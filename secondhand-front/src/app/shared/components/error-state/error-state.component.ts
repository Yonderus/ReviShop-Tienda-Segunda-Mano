import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ApiError } from '../../../core/models/api-error.model';
import { IconComponent } from '../../ui/icon.component';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center" role="alert">
      <span class="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
        <app-icon [name]="isOffline() ? 'wifiOff' : 'refresh'" [size]="28" />
      </span>
      <h2 class="text-lg font-semibold text-ink">{{ title() }}</h2>
      <p class="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{{ error()?.message ?? fallback }}</p>
      <button type="button" class="btn btn-primary mt-6" (click)="retry.emit()">
        <app-icon name="refresh" [size]="18" />
        Reintentar
      </button>
    </section>
  `,
})
export class ErrorStateComponent {
  readonly error = input<ApiError | null>(null);
  readonly title = input('No hemos podido cargar esta página');
  readonly retry = output<void>();

  protected readonly fallback = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  protected readonly isOffline = computed(() => {
    const kind = this.error()?.kind;
    return kind === 'network' || kind === 'timeout';
  });
}
