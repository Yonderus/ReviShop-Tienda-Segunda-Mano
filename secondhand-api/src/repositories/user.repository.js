import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

const LIVE = { isActive: true, deletedAt: null };
const PUBLIC_FIELDS = "name slug location";

export const userRepository = {
  findActiveById(id) {
    return User.findOne({ _id: id, ...LIVE, status: { $ne: "suspended" } }).lean();
  },

  findBySlug(slug) {
    return User.findOne({ slug, deletedAt: null }).lean();
  },

  async findRoleIdsBySlugs(slugs) {
    return Role.find({ slug: { $in: slugs }, ...LIVE }).distinct("_id");
  },

  listByRoles(roleIds) {
    return User.find({ roleId: { $in: roleIds }, ...LIVE, status: { $ne: "suspended" } })
      .sort({ name: 1 })
      .select(PUBLIC_FIELDS)
      .lean();
  },
};
