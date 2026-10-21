import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError, toApiError } from '../../../core/models/api-error.model';
import { Category, CategoryAttribute } from '../models/category.model';
import { Seller } from '../models/seller.model';
import { CategoriesService } from '../services/categories.service';
import { SellersService } from '../services/sellers.service';

export interface CategoryGroup {
  root: Category;
  children: Category[];
}

/** Datos de referencia para select, filtros y etiquetas: se cargan una vez y se comparten. */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly categoriesService = inject(CategoriesService);
  private readonly sellersService = inject(SellersService);

  private readonly _categories = signal<Category[]>([]);
  private readonly _sellers = signal<Seller[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private inFlight: Promise<void> | null = null;

  readonly categories = this._categories.asReadonly();
  readonly sellers = this._sellers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly byId = computed(() => new Map(this._categories().map((c) => [c._id, c])));
  private readonly bySlug = computed(() => new Map(this._categories().map((c) => [c.slug, c])));

  readonly rootCategories = computed(() => this._categories().filter((c) => !c.parentId));

  /** Árbol de dos niveles para los optgroup de los select. */
  readonly categoryGroups = computed<CategoryGroup[]>(() =>
    this.rootCategories().map((root) => ({
      root,
      children: this._categories().filter((c) => c.parentId === root._id),
    })),
  );

  load(options: { force?: boolean } = {}): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this._loaded() && !options.force) return Promise.resolve();
    this.inFlight = this.fetch();
    return this.inFlight;
  }

  categoryBySlug(slug: string | undefined): Category | undefined {
    return slug ? this.bySlug().get(slug) : undefined;
  }

  /** La categoría y sus subcategorías (para filtrar "Electrónica" e incluir "Móviles"). */
  descendantSlugs(slug: string): ReadonlySet<string> {
    const category = this.bySlug().get(slug);
    if (!category) return new Set([slug]);
    const children = this._categories().filter((c) => c.parentId === category._id).map((c) => c.slug);
    return new Set([slug, ...children]);
  }

  /** Atributos de variante: los propios o, si no tiene, los heredados del padre. */
  attributesFor(categoryId: string | null | undefined): CategoryAttribute[] {
    const category = categoryId ? this.byId().get(categoryId) : undefined;
    if (!category) return [];
    if (category.attributes.length || !category.parentId) return category.attributes;
    return this.byId().get(category.parentId)?.attributes ?? [];
  }

  private async fetch(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [categories, sellers] = await Promise.all([this.categoriesService.list(), this.sellersService.list()]);
      this._categories.set(categories);
      this._sellers.set(sellers);
      this._loaded.set(true);
    } catch (raw) {
      this._error.set(toApiError(raw));
    } finally {
      this._loading.set(false);
      this.inFlight = null;
    }
  }
}
