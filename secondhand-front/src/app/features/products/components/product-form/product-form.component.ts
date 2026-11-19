import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ApiError, ApiFieldError, isAbortError } from '../../../../core/models/api-error.model';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { PriceRange } from '../../../assistant/models/assistant.model';
import { AssistantService } from '../../../assistant/services/assistant.service';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import { applyServerErrors } from '../../../../shared/utils/form-errors';
import { PRICE_PATTERN, greaterThan, notBlank, oneOf, uniqueField } from '../../../../shared/utils/validators';
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
    IconComponent,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly auth = inject(AuthStore);
  private readonly assistant = inject(AssistantService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly catalog = inject(CatalogStore);

  /** Solo el admin elige vendedor (publica o reasigna en nombre de otro); el resto vende a su nombre. */
  protected readonly canChooseSeller = this.auth.isAdmin;
  /** Sin select: al crear, tú; al editar, quien ya lo vendía. */
  protected readonly sellerName = computed(() => this.product()?.seller.name ?? this.auth.user()?.name ?? '');

  readonly product = input<Product | null>(null);
  readonly saving = input(false);
  readonly serverError = input<ApiError | null>(null);
  readonly cancelLink = input('/');
  /** Lista de variantes de solo lectura. El panel la oculta porque tiene su propio editor de variantes. */
  readonly showVariants = input(true);
  readonly submitted = output<ProductInput>();

  protected readonly conditions = PRODUCT_CONDITIONS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly conditionLevel = CONDITION_LEVEL;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  protected readonly submitAttempted = signal(false);
  protected readonly isEdit = computed(() => this.product() !== null);

  /** Errores del backend que no tienen un campo donde pintarse. */
  private readonly unplacedErrors = signal<readonly ApiFieldError[]>([]);

  /** El aviso general solo sale si queda algo que no se ha podido mostrar junto a un campo. */
  protected readonly generalError = computed(() => {
    const error = this.serverError();
    const items = this.unplacedErrors();
    if (!error || (error.errors.length > 0 && items.length === 0)) return null;
    return { message: error.message, items };
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
    images: this.fb.array<ImageGroup>([], [Validators.maxLength(5), uniqueField('url')]),
  });

  protected readonly f = this.form.controls;

  // ── Asistente de anuncio (IA): descripción sugerida y rango de precio. Nada se guarda sin que el vendedor lo
  // acepte: si la descripción está vacía se rellena; si ya tiene texto, la sugerencia espera a que elija.

  protected readonly drafting = signal(false);
  protected readonly draftError = signal<string | null>(null);
  /** Sugerencia pendiente de aceptar (solo cuando ya había una descripción escrita). */
  protected readonly suggestion = signal<string | null>(null);
  protected readonly priceHint = signal<{ range: PriceRange; categoryName: string } | null>(null);
  /** Para avisar a los lectores de pantalla cuando llega la sugerencia. */
  protected readonly draftStatus = signal('');
  private draftController: AbortController | null = null;
  /** Título, categoría y estado con los que se pidió el rango: si cambian, el rango ya no vale. */
  private draftKey = '';

  private readonly draftKeyOf = () => `${this.f.title.value.trim()}|${this.f.categoryId.value}|${this.f.condition.value}`;

  /** Lo que le falta al formulario para poder sugerir (o null si está todo). */
  protected draftMissing(): string | null {
    const missing = [
      this.f.title.invalid && 'el título',
      !this.f.categoryId.value && 'la categoría',
      !this.f.condition.value && 'el estado',
    ].filter(Boolean);
    return missing.length ? `Para sugerir una descripción, rellena ${missing.join(', ').replace(/, ([^,]*)$/, ' y $1')}.` : null;
  }

  protected async suggestDescription(): Promise<void> {
    const missing = this.draftMissing();
    if (missing) {
      this.draftError.set(missing);
      return;
    }
    this.draftController?.abort();
    const controller = new AbortController();
    this.draftController = controller;
    this.drafting.set(true);
    this.draftError.set(null);
    this.draftStatus.set('Preparando una sugerencia…');

    try {
      const draft = await this.assistant.draftListing(
        {
          title: this.f.title.value.trim(),
          categoryId: this.f.categoryId.value,
          condition: this.f.condition.value as ProductCondition,
          ...(this.product() ? { excludeSlug: this.product()!.slug } : {}),
        },
        controller.signal,
      );
      this.draftKey = this.draftKeyOf();
      this.priceHint.set(draft.priceRange ? { range: draft.priceRange, categoryName: draft.category.name } : null);
      if (this.f.description.value.trim()) {
        this.suggestion.set(draft.description);
        this.draftStatus.set('Sugerencia lista. Elige si sustituye a tu descripción.');
      } else {
        this.applyDescription(draft.description);
        this.draftStatus.set('Descripción sugerida añadida. Revísala antes de publicar.');
      }
    } catch (error) {
      if (isAbortError(error)) return;
      const apiError = error instanceof ApiError ? error : null;
      // Sin conexión: el servicio de IA está caído o no se llega a él (un timeout tiene su propio mensaje). El
      // resto del formulario sigue funcionando, porque publicar va a la API de la tienda.
      const message =
        apiError?.kind === 'network'
          ? 'El asistente no está disponible ahora mismo. Puedes escribir la descripción tú y publicar igualmente.'
          : (apiError?.errors[0]?.message ?? apiError?.message ?? 'No se ha podido preparar la sugerencia.');
      this.draftError.set(message);
      this.draftStatus.set('');
    } finally {
      if (this.draftController === controller) {
        this.drafting.set(false);
        this.draftController = null;
      }
    }
  }

  protected acceptSuggestion(): void {
    const text = this.suggestion();
    if (text) this.applyDescription(text);
    this.suggestion.set(null);
    this.focus('pf-description');
  }

  protected discardSuggestion(): void {
    this.suggestion.set(null);
    this.focus('pf-description');
  }

  private applyDescription(text: string): void {
    this.f.description.setValue(text);
    this.f.description.markAsDirty();
    this.f.description.markAsTouched();
  }

  ngOnInit(): void {
    // Si cambia el título, la categoría o el estado, el rango de precio que se enseña ya no es de este anuncio.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.priceHint() && this.draftKeyOf() !== this.draftKey) this.priceHint.set(null);
      if (this.draftError() && !this.draftMissing()) this.draftError.set(null);
    });
    this.destroyRef.onDestroy(() => this.draftController?.abort());

    void this.catalog.load();
    if (!this.canChooseSeller()) {
      this.f.sellerId.clearValidators();
      this.f.sellerId.updateValueAndValidity();
    }

    const product = this.product();
    if (!product) return;
    const input = productToInput(product);
    this.form.patchValue(input);
    input.images.forEach((image) => this.f.images.push(createImageGroup(this.fb, image)));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['serverError']) return;
    const errors = this.serverError()?.errors ?? [];
    const unplaced = applyServerErrors(this.form, errors);
    this.unplacedErrors.set(unplaced);
    const firstPlaced = errors.find((error) => !unplaced.includes(error));
    if (firstPlaced?.field) this.focusField(firstPlaced.field);
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
      // Sin `sellerId`, la API usa el de la sesión (y al editar no lo toca).
      ...(this.canChooseSeller() ? { sellerId: v.sellerId } : {}),
      images: v.images.map((image) => ({ url: image.url.trim(), alt: image.alt.trim() })),
    };
  }

  private focusFirstInvalid(): void {
    const name = FIELD_ORDER.find((field) => this.f[field].invalid);
    if (name) this.focusField(name);
  }

  /** Lleva el foco al campo de una ruta del formulario ("title", "images.0.url"…). */
  private focusField(path: string): void {
    const image = /^images\.(\d+)\.(url|alt)$/.exec(path);
    if (image) return this.focus(image[2] === 'url' ? `pf-image-${image[1]}` : `pf-image-alt-${image[1]}`);
    if (path === 'images') return this.focus('pf-add-image');
    if (path === 'condition') return this.focus('pf-condition-0');
    this.focus(`pf-${path}`);
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
