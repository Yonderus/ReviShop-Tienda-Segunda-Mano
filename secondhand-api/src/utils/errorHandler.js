import { AppError } from "./AppError.js";

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue ?? {}).join(", ");
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con ese valor de ${fields || "campo unico"}`,
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
