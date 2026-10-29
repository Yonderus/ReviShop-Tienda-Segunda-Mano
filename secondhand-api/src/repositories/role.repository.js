import { ROLE_STATUS } from "../constants/role.constants.js";
import { Role } from "../models/role.model.js";

// Los eliminados ya los oculta el plugin de soft delete.
const ASSIGNABLE = { isActive: true, status: ROLE_STATUS.ACTIVE };

export const roleRepository = {
  /** Los que se pueden asignar a un usuario: activos y no obsoletos. */
  listAssignable() {
    return Role.find(ASSIGNABLE).sort({ name: 1 }).select("name slug description").lean();
  },

  findAssignableById(id) {
    return Role.findOne({ _id: id, ...ASSIGNABLE }).lean();
  },

  /** Activo y no eliminado, aunque esté `deprecated` (lo conserva quien ya lo tiene). */
  findLiveById(id) {
    return Role.findOne({ _id: id, isActive: true }).lean();
  },

  findBySlug(slug) {
    return Role.findOne({ slug }).lean();
  },
};
