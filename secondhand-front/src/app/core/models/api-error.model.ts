export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'validation' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status = 0,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  static unexpected(): ApiError {
    return new ApiError('http', 'Ha ocurrido un error inesperado. Inténtalo de nuevo.');
  }
}

export const toApiError = (error: unknown): ApiError =>
  error instanceof ApiError ? error : ApiError.unexpected();
