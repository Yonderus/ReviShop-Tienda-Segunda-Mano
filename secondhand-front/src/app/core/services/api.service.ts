import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, fromEvent, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BLOCKING_REQUEST,
  INLINE_ERROR_STATUSES,
  SKIP_AUTH_REDIRECT,
  SKIP_ERROR_ALERT,
  SKIP_GLOBAL_LOADER,
} from '../config/api.tokens';
import { abortError } from '../models/api-error.model';
import { ApiSuccess } from '../models/api-response.model';

/** Un valor de query param. Un array se envía con comas (`?category=a,b`); vacíos, null y undefined no se envían. */
export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export interface ApiRequestOptions {
  params?: Record<string, QueryValue>;
  /**
   * Para cancelar la petición (AbortController): al abortar se corta la petición HTTP de verdad y la Promise
   * se rechaza con un AbortError (`isAbortError`), que no es un error que haya que enseñar.
   */
  signal?: AbortSignal;
  skipErrorAlert?: boolean;
  skipGlobalLoader?: boolean;
  inlineErrorStatuses?: readonly number[];
  blocking?: boolean;
  /** Ver SKIP_AUTH_REDIRECT. */
  skipAuthRedirect?: boolean;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T = void>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Único punto de contacto con HttpClient: convierte el Observable en Promise.
   * La forma `{ success, data }` ya la valida el errorInterceptor; aquí solo se desempaqueta (204 → undefined).
   */
  private async request<T>(method: Method, path: string, body: unknown, options: ApiRequestOptions = {}): Promise<T> {
    const { signal } = options;
    if (signal?.aborted) throw abortError();

    const request$ = this.http.request<ApiSuccess<T> | null>(method, `${this.baseUrl}${path}`, {
      body,
      params: this.buildParams(options.params),
      context: this.buildContext(options),
    });
    // Al abortar, takeUntil se desuscribe: HttpClient cancela la petición (fetch/XHR) y termina sin valor.
    const response = await firstValueFrom(signal ? request$.pipe(takeUntil(fromEvent(signal, 'abort'))) : request$, {
      defaultValue: null,
    });
    if (signal?.aborted) throw abortError();
    return (response === null ? undefined : response.data) as T;
  }

  /** El "buildUrl": de un objeto a query params, sin vacíos y con los arrays separados por comas. */
  private buildParams(params: Record<string, QueryValue> = {}): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      const text = Array.isArray(value) ? value.filter((item) => item !== '').join(',') : value;
      if (text === undefined || text === null || text === '') continue;
      httpParams = httpParams.set(key, String(text));
    }
    return httpParams;
  }

  private buildContext(options: ApiRequestOptions): HttpContext {
    return new HttpContext()
      .set(SKIP_ERROR_ALERT, options.skipErrorAlert ?? false)
      .set(SKIP_GLOBAL_LOADER, options.skipGlobalLoader ?? false)
      .set(INLINE_ERROR_STATUSES, options.inlineErrorStatuses ?? [])
      .set(BLOCKING_REQUEST, options.blocking ?? false)
      .set(SKIP_AUTH_REDIRECT, options.skipAuthRedirect ?? false);
  }
}
