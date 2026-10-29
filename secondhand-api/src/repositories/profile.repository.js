import { AVATAR_MATCH, Profile } from "../models/profile.model.js";

/**
 * Solo lo usa `profile.service.js`: el perfil no tiene CRUD propio. Cada método recibe el `userId`, nunca
 * el id del perfil, porque un perfil se identifica por su usuario.
 */
export const profileRepository = {
  findByUserId(userId) {
    return Profile.findOne({ userId }).lean();
  },

  /** Con su avatar vivo (el `match` se repite: el de un populate sustituye al del virtual). */
  findWithAvatarByUserId(userId) {
    return Profile.findOne({ userId })
      .select("userId phone location bio deletedAt")
      .populate({ path: "avatar", select: "url deletedAt", match: AVATAR_MATCH })
      .lean();
  },

  /** Incluye los de la papelera: al restaurar un usuario hace falta su perfil (para su avatar). */
  findRawByUserId(userId) {
    return Profile.findOne({ userId }).setOptions({ withDeleted: true }).lean();
  },

  create(data) {
    return Profile.create(data);
  },

  updateByUserId(userId, data) {
    return Profile.findOneAndUpdate({ userId }, data, { new: true, runValidators: true });
  },

  setActiveByUserId(userId, isActive) {
    return Profile.updateOne({ userId }, { isActive });
  },

  /** Con la misma fecha que su usuario: así la restauración solo devuelve lo que se borró junto. */
  softDeleteByUserId(userId, date) {
    return Profile.softDeleteMany({ userId }, date);
  },

  restoreByUserId(userId, date, isActive) {
    return Profile.restoreMany({ userId }, date, { isActive });
  },

  /** Borrado físico: solo para deshacer una creación que falló a medias. */
  hardDeleteByUserId(userId) {
    return Profile.deleteOne({ userId });
  },
};
