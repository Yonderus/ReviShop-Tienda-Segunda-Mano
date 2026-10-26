import { DatePipe } from '@angular/common';
import { PricePipe } from '../../../../shared/utils/price.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { APP_NAME } from '../../../../core/config/app.constants';
import { AlertService } from '../../../../core/services/alert.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageNotFoundComponent } from '../../../../shared/components/page-not-found/page-not-found.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import { ProductGalleryComponent } from '../../components/product-gallery/product-gallery.component';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { ProductVariantPickerComponent } from '../../components/product-variant-picker/product-variant-picker.component';
import { ProductVariant } from '../../models/product-variant.model';
import { variantPrice } from '../../models/product.utils';
import {
  CONDITION_LABELS,
  CONDITION_LEVEL,
  Product,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../models/product.model';
import { ProductsStore } from '../../store/products.store';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    PricePipe,
    BadgeComponent,
    IconComponent,
    LevelMeterComponent,
    ProductImageComponent,
    ProductGalleryComponent,
    ProductVariantPickerComponent,
    SkeletonComponent,
    ErrorStateComponent,
    PageNotFoundComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail-page.component.html',
})
export class ProductDetailPageComponent implements OnChanges, OnDestroy {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly alert = inject(AlertService);

  readonly slug = input.required<string>();

  protected readonly activeImage = signal(0);
  protected readonly selectedVariantId = signal<string | null>(null);
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  protected readonly product = this.store.selected;

  /** La foto visible; el índice puede quedar fuera de rango al cambiar de producto. */
  protected readonly activePhoto = computed(() => this.product()?.images[this.activeImage()]);

  protected readonly variants = computed(() => (this.product()?.variants ?? []).filter((v) => v.isActive));
  protected readonly hasVariants = computed(() => this.variants().length > 1);

  /** La elegida, o la primera disponible, o la primera. */
  protected readonly selectedVariant = computed<ProductVariant | undefined>(() => {
    const variants = this.variants();
    const id = this.selectedVariantId();
    return (
      variants.find((v) => v._id === id) ?? variants.find((v) => v.status === 'disponible') ?? variants[0]
    );
  });

  protected readonly currentPrice = computed(() => {
    const product = this.product();
    const variant = this.selectedVariant();
    if (!product) return 0;
    return variant ? variantPrice(product, variant) : product.basePrice;
  });

  protected readonly currentStatus = computed(() => this.selectedVariant()?.status ?? this.product()?.status ?? 'disponible');
  protected readonly conditionLevel = computed(() => {
    const product = this.product();
    return product ? CONDITION_LEVEL[product.condition] : 0;
  });

  ngOnChanges(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.store.clearSelected();
  }

  protected async load(): Promise<void> {
    this.activeImage.set(0);
    this.selectedVariantId.set(null);
    const product = await this.store.loadBySlug(this.slug());
    if (product) this.title.setTitle(`${product.title} · ${APP_NAME}`);
  }

  protected selectVariant(variant: ProductVariant): void {
    this.selectedVariantId.set(variant._id);
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Retirar este anuncio?',
      text: `"${product.title}" dejará de mostrarse en el catálogo.`,
      confirmText: 'Sí, retirar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.store.remove(product);
      void this.alert.success('Anuncio retirado');
      void this.router.navigate(['/']);
    } catch {
      // El errorInterceptor ya ha mostrado el aviso al usuario.
    }
  }
}
