import { computed, signal } from '@angular/core';
import { ApiError, toApiError } from '../models/api-error.model';
import { EntityRecord } from '../models/entity.model';
import { EntityApiService } from '../services/entity-api.service';
import { RemoteCollection } from './remote-collection';

export type DetailStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error';
export type CollectionKey = 'active' | 'inactive' | 'trash';

export const byNewest = (a: EntityRecord, b: EntityRecord) => b.createdAt.localeCompare(a.createdAt);
const byDeletedNewest = (a: EntityRecord, b: EntityRecord) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '');

/**
 * Estado y operaciones comunes a cualquier entidad con CRUD, con signals: las tres colecciones del panel
 * (activos, inactivos y papelera), el registro abierto por slug y las escrituras, con la visibilidad
 * optimista (cambia al instante y vuelve atrás si la API falla).
 *
 * Para una entidad nueva basta con heredar y declarar `api`:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class CategoriesStore extends EntityStore<Category, CategoryInput> {
 *     protected readonly api = inject(CategoriesService);
 *   }
 */
export abstract class EntityStore<T extends EntityRecord, TInput> {
  protected abstract readonly api: EntityApiService<T, TInput>;

  // Las funciones de carga leen `this.api` al llamarse, cuando la subclase ya lo ha asignado.
  protected readonly collections: Record<CollectionKey, RemoteCollection<T>> = {
    active: new RemoteCollection<T>(() => this.api.listActive(), byNewest),
    inactive: new RemoteCollection<T>(() => this.api.listInactive(), byNewest),
    trash: new RemoteCollection<T>(() => this.api.listTrashed(), byDeletedNewest),
  };

  private readonly _selected = signal<T | null>(null);
  private readonly _detailStatus = signal<DetailStatus>('idle');
  private readonly _detailError = signal<ApiError | null>(null);
  private readonly _saving = signal(false);
  private readonly _deletingId = signal<string | null>(null);
  private readonly _pendingIds = signal<ReadonlySet<string>>(new Set());

  /** Registro abierto (detalle o edición). Lo rellena `loadBySlug`. */
  readonly selected = this._selected.asReadonly();
  readonly detailStatus = this._detailStatus.asReadonly();
  readonly detailError = this._detailError.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly deletingId = this._deletingId.asReadonly();
  /** Registros con una mutación optimista o de restauración en curso. */
  readonly pendingIds = this._pendingIds.asReadonly();

  /**
   * El registro abierto solo cuando ya está completo (no el resumen de un listado). Los formularios de
   * edición usan este: se rellenan una sola vez y no pueden partir de un resumen.
   */
  readonly selectedComplete = computed(() => {
    const entity = this._selected();
    return entity && this.isComplete(entity) ? entity : null;
  });

  readonly trashCount = computed(() => this.collections.trash.items().length);
  /** Recuento por pestaña; null mientras esa colección no se haya cargado. */
  readonly counts = computed(() => ({
    active: this.countOf('active'),
    inactive: this.countOf('inactive'),
    trash: this.countOf('trash'),
  }));

  private readonly detailInFlight = new Map<string, Promise<T>>();
  /** Registros pedidos por slug que aún no están en ninguna lista (p. ej. entrada directa al detalle). */
  private readonly detailCache = new Map<string, T>();
  private currentSlug: string | null = null;

  collection(key: CollectionKey) {
    const { items, loading, error, loaded } = this.collections[key];
    return { items, loading, error, loaded };
  }

  loadCollection(key: CollectionKey, options: { force?: boolean } = {}): Promise<void> {
    return this.collections[key].load(options.force);
  }

  /** Las tres colecciones a la vez (panel y contadores de las pestañas). */
  loadCollections(options: { force?: boolean } = {}): Promise<unknown> {
    return Promise.all((Object.keys(this.collections) as CollectionKey[]).map((key) => this.loadCollection(key, options)));
  }

  /**
   * Abre un registro por slug. Si ya está en memoria se pinta al instante; si lo que hay es el resumen de un
   * listado (ver `isComplete`), se pide además el detalle y se sustituye cuando llega.
   */
  async loadBySlug(slug: string): Promise<T | null> {
    this.currentSlug = slug;
    const cached = this.findCached(slug);
    if (cached) {
      this.select(cached);
      if (this.isComplete(cached)) return cached;
    } else {
      this._selected.set(null);
      this._detailError.set(null);
      this._detailStatus.set('loading');
    }

    let request = this.detailInFlight.get(slug);
    if (!request) {
      request = this.api.getBySlug(slug);
      this.detailInFlight.set(slug, request);
    }

    try {
      const entity = await request;
      this.detailCache.set(entity.slug, entity);
      if (this.currentSlug === slug) this.select(entity);
      return entity;
    } catch (raw) {
      // Si ya se estaba enseñando el resumen, se queda: es mejor que una pantalla de error.
      if (cached) return cached;
      const error = toApiError(raw);
      if (this.currentSlug === slug) {
        this._detailError.set(error);
        this._detailStatus.set(error.isNotFound ? 'not-found' : 'error');
      }
      return null;
    } finally {
      this.detailInFlight.delete(slug);
    }
  }

  /**
   * ¿Tiene este registro todo lo que necesita su página de detalle? Los listados de algunas entidades traen
   * un resumen (p. ej. productos sin variantes); esos stores lo indican aquí para que se pida el detalle.
   */
  protected isComplete(_entity: T): boolean {
    return true;
  }

  /**
   * Vuelve a pedir un registro a la API, sin caché, y lo pone al día en su lista y en `selected`. Para cuando
   * algo que la API calcula (p. ej. el estado de un producto según sus variantes) ha cambiado por otro camino.
   */
  async reload(slug: string): Promise<T> {
    const entity = await this.api.getBySlug(slug);
    this.detailCache.set(entity.slug, entity);
    this.placeLive(entity);
    return entity;
  }

  async create(input: TInput): Promise<T> {
    this._saving.set(true);
    try {
      const entity = await this.api.create(input);
      this.placeLive(entity);
      this.select(entity);
      return entity;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._saving.set(false);
    }
  }

  async update(entity: T, changes: Partial<TInput>): Promise<T> {
    this._saving.set(true);
    try {
      const updated = await this.api.update(entity._id, changes);
      this.detailCache.delete(entity.slug);
      this.placeLive(updated);
      this.select(updated);
      return updated;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._saving.set(false);
    }
  }

  /** Optimista: la UI cambia al instante y se revierte si la API falla. */
  async setActive(entity: T, isActive: boolean): Promise<T> {
    if (entity.isActive === isActive || this.isPending(entity._id)) return entity;

    this.setPending(entity._id, true);
    this.placeLive({ ...entity, isActive });

    try {
      const updated = await this.api.setActive(entity._id, isActive);
      this.placeLive(updated);
      return updated;
    } catch (raw) {
      this.placeLive(entity);
      throw toApiError(raw);
    } finally {
      this.setPending(entity._id, false);
    }
  }

  /** Soft delete: el registro pasa a la papelera con fecha de borrado. */
  async remove(entity: T): Promise<void> {
    this._deletingId.set(entity._id);
    try {
      await this.api.remove(entity._id);
      this.collections.active.remove(entity._id);
      this.collections.inactive.remove(entity._id);
      this.collections.trash.upsert({ ...entity, isActive: false, deletedAt: new Date().toISOString() });
      this.detailCache.delete(entity.slug);
      if (this._selected()?._id === entity._id) this.clearSelected();
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this._deletingId.set(null);
    }
  }

  async restore(entity: T, isActive: boolean): Promise<T> {
    this.setPending(entity._id, true);
    try {
      const restored = await this.api.restore(entity._id, isActive);
      this.collections.trash.remove(entity._id);
      this.placeLive(restored);
      return restored;
    } catch (raw) {
      throw toApiError(raw);
    } finally {
      this.setPending(entity._id, false);
    }
  }

  clearSelected(): void {
    this.currentSlug = null;
    this._selected.set(null);
    this._detailError.set(null);
    this._detailStatus.set('idle');
  }

  protected isPending(id: string): boolean {
    return this._pendingIds().has(id);
  }

  protected setPending(id: string, pending: boolean): void {
    this._pendingIds.update((set) => {
      const next = new Set(set);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Coloca un registro no eliminado en la colección que le corresponde según isActive. */
  protected placeLive(entity: T): void {
    const [target, other] = entity.isActive
      ? [this.collections.active, this.collections.inactive]
      : [this.collections.inactive, this.collections.active];
    other.remove(entity._id);
    if (target.loaded()) target.upsert(entity);
    else this.detailCache.set(entity.slug, entity);
    if (this._selected()?._id === entity._id) this._selected.set(entity);
  }

  private countOf(key: CollectionKey): number | null {
    const collection = this.collections[key];
    return collection.loaded() ? collection.items().length : null;
  }

  private findCached(slug: string): T | undefined {
    const bySlug = (entity: T) => entity.slug === slug;
    return this.collections.active.find(bySlug) ?? this.collections.inactive.find(bySlug) ?? this.detailCache.get(slug);
  }

  private select(entity: T): void {
    this._selected.set(entity);
    this._detailError.set(null);
    this._detailStatus.set('success');
  }
}
