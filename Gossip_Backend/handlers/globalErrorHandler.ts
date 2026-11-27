import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../errors/appError.js";

export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the 5MB size limit"
        : error.message;
    req.log.warn({ err: error, code: error.code }, message);
    return res.status(400).json({ error: message });
  }

  if (error instanceof AppError && error.isOperational) {
    req.log.warn({ err: error, code: error.code }, error.message);
    return res.status(error.statusCode).json({ error: error.message });
  }

  req.log.error(error, "Unhandled error");
  res.status(500).json({ message: "Internal Server Error" });
};
