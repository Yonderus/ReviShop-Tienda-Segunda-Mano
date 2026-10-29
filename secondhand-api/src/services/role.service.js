import { roleRepository } from "../repositories/role.repository.js";
import { ValidationError } from "../utils/AppError.js";

/*
 * Integridad: las reglas sobre un rol las responde este service y las usan los demás (no hay un service de
 * integridad aparte). Si algún día hay CRUD de roles, aquí irá también "no se borra un rol que alguien tiene".
 */
export const roleService = {
  /** Para el select de rol del panel. Sin CRUD: los roles los crea el seed. */
  async listAssignable() {
    return roleRepository.listAssignable();
  },

  /** ¿Se puede asignar? Existe, no está en la papelera, está activo y no es `deprecated`. Si no, 422 `roleId`. */
  async assertAssignable(roleId) {
    const role = await roleRepository.findAssignableById(roleId);
    if (!role) throw ValidationError.forField("roleId", "El rol no existe o ya no se puede asignar");
    return role;
  },

  /**
   * El rol de alguien que inicia sesión: tiene que existir, no estar en la papelera y estar activo. Uno
   * `deprecated` sí vale: se conserva para quien ya lo tiene. Devuelve null si no.
   */
  findForSession(roleId) {
    return roleRepository.findLiveById(roleId);
  },
};
