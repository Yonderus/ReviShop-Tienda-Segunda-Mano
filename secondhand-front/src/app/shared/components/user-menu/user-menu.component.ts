import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { AlertService } from '../../../core/services/alert.service';
import { AvatarComponent } from '../../ui/avatar.component';
import { IconComponent } from '../../ui/icon.component';

/**
 * La sesión en la cabecera: "Iniciar sesión" o la foto y el nombre con un menú (Mi perfil, Panel o Tienda,
 * Cerrar sesión). Lo usan la navbar de la tienda (`tone="dark"`) y la cabecera del panel (`tone="light"`).
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'closeIfOutside($event)',
    '(document:keydown.escape)': 'closeAndFocus()',
  },
  template: `
    @if (auth.user(); as user) {
      <button
        #trigger
        type="button"
        class="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors sm:pr-3"
        [class]="tone() === 'dark' ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-canvas'"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        aria-controls="user-menu"
        [attr.aria-label]="'Menú de ' + user.name"
        (click)="open.set(!open())"
      >
        <app-avatar size="sm" [name]="user.name" [src]="user.avatarUrl" />
        <span class="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{{ firstName() }}</span>
      </button>

      @if (open()) {
        <div
          id="user-menu"
          role="menu"
          class="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-lift"
        >
          <div class="flex items-center gap-3 border-b border-line px-4 py-3">
            <app-avatar [name]="user.name" [src]="user.avatarUrl" />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ user.name }}</p>
              <p class="truncate text-xs text-ink-muted">{{ user.email }}</p>
              @if (user.role) {
                <p class="mt-0.5 text-xs font-medium text-primary-700">{{ user.role.name }}</p>
              }
            </div>
          </div>
          <div class="p-1.5">
            <a routerLink="/profile" role="menuitem" [class]="item" (click)="close()">
              <app-icon name="user" [size]="18" />
              Mi perfil
            </a>
            @if (context() === 'admin') {
              <a routerLink="/" role="menuitem" [class]="item" (click)="close()">
                <app-icon name="store" [size]="18" />
                Ver tienda
              </a>
            } @else if (auth.isAdmin()) {
              <a routerLink="/admin" role="menuitem" [class]="item" (click)="close()">
                <app-icon name="dashboard" [size]="18" />
                Panel de administración
              </a>
            }
            <button type="button" role="menuitem" [class]="item + ' w-full text-red-700 hover:!bg-red-50'" [disabled]="leaving()" (click)="logout()">
              <app-icon name="logOut" [size]="18" />
              {{ leaving() ? 'Cerrando sesión…' : 'Cerrar sesión' }}
            </button>
          </div>
        </div>
      }
    } @else if (auth.restoring()) {
      <!-- Mientras se comprueba la sesión guardada: ni "Iniciar sesión" ni usuario, para no parpadear. -->
      <span class="block size-9 animate-pulse rounded-full" [class]="tone() === 'dark' ? 'bg-white/15' : 'bg-line'" role="status" aria-label="Comprobando la sesión"></span>
    } @else {
      <a
        routerLink="/login"
        class="btn min-h-9 px-3 sm:px-4"
        [class]="tone() === 'dark' ? 'border border-white/25 text-white hover:bg-white/10' : 'btn-secondary'"
      >
        <app-icon name="user" [size]="18" />
        <span>Iniciar sesión</span>
      </a>
    }
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthStore);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** Colores: sobre la navbar oscura de la tienda o sobre la cabecera clara del panel. */
  readonly tone = input<'dark' | 'light'>('dark');
  /** En el panel el enlace es "Ver tienda"; en la tienda, "Panel" (solo admin). */
  readonly context = input<'store' | 'admin'>('store');

  protected readonly item =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-canvas focus-visible:bg-canvas';
  protected readonly open = signal(false);
  protected readonly leaving = signal(false);
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  protected close(): void {
    this.open.set(false);
  }

  /** Escape: cierra y devuelve el foco al botón (solo si estaba abierto). */
  protected closeAndFocus(): void {
    if (!this.open()) return;
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  protected closeIfOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  /** Revoca el token en la API (aunque falle, la sesión local se borra) y vuelve a la tienda. */
  protected async logout(): Promise<void> {
    this.leaving.set(true);
    try {
      await this.auth.logout();
    } finally {
      this.leaving.set(false);
      this.close();
    }
    void this.alert.success('Has cerrado sesión');
    void this.router.navigateByUrl('/');
  }
}
