import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

/** Punto de entrada para la futura autenticación: hoy nunca hay sesión. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<AuthUser | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
}
