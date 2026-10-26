import { inject } from '@angular/core';
import { INLINE_FORM_STATUSES } from '../config/app.constants';
import { EntityRecord } from '../models/entity.model';
import { ApiRequestOptions, ApiService } from './api.service';

/** Las cargas pintan skeleton y ErrorState propios: sin loader global ni modal. */
export const READ_OPTIONS: ApiRequestOptions = { skipErrorAlert: true, skipGlobalLoader: true };

const FORM_OPTIONS: ApiRequestOptions = { inlineErrorStatuses: INLINE_FORM_STATUSES, blocking: true };

/** 409 de estado (activar uno eliminado, restaurar uno vivo): el llamador muestra un mensaje específico. */
export const STATE_CONFLICT_STATUS = 409;

/**
 * Los endpoints que comparten todas las entidades con CRUD. Cada servicio hereda de aquí, declara su
 * `path` y añade solo los suyos (p. ej. `changeStatus` en productos).
 *
 *   GET    /<path>/actives · /inactives · /trash · /slug/:slug
 *   POST   /<path>                    PATCH  /<path>/:id
 *   PATCH  /<path>/:id/active         PATCH  /<path>/:id/restore         DELETE /<path>/:id
 */
export abstract class EntityApiService<T extends EntityRecord, TInput> {
  protected readonly api = inject(ApiService);
  /** Ruta base del recurso en la API, por ejemplo `/products`. */
  protected abstract readonly path: string;

  listActive(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/actives`, READ_OPTIONS);
  }

  listInactive(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/inactives`, READ_OPTIONS);
  }

  listTrashed(): Promise<T[]> {
    return this.api.get<T[]>(`${this.path}/trash`, READ_OPTIONS);
  }

  getBySlug(slug: string): Promise<T> {
    return this.api.get<T>(`${this.path}/slug/${encodeURIComponent(slug)}`, READ_OPTIONS);
  }

  create(input: TInput): Promise<T> {
    return this.api.post<T>(this.path, input, FORM_OPTIONS);
  }

  update(id: string, changes: Partial<TInput>): Promise<T> {
    return this.api.patch<T>(`${this.path}/${id}`, changes, FORM_OPTIONS);
  }

  /** No bloqueante: la UI ya ha aplicado el cambio de forma optimista. */
  setActive(id: string, isActive: boolean): Promise<T> {
    return this.api.patch<T>(`${this.path}/${id}/active`, { isActive }, { inlineErrorStatuses: [STATE_CONFLICT_STATUS] });
  }

  restore(id: string, isActive: boolean): Promise<T> {
    return this.api.patch<T>(
      `${this.path}/${id}/restore`,
      { isActive },
      { inlineErrorStatuses: [STATE_CONFLICT_STATUS], blocking: true },
    );
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`${this.path}/${id}`, { blocking: true });
  }
}
