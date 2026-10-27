import { roleRepository } from "../repositories/role.repository.js";

export const roleService = {
  /** Para el select de rol del panel. Sin CRUD: los roles los crea el seed. */
  async listAssignable() {
    return roleRepository.listAssignable();
  },
};
