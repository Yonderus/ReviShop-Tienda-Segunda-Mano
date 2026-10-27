import { IMAGE_OWNER } from "../constants/image.constants.js";
import { ROLE } from "../constants/role.constants.js";
import { USER_STATUS } from "../constants/user.constants.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";

const WRITABLE_FIELDS = ["name", "email", "roleId", "phone", "location", "bio", "status"];
const pick = (data) => Object.fromEntries(Object.entries(data).filter(([key]) => WRITABLE_FIELDS.includes(key)));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

async function findLiveUser(id) {
  const user = await userRepository.findRawById(id);
  if (!user || user.deletedAt) throw new NotFoundError("Usuario no encontrado");
  return user;
}

/** El índice único también cuenta los de la papelera: en ese caso lo que toca es restaurarlo. */
async function assertEmailAvailable(email, excludeId) {
  const existing = await userRepository.findRawByEmail(email);
  if (!existing || String(existing._id) === String(excludeId)) return;
  throw ConflictError.forField(
    "email",
    existing.deletedAt
      ? "Ese email es de un usuario que está en la papelera: restáuralo en vez de crear otro"
      : "Ya existe un usuario con ese email",
  );
}

async function assertRole(roleId) {
  const role = await roleRepository.findAssignableById(roleId);
  if (!role) throw ValidationError.forField("roleId", "El rol no existe o ya no se puede asignar");
}

/**
 * Siempre debe quedar al menos un admin que pueda entrar (no eliminado, activo y no suspendido).
 * `action` completa el mensaje: "eliminar", "desactivar"…
 */
async function assertNotLastAdmin(user, action) {
  const admin = await roleRepository.findBySlug(ROLE.ADMIN);
  const counts = admin && String(user.roleId) === String(admin._id) && user.isActive && user.status !== USER_STATUS.SUSPENDED;
  if (!counts) return;
  if ((await userRepository.countActiveWithRole(admin._id)) <= 1) {
    throw new ConflictError(`Es el único administrador activo: no se puede ${action}. Dale antes el rol de administrador a otro usuario.`);
  }
}

/** Añade a cada usuario cuántos productos no eliminados tiene. */
async function withCounts(users) {
  const products = await productRepository.countBySellers(users.map((u) => u._id));
  return users.map((u) => ({ ...u, productsCount: products[u._id] ?? 0 }));
}

/** Filtros del panel. El rol llega por slug; si no existe, no hay resultados (null). */
async function buildFilters(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.role) {
    const role = await roleRepository.findBySlug(query.role);
    if (!role) return null;
    filter.roleId = role._id;
  }
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  return filter;
}

async function listWith(query, extra) {
  const filter = await buildFilters(query);
  return filter ? withCounts(await userRepository.findAll({ ...filter, ...extra })) : [];
}

export const userService = {
  /** Quién puede publicar: cualquier usuario activo y no suspendido. Solo campos públicos. */
  async listSellers() {
    return userRepository.listSellers();
  },

  async list(query = {}) {
    return listWith(query, {});
  },

  async listActives(query = {}) {
    return listWith({ ...query, isActive: undefined }, { isActive: true });
  },

  async listInactives(query = {}) {
    return listWith({ ...query, isActive: undefined }, { isActive: false });
  },

  async listTrashed(query = {}) {
    const filter = await buildFilters(query);
    return filter ? withCounts(await userRepository.findTrashed(filter)) : [];
  },

  async getById(id) {
    const user = await userRepository.findDetailById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    return (await withCounts([user]))[0];
  },

  async getBySlug(slug) {
    const user = await userRepository.findDetailBySlug(slug);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    return (await withCounts([user]))[0];
  },

  async create(data) {
    const input = pick(data);
    await assertEmailAvailable(input.email);
    await assertRole(input.roleId);
    const user = await userRepository.create({ ...input, passwordHash: await hashPassword(data.password) });
    return this.getById(user._id);
  },

  /** Parcial. Si llega `password` se vuelve a hashear; si no, la contraseña no cambia. */
  async update(id, data) {
    const current = await findLiveUser(id);
    const input = pick(data);

    if (input.email !== undefined && input.email !== current.email) await assertEmailAvailable(input.email, id);
    if (input.roleId !== undefined && String(input.roleId) !== String(current.roleId)) {
      await assertRole(input.roleId);
      await assertNotLastAdmin(current, "cambiar su rol");
    }
    if (input.status === USER_STATUS.SUSPENDED && current.status !== USER_STATUS.SUSPENDED) {
      await assertNotLastAdmin(current, "suspender");
    }
    if (data.password) input.passwordHash = await hashPassword(data.password);

    await userRepository.updateById(id, input);
    return this.getById(id);
  },

  async setActive(id, isActive) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (user.deletedAt) throw new ConflictError("El usuario está eliminado. Restáuralo antes de cambiar su visibilidad");
    if (!isActive) await assertNotLastAdmin(user, "desactivar");
    await userRepository.updateById(id, { isActive });
    return this.getById(id);
  },

  /** No se puede eliminar con productos: sus anuncios se quedarían sin vendedor. Desactivarlo sí. */
  async softDelete(id) {
    const user = await findLiveUser(id);
    await assertNotLastAdmin(user, "eliminar");
    const products = (await productRepository.countBySellers([id]))[id] ?? 0;
    if (products) {
      throw new ConflictError(
        `No se puede eliminar: tiene ${plural(products, "producto", "productos")}. Desactívalo o suspéndelo si no quieres que venda.`,
      );
    }

    const date = new Date();
    await userRepository.softDeleteById(id, date);
    await imageRepository.softDeleteByOwners(IMAGE_OWNER.USER, [id], date);
  },

  /** Vuelve inactivo salvo que se pida isActive true. Con su avatar, si se borró con él. */
  async restore(id, isActive = false) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (!user.deletedAt) throw new ConflictError("El usuario no está eliminado");

    await userRepository.restoreById(id, user.deletedAt, isActive);
    await imageRepository.restoreByOwners(IMAGE_OWNER.USER, [id], user.deletedAt);
    return this.getById(id);
  },
};

