import { signal } from '@angular/core';
import { ApiError, toApiError } from '../models/api-error.model';

/** Una lista remota con carga única, deduplicación de peticiones y mutaciones locales. */
export class RemoteCollection<T extends { _id: string }> {
  private readonly _items = signal<T[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private readonly _loaded = signal(false);
  private inFlight: Promise<void> | null = null;

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  constructor(
    private readonly fetch: () => Promise<T[]>,
    private readonly order: (a: T, b: T) => number,
  ) {}

  load(force = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this._loaded() && !force) return Promise.resolve();
    this.inFlight = this.run();
    return this.inFlight;
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this._items().find(predicate);
  }

  /** Si la colección aún no se ha cargado no se toca: se pedirá completa cuando haga falta. */
  upsert(item: T): void {
    if (!this._loaded()) return;
    this._items.update((list) => [item, ...list.filter((i) => i._id !== item._id)].sort(this.order));
  }

  remove(id: string): void {
    this._items.update((list) => list.filter((i) => i._id !== id));
  }

  private async run(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._items.set([...(await this.fetch())].sort(this.order));
      this._loaded.set(true);
    } catch (raw) {
      this._error.set(toApiError(raw));
    } finally {
      this._loading.set(false);
      this.inFlight = null;
    }
  }
}
