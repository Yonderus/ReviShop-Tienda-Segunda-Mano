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
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error.model';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import { PRICE_PATTERN, greaterThan, httpUrl, notBlank, oneOf, uniqueValues } from '../../../../shared/utils/validators';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONDITION_LEVEL,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  Product,
  ProductCategory,
  ProductCondition,
  ProductInput,
  ProductStatus,
  STATUS_LABELS,
} from '../../models/product.model';

/** La API acepta price ≥ 0; el front exige > 0 por requisito de negocio. */
export const PRICE_MIN_EXCLUSIVE = 0;
export const MAX_IMAGES = 5;

const FIELD_ORDER = ['title', 'description', 'price', 'category', 'condition', 'status', 'images', 'seller', 'location'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass, FormFieldErrorComponent, IconComponent, LevelMeterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly product = input<Product | null>(null);
  readonly saving = input(false);
  readonly serverError = input<ApiError | null>(null);
  readonly cancelLink = input('/');
  readonly submitted = output<ProductInput>();

  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly conditions = PRODUCT_CONDITIONS;
  protected readonly statuses = PRODUCT_STATUSES;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly maxImages = MAX_IMAGES;

  protected readonly submitAttempted = signal(false);
  protected readonly isEdit = computed(() => this.product() !== null);
  protected readonly generalError = computed(() => {
    const error = this.serverError();
    return error && !error.isConflict ? error : null;
  });

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', [Validators.required, notBlank, Validators.minLength(10), Validators.maxLength(2000)]],
    price: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.pattern(PRICE_PATTERN),
      greaterThan(PRICE_MIN_EXCLUSIVE),
    ]),
    category: this.fb.control<ProductCategory | ''>('', [Validators.required, oneOf(PRODUCT_CATEGORIES)]),
    condition: this.fb.control<ProductCondition | ''>('', [Validators.required, oneOf(PRODUCT_CONDITIONS)]),
    status: this.fb.control<ProductStatus>('disponible', [Validators.required, oneOf(PRODUCT_STATUSES)]),
    location: ['', [Validators.maxLength(100)]],
    seller: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(60)]],
    images: this.fb.array<FormControl<string>>([], [Validators.maxLength(MAX_IMAGES), uniqueValues]),
  });

  protected readonly f = this.form.controls;

  ngOnInit(): void {
    const product = this.product();
    if (!product) return;
    this.form.patchValue({
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      status: product.status,
      location: product.location ?? '',
      seller: product.seller,
    });
    product.images.slice(0, MAX_IMAGES).forEach((url) => this.addImage(url));
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

  protected showImageError(index: number): boolean {
    const control = this.f.images.at(index);
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected describedBy(name: string, hint = false): string {
    return [hint ? `pf-${name}-hint` : '', `pf-${name}-error`].filter(Boolean).join(' ');
  }

  protected addImage(url = ''): void {
    if (this.f.images.length >= MAX_IMAGES) return;
    this.f.images.push(this.fb.control(url, [Validators.required, httpUrl]));
    if (!url) setTimeout(() => this.focus(`pf-image-${this.f.images.length - 1}`));
  }

  protected removeImage(index: number): void {
    this.f.images.removeAt(index);
  }

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
    const input: ProductInput = {
      title: v.title.trim(),
      description: v.description.trim(),
      price: Number(v.price),
      category: v.category as ProductCategory,
      condition: v.condition as ProductCondition,
      location: v.location.trim() || undefined,
      seller: v.seller.trim(),
      images: v.images.map((url) => url.trim()).filter(Boolean),
    };
    if (this.isEdit()) input.status = v.status;
    return input;
  }

  private focusFirstInvalid(): void {
    const name = FIELD_ORDER.find((field) => this.f[field].invalid);
    if (!name) return;
    if (name === 'condition') return this.focus('pf-condition-0');
    if (name === 'images') {
      const index = this.f.images.controls.findIndex((c) => c.invalid);
      return this.focus(index >= 0 ? `pf-image-${index}` : 'pf-add-image');
    }
    this.focus(`pf-${name}`);
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
