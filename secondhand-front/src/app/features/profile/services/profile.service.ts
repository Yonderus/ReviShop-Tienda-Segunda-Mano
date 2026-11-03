import { Injectable, inject } from '@angular/core';
import { INLINE_FORM_STATUSES } from '../../../core/config/app.constants';
import { ApiService } from '../../../core/services/api.service';
import { Profile, ProfileInput } from '../models/profile.model';

/** El perfil de la sesión. No lleva id: la API siempre usa el usuario del token. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getMine(): Promise<Profile> {
    return this.api.get<Profile>('/profile/me');
  }

  /** PATCH parcial: solo lo que cambie. */
  updateMine(changes: Partial<ProfileInput>): Promise<Profile> {
    return this.api.patch<Profile>('/profile/me', changes, { inlineErrorStatuses: INLINE_FORM_STATUSES, blocking: true });
  }
}
