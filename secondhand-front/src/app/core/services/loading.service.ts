import { Injectable, computed, signal } from '@angular/core';
import { LOADER_SHOW_DELAY_MS } from '../config/app.constants';

export type LoadingKind = 'background' | 'blocking';

/** Contador de peticiones que solo se hace visible si dura más que el retardo (evita parpadeos). */
class DelayedCounter {
  private readonly pending = signal(0);
  private readonly shown = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  readonly count = this.pending.asReadonly();
  readonly visible = this.shown.asReadonly();

  start(): void {
    this.pending.update((n) => n + 1);
    if (this.pending() === 1) this.timer = setTimeout(() => this.shown.set(true), LOADER_SHOW_DELAY_MS);
  }

  stop(): void {
    this.pending.update((n) => Math.max(0, n - 1));
    if (this.pending() === 0) {
      clearTimeout(this.timer);
      this.shown.set(false);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly counters: Record<LoadingKind, DelayedCounter> = {
    background: new DelayedCounter(),
    blocking: new DelayedCounter(),
  };

  readonly pendingCount = computed(() => this.counters.background.count() + this.counters.blocking.count());
  readonly isLoading = computed(() => this.pendingCount() > 0);
  /** Barra fina superior: peticiones en segundo plano. */
  readonly showIndicator = this.counters.background.visible;
  /** Spinner a pantalla completa: operaciones que el usuario espera (guardar, borrar, restaurar). */
  readonly showBlocking = this.counters.blocking.visible;

  start(kind: LoadingKind = 'background'): void {
    this.counters[kind].start();
  }

  stop(kind: LoadingKind = 'background'): void {
    this.counters[kind].stop();
  }
}
