import { ValidationError } from "../utils/AppError.js";

export const validate = (schemas) => (req, _res, next) => {
  const messages = [];

  for (const key of ["params", "query", "body"]) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) {
      req[key] = result.data;
    } else {
      messages.push(...result.error.issues.map((issue) => issue.message));
    }
  }

  if (messages.length) return next(new ValidationError(messages.join(", ")));
  next();
};
