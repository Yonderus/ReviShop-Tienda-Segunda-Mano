import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Miniatura cuadrada para filas de tabla: foto o la inicial del producto si no hay o falla. */
@Component({
  selector: 'app-admin-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-primary-50' },
  template: `
    @if (src() && failedSrc() !== src()) {
      <img [src]="src()" alt="" width="44" height="44" loading="lazy" class="size-full object-cover" (error)="failedSrc.set(src() ?? null)" />
    } @else {
      <span class="m-auto text-base font-bold text-primary-400" aria-hidden="true">{{ initial() }}</span>
    }
  `,
})
export class AdminThumbComponent {
  readonly src = input<string | undefined>();
  readonly title = input.required<string>();

  protected readonly failedSrc = signal<string | null>(null);
  protected readonly initial = computed(() => this.title().trim().charAt(0).toUpperCase());
}
