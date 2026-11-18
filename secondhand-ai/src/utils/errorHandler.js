import {
  AppError,
  BadRequestError,
  ForbiddenError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./AppError.js";

/** Errores del lector de JSON (body-parser), por su `type`: la petición venía mal, no es un fallo del servidor. */
const BODY_ERRORS = {
  "entity.parse.failed": () => new ValidationError("El cuerpo de la petición no es un JSON válido"),
  "entity.too.large": () => new PayloadTooLargeError(),
  "charset.unsupported": () => new UnsupportedMediaTypeError(),
  "encoding.unsupported": () => new UnsupportedMediaTypeError("La compresión de la petición no está soportada"),
  "entity.verify.failed": () => new ForbiddenError("No se ha podido verificar el cuerpo de la petición"),
  "request.size.invalid": () => new BadRequestError("La petición llegó incompleta"),
  "request.aborted": () => new BadRequestError("La petición se cortó antes de terminar"),
};

function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err?.type && BODY_ERRORS[err.type]) return BODY_ERRORS[err.type]();
  return null;
}

const describe = (req) => `${req.method} ${req.originalUrl}`;

/**
 * Mismo formato que la API: { success: false, message, errors? }. Lo inesperado se registra con su traza,
 * pero al cliente solo le llega "Error interno del servidor".
 */
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const error = toAppError(err);
  if (error) {
    if (error.statusCode >= 500) console.warn(`[${error.statusCode}] ${describe(req)}: ${error.message}`);
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message, ...(error.errors?.length && { errors: error.errors }) });
  }

  console.error(`[500] ${describe(req)}`, err);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
};
