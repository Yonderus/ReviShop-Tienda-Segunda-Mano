import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../shared/ui/level-meter.component';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { PricePipe } from '../../../shared/utils/price.pipe';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONDITION_LEVEL,
  Product,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../products/models/product.model';
import { ProductsStore } from '../../products/store/products.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminThumbComponent } from '../components/admin-thumb/admin-thumb.component';

export type ProductsView = 'active' | 'inactive';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PricePipe,
    BadgeComponent,
    IconComponent,
    LevelMeterComponent,
    ToggleSwitchComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    AdminThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  templateUrl: './admin-products-page.component.html',
  styles: `
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: -1px;
      padding: 0.625rem 0.75rem;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgb(var(--color-ink-muted));
      transition: color 150ms ease-out, border-color 150ms ease-out;
    }
    .tab:hover {
      color: rgb(var(--color-ink));
    }
    .tab.is-current {
      color: rgb(var(--color-primary-700));
      border-color: rgb(var(--color-primary-600));
    }
    .tab-count {
      border-radius: 9999px;
      background: rgb(var(--color-canvas));
      padding: 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: rgb(var(--color-ink-muted));
    }
    .tab.is-current .tab-count {
      background: rgb(var(--color-primary-50));
      color: rgb(var(--color-primary-700));
    }
  `,
})
export class AdminProductsPageComponent implements OnChanges {
  protected readonly store = inject(ProductsStore);
  private readonly notification = inject(NotificationService);

  /** Viene de `data.view` de la ruta gracias a withComponentInputBinding. */
  readonly view = input<ProductsView>('active');

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly reducedMotion = prefersReducedMotion();

  protected readonly isActiveView = computed(() => this.view() !== 'inactive');
  protected readonly list = computed(() => this.store.collection(this.isActiveView() ? 'active' : 'inactive'));
  protected readonly activeCount = computed(() => this.store.products().length);
  protected readonly inactiveCount = computed(() => this.store.inactiveProducts().length);
  protected readonly countsReady = computed(
    () => this.store.collection('active').loaded() && this.store.collection('inactive').loaded(),
  );

  ngOnChanges(): void {
    void this.store.loadCollection('active');
    void this.store.loadCollection('inactive');
  }

  protected retry(): void {
    void this.store.loadCollection(this.isActiveView() ? 'active' : 'inactive', { force: true });
  }

  protected async toggle(product: Product, isActive: boolean): Promise<void> {
    try {
      await this.store.setActive(product, isActive);
      void this.notification.success(isActive ? `"${product.title}" vuelve a estar activo` : `"${product.title}" pasa a Inactivos`);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        void this.notification.error('Este producto está en la papelera. Restáuralo antes de activarlo.');
        // Nuestra caché estaba desfasada: se recargan las tres colecciones.
        void this.store.loadDashboard({ force: true });
      }
    }
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: '¿Mover a la papelera?',
      text: `"${product.title}" dejará de verse en la tienda. Podrás restaurarlo desde la Papelera cuando quieras.`,
      confirmText: 'Mover a la papelera',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(product);
      void this.notification.success('Movido a la papelera');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso.
    }
  }
}
