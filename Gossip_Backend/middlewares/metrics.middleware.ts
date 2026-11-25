import type { NextFunction, Request, Response } from "express";
import {
  httpActiveRequests,
  recordHttpRequest,
} from "../metrics/http.metrics.js";
import type { HttpRouteType } from "../types/metrics.types.js";

function resolveRouteLabel(req: Request): string {
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  return req.path === "/" ? "/" : "unmatched";
}

function getRouteType(req: Request, route: string): HttpRouteType {
  if (route.startsWith("/api/ai") || req.originalUrl.startsWith("/api/ai")) {
    return "ai";
  }
  return "normal";
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path === "/metrics") {
    return next();
  }

  const start = process.hrtime.bigint();
  httpActiveRequests.inc();

  let settled = false;

  const finalize = (isAborted: boolean) => {
    if (settled) return;
    settled = true;

    httpActiveRequests.dec();

    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = resolveRouteLabel(req);
    const type = getRouteType(req, route);
    const statusCode = isAborted && !res.writableEnded ? 499 : res.statusCode;

    recordHttpRequest(type, req.method, route, statusCode, durationSeconds);
  };

  res.on("finish", () => finalize(false));
  res.on("close", () => finalize(true));

  next();
}
