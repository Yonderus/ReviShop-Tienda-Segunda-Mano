import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'para', 'y', 'en', 'a', 'un', 'una']);

@Component({
  selector: 'app-product-image',
  standalone: true,
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block overflow-hidden bg-primary-50' },
  template: `
    @if (src() && failedSrc() !== src()) {
      <img
        [ngSrc]="src()!"
        [alt]="alt()"
        fill
        [sizes]="sizes()"
        [priority]="priority()"
        class="object-cover"
        (error)="failedSrc.set(src() ?? null)"
      />
    } @else {
      <div class="absolute inset-0 flex flex-col items-end justify-between p-4" role="img" [attr.aria-label]="alt() + ' (sin foto)'">
        <span class="rounded-md bg-surface/85 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted" aria-hidden="true">
          Sin foto
        </span>
        <span
          class="line-clamp-2 self-start break-words font-bold uppercase leading-[0.92] tracking-tight text-primary-200"
          [class]="large() ? 'text-5xl sm:text-7xl' : 'text-[2.25rem]'"
          aria-hidden="true"
        >{{ word() }}</span>
      </div>
    }
  `,
})
export class ProductImageComponent {
  readonly src = input<string | undefined>(undefined);
  readonly alt = input.required<string>();
  readonly sizes = input('(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw');
  readonly priority = input(false);
  readonly large = input(false);

  protected readonly failedSrc = signal<string | null>(null);
  protected readonly word = computed(() =>
    this.alt()
      .split(/\s+/)
      .filter((w) => !STOPWORDS.has(w.toLowerCase()))
      .slice(0, 2)
      .join(' '),
  );
}
