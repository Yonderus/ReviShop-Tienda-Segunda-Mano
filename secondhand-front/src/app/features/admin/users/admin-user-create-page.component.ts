import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiError } from '../../../core/models/api-error.model';
import { AlertService } from '../../../core/services/alert.service';
import { UserInput } from '../../users/models/user.model';
import { UsersStore } from '../../users/store/users.store';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-admin-user-create-page',
  standalone: true,
  imports: [UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">Nuevo usuario</h1>
      <p class="mt-1 text-sm text-ink-muted">Nace activo. Mientras no esté suspendido, puede comprar y vender.</p>
      <div class="mt-6">
        <app-user-form
          [roles]="store.roles()"
          [rolesFailed]="store.rolesError() !== null"
          [saving]="store.saving()"
          [serverError]="serverError()"
          (retryRoles)="store.loadRoles({ force: true })"
          (submitted)="create($event)"
        />
      </div>
    </div>
  `,
})
export class AdminUserCreatePageComponent implements OnInit {
  protected readonly store = inject(UsersStore);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  protected readonly serverError = signal<ApiError | null>(null);

  ngOnInit(): void {
    void this.store.loadRoles();
  }

  protected async create(input: UserInput): Promise<void> {
    this.serverError.set(null);
    try {
      const user = await this.store.create(input);
      void this.alert.success(`"${user.name}" creado`);
      void this.router.navigate(['/admin/users']);
    } catch (error) {
      if (error instanceof ApiError && INLINE_FORM_STATUSES.includes(error.status)) this.serverError.set(error);
    }
  }
}
