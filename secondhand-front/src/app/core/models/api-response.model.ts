export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** `errors` solo llega si el error va ligado a campos; `field` es una ruta con puntos ("images.0.url"). */
export interface ApiFailure {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isApiSuccess = (body: unknown): body is ApiSuccess<unknown> =>
  isObject(body) && body['success'] === true && 'data' in body;

export const isApiFailure = (body: unknown): body is ApiFailure =>
  isObject(body) && body['success'] === false && typeof body['message'] === 'string';

/** Los errores por campo de una respuesta de error, descartando los que no tengan la forma esperada. */
export function failureErrors(body: ApiFailure): { field: string | null; message: string }[] {
  if (!Array.isArray(body.errors)) return [];
  return body.errors
    .filter((error): error is { field: string; message: string } => isObject(error) && typeof error['message'] === 'string')
    .map(({ field, message }) => ({ field: typeof field === 'string' && field ? field : null, message }));
}
