import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon.component';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-page flex flex-col items-center py-20 text-center sm:py-28">
      <p class="text-6xl font-bold tracking-tight text-primary-200 sm:text-7xl" aria-hidden="true">404</p>
      <h1 class="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{{ heading() }}</h1>
      <p class="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">{{ text() }}</p>
      <a routerLink="/" class="btn btn-primary mt-8">
        <app-icon name="arrowLeft" [size]="18" />
        Volver al catálogo
      </a>
    </section>
  `,
})
export class PageNotFoundComponent {
  /** Como componente de ruta, withComponentInputBinding los pone a undefined: el valor por defecto va en el computed. */
  readonly title = input<string>();
  readonly message = input<string>();

  protected readonly heading = computed(() => this.title() ?? 'Esta página no existe');
  protected readonly text = computed(
    () => this.message() ?? 'Puede que el enlace esté mal escrito o que la página se haya movido.',
  );
}
