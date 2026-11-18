import { ValidationError } from "../utils/AppError.js";

/** Valida params, query y body con Zod (igual que la API). Cada fallo va a `errors` con la ruta de su campo. */
export const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const key of ["params", "query", "body"]) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) {
      req[key] = result.data;
    } else {
      for (const issue of result.error.issues) {
        errors.push({ field: issue.path.join(".") || key, message: issue.message });
      }
    }
  }

  if (errors.length) return next(new ValidationError(undefined, errors));
  next();
};
