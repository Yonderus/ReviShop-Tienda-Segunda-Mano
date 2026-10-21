import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error.model';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import { PRICE_PATTERN, greaterThan, notBlank, oneOf } from '../../../../shared/utils/validators';
import { CatalogStore } from '../../../catalog/store/catalog.store';
import {
  CONDITION_LABELS,
  CONDITION_LEVEL,
  PRODUCT_CONDITIONS,
  Product,
  ProductCondition,
  ProductInput,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../models/product.model';
import { ProductVariant } from '../../models/product-variant.model';
import { productToInput, variantLabel, variantPrice } from '../../models/product.utils';
import { ImageGroup, ProductImagesFieldComponent, createImageGroup } from '../product-images-field/product-images-field.component';

/** La API acepta basePrice ≥ 0; el front exige > 0 por requisito de negocio. */
export const PRICE_MIN_EXCLUSIVE = 0;

const FIELD_ORDER = ['title', 'description', 'basePrice', 'categoryId', 'sellerId', 'condition', 'location'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgClass,
    FormFieldErrorComponent,
    SkeletonComponent,
    ErrorStateComponent,
    BadgeComponent,
    LevelMeterComponent,
    ProductImagesFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly catalog = inject(CatalogStore);

  readonly product = input<Product | null>(null);
  readonly saving = input(false);
  readonly serverError = input<ApiError | null>(null);
  readonly cancelLink = input('/');
  readonly submitted = output<ProductInput>();

  protected readonly conditions = PRODUCT_CONDITIONS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  protected readonly submitAttempted = signal(false);
  protected readonly isEdit = computed(() => this.product() !== null);
  protected readonly generalError = computed(() => {
    const error = this.serverError();
    return error && !error.isConflict ? error : null;
  });

  /** Variantes reales (edición): no hay CRUD de variantes, solo se muestran de forma informativa. */
  protected readonly variants = computed(() => this.product()?.variants ?? []);
  protected readonly hasMultipleVariants = computed(() => this.variants().length > 1);

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', [Validators.required, notBlank, Validators.minLength(10), Validators.maxLength(2000)]],
    basePrice: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.pattern(PRICE_PATTERN),
      greaterThan(PRICE_MIN_EXCLUSIVE),
    ]),
    categoryId: ['', [Validators.required]],
    sellerId: ['', [Validators.required]],
    condition: this.fb.control<ProductCondition | ''>('', [Validators.required, oneOf(PRODUCT_CONDITIONS)]),
    location: ['', [Validators.maxLength(100)]],
    images: this.fb.array<ImageGroup>([], [Validators.maxLength(5)]),
  });

  protected readonly f = this.form.controls;

  ngOnInit(): void {
    void this.catalog.load();

    const product = this.product();
    if (!product) return;
    const input = productToInput(product);
    this.form.patchValue(input);
    input.images.forEach((image) => this.f.images.push(createImageGroup(this.fb, image)));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverError'] && this.serverError()?.isConflict) {
      this.f.title.setErrors({ ...this.f.title.errors, duplicate: true });
      this.f.title.markAsTouched();
      this.focus('pf-title');
    }
  }

  protected showError(name: FieldName): boolean {
    const control = this.f[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected describedBy(name: string, hint = false): string {
    return [hint ? `pf-${name}-hint` : '', `pf-${name}-error`].filter(Boolean).join(' ');
  }

  protected priceOf(variant: ProductVariant): number {
    const product = this.product();
    return product ? variantPrice(product, variant) : 0;
  }

  protected readonly variantLabel = variantLabel;

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    this.submitted.emit(this.toInput());
  }

  private toInput(): ProductInput {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      description: v.description.trim(),
      basePrice: Number(v.basePrice),
      condition: v.condition as ProductCondition,
      location: v.location.trim() || undefined,
      categoryId: v.categoryId,
      sellerId: v.sellerId,
      images: v.images.map((image) => ({ url: image.url.trim(), alt: image.alt.trim() })),
    };
  }

  private focusFirstInvalid(): void {
    const name = FIELD_ORDER.find((field) => this.f[field].invalid);
    if (!name) return;
    if (name === 'condition') return this.focus('pf-condition-0');
    this.focus(`pf-${name}`);
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
