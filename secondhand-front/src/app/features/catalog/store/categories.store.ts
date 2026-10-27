import { Injectable, computed, inject } from '@angular/core';
import { EntityStore } from '../../../core/store/entity.store';
import { AdminCategory, CategoryInput } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';
import { CatalogStore } from './catalog.store';

/** Panel de categorías. Carga, escrituras, visibilidad optimista y papelera vienen de EntityStore. */
@Injectable({ providedIn: 'root' })
export class CategoriesStore extends EntityStore<AdminCategory, CategoryInput> {
  protected readonly api = inject(CategoriesService);
  private readonly catalog = inject(CatalogStore);

  /** Las no eliminadas, activas o no: de aquí salen los posibles padres del formulario. */
  readonly liveCategories = computed(() => [...this.collections.active.items(), ...this.collections.inactive.items()]);

  /** Nombre de cualquier categoría cargada, también de la papelera (para "subcategoría de …"). */
  readonly namesById = computed(
    () => new Map([...this.liveCategories(), ...this.collections.trash.items()].map((c) => [c._id, c.name])),
  );

  /**
   * Un cambio en una categoría cambia los select y filtros de la tienda (CatalogStore) y los contadores de
   * otras categorías (el nº de subcategorías del padre): se vuelven a pedir los dos.
   */
  protected override afterWrite(): void {
    void this.catalog.load({ force: true });
    void this.loadCollections({ force: true });
  }
}
