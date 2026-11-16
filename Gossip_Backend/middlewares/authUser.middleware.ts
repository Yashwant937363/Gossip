import type { NextFunction, Request, Response } from "express";
import type { JWTPayload } from "../types/auth.types.js";
import { verifyToken } from "../services/jwt.service.js";

const authUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token =
      (authHeader?.startsWith("Bearer ") && authHeader?.trim().split(" ")[1]) ||
      undefined;
    if (token === undefined || token === "") {
      req.log.warn("Unauthorized access attempt: Missing token");
      return res.status(401).json({ message: "unauthorized" });
    }

    const { id } = verifyToken<JWTPayload>(token);
    if (!id) {
      req.log.warn("Unauthorized access attempt: Invalid token payload");
      return res.status(401).json({ message: "unauthorized" });
    }
    res.locals.id = id;
    next();
  } catch (e) {
    req.log.warn({ err: e }, "Unauthorized access attempt: Invalid token");
    return res.status(401).json({ message: "unauthorized" });
  }
};

export default authUser;
