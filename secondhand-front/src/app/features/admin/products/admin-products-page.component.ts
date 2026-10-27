import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../shared/ui/level-meter.component';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { PricePipe } from '../../../shared/utils/price.pipe';
import {
  CONDITION_LABELS,
  CONDITION_LEVEL,
  Product,
  PRODUCT_STATUSES,
  ProductStatus,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../products/models/product.model';
import { primaryImage } from '../../products/models/product.utils';
import { STATUS_BY_VARIANT_STATUS } from '../../products/services/products.service';
import { ProductsStore } from '../../products/store/products.store';
import { prefersReducedMotion, rowLeave } from '../admin.animations';
import { AdminTabsComponent, sectionTabs } from '../components/admin-tabs/admin-tabs.component';
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
    AdminTabsComponent,
    AdminThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [rowLeave],
  templateUrl: './admin-products-page.component.html',
  styles: `
    .status-select {
      appearance: none;
      border-radius: 9999px;
      border: 1px solid;
      padding: 0.25rem 1.5rem 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.375rem center;
      background-size: 0.75rem;
    }
    .status-select:disabled {
      cursor: not-allowed;
      opacity: 0.7;
      background-image: none;
      padding-right: 0.625rem;
    }
    .status-disponible {
      background-color: #ecfdf5;
      border-color: rgb(5 150 105 / 0.25);
      color: #065f46;
    }
    .status-reservado {
      background-color: #fffbeb;
      border-color: rgb(217 119 6 / 0.3);
      color: #92400e;
    }
    .status-vendido {
      background-color: #f1f5f9;
      border-color: rgb(100 116 139 / 0.25);
      color: #334155;
    }
  `,
})
export class AdminProductsPageComponent implements OnChanges {
  protected readonly store = inject(ProductsStore);
  private readonly alert = inject(AlertService);

  /** Viene de `data.view` de la ruta gracias a withComponentInputBinding. */
  readonly view = input<ProductsView>('active');

  protected readonly primaryImage = primaryImage;
  protected readonly statuses = PRODUCT_STATUSES;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly reducedMotion = prefersReducedMotion();

  protected readonly isActiveView = computed(() => this.view() !== 'inactive');
  protected readonly list = computed(() => this.store.collection(this.isActiveView() ? 'active' : 'inactive'));
  protected readonly tabs = computed(() => sectionTabs('/admin/products', this.store.counts()));

  ngOnChanges(): void {
    // Las tres: la lista que se ve y los contadores de las otras dos pestañas.
    void this.store.loadCollections();
  }

  protected retry(): void {
    void this.store.loadCollection(this.isActiveView() ? 'active' : 'inactive', { force: true });
  }

  protected async toggle(product: Product, isActive: boolean): Promise<void> {
    try {
      await this.store.setActive(product, isActive);
      void this.alert.success(isActive ? `"${product.title}" vuelve a estar activo` : `"${product.title}" pasa a Inactivos`);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        void this.alert.error('Este producto está en la papelera. Restáuralo antes de activarlo.');
        // Nuestra caché estaba desfasada: se recargan las tres colecciones.
        void this.store.loadCollections({ force: true });
      }
    }
  }

  protected async changeStatus(product: Product, status: string): Promise<void> {
    if (status === product.status) return;
    try {
      await this.store.changeStatus(product, status as ProductStatus);
      void this.alert.success(`"${product.title}" pasa a ${STATUS_LABELS[status as ProductStatus]}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === STATUS_BY_VARIANT_STATUS) {
        void this.alert.error('Este producto tiene varias variantes: el estado se gestiona por variante.');
      }
    }
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Mover a la papelera?',
      text: `"${product.title}" dejará de verse en la tienda. Podrás restaurarlo desde la Papelera cuando quieras.`,
      confirmText: 'Mover a la papelera',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(product);
      void this.alert.success('Movido a la papelera');
    } catch {
      // El errorInterceptor ya ha mostrado el aviso.
    }
  }
}
