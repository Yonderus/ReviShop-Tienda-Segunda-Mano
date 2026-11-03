import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** Adonde manda el adminGuard a quien tiene sesión pero no permiso (p. ej. un usuario que abre /admin). */
@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-page py-8">
      <app-empty-state
        icon="lock"
        title="No tienes permiso para entrar aquí"
        message="Esta parte es solo para administradores. Si crees que deberías tener acceso, habla con un administrador."
      >
        <a routerLink="/" class="btn btn-primary">Volver a la tienda</a>
      </app-empty-state>
    </div>
  `,
})
export class ForbiddenPageComponent {}
