import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BLOCKING_REQUEST, INLINE_ERROR_STATUSES, SKIP_ERROR_ALERT, SKIP_GLOBAL_LOADER } from '../config/api.tokens';
import { ApiSuccess } from '../models/api-response.model';

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  params?: Record<string, QueryValue>;
  skipErrorAlert?: boolean;
  skipGlobalLoader?: boolean;
  inlineErrorStatuses?: readonly number[];
  blocking?: boolean;
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
    const response = await firstValueFrom(
      this.http.request<ApiSuccess<T> | null>(method, `${this.baseUrl}${path}`, {
        body,
        params: this.buildParams(options.params),
        context: this.buildContext(options),
      }),
      { defaultValue: null },
    );
    return (response === null ? undefined : response.data) as T;
  }

  private buildParams(params: Record<string, QueryValue> = {}): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }

  private buildContext(options: ApiRequestOptions): HttpContext {
    return new HttpContext()
      .set(SKIP_ERROR_ALERT, options.skipErrorAlert ?? false)
      .set(SKIP_GLOBAL_LOADER, options.skipGlobalLoader ?? false)
      .set(INLINE_ERROR_STATUSES, options.inlineErrorStatuses ?? [])
      .set(BLOCKING_REQUEST, options.blocking ?? false);
  }
}
