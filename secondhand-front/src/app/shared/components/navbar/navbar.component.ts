import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NAME } from '../../../core/config/app.constants';
import { IconComponent } from '../../ui/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <header class="sticky top-0 z-50 bg-primary-900 text-white shadow-[0_1px_0_rgb(255_255_255/0.08)]">
      <nav class="container-page flex h-16 items-center justify-between gap-4" aria-label="Principal">
        <a routerLink="/" class="flex items-center gap-2.5 rounded-lg font-semibold" (click)="close()">
          <img src="assets/logo.svg" alt="" width="34" height="34" class="size-[34px]" />
          <span class="text-lg tracking-tight">{{ appName }}</span>
        </a>

        <div class="hidden items-center gap-1 md:flex">
          <a
            routerLink="/"
            routerLinkActive="!bg-white/10 !text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="rounded-lg px-3.5 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-white/10 hover:text-white"
          >Inicio</a>
          <a routerLink="/products/new" class="btn btn-accent ml-2">
            <app-icon name="plus" [size]="18" />
            Publicar producto
          </a>
        </div>

        <button
          type="button"
          class="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
          [attr.aria-expanded]="open()"
          aria-controls="mobile-menu"
          [attr.aria-label]="open() ? 'Cerrar menú' : 'Abrir menú'"
          (click)="open.set(!open())"
        >
          <app-icon [name]="open() ? 'close' : 'menu'" [size]="22" />
        </button>
      </nav>

      @if (open()) {
        <div id="mobile-menu" class="border-t border-white/10 md:hidden">
          <div class="container-page flex flex-col gap-1 py-3">
            <a
              routerLink="/"
              routerLinkActive="bg-white/10"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-3 py-2.5 font-medium text-primary-50 hover:bg-white/10"
              (click)="close()"
            >Inicio</a>
            <a routerLink="/products/new" class="btn btn-accent mt-1 w-full" (click)="close()">
              <app-icon name="plus" [size]="18" />
              Publicar producto
            </a>
          </div>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly appName = APP_NAME;
  protected readonly open = signal(false);

  protected close(): void {
    this.open.set(false);
  }
}
