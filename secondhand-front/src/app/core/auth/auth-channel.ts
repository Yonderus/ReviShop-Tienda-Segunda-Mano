import { Injectable, OnDestroy } from '@angular/core';

/** Lo que se cuentan las pestañas de la tienda sobre la sesión. Nunca tokens (no los tiene nadie en JavaScript). */
export type AuthChannelMessage =
  | { type: 'login' }
  | { type: 'logout' }
  | { type: 'refreshed'; accessExpiresAt: string };

const CHANNEL_NAME = 'revishop-auth';

/**
 * Aviso entre pestañas con `BroadcastChannel` (mismo origen). Las cookies ya se comparten solas entre pestañas; lo
 * que no se comparte es el estado de cada una:
 * - `logout`: las demás cierran la sesión al momento (no cuando hagan su próxima petición);
 * - `login`: las demás recuperan la sesión sin recargar;
 * - `refreshed`: las demás reprograman su renovación con la caducidad nueva (y no renuevan todas a la vez).
 *
 * Un mensaje no le llega a la pestaña que lo envía. Si el navegador no tiene `BroadcastChannel`, todo sigue
 * funcionando; solo se pierde el aviso inmediato.
 */
@Injectable({ providedIn: 'root' })
export class AuthChannel implements OnDestroy {
  private readonly channel: BroadcastChannel | null = createChannel();
  private readonly listeners = new Set<(message: AuthChannelMessage) => void>();

  constructor() {
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
        if (isMessage(event.data)) this.listeners.forEach((listener) => listener(event.data));
      };
    }
  }

  post(message: AuthChannelMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // Canal cerrado: la pestaña se está cerrando.
    }
  }

  onMessage(listener: (message: AuthChannelMessage) => void): void {
    this.listeners.add(listener);
  }

  ngOnDestroy(): void {
    this.channel?.close();
  }
}

function createChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Lo que llega por el canal lo podría mandar cualquier script del mismo origen: se comprueba la forma. */
function isMessage(data: unknown): data is AuthChannelMessage {
  if (!data || typeof data !== 'object') return false;
  const { type } = data as { type?: unknown };
  if (type === 'login' || type === 'logout') return true;
  return type === 'refreshed' && typeof (data as { accessExpiresAt?: unknown }).accessExpiresAt === 'string';
}
