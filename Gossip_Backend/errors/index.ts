import { AppError } from "./appError";
export * from "./friend-request.error";
export * from "./chat.error";

export class UserNotFoundError extends AppError {
  constructor(message = "User not found") {
    super(message, 404, "USER_NOT_FOUND");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "Login with correct credentials") {
    super(message, 401, "INVALID_CREDENTIALS");
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message = "Please enter a unique email address") {
    super(message, 409, "EMAIL_ALREADY_EXISTS");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class ImageProcessingError extends AppError {
  constructor(message = "Error while processing image Sharp Error") {
    super(message, 500, "IMAGE_PROCESSING_ERROR");
  }
}

export class SendEmailOtpError extends AppError {
  constructor(message = "Failed to send email") {
    super(message, 500, "SEND_EMAIL_FAILED");
  }
}

export class ImageUploadError extends AppError {
  constructor(message = "Failed to upload chat image") {
    super(message, 500, "IMAGE_UPLOAD_FAILED");
  }
}

export class GroqServiceError extends AppError {
  constructor(message = "Groq AI service failed", details?: unknown) {
    super(message, 502, "GROQ_SERVICE_ERROR", details);
  }
}

export class ReceiverOfflineError extends AppError {
  constructor(message = "receiver is offline") {
    super(message, 409, "RECEIVER_OFFLINE");
  }
}
