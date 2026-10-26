export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'validation' | 'invalid-response';

/** Un error del backend. Con `field` se pinta junto a ese campo del formulario; sin él, en el aviso general. */
export interface ApiFieldError {
  readonly field: string | null;
  readonly message: string;
}

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status = 0,
    readonly errors: readonly ApiFieldError[] = [],
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
