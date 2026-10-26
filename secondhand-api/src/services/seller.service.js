import { ROLE } from "../constants/role.constants.js";
import { userRepository } from "../repositories/user.repository.js";

/** Roles que pueden publicar productos: son los que salen en el select de vendedor. */
const SELLER_ROLES = [ROLE.SELLER, ROLE.ADMIN];

export const sellerService = {
  /** Solo lectura y solo campos públicos: para el select de vendedor del front. */
  async list() {
    const roleIds = await userRepository.findRoleIdsBySlugs(SELLER_ROLES);
    return userRepository.listByRoles(roleIds);
  },
};
