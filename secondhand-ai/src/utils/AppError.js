// Los mismos errores que la API, para que el front reciba siempre el mismo formato venga de donde venga.

export class AppError extends Error {
  /** @param {{ field: string, message: string }[]} [errors] errores ligados a un campo ("messages.0.content") */
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
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

export class ValidationError extends AppError {
  constructor(message = "Los datos enviados no son válidos", errors) {
    super(422, message, errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Demasiadas peticiones", errors) {
    super(429, message, errors);
  }
}

export class BadGatewayError extends AppError {
  constructor(message = "El asistente no ha podido responder. Inténtalo de nuevo", errors) {
    super(502, message, errors);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos", errors) {
    super(503, message, errors);
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message = "El asistente ha tardado demasiado en responder", errors) {
    super(504, message, errors);
  }
}
