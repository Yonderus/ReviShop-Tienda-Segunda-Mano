import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden" aria-hidden="true">
      @if (loading.showIndicator()) {
        <div class="h-full w-2/5 animate-progress rounded-full bg-accent motion-reduce:w-full motion-reduce:animate-none"></div>
      }
    </div>
    <p class="sr-only" role="status" aria-live="polite">
      {{ loading.showIndicator() ? 'Procesando…' : '' }}
    </p>
  `,
})
export class LoaderComponent {
  protected readonly loading = inject(LoadingService);
}
