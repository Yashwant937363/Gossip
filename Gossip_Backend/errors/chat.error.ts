import { AppError } from "./appError";

export class EmptyMessageError extends AppError {
  constructor(message = "Chat Message Cannot be Empty") {
    super(message, 400, "EMPTY_CHAT");
  }
}
