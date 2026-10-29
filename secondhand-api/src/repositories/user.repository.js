import { USER_STATUS } from "../constants/user.constants.js";
import { AVATAR_MATCH } from "../models/profile.model.js";
import { User } from "../models/user.model.js";

// Los eliminados ya los oculta el plugin de soft delete. `passwordHash` no sale nunca: es `select: false`.
const ACTIVE = { isActive: true };
const CAN_SELL = { ...ACTIVE, status: { $ne: USER_STATUS.SUSPENDED } };
const WITH_DELETED = { withDeleted: true };
const PUBLIC_FIELDS = "name slug";
// `tokensValidAfter` es un detalle interno de la sesión (lo usa el middleware de auth): no sale al panel.
const ADMIN_FIELDS = "-__v -deletedBy -tokensValidAfter";
// Un usuario siempre muestra su rol, aunque después se retire.
const ROLE_SUMMARY = { path: "role", select: "name slug", options: WITH_DELETED };
/**
 * El perfil, con su avatar. `userId` hace falta para que el populate lo empareje. El perfil sigue al usuario
 * también en la papelera; su avatar, en cambio, se pide distinto según la lista (ver TRASH_POPULATE).
 */
const profileWith = (avatarOptions) => ({
  path: "profile",
  select: "userId phone location bio deletedAt",
  options: WITH_DELETED,
  populate: { path: "avatar", select: "url deletedAt", match: AVATAR_MATCH, options: avatarOptions },
});
const ADMIN_POPULATE = [ROLE_SUMMARY, profileWith({})];
/**
 * Papelera: el avatar está borrado con el perfil. Entre los borrados, el más reciente es el que se borró con
 * él (los sustituidos antes son más antiguos); el service comprueba que la fecha coincida.
 */
const TRASH_POPULATE = [ROLE_SUMMARY, profileWith({ ...WITH_DELETED, sort: { deletedAt: -1 } })];

export const userRepository = {
  findActiveById(id) {
    return User.findOne({ _id: id, ...CAN_SELL }).lean();
  },

  /** Para el filtro de vendedor de los productos. */
  findBySlug(slug) {
    return User.findOne({ slug }).lean();
  },

  /** Los mismos que acepta `findActiveById`: activos y no suspendidos. */
  listSellers() {
    return User.find(CAN_SELL)
      .sort({ name: 1 })
      .select(PUBLIC_FIELDS)
      .populate({ path: "profile", select: "userId location" })
      .lean();
  },

  /** Panel: con su rol y su perfil (y el avatar del perfil). */
  findAll(filter = {}) {
    return User.find(filter).sort({ name: 1 }).select(ADMIN_FIELDS).populate(ADMIN_POPULATE).lean();
  },

  findTrashed(filter = {}) {
    return User.find({ ...filter, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .select(ADMIN_FIELDS)
      .populate(TRASH_POPULATE)
      .lean();
  },

  findDetailById(id) {
    return User.findById(id).select(ADMIN_FIELDS).populate(ADMIN_POPULATE).lean();
  },

  findDetailBySlug(slug) {
    return User.findOne({ slug }).select(ADMIN_FIELDS).populate(ADMIN_POPULATE).lean();
  },

  /** Incluye eliminados: el service decide qué hacer con ellos (404, 409, restaurar…). */
  findRawById(id) {
    return User.findById(id).setOptions(WITH_DELETED).lean();
  },

  /**
   * Para el login: el **único** método que trae `passwordHash`. Incluye la papelera, para responder 403
   * (y no 401) a quien sabe la contraseña de una cuenta borrada.
   */
  findForLogin(email) {
    return User.findOne({ email }).select("+passwordHash").setOptions(WITH_DELETED).lean();
  },

  /** Incluye eliminados: su email sigue ocupado en el índice único. */
  findRawByEmail(email) {
    return User.findOne({ email }).setOptions(WITH_DELETED).lean();
  },

  /** Admins que cuentan para "siempre queda uno": no eliminados, activos y no suspendidos. */
  countActiveWithRole(roleId) {
    return User.countDocuments({ roleId, ...CAN_SELL });
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  /** Borrado físico: solo para deshacer una creación que falló a medias (p. ej. sin perfil). */
  hardDeleteById(id) {
    return User.deleteOne({ _id: id });
  },

  softDeleteById(id, date) {
    return User.softDeleteMany({ _id: id }, date);
  },

  restoreById(id, date, isActive) {
    return User.restoreMany({ _id: id }, date, { isActive });
  },
};
