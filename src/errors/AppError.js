class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

module.exports = { AppError, NotFoundError, BadRequestError };
