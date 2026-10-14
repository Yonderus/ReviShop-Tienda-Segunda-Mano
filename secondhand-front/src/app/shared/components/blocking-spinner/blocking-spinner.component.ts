import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';
import { LoadingService } from '../../../core/services/loading.service';

const SPINNER = 'blocking';

/** Anillo propio en lugar de las hojas CSS de ngx-spinner (usan @-webkit-keyframes y rompen el CSS crítico). */
const RING =
  '<span class="block size-12 rounded-full border-4 border-white/25 border-t-white motion-safe:animate-spin" aria-hidden="true"></span>';

@Component({
  selector: 'app-blocking-spinner',
  standalone: true,
  imports: [NgxSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngx-spinner [name]="name" [template]="ring" bdColor="rgba(15, 23, 42, 0.55)" [fullScreen]="true" [zIndex]="1100">
      <p class="mt-4 text-sm font-medium text-white">Procesando…</p>
    </ngx-spinner>
    <p class="sr-only" role="status" aria-live="polite">{{ loading.showBlocking() ? 'Procesando, espera un momento' : '' }}</p>
  `,
})
export class BlockingSpinnerComponent {
  protected readonly loading = inject(LoadingService);
  private readonly spinner = inject(NgxSpinnerService);
  protected readonly name = SPINNER;
  protected readonly ring = RING;

  constructor() {
    // Efecto secundario puro: sincroniza la señal con la librería externa, no escribe señales.
    effect(() => {
      if (this.loading.showBlocking()) void this.spinner.show(SPINNER);
      else void this.spinner.hide(SPINNER);
    });
  }
}
