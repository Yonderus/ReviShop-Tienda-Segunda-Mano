export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isApiSuccess = (body: unknown): body is ApiSuccess<unknown> =>
  isObject(body) && body['success'] === true && 'data' in body;

export const isApiFailure = (body: unknown): body is ApiFailure =>
  isObject(body) && body['success'] === false && typeof body['message'] === 'string';
