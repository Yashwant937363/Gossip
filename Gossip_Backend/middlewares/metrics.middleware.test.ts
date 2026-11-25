import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { metricsMiddleware } from "./metrics.middleware.js";
import * as httpMetrics from "../metrics/http.metrics.js";
import { register } from "../metrics/registry.js";

describe("metricsMiddleware", () => {
  let req: any;
  let res: any;
  let next: any;

  const recordSpy = vi.spyOn(httpMetrics, "recordHttpRequest");

  beforeEach(() => {
    vi.clearAllMocks();
    register.resetMetrics();

    req = {
      method: "GET",
      path: "/api/user/search",
      originalUrl: "/api/user/search",
      baseUrl: "/api/user",
      route: { path: "/search" },
    };

    res = new EventEmitter();
    res.statusCode = 200;
    res.writableEnded = true;

    next = vi.fn();
  });

  it("skips recording metrics for /metrics endpoint", () => {
    req.path = "/metrics";

    metricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    res.emit("finish");
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("tracks active requests and records normal route metrics on finish", async () => {
    metricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const activeDuring = await httpMetrics.httpActiveRequests.get();
    expect(activeDuring.values[0].value).toBe(1);

    res.emit("finish");

    const activeAfter = await httpMetrics.httpActiveRequests.get();
    expect(activeAfter.values[0].value).toBe(0);

    expect(recordSpy).toHaveBeenCalledOnce();
    expect(recordSpy).toHaveBeenCalledWith(
      "normal",
      "GET",
      "/api/user/search",
      200,
      expect.any(Number),
    );
  });

  it("records AI route metrics when path starts with /api/ai", () => {
    req.method = "POST";
    req.path = "/chatbot";
    req.originalUrl = "/api/ai/chatbot";
    req.baseUrl = "/api/ai";
    req.route = { path: "/chatbot" };

    metricsMiddleware(req, res, next);
    res.emit("finish");

    expect(recordSpy).toHaveBeenCalledWith(
      "ai",
      "POST",
      "/api/ai/chatbot",
      200,
      expect.any(Number),
    );
  });

  it("records error metrics on 4xx/5xx responses", async () => {
    res.statusCode = 500;

    metricsMiddleware(req, res, next);
    res.emit("finish");

    const httpErrors = await httpMetrics.httpErrorsTotal.get();
    expect(httpErrors.values[0].value).toBe(1);
    expect(httpErrors.values[0].labels).toMatchObject({
      method: "GET",
      route: "/api/user/search",
      status_code: "500",
      type: "normal",
      error_type: "server_error",
    });
  });

  it("handles aborted connections cleanly without double-decrementing", async () => {
    res.writableEnded = false;

    metricsMiddleware(req, res, next);
    res.emit("close");
    res.emit("finish");

    const activeAfter = await httpMetrics.httpActiveRequests.get();
    expect(activeAfter.values[0].value).toBe(0);
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      "normal",
      "GET",
      "/api/user/search",
      499,
      expect.any(Number),
    );
  });
});
