import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  afterRender,
  contentChild,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../ui/icon.component';

/**
 * Carrusel genérico: una fila con scroll horizontal (`scroll-snap`), botones anterior/siguiente que se
 * deshabilitan en los extremos y la card que se quiera, como plantilla:
 *
 *   <app-carousel label="Categorías" [items]="categorias()">
 *     <ng-template let-item><app-category-card [category]="item" /></ng-template>
 *   </app-carousel>
 *
 * Con teclado: la fila recibe el foco y se mueve con las flechas (scroll nativo); los botones también.
 */
@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgTemplateOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-roledescription="carrusel" [attr.aria-label]="label()">
      <div class="mb-4 flex items-end justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-xl font-semibold tracking-tight text-ink">{{ label() }}</h2>
          @if (subtitle()) {
            <p class="mt-1 text-sm text-ink-muted">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <ng-content select="[carousel-actions]" />
          <button type="button" class="icon-btn" [disabled]="!canPrev()" [attr.aria-label]="'Anteriores: ' + label()" (click)="scroll(-1)">
            <app-icon name="chevronLeft" [size]="20" />
          </button>
          <button type="button" class="icon-btn" [disabled]="!canNext()" [attr.aria-label]="'Siguientes: ' + label()" (click)="scroll(1)">
            <app-icon name="chevronRight" [size]="20" />
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex gap-4 overflow-hidden" role="status" [attr.aria-label]="'Cargando ' + label()">
          @for (n of placeholders; track n) {
            <div class="h-36 shrink-0 animate-pulse rounded-2xl bg-line" [style.width]="itemWidth()"></div>
          }
        </div>
      } @else {
        <div
          #track
          role="list"
          tabindex="0"
          [attr.aria-label]="label()"
          class="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:scroll-auto"
          (scroll)="updateEdges()"
        >
          @for (item of items(); track $index) {
            <div role="listitem" class="shrink-0 snap-start" [style.width]="itemWidth()">
              <ng-container [ngTemplateOutlet]="itemTemplate() ?? null" [ngTemplateOutletContext]="{ $implicit: item }" />
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class CarouselComponent<T> implements OnDestroy {
  readonly label = input.required<string>();
  readonly subtitle = input('');
  readonly items = input.required<readonly T[]>();
  readonly loading = input(false);
  /** Ancho de cada elemento (CSS): por defecto, unas 2 cards en móvil y 4-5 en escritorio. */
  readonly itemWidth = input('min(15rem, 70vw)');

  protected readonly itemTemplate = contentChild<TemplateRef<{ $implicit: T }>>(TemplateRef);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  protected readonly canPrev = signal(false);
  protected readonly canNext = signal(false);
  protected readonly placeholders = [1, 2, 3, 4, 5];

  // Los extremos cambian al hacer scroll, al cambiar el tamaño y cuando llegan (o cambian) las cards.
  private readonly resize = new ResizeObserver(() => this.updateEdges());
  private readonly mutations = new MutationObserver(() => this.updateEdges());
  private observed: HTMLElement | null = null;

  constructor() {
    // La fila no existe mientras carga: tras cada render se comprueba si ya está (si es la misma, no hace nada).
    afterRender(() => this.observeTrack());
  }

  ngOnDestroy(): void {
    this.resize.disconnect();
    this.mutations.disconnect();
  }

  protected scroll(direction: 1 | -1): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: reduced ? 'auto' : 'smooth' });
  }

  protected updateEdges(): void {
    this.observeTrack();
    const track = this.track()?.nativeElement;
    if (!track) {
      this.canPrev.set(false);
      this.canNext.set(false);
      return;
    }
    this.canPrev.set(track.scrollLeft > 4);
    this.canNext.set(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }

  /** La fila aparece cuando termina la carga: se empieza a observar en cuanto existe. */
  private observeTrack(): void {
    const track = this.track()?.nativeElement ?? null;
    if (!track || track === this.observed) return;
    this.resize.disconnect();
    this.mutations.disconnect();
    this.resize.observe(track);
    this.mutations.observe(track, { childList: true });
    this.observed = track;
    queueMicrotask(() => this.updateEdges());
  }
}
