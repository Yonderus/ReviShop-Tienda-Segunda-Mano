import { IMAGE_KIND, IMAGE_OWNER, IMAGE_STATUS } from "../constants/image.constants.js";
import { PROFILE_FIELDS } from "../constants/user.constants.js";
import { imageRepository } from "../repositories/image.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { NotFoundError } from "../utils/AppError.js";

/*
 * El perfil (teléfono, ubicación, bio y avatar) es una parte del usuario. Aquí viven todas sus reglas:
 *
 * - Lo "mío" (`getMine`, `updateMine`): cada usuario ve y edita **su** perfil. El `userId` sale siempre de
 *   la sesión, nunca de lo que llegue en la petición.
 * - El ciclo de vida (`createFor`, `updateFor`, `setActiveFor`, `softDeleteFor`, `restoreFor`,
 *   `hardDeleteFor`): **solo lo llama `user.service.js`**, siempre junto a su usuario. Nadie crea, borra
 *   ni restaura un perfil por su cuenta.
 */

const pickProfileFields = (data) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => PROFILE_FIELDS.includes(key)));

const buildAvatar = (profile, user, url) => ({
  ownerType: IMAGE_OWNER.PROFILE,
  ownerId: profile._id,
  kind: IMAGE_KIND.AVATAR,
  url,
  alt: `Avatar de ${user.name}`,
  isPrimary: true,
  uploadedBy: user._id,
  status: IMAGE_STATUS.READY,
});

/**
 * Cambia el avatar como las fotos de un producto: primero crea el nuevo y solo después retira el anterior,
 * así un fallo no deja el perfil sin foto. `url` null = quitarlo.
 */
async function replaceAvatar(profile, user, url, deletedBy) {
  const previousIds = await imageRepository.findIdsByOwner(IMAGE_OWNER.PROFILE, profile._id);
  if (url) await imageRepository.createMany([buildAvatar(profile, user, url)]);
  if (previousIds.length) await imageRepository.softDeleteByIds(previousIds, new Date(), deletedBy);
}

/** Escribe lo que llegue: campos del perfil y, si viene `avatarUrl` (aunque sea null), el avatar. */
async function writeProfile(user, data, deletedBy) {
  const fields = pickProfileFields(data);
  if (Object.keys(fields).length) await profileRepository.updateByUserId(user._id, fields);
  if (data.avatarUrl !== undefined) {
    const profile = await profileRepository.findByUserId(user._id);
    await replaceAvatar(profile, user, data.avatarUrl, deletedBy);
  }
}

export const profileService = {
  /**
   * Perfil poblado con su avatar → `{ phone, location, bio, avatarUrl }` (solo los que tenga). El avatar
   * cuenta si está vivo como el perfil o, en la papelera, si se borró a la vez que él.
   */
  toFields(profile) {
    const fields = {};
    for (const field of PROFILE_FIELDS) {
      if (profile?.[field] !== undefined) fields[field] = profile[field];
    }
    const avatar = profile?.avatar;
    if (avatar && +(avatar.deletedAt ?? 0) === +(profile.deletedAt ?? 0)) fields.avatarUrl = avatar.url;
    return fields;
  },

  // ── Lo mío ──

  async getMine(userId) {
    const profile = await profileRepository.findWithAvatarByUserId(userId);
    if (!profile) throw new NotFoundError("Perfil no encontrado");
    return this.toFields(profile);
  },

  /** `user` es el de la sesión: `{ _id, name }`. Solo teléfono, ubicación, bio y avatar. */
  async updateMine(user, data) {
    // El avatar anterior lo retira el propio usuario.
    await writeProfile(user, data, user._id);
    return this.getMine(user._id);
  },

  // ── Ciclo de vida: solo desde user.service ──

  /** Nace con su usuario. Si el avatar falla, `createMany` ya ha borrado lo suyo y el error sube. */
  async createFor(user, data = {}) {
    const profile = await profileRepository.create({ ...pickProfileFields(data), userId: user._id });
    if (data.avatarUrl) await imageRepository.createMany([buildAvatar(profile, user, data.avatarUrl)]);
    return profile;
  },

  /** `deletedBy`: quien hace el cambio (el admin desde el panel), para el avatar que se retira. */
  updateFor(user, data, deletedBy = null) {
    return writeProfile(user, data, deletedBy);
  },

  setActiveFor(userId, isActive) {
    return profileRepository.setActiveByUserId(userId, isActive);
  },

  /** A la papelera con la misma fecha que su usuario, con su avatar. */
  async softDeleteFor(userId, date, deletedBy = null) {
    const profile = await profileRepository.findByUserId(userId);
    await profileRepository.softDeleteByUserId(userId, date, deletedBy);
    if (profile) await imageRepository.softDeleteByOwners(IMAGE_OWNER.PROFILE, [profile._id], date, deletedBy);
  },

  /** Solo vuelve lo que se borró con el usuario (misma fecha). */
  async restoreFor(userId, date, isActive) {
    const profile = await profileRepository.findRawByUserId(userId);
    await profileRepository.restoreByUserId(userId, date, isActive);
    if (profile) await imageRepository.restoreByOwners(IMAGE_OWNER.PROFILE, [profile._id], date);
  },

  /** Borrado físico: solo para deshacer la creación de un usuario que falló a medias. */
  async hardDeleteFor(userId) {
    const profile = await profileRepository.findRawByUserId(userId);
    if (profile) await imageRepository.hardDeleteByOwners(IMAGE_OWNER.PROFILE, [profile._id]);
    await profileRepository.hardDeleteByUserId(userId);
  },
};
