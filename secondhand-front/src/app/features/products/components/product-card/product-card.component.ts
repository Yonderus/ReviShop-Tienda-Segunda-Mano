import { PricePipe } from '../../../../shared/utils/price.pipe';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { LevelMeterComponent } from '../../../../shared/ui/level-meter.component';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONDITION_LEVEL,
  Product,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../models/product.model';
import { ProductImageComponent } from '../product-image/product-image.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, PricePipe, BadgeComponent, IconComponent, LevelMeterComponent, ProductImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article
      class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lift focus-within:border-primary-200"
      [class.opacity-60]="deleting()"
    >
      <app-product-image
        class="aspect-[4/3]"
        [src]="product().images[0]"
        [alt]="product().title"
        [priority]="priority()"
        [style.view-transition-name]="'product-' + product()._id"
      />
      <div class="absolute left-3 top-3">
        <app-badge [tone]="statusTones[product().status]">{{ statusLabels[product().status] }}</app-badge>
      </div>

      <div class="flex flex-1 flex-col p-4">
        <h3 class="line-clamp-2 text-[0.9875rem] font-semibold leading-snug text-ink">
          <a [routerLink]="link()" class="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary-500 focus-visible:after:ring-offset-2">
            {{ product().title }}
          </a>
        </h3>

        <app-level-meter
          class="mt-2.5"
          [value]="conditionLevel()"
          [label]="conditionLabels[product().condition]"
          caption="Condición"
        />

        <p class="mt-2 truncate text-sm text-ink-muted">
          {{ categoryLabels[product().category] }}@if (product().location) { · {{ product().location }}}
        </p>

        <div class="mt-auto flex items-end justify-between gap-2 pt-4">
          <p class="rounded-lg bg-accent-soft px-2 py-0.5 text-lg font-bold tabular-nums tracking-tight text-accent-strong">
            {{ product().price | price }}
          </p>
          <div class="relative z-10 flex gap-1">
            <a
              [routerLink]="[link(), 'edit']"
              class="icon-btn"
              [attr.aria-label]="'Editar ' + product().title"
              title="Editar"
            >
              <app-icon name="pencil" [size]="18" />
            </a>
            <button
              type="button"
              class="icon-btn hover:!bg-red-50 hover:!text-red-700"
              [attr.aria-label]="'Eliminar ' + product().title"
              title="Eliminar"
              [disabled]="deleting()"
              (click)="remove.emit(product())"
            >
              <app-icon name="trash" [size]="18" />
            </button>
          </div>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly deleting = input(false);
  readonly priority = input(false);
  readonly remove = output<Product>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly conditionLabels = CONDITION_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;

  protected readonly link = computed(() => `/products/${this.product().slug}`);
  protected readonly conditionLevel = computed(() => CONDITION_LEVEL[this.product().condition]);
}
