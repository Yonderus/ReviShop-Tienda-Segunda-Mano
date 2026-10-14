import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PricePipe } from '../../../shared/utils/price.pipe';
import { RelativeTimePipe } from '../../../shared/utils/relative-time.pipe';
import { CATEGORY_LABELS, Product } from '../../products/models/product.model';
import { ProductsStore } from '../../products/store/products.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminThumbComponent } from '../components/admin-thumb/admin-thumb.component';

@Component({
  selector: 'app-admin-trash-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PricePipe,
    RelativeTimePipe,
    IconComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    AdminThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  template: `
    <div class="mx-auto max-w-5xl" [@.disabled]="reducedMotion">
      <header class="mb-5">
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Papelera</h1>
        <p class="mt-1 max-w-2xl text-sm text-ink-muted">
          Productos borrados con soft delete. No aparecen en la tienda ni en las listas, pero no se pierden:
          restáuralos como activos o como inactivos.
        </p>
      </header>

      @if (trash.loading() && !trash.loaded()) {
        <app-skeleton variant="table" [count]="4" label="Cargando papelera…" />
      } @else if (trash.error()) {
        <app-error-state title="No hemos podido cargar la papelera" [error]="trash.error()" (retry)="retry()" />
      } @else if (trash.items().length === 0) {
        <app-empty-state icon="trash" title="La papelera está vacía" message="Cuando borres un producto aparecerá aquí y podrás recuperarlo.">
          <a routerLink="/admin/products" class="btn btn-secondary">Ir a productos</a>
        </app-empty-state>
      } @else {
        <ul class="space-y-3" aria-label="Productos en la papelera">
          @for (product of trash.items(); track product._id) {
            <li @rowLeave class="retired rounded-2xl border border-slate-400 bg-surface p-4 sm:p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-start gap-3">
                  <app-admin-thumb class="retired-dim" [src]="product.images[0]" [title]="product.title" />
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-medium text-ink">{{ product.title }}</p>
                      <span class="retired-tag text-slate-600">
                        <app-icon name="trash" [size]="12" />
                        En papelera
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-ink-muted">
                      {{ categoryLabels[product.category] }} · {{ product.seller }} ·
                      <span class="retired-dim line-through decoration-slate-400 tabular-nums">{{ product.price | price }}</span>
                    </p>
                    <p class="mt-1 text-xs font-medium text-slate-700">
                      Eliminado
                      <time [attr.datetime]="product.deletedAt" [title]="product.deletedAt | date: 'd MMMM y, HH:mm'">
                        {{ product.deletedAt | relativeTime }}
                      </time>
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    class="btn btn-primary min-h-9 px-3"
                    [disabled]="store.pendingIds().has(product._id)"
                    (click)="restore(product, true)"
                  >
                    <app-icon name="restore" [size]="17" />
                    Restaurar como activo
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary min-h-9 px-3"
                    [disabled]="store.pendingIds().has(product._id)"
                    (click)="restore(product, false)"
                  >
                    Como inactivo
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>
        <p class="mt-4 text-xs text-ink-muted">No hay borrado definitivo: la API solo permite restaurar.</p>
      }
    </div>
  `,
})
export class AdminTrashPageComponent implements OnInit {
  protected readonly store = inject(ProductsStore);
  private readonly notification = inject(NotificationService);

  protected readonly trash = this.store.collection('trash');
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly reducedMotion = prefersReducedMotion();

  ngOnInit(): void {
    void this.store.loadCollection('trash');
  }

  protected retry(): void {
    void this.store.loadCollection('trash', { force: true });
  }

  protected async restore(product: Product, isActive: boolean): Promise<void> {
    try {
      await this.store.restore(product, isActive);
      void this.notification.success(`"${product.title}" restaurado como ${isActive ? 'activo' : 'inactivo'}`);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        void this.notification.error('Este producto ya no está en la papelera. Hemos actualizado la lista.');
        this.retry();
      }
    }
  }
}
