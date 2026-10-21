import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ProductImage } from '../../models/image.model';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex gap-2 overflow-x-auto pb-1" aria-label="Fotos del producto">
      @for (image of images(); track image._id; let i = $index) {
        @if (!failed().has(image.url)) {
          <li class="shrink-0">
            <button
              type="button"
              class="block size-16 overflow-hidden rounded-lg border-2 bg-primary-50 transition-[border-color,opacity] duration-150 sm:size-20"
              [class.border-primary-600]="i === active()"
              [class.border-transparent]="i !== active()"
              [class.opacity-70]="i !== active()"
              [attr.aria-label]="'Ver foto ' + (i + 1) + ' de ' + images().length"
              [attr.aria-current]="i === active() ? 'true' : null"
              (click)="select.emit(i)"
            >
              <img [src]="image.url" [alt]="image.alt || ''" width="80" height="80" class="size-full object-cover" (error)="markFailed(image.url)" />
            </button>
          </li>
        }
      }
    </ul>
  `,
})
export class ProductGalleryComponent {
  readonly images = input.required<ProductImage[]>();
  readonly active = input(0);
  readonly select = output<number>();

  /** Las miniaturas que no cargan se ocultan en vez de mostrarse como un hueco vacío. */
  protected readonly failed = signal<ReadonlySet<string>>(new Set());

  protected markFailed(url: string): void {
    this.failed.update((set) => new Set(set).add(url));
  }
}
