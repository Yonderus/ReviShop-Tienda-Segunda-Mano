import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../ui/icon.component';

type PageItem = { kind: 'page'; page: number } | { kind: 'gap'; key: string };

/**
 * Paginación: anterior/siguiente, números (con "…" si hay muchas) y "Página X de Y". Solo emite el número de
 * página: quien la usa decide qué hacer (en el shop, cambiar la URL). Con una sola página no se pinta.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav [attr.aria-label]="label()" class="flex flex-col items-center gap-3">
        <ul class="flex flex-wrap items-center justify-center gap-1">
          <li>
            <button type="button" class="btn btn-secondary min-h-10 px-3" [disabled]="page() <= 1" aria-label="Página anterior" (click)="go(page() - 1)">
              <app-icon name="chevronLeft" [size]="18" />
              <span class="hidden sm:inline">Anterior</span>
            </button>
          </li>
          @for (item of items(); track item.kind === 'page' ? item.page : item.key) {
            <li>
              @if (item.kind === 'page') {
                <button
                  type="button"
                  class="inline-flex size-10 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-colors"
                  [class]="item.page === page() ? 'bg-primary-600 text-white' : 'text-ink hover:bg-canvas'"
                  [attr.aria-current]="item.page === page() ? 'page' : null"
                  [attr.aria-label]="'Página ' + item.page"
                  (click)="go(item.page)"
                >
                  {{ item.page }}
                </button>
              } @else {
                <span class="inline-flex size-10 items-center justify-center text-ink-muted" aria-hidden="true">…</span>
              }
            </li>
          }
          <li>
            <button type="button" class="btn btn-secondary min-h-10 px-3" [disabled]="page() >= totalPages()" aria-label="Página siguiente" (click)="go(page() + 1)">
              <span class="hidden sm:inline">Siguiente</span>
              <app-icon name="chevronRight" [size]="18" />
            </button>
          </li>
        </ul>
        <p class="text-xs text-ink-muted" aria-live="polite">Página {{ page() }} de {{ totalPages() }}</p>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly label = input('Paginación');
  readonly pageChange = output<number>();

  /** 1 … 4 5 6 … 12: siempre la primera, la última y las vecinas de la actual. */
  protected readonly items = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = Math.min(Math.max(this.page(), 1), total);
    const wanted = [...new Set([1, current - 1, current, current + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const items: PageItem[] = [];
    wanted.forEach((page, index) => {
      const previous = wanted[index - 1];
      if (previous !== undefined && page - previous === 2) items.push({ kind: 'page', page: previous + 1 });
      else if (previous !== undefined && page - previous > 2) items.push({ kind: 'gap', key: `gap-${page}` });
      items.push({ kind: 'page', page });
    });
    return items;
  });

  protected go(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
