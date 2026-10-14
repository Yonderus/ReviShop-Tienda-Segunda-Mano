import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { APP_NAME } from '../../core/config/app.constants';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent, LoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Globales a propósito: los pseudo-elementos de View Transitions viven en la raíz del documento.
  encapsulation: ViewEncapsulation.None,
  styles: `
    ::view-transition-group(*) {
      animation-duration: 280ms;
      animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-group(*),
      ::view-transition-old(*),
      ::view-transition-new(*) {
        animation: none !important;
      }
    }
  `,
  host: { class: 'flex min-h-screen flex-col' },
  template: `
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700 focus:shadow-lift"
    >Saltar al contenido</a>
    <app-loader />
    <app-navbar />

    <main id="contenido" class="flex-1" tabindex="-1">
      <router-outlet />
    </main>

    <footer class="border-t border-line bg-surface">
      <div class="container-page flex flex-col gap-2 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p><span class="font-semibold text-ink">{{ appName }}</span> · Cada objeto merece una segunda vida.</p>
        <a routerLink="/products/new" class="font-medium text-primary-700 hover:underline">Publicar un producto</a>
      </div>
    </footer>
  `,
})
export class MainLayoutComponent {
  protected readonly appName = APP_NAME;
}
