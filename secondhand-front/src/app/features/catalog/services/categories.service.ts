import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly api = inject(ApiService);

  list(): Promise<Category[]> {
    return this.api.get<Category[]>('/categories', { skipErrorAlert: true, skipGlobalLoader: true });
  }
}
