import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { AdminSidebarComponent } from '../../features/admin/components/admin-sidebar/admin-sidebar.component';

export interface AdminCrumb {
  label: string;
  link?: string;
}

export interface AdminRouteMeta {
  crumbs?: AdminCrumb[];
}

function deepestData(root: ActivatedRouteSnapshot): AdminRouteMeta {
  let route = root;
  while (route.firstChild) route = route.firstChild;
  return route.data as AdminRouteMeta;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, IconComponent, LoaderComponent, AdminSidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-screen bg-canvas' },
  template: `
    <a href="#admin-main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700 focus:shadow-lift">
      Saltar al contenido
    </a>
    <app-loader />

    <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
      <app-admin-sidebar />
    </aside>

    <dialog
      #drawer
      id="admin-drawer"
      class="drawer m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-transparent p-0 lg:hidden"
      aria-label="Menú de administración"
      (close)="drawerOpen.set(false)"
      (click)="closeOnBackdrop($event)"
    >
      <app-admin-sidebar (navigate)="closeDrawer()" />
    </dialog>

    <div class="lg:pl-64">
      <header class="sticky top-0 z-30 border-b border-line bg-surface/95 supports-[backdrop-filter]:bg-surface/90">
        <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            class="icon-btn -ml-1 lg:hidden"
            aria-controls="admin-drawer"
            [attr.aria-expanded]="drawerOpen()"
            aria-label="Abrir menú de administración"
            (click)="openDrawer()"
          >
            <app-icon name="menu" [size]="22" />
          </button>

          <div class="min-w-0 flex-1">
            @if (meta().crumbs?.length) {
              <nav aria-label="Ruta de navegación" class="hidden sm:block">
                <ol class="flex items-center gap-1 text-xs text-ink-muted">
                  @for (crumb of meta().crumbs; track crumb.label; let last = $last) {
                    <li class="flex items-center gap-1">
                      @if (crumb.link && !last) {
                        <a [routerLink]="crumb.link" class="rounded hover:text-primary-700 hover:underline">{{ crumb.label }}</a>
                      } @else {
                        <span [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span>
                      }
                      @if (!last) {
                        <app-icon name="chevronRight" [size]="13" class="text-ink-muted/70" />
                      }
                    </li>
                  }
                </ol>
              </nav>
            }
          </div>

          <a routerLink="/admin/products/new" class="btn btn-primary min-h-9 px-3 sm:px-4">
            <app-icon name="plus" [size]="18" />
            <span class="hidden sm:inline">Nuevo producto</span>
            <span class="sr-only sm:hidden">Nuevo producto</span>
          </a>
          <span
            class="hidden size-9 items-center justify-center rounded-full border border-dashed border-line text-ink-muted sm:inline-flex"
            title="Inicio de sesión disponible próximamente"
            aria-label="Usuario: sin sesión"
            role="img"
          >
            <app-icon name="user" [size]="18" />
          </span>
        </div>
      </header>

      <main id="admin-main" tabindex="-1" class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .drawer::backdrop {
      background: rgb(15 23 42 / 0.5);
    }
    .drawer[open] {
      animation: drawer-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes drawer-in {
      from {
        transform: translateX(-100%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .drawer[open] {
        animation: none;
      }
    }
  `,
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly drawer = viewChild.required<ElementRef<HTMLDialogElement>>('drawer');

  protected readonly drawerOpen = signal(false);
  protected readonly meta = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => deepestData(this.router.routerState.snapshot.root)),
    ),
    { initialValue: deepestData(this.router.routerState.snapshot.root) },
  );

  protected openDrawer(): void {
    this.drawer().nativeElement.showModal();
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawer().nativeElement.close();
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.drawer().nativeElement) this.closeDrawer();
  }
}
