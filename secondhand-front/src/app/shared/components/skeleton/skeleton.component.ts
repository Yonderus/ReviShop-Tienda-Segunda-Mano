import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

const BONE = { 'background-color': 'rgb(226 232 240)', margin: '0', 'border-radius': '0.5rem', display: 'block' };
const bone = (width: string, height: string) => ({ ...BONE, width, height });

const BONES = {
  tag: bone('35%', '0.75rem'),
  title: bone('85%', '1rem'),
  meta: bone('50%', '0.75rem'),
  price: bone('5rem', '1.5rem'),
  actions: bone('4.5rem', '2.25rem'),
  badge: bone('30%', '1.5rem'),
  heading: bone('90%', '2.25rem'),
  amount: bone('40%', '2.5rem'),
  facts: bone('100%', '5rem'),
  text: bone('100%', '7rem'),
  thumb: bone('2.75rem', '2.75rem'),
  cellWide: bone('70%', '0.875rem'),
  cellNarrow: bone('40%', '0.75rem'),
  cell: bone('4.5rem', '0.875rem'),
  toggle: bone('6rem', '1.5rem'),
  statLabel: bone('55%', '0.875rem'),
  statValue: bone('40%', '2.25rem'),
  label: bone('25%', '0.875rem'),
  field: bone('100%', '2.75rem'),
  area: bone('100%', '7.5rem'),
};

/** Replica las dimensiones reales de la card y del detalle para evitar saltos de layout. */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [NgxSkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite">
      <span class="sr-only">{{ label() }}</span>
      @if (variant() === 'cards') {
        <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
          @for (i of items(); track i) {
            <li class="overflow-hidden rounded-2xl border border-line bg-surface">
              <div class="aspect-[4/3]">
                <ngx-skeleton-loader class="block h-full" [theme]="fill" animation="pulse" />
              </div>
              <div class="space-y-3 p-4">
                <ngx-skeleton-loader [theme]="bones.tag" animation="pulse" />
                <ngx-skeleton-loader [theme]="bones.title" animation="pulse" />
                <ngx-skeleton-loader [theme]="bones.meta" animation="pulse" />
                <div class="flex items-center justify-between pt-2">
                  <ngx-skeleton-loader [theme]="bones.price" animation="pulse" />
                  <ngx-skeleton-loader [theme]="bones.actions" animation="pulse" />
                </div>
              </div>
            </li>
          }
        </ul>
      } @else if (variant() === 'table') {
        <ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
          @for (i of items(); track i) {
            <li class="flex h-16 items-center gap-4 px-4">
              <ngx-skeleton-loader [theme]="bones.thumb" animation="pulse" />
              <div class="flex-1 space-y-2">
                <ngx-skeleton-loader [theme]="bones.cellWide" animation="pulse" />
                <ngx-skeleton-loader [theme]="bones.cellNarrow" animation="pulse" />
              </div>
              <div class="hidden w-24 md:block"><ngx-skeleton-loader [theme]="bones.cell" animation="pulse" /></div>
              <div class="hidden w-24 lg:block"><ngx-skeleton-loader [theme]="bones.cell" animation="pulse" /></div>
              <ngx-skeleton-loader [theme]="bones.toggle" animation="pulse" />
            </li>
          }
        </ul>
      } @else if (variant() === 'stats') {
        <div class="grid grid-cols-2 divide-line rounded-2xl border border-line bg-surface lg:grid-cols-4 lg:divide-x" aria-hidden="true">
          @for (i of items(); track i) {
            <div class="space-y-3 p-5">
              <ngx-skeleton-loader [theme]="bones.statLabel" animation="pulse" />
              <ngx-skeleton-loader [theme]="bones.statValue" animation="pulse" />
            </div>
          }
        </div>
      } @else if (variant() === 'form') {
        <div class="space-y-6 rounded-2xl border border-line bg-surface p-6" aria-hidden="true">
          @for (i of items(); track i) {
            <div class="space-y-2">
              <ngx-skeleton-loader [theme]="bones.label" animation="pulse" />
              <ngx-skeleton-loader [theme]="i === 1 ? bones.area : bones.field" animation="pulse" />
            </div>
          }
        </div>
      } @else {
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12" aria-hidden="true">
          <div class="aspect-[4/3] overflow-hidden rounded-2xl">
            <ngx-skeleton-loader class="block h-full" [theme]="fill" animation="pulse" />
          </div>
          <div class="space-y-4">
            <ngx-skeleton-loader [theme]="bones.badge" animation="pulse" />
            <ngx-skeleton-loader [theme]="bones.heading" animation="pulse" />
            <ngx-skeleton-loader [theme]="bones.amount" animation="pulse" />
            <ngx-skeleton-loader [theme]="bones.facts" animation="pulse" />
            <ngx-skeleton-loader [theme]="bones.text" animation="pulse" />
          </div>
        </div>
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly variant = input<'cards' | 'detail' | 'table' | 'stats' | 'form'>('cards');
  readonly count = input(8);
  readonly label = input('Cargando…');

  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
  protected readonly fill = { ...BONE, width: '100%', height: '100%', 'border-radius': '0' };
  protected readonly bones = BONES;
}
