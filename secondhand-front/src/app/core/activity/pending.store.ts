import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { ApiService } from '../services/api.service';

/** `GET /api/me/pending`: lo que el usuario de la sesión tiene por hacer. */
export interface PendingCounts {
  /** Compras que un vendedor ha registrado y faltan por confirmar. */
  salesToConfirm: number;
  /** Ventas confirmadas que aún puede valorar (llegan con las valoraciones). */
  reviewsToWrite: number;
  /** Ventas en las que la otra parte ya le ha valorado y él no. */
  othersReviewedMe: number;
  /** Preguntas sin responder en sus anuncios. */
  questionsToAnswer: number;
}

/**
 * El contador de "Mi actividad" del menú de usuario. Está en `core` (y no en la feature de ventas) porque lo usa el
 * menú, que es compartido; la página de Mi actividad lo refresca después de cada acción.
 *
 * - Se pide al iniciar sesión (o al recuperarla al recargar) y se vacía al cerrarla.
 * - Si falla, no se enseña nada: es un aviso, no algo que haya que reintentar delante del usuario.
 */
@Injectable({ providedIn: 'root' })
export class PendingStore {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);

  private readonly _counts = signal<PendingCounts | null>(null);
  readonly counts = this._counts.asReadonly();
  /** Lo que se cuenta en el aviso: lo que el usuario tiene que hacer él (confirmar compras, valorar y responder). */
  readonly total = computed(() => {
    const counts = this._counts();
    return counts ? counts.salesToConfirm + counts.reviewsToWrite + (counts.questionsToAnswer ?? 0) : 0;
  });

  private inFlight: Promise<void> | null = null;

  constructor() {
    // Cambia el usuario (login, recuperar la sesión, otra pestaña…): se vuelve a pedir; sin usuario, se vacía.
    effect(() => {
      const userId = this.auth.user()?._id;
      untracked(() => (userId ? void this.refresh() : this._counts.set(null)));
    });
    this.auth.onSessionEnd(() => this._counts.set(null));
  }

  /** Dos llamadas seguidas (p. ej. al entrar en Mi actividad justo después del login) comparten la petición. */
  refresh(): Promise<void> {
    if (!this.auth.isAuthenticated()) return Promise.resolve();
    return (this.inFlight ??= this.load().finally(() => (this.inFlight = null)));
  }

  private async load(): Promise<void> {
    try {
      this._counts.set(await this.api.get<PendingCounts>('/me/pending', { skipErrorAlert: true, skipGlobalLoader: true }));
    } catch {
      // Un aviso que no se ha podido cargar no se enseña; la próxima acción lo volverá a pedir.
    }
  }
}
