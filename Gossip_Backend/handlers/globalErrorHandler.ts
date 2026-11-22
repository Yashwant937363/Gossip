import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError && error.isOperational) {
    req.log.warn({ err: error, code: error.code }, error.message);
    return res.status(error.statusCode).json({ error: error.message });
  }

  req.log.error(error, "Unhandled error");
  res.status(500).json({ message: "Internal Server Error" });
};
