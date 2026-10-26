import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NAME } from '../../../../core/config/app.constants';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { ADMIN_NAV, PLATFORM_MODULES } from '../../admin-nav.config';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col bg-primary-900 text-primary-100' },
  template: `
    <div class="flex h-16 shrink-0 items-center gap-2.5 px-5">
      <img src="assets/logo.svg" alt="" width="32" height="32" class="size-8" />
      <span class="text-[1.0625rem] font-semibold tracking-tight text-white">{{ appName }}</span>
      <span class="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary-100">Admin</span>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-6" aria-label="Administración">
      @for (group of nav; track group.title) {
        <p class="mb-1 mt-6 px-3 text-xs font-medium text-primary-200/80" [id]="'nav-' + group.title">{{ group.title }}</p>
        <ul class="space-y-0.5" [attr.aria-labelledby]="'nav-' + group.title">
          @for (link of group.links; track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: !!link.exact }"
                ariaCurrentWhenActive="page"
                class="nav-link group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-primary-100 transition-colors duration-150 hover:bg-white/5 hover:text-white"
                (click)="navigate.emit()"
              >
                <span class="nav-indicator absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent opacity-0 transition-opacity" aria-hidden="true"></span>
                <app-icon [name]="link.icon" [size]="19" />
                <span class="flex-1">{{ link.label }}</span>
              </a>
            </li>
          }
        </ul>
      }

      <p class="mb-1 mt-6 px-3 text-xs font-medium text-primary-200/80" id="nav-platform">Plataforma</p>
      <ul class="space-y-0.5" aria-labelledby="nav-platform">
        @for (module of modules; track module.label) {
          <li
            class="retired flex h-10 cursor-not-allowed items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-primary-100"
            aria-disabled="true"
            title="Disponible próximamente"
          >
            <span class="retired-dim flex flex-1 items-center gap-3">
              <app-icon [name]="module.icon" [size]="19" />
              <span>{{ module.label }}<span class="sr-only">, próximamente</span></span>
            </span>
            <span class="retired-tag text-primary-200" aria-hidden="true">Pronto</span>
          </li>
        }
      </ul>
    </nav>

    <div class="border-t border-white/10 p-3">
      <a routerLink="/" class="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-primary-100 hover:bg-white/5 hover:text-white">
        <app-icon name="store" [size]="19" />
        Ver tienda
      </a>
    </div>
  `,
  styles: `
    .nav-link.is-active {
      background: rgb(255 255 255 / 0.1);
      color: #fff;
    }
    .nav-link.is-active .nav-indicator {
      opacity: 1;
    }
  `,
})
export class AdminSidebarComponent {
  /** Para que el drawer móvil se cierre al navegar. */
  readonly navigate = output<void>();

  protected readonly appName = APP_NAME;
  protected readonly nav = ADMIN_NAV;
  protected readonly modules = PLATFORM_MODULES;
}
