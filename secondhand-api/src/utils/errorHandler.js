import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

const FIELD_LABELS = {
  email: "email",
  slug: "slug",
  sku: "SKU",
  productId: "combinación de opciones",
};

const send = (res, statusCode, message) => res.status(statusCode).json({ success: false, message });

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) return send(res, err.statusCode, err.message);

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0];
    return send(res, 409, `Ya existe un registro con ese ${FIELD_LABELS[field] ?? field ?? "valor"}`);
  }

  if (err instanceof mongoose.Error.CastError) {
    return send(res, 422, `${err.path} no es un valor válido`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return send(res, 422, messages.join(", "));
  }

  if (err?.type === "entity.parse.failed") {
    return send(res, 422, "El cuerpo de la petición no es un JSON válido");
  }

  if (!env.isProduction) console.error(err);
  return send(res, 500, "Error interno del servidor");
};
