import { Injectable } from '@angular/core';
import { EntityApiService, READ_OPTIONS } from '../../../core/services/entity-api.service';
import { AdminCategory, Category, CategoryInput } from '../models/category.model';

/** Los endpoints del panel vienen de EntityApiService; `list` es el público (solo publicadas y activas). */
@Injectable({ providedIn: 'root' })
export class CategoriesService extends EntityApiService<AdminCategory, CategoryInput> {
  protected readonly path = '/categories';

  list(): Promise<Category[]> {
    return this.api.get<Category[]>(this.path, READ_OPTIONS);
  }
}
