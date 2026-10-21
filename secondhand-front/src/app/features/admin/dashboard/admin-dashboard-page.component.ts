import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../shared/ui/badge.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { PricePipe } from '../../../shared/utils/price.pipe';
import { ProductStatus, STATUS_LABELS, STATUS_TONES } from '../../products/models/product.model';
import { primaryImage } from '../../products/models/product.utils';
import { ProductsStore } from '../../products/store/products.store';
import { PLATFORM_MODULES } from '../admin-nav.config';
import { AdminThumbComponent } from '../components/admin-thumb/admin-thumb.component';

const STATUS_BAR: Record<ProductStatus, string> = {
  disponible: 'bg-emerald-600',
  reservado: 'bg-amber-500',
  vendido: 'bg-slate-500',
};

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0);

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    PricePipe,
    BadgeComponent,
    IconComponent,
    StatCardComponent,
    SkeletonComponent,
    ErrorStateComponent,
    AdminThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard-page.component.html',
})
export class AdminDashboardPageComponent implements OnInit {
  protected readonly store = inject(ProductsStore);

  protected readonly modules = PLATFORM_MODULES;
  protected readonly primaryImage = primaryImage;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  protected readonly error = computed(
    () =>
      this.store.collection('active').error() ??
      this.store.collection('inactive').error() ??
      this.store.collection('trash').error(),
  );

  /** Reparto del inventario completo (incluida la papelera) para la barra proporcional. */
  protected readonly inventorySplit = computed(() => {
    const { active, inactive, trashed } = this.store.stats();
    const total = active + inactive + trashed;
    return {
      active: pct(active, total),
      inactive: pct(inactive, total),
      trashed: pct(trashed, total),
      label: `Activos ${active}, inactivos ${inactive}, en papelera ${trashed}`,
    };
  });

  protected readonly statusRows = computed(() => {
    const rows = this.store.statusBreakdown();
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({ ...r, width: pct(r.count, max), bar: STATUS_BAR[r.key] }));
  });

  protected readonly categoryRows = computed(() => {
    const rows = this.store.categoryBreakdown();
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({ ...r, width: pct(r.count, max) }));
  });

  ngOnInit(): void {
    void this.store.loadDashboard();
  }

  protected retry(): void {
    void this.store.loadDashboard({ force: true });
  }
}
