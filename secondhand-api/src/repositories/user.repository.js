import { USER_STATUS } from "../constants/user.constants.js";
import { User } from "../models/user.model.js";

// Los eliminados ya los oculta el plugin de soft delete. `passwordHash` no sale nunca: es `select: false`.
const ACTIVE = { isActive: true };
const CAN_SELL = { ...ACTIVE, status: { $ne: USER_STATUS.SUSPENDED } };
const WITH_DELETED = { withDeleted: true };
const PUBLIC_FIELDS = "name slug location";
const ADMIN_FIELDS = "-__v -deletedBy";
// Un usuario siempre muestra su rol, aunque después se retire.
const ROLE_SUMMARY = { path: "role", select: "name slug", options: WITH_DELETED };

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
    return User.find(CAN_SELL).sort({ name: 1 }).select(PUBLIC_FIELDS).lean();
  },

  /** Panel: con su rol. */
  findAll(filter = {}) {
    return User.find(filter).sort({ name: 1 }).select(ADMIN_FIELDS).populate(ROLE_SUMMARY).lean();
  },

  findTrashed(filter = {}) {
    return User.find({ ...filter, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .select(ADMIN_FIELDS)
      .populate(ROLE_SUMMARY)
      .lean();
  },

  findDetailById(id) {
    return User.findById(id).select(ADMIN_FIELDS).populate(ROLE_SUMMARY).lean();
  },

  findDetailBySlug(slug) {
    return User.findOne({ slug }).select(ADMIN_FIELDS).populate(ROLE_SUMMARY).lean();
  },

  /** Incluye eliminados: el service decide qué hacer con ellos (404, 409, restaurar…). */
  findRawById(id) {
    return User.findById(id).setOptions(WITH_DELETED).lean();
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

  softDeleteById(id, date) {
    return User.softDeleteMany({ _id: id }, date);
  },

  restoreById(id, date, isActive) {
    return User.restoreMany({ _id: id }, date, { isActive });
  },
};
