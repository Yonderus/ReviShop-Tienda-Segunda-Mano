import { userRepository } from "../repositories/user.repository.js";

export const sellerService = {
  /**
   * Quién puede publicar: cualquier usuario activo y no suspendido (en Revishop todos compran y venden).
   * Solo lectura y solo campos públicos: para el select de vendedor del front.
   */
  async list() {
    return userRepository.listSellers();
  },
};
