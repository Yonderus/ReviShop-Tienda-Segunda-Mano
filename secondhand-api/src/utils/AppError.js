export class AppError extends Error {
  /**
   * @param {{ field: string, message: string }[]} [errors] errores ligados a un campo ("title", "images.0.url"):
   *   el front los pinta junto a cada uno.
   */
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /** Error de un solo campo, con el mismo texto en `message` y en `errors`: `ValidationError.forField("categoryId", "…")`. */
  static forField(field, message) {
    return new this(message, [{ field, message }]);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", errors) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", errors) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", errors) {
    super(403, message, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", errors) {
    super(404, message, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", errors) {
    super(409, message, errors);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "El cuerpo de la petición es demasiado grande", errors) {
    super(413, message, errors);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = "El formato de la petición no está soportado. Envía JSON en UTF-8", errors) {
    super(415, message, errors);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos", errors) {
    super(503, message, errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Demasiadas peticiones", errors) {
    super(429, message, errors);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Los datos enviados no son válidos", errors) {
    super(422, message, errors);
  }
}
