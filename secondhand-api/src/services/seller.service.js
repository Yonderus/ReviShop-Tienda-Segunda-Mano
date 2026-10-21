import { userRepository } from "../repositories/user.repository.js";

const SELLER_ROLES = ["seller", "admin"];

export const sellerService = {
  /** Solo lectura y solo campos públicos: para el select de vendedor del front. */
  async list() {
    const roleIds = await userRepository.findRoleIdsBySlugs(SELLER_ROLES);
    return userRepository.listByRoles(roleIds);
  },
};
