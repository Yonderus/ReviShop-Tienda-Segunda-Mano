import { USER_STATUS } from "../constants/user.constants.js";
import { User } from "../models/user.model.js";

// Los eliminados ya los oculta el plugin de soft delete.
const ACTIVE = { isActive: true };
const PUBLIC_FIELDS = "name slug location";

export const userRepository = {
  findActiveById(id) {
    return User.findOne({ _id: id, ...ACTIVE, status: { $ne: USER_STATUS.SUSPENDED } }).lean();
  },

  findBySlug(slug) {
    return User.findOne({ slug }).lean();
  },

  /** Los mismos que acepta `findActiveById`: activos y no suspendidos. */
  listSellers() {
    return User.find({ ...ACTIVE, status: { $ne: USER_STATUS.SUSPENDED } })
      .sort({ name: 1 })
      .select(PUBLIC_FIELDS)
      .lean();
  },
};
