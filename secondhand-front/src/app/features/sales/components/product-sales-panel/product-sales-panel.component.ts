import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnChanges, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PendingStore } from '../../../../core/activity/pending.store';
import { ApiError, toApiError } from '../../../../core/models/api-error.model';
import { AlertService } from '../../../../core/services/alert.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ProductVariant } from '../../../products/models/product-variant.model';
import { Product, STATUS_LABELS, STATUS_TONES } from '../../../products/models/product.model';
import { variantLabel } from '../../../products/models/product.utils';
import { SALE_STATE_LABELS, SALE_STATE_TONES, Sale, isLiveSale } from '../../models/sale.model';
import { SalesService } from '../../services/sales.service';

/** Una fila: la variante y su venta viva (pendiente o confirmada), si la tiene. */
interface VariantRow {
  variant: ProductVariant;
  label: string;
  sale: Sale | null;
}

/**
 * Ventas de un anuncio, en su ficha de gestión (solo para su vendedor). Por cada variante:
 * - sin venta: «Registrar venta», que pide el email del comprador;
 * - pendiente: a quién, hasta cuándo puede confirmarla y «Cancelar»;
 * - confirmada: a quién se vendió.
 *
 * Al registrar o cancelar cambia el estado de la variante (lo hace la API): se avisa con `changed` para que la página
 * recargue el producto.
 */
@Component({
  selector: 'app-product-sales-panel',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, BadgeComponent, IconComponent, FormFieldErrorComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block scroll-mt-24' },
  template: `
    <section id="ventas" class="mt-8 scroll-mt-24 border-t border-line pt-6" aria-labelledby="sales-title">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="sales-title" class="text-base font-semibold text-ink">Ventas</h2>
        <a routerLink="/activity" [queryParams]="{ tab: 'ventas' }" class="text-sm font-medium text-primary-700 hover:underline">Ver todas en Mi actividad</a>
      </div>
      <p class="mt-1 text-sm text-ink-muted">
        Cuando vendas algo, regístralo con el email de la cuenta del comprador: al confirmarlo, podréis valoraros.
      </p>

      @if (loadError(); as error) {
        <app-error-state title="No hemos podido cargar las ventas" [error]="error" (retry)="load()" />
      } @else if (!loaded()) {
        <p class="mt-4 text-sm text-ink-muted" role="status">Cargando las ventas…</p>
      } @else {
        <ul class="mt-4 space-y-3">
          @for (row of rows(); track row.variant._id) {
            <li class="rounded-2xl border border-line bg-surface p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-ink">{{ row.label }}</p>
                <app-badge [tone]="statusTones[row.variant.status]">{{ statusLabels[row.variant.status] }}</app-badge>
                @if (row.sale; as sale) {
                  <app-badge [tone]="saleTones[sale.status]">Venta {{ saleLabels[sale.status].toLowerCase() }}</app-badge>
                }
              </div>

              @if (row.sale; as sale) {
                @if (sale.status === 'pending') {
                  <p class="mt-2 text-sm text-ink">
                    Esperando a que <span class="font-semibold">{{ sale.buyer?.name }}</span> confirme la compra.
                    Tiene hasta el <time [attr.datetime]="sale.expiresAt">{{ sale.expiresAt | date: "d 'de' MMMM" : undefined : 'es-ES' }}</time>.
                  </p>
                  @if (sale.can.cancel) {
                    <button type="button" class="btn btn-secondary mt-3 min-h-9 px-3 text-sm" [disabled]="busyId() === sale._id" (click)="cancel(sale)">
                      {{ busyId() === sale._id ? 'Cancelando…' : 'Cancelar la venta' }}
                    </button>
                  }
                } @else {
                  <p class="mt-2 text-sm text-ink">
                    Vendida a <span class="font-semibold">{{ sale.buyer?.name }}</span>, que lo confirmó el
                    <time [attr.datetime]="sale.confirmedAt">{{ sale.confirmedAt | date: "d 'de' MMMM" : undefined : 'es-ES' }}</time>.
                  </p>
                }
              } @else if (openId() === row.variant._id) {
                <form [formGroup]="form" (ngSubmit)="register(row.variant)" novalidate class="mt-3">
                  <label [for]="'buyer-' + row.variant._id" class="field-label">Email de la cuenta del comprador</label>
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <input
                      #emailInput
                      [id]="'buyer-' + row.variant._id"
                      type="email"
                      autocomplete="off"
                      inputmode="email"
                      formControlName="buyerEmail"
                      class="field-control sm:flex-1"
                      placeholder="comprador@ejemplo.com"
                      [attr.aria-invalid]="showEmailError() || !!serverError()"
                      [attr.aria-describedby]="'buyer-hint-' + row.variant._id + ' buyer-error-' + row.variant._id"
                    />
                    <div class="flex gap-2">
                      <button type="submit" class="btn btn-primary min-h-11 flex-1 sm:flex-none" [disabled]="saving()">
                        {{ saving() ? 'Registrando…' : 'Registrar' }}
                      </button>
                      <button type="button" class="btn btn-secondary min-h-11" [disabled]="saving()" (click)="closeForm()">Cancelar</button>
                    </div>
                  </div>
                  <p [id]="'buyer-hint-' + row.variant._id" class="mt-1.5 text-xs text-ink-muted">
                    La variante pasará a «Vendido». El comprador tendrá 7 días para confirmarlo.
                  </p>
                  <app-form-field-error
                    [errorId]="'buyer-error-' + row.variant._id"
                    [errors]="form.controls.buyerEmail.errors"
                    [show]="showEmailError()"
                    label="El email del comprador"
                  />
                  @if (serverError(); as message) {
                    <p class="mt-1.5 text-sm font-medium text-red-700" role="alert">{{ message }}</p>
                  }
                </form>
              } @else {
                <button type="button" class="btn btn-secondary mt-3 min-h-9 px-3 text-sm" (click)="openForm(row.variant)">
                  <app-icon name="checkCircle" [size]="16" />
                  Registrar venta
                </button>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class ProductSalesPanelComponent implements OnChanges {
  private readonly sales = inject(SalesService);
  private readonly pending = inject(PendingStore);
  private readonly alert = inject(AlertService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly product = input.required<Product>();
  /** Ha cambiado el estado de una variante: la página recarga el producto. */
  readonly changed = output<void>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly saleLabels = SALE_STATE_LABELS;
  protected readonly saleTones = SALE_STATE_TONES;

  private readonly liveSales = signal<Sale[]>([]);
  protected readonly loaded = signal(false);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly openId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly serverError = signal<string | null>(null);
  private readonly submitted = signal(false);
  private loadedFor: string | null = null;

  protected readonly form = this.fb.group({ buyerEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]] });

  protected readonly rows = computed<VariantRow[]>(() =>
    (this.product().variants ?? []).map((variant) => ({
      variant,
      label: variantLabel(variant),
      sale: this.liveSales().find((sale) => sale.variantId === variant._id) ?? null,
    })),
  );

  ngOnChanges(): void {
    // Al recargar el producto (tras una venta) llega otro objeto del mismo producto: las ventas ya están al día.
    if (this.loadedFor !== this.product()._id) void this.load();
  }

  protected showEmailError(): boolean {
    const control = this.form.controls.buyerEmail;
    return control.invalid && (control.touched || this.submitted());
  }

  /** Las vivas del producto: pendientes y confirmadas (una venta ya cerrada no ocupa la variante). */
  protected async load(): Promise<void> {
    const productId = this.product()._id;
    this.loadError.set(null);
    try {
      const page = await this.sales.mine({ as: 'seller', productId, limit: 50 });
      this.liveSales.set(page.items.filter(isLiveSale));
      const firstLoad = this.loadedFor === null;
      this.loadedFor = productId;
      this.loaded.set(true);
      // «Registrar venta» de la ficha pública trae aquí con #ventas. El router baja al fragmento al terminar la
      // navegación, pero entonces esta sección aún no existía (se pinta cuando llega el producto): se baja ahora.
      if (firstLoad && location.hash === '#ventas') {
        setTimeout(() => this.host.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    } catch (error) {
      this.loadError.set(toApiError(error));
    }
  }

  protected openForm(variant: ProductVariant): void {
    this.form.reset();
    this.submitted.set(false);
    this.serverError.set(null);
    this.openId.set(variant._id);
    // Cuando ya se ha pintado el formulario: el foco va al campo.
    setTimeout(() => this.emailInput()?.nativeElement.focus());
  }

  protected closeForm(): void {
    this.openId.set(null);
  }

  protected async register(variant: ProductVariant): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) {
      this.emailInput()?.nativeElement.focus();
      return;
    }

    this.saving.set(true);
    try {
      const sale = await this.sales.register(variant._id, this.form.getRawValue().buyerEmail.trim());
      this.liveSales.update((list) => [sale, ...list]);
      this.openId.set(null);
      void this.alert.success(`Venta registrada. ${sale.buyer?.name ?? 'El comprador'} tiene que confirmarla.`);
      this.changed.emit();
    } catch (error) {
      // 422 (el email) y 409 (ya tiene una venta) se pintan aquí; el resto ya lo ha avisado el errorInterceptor.
      const apiError = toApiError(error);
      if (apiError.status === 422 || apiError.status === 409) {
        this.serverError.set(apiError.errors[0]?.message ?? apiError.message);
        this.emailInput()?.nativeElement.focus();
        if (apiError.status === 409) void this.load();
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancel(sale: Sale): Promise<void> {
    const confirmed = await this.alert.confirm({
      title: '¿Cancelar la venta?',
      text: `${sale.buyer?.name ?? 'El comprador'} ya no podrá confirmarla y la variante volverá al estado que tenía.`,
      confirmText: 'Cancelar la venta',
      cancelText: 'Volver',
      danger: true,
    });
    if (!confirmed) return;

    this.busyId.set(sale._id);
    try {
      await this.sales.cancel(sale._id);
      this.liveSales.update((list) => list.filter((item) => item._id !== sale._id));
      void this.alert.success('Venta cancelada');
      this.changed.emit();
    } catch {
      // El errorInterceptor ya ha avisado (p. ej. 409: el comprador la confirmó justo antes). Se recarga para verlo.
      void this.load();
    } finally {
      this.busyId.set(null);
      void this.pending.refresh();
    }
  }
}
