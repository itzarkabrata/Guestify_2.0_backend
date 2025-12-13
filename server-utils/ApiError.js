export class ApiError extends Error {
  constructor(statusCode = 500, message = "Something Went Wrong", error = "", stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.error = error;
    if(stack) {
      this.stack = stack;
    } else {
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class TypeError extends ApiError {
  constructor(message = "Type Mismatch Error", error = "", stack = "") {
    super(422, message, error, stack);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = "Authorization Error", error = "", stack = "") {
    super(403, message, error, stack);
  }
}
export class EvalError extends ApiError {
  constructor(message = "Evaluation Error", error = "", stack = "") {
    super(400, message, error, stack);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error", error = "", stack = "") {
    super(500, message, error, stack);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource Not Found", error = "", stack = "") {
    super(404, message, error, stack);
  }
}