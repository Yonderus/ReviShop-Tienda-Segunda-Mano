import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { CategoryInput } from '../../catalog/models/category.model';
import { CategoriesStore } from '../../catalog/store/categories.store';
import { CategoryFormComponent } from './category-form.component';

@Component({
  selector: 'app-admin-category-create-page',
  standalone: true,
  imports: [CategoryFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">Nueva categoría</h1>
      <p class="mt-1 text-sm text-ink-muted">Nace como borrador salvo que la publiques: así puedes prepararla antes de que salga en la tienda.</p>
      <div class="mt-6">
        <app-category-form
          [categories]="store.liveCategories()"
          [saving]="store.saving()"
          [serverError]="serverError()"
          (submitted)="create($event)"
        />
      </div>
    </div>
  `,
})
export class AdminCategoryCreatePageComponent implements OnInit {
  protected readonly store = inject(CategoriesStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  protected readonly serverError = signal<ApiError | null>(null);

  ngOnInit(): void {
    // Para el select de categoría padre.
    void this.store.loadCollections();
  }

  protected async create(input: CategoryInput): Promise<void> {
    this.serverError.set(null);
    try {
      const category = await this.store.create(input);
      void this.alert.success(`"${category.name}" creada${category.status === 'draft' ? ' como borrador' : ''}`);
      void this.router.navigate(['/admin/categories']);
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
