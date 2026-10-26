import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError, ConflictError, ValidationError } from "./AppError.js";

const FIELD_LABELS = {
  email: "email",
  slug: "slug",
  sku: "SKU",
  productId: "combinación de opciones",
};

/** Traduce los errores conocidos (Mongo, Mongoose, JSON mal formado) a un AppError; null si es inesperado. */
function toAppError(err) {
  if (err instanceof AppError) return err;

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

  if (err?.type === "entity.parse.failed") {
    return new ValidationError("El cuerpo de la petición no es un JSON válido");
  }

  return null;
}

/** Formato único de error: { success: false, message, errors? }. `errors` solo aparece si hay errores por campo. */
export const errorHandler = (err, _req, res, _next) => {
  const error = toAppError(err);
  if (error) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message, ...(error.errors?.length && { errors: error.errors }) });
  }

  if (!env.isProduction) console.error(err);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
};
