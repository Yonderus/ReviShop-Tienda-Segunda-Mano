import mongoose from "mongoose";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./AppError.js";

const FIELD_LABELS = {
  email: "email",
  slug: "slug",
  sku: "SKU",
  productId: "combinación de opciones",
};

/**
 * Errores del lector de JSON (body-parser), por su `type`. No son fallos del servidor: la petición venía mal.
 * Ver https://github.com/expressjs/body-parser#errors
 */
const BODY_ERRORS = {
  "entity.parse.failed": () => new ValidationError("El cuerpo de la petición no es un JSON válido"),
  "entity.too.large": () => new PayloadTooLargeError(),
  "charset.unsupported": () => new UnsupportedMediaTypeError(),
  "encoding.unsupported": () => new UnsupportedMediaTypeError("La compresión de la petición no está soportada"),
  "entity.verify.failed": () => new ForbiddenError("No se ha podido verificar el cuerpo de la petición"),
  "request.size.invalid": () => new BadRequestError("La petición llegó incompleta"),
  // El cliente cortó la petición a medias: ya no hay nadie esperando la respuesta.
  "request.aborted": () => new BadRequestError("La petición se cortó antes de terminar"),
};

/** Sin conexión con MongoDB (caída, reiniciándose o inalcanzable): no es culpa de la petición. */
const DB_UNAVAILABLE = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoServerSelectionError",
  "MongooseServerSelectionError",
  "MongoNotConnectedError",
  "MongoTopologyClosedError",
]);
const isDbUnavailable = (err) =>
  DB_UNAVAILABLE.has(err?.name) || (err instanceof mongoose.Error && /buffering timed out/i.test(err.message));

/** Traduce los errores conocidos (Mongo, Mongoose, body-parser) a un AppError; null si es inesperado. */
function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err?.type && BODY_ERRORS[err.type]) return BODY_ERRORS[err.type]();

  if (isDbUnavailable(err)) return new ServiceUnavailableError();

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0];
    const message = `Ya existe un registro con ese ${FIELD_LABELS[field] ?? field ?? "valor"}`;
    return field ? ConflictError.forField(field, message) : new ConflictError(message);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ValidationError.forField(err.path, `${err.path} no es un valor válido`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return new ValidationError(undefined, Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })));
  }

  return null;
}

const describe = (req) => `${req.method} ${req.originalUrl}`;

/**
 * Formato único de error: { success: false, message, errors? }. `errors` solo aparece si hay errores por campo.
 * Lo inesperado se registra **siempre** (también en producción) con su traza, pero al cliente solo le llega
 * "Error interno del servidor": nunca detalles internos.
 */
export const errorHandler = (err, req, res, next) => {
  // Si la respuesta ya empezó a enviarse, no se puede cambiar: Express cierra la conexión.
  if (res.headersSent) return next(err);

  const error = toAppError(err);
  if (error) {
    if (error.statusCode === 503) console.warn(`[503] ${describe(req)}: sin conexión con la base de datos (${err.name})`);
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message, ...(error.errors?.length && { errors: error.errors }) });
  }

  console.error(`[500] ${describe(req)}`, err);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
};
