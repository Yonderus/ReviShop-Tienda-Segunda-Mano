/** `GET/PATCH /profile/me`: solo los campos que tenga (sin foto, no viene `avatarUrl`). */
export interface Profile {
  phone?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
}

/** Lo que manda el formulario. Texto vacío = borrarlo; `avatarUrl: null` = quitar la foto. */
export interface ProfileInput {
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
}

export const profileToInput = (profile: Profile): ProfileInput => ({
  phone: profile.phone ?? '',
  location: profile.location ?? '',
  bio: profile.bio ?? '',
  avatarUrl: profile.avatarUrl ?? null,
});
