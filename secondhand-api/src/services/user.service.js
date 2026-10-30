import { AUTH_MESSAGES } from "../constants/auth.constants.js";
import { ROLE } from "../constants/role.constants.js";
import { USER_STATUS } from "../constants/user.constants.js";
import { productRepository } from "../repositories/product.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import { profileService } from "./profile.service.js";
import { roleService } from "./role.service.js";

/*
 * El usuario es la cuenta. Su perfil (teléfono, ubicación, bio y avatar) lo gestiona `profileService`, pero
 * siempre desde aquí y junto a su usuario: nace, se edita, se desactiva, se borra y se restaura con él.
 * Hacia fuera, la API sigue devolviendo los campos del perfil dentro del usuario (el avatar, como `avatarUrl`).
 */

const USER_FIELDS = ["name", "email", "roleId", "status"];
const pickAccount = (data) => Object.fromEntries(Object.entries(data).filter(([key]) => USER_FIELDS.includes(key)));

/** Usuario con su perfil poblado → la forma de siempre: los campos del perfil al mismo nivel. */
const withProfileFields = ({ profile, ...user }) => ({ ...user, ...profileService.toFields(profile) });

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Cierra todas las sesiones abiertas del usuario: los tokens emitidos antes de ahora dejan de valer (lo
 * comprueba el middleware de auth). Se usa cuando se le quita el acceso (desactivar, suspender, borrar) o
 * cambia su contraseña: si después recupera el acceso, tiene que volver a iniciar sesión.
 */
const closeSessions = () => ({ tokensValidAfter: new Date() });

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

/** Forma de salida del panel: con los campos del perfil y cuántos productos no eliminados tiene. */
async function withCounts(users) {
  const products = await productRepository.countBySellers(users.map((u) => u._id));
  return users.map((u) => ({ ...withProfileFields(u), productsCount: products[u._id] ?? 0 }));
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
  // ── Integridad: lo que los demás services preguntan sobre un usuario ──

  /** ¿Puede vender? Existe, no está en la papelera, está activo y no suspendido. Lo usa `product.service`. */
  async assertCanSell(userId) {
    const seller = await userRepository.findActiveById(userId);
    if (!seller) throw ValidationError.forField("sellerId", "El vendedor no existe, está inactivo o está suspendido");
  },

  /**
   * ¿Puede iniciar sesión (y seguir con la sesión abierta)? Existe, no está en la papelera, está activo, no
   * suspendido y su rol sigue vivo. Devuelve su rol. Si no, 403. Lo usan el login y el middleware de auth.
   */
  async assertCanLogIn(user) {
    const canLogIn = user && !user.deletedAt && user.isActive && user.status !== USER_STATUS.SUSPENDED;
    const role = canLogIn ? await roleService.findForSession(user.roleId) : null;
    if (!role) throw new ForbiddenError(AUTH_MESSAGES.CANNOT_LOG_IN);
    return role;
  },

  // ── Lecturas ──

  /** Quién puede publicar: cualquier usuario activo y no suspendido. Solo campos públicos. */
  async listSellers() {
    // Solo la ubicación del perfil: { _id, name, slug, location }.
    return (await userRepository.listSellers()).map(({ profile, ...seller }) =>
      profile?.location ? { ...seller, location: profile.location } : seller,
    );
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

  // ── Escrituras ──

  /** Usuario, perfil y avatar nacen juntos: si el perfil o el avatar fallan, se deshace todo (sin transacciones). */
  async create(data) {
    const account = pickAccount(data);
    await assertEmailAvailable(account.email);
    await roleService.assertAssignable(account.roleId);

    const user = await userRepository.create({ ...account, passwordHash: await hashPassword(data.password) });
    try {
      await profileService.createFor(user, data);
    } catch (error) {
      await profileService.hardDeleteFor(user._id);
      await userRepository.hardDeleteById(user._id);
      throw error;
    }
    return this.getById(user._id);
  },

  /**
   * Parcial: cada campo va a su sitio (cuenta, perfil o avatar) y solo se escribe lo que llega.
   * Si llega `password` se vuelve a hashear. Cambiar la contraseña o suspender cierra todas sus sesiones.
   */
  async update(id, data) {
    const current = await findLiveUser(id);
    const account = pickAccount(data);

    if (account.email !== undefined && account.email !== current.email) await assertEmailAvailable(account.email, id);
    if (account.roleId !== undefined && String(account.roleId) !== String(current.roleId)) {
      await roleService.assertAssignable(account.roleId);
      await assertNotLastAdmin(current, "cambiar su rol");
    }
    const suspending = account.status === USER_STATUS.SUSPENDED && current.status !== USER_STATUS.SUSPENDED;
    if (suspending) await assertNotLastAdmin(current, "suspender");
    if (data.password) account.passwordHash = await hashPassword(data.password);
    if (data.password || suspending) Object.assign(account, closeSessions());

    if (Object.keys(account).length) await userRepository.updateById(id, account);
    await profileService.updateFor({ _id: current._id, name: account.name ?? current.name }, data);
    return this.getById(id);
  },

  async setActive(id, isActive) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (user.deletedAt) throw new ConflictError("El usuario está eliminado. Restáuralo antes de cambiar su visibilidad");
    if (!isActive) await assertNotLastAdmin(user, "desactivar");
    // Desactivar cierra sus sesiones: al reactivarlo tendrá que volver a iniciar sesión.
    await userRepository.updateById(id, isActive ? { isActive } : { isActive, ...closeSessions() });
    await profileService.setActiveFor(id, isActive);
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

    // Cierra sus sesiones (si se restaura, tendrá que volver a iniciar sesión) y, en cascada y con la misma
    // fecha, su perfil y su avatar.
    const date = new Date();
    await userRepository.updateById(id, closeSessions());
    await userRepository.softDeleteById(id, date);
    await profileService.softDeleteFor(id, date);
  },

  /** Vuelve inactivo salvo que se pida isActive true. Con su perfil y su avatar, si se borraron con él. */
  async restore(id, isActive = false) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (!user.deletedAt) throw new ConflictError("El usuario no está eliminado");

    await userRepository.restoreById(id, user.deletedAt, isActive);
    await profileService.restoreFor(id, user.deletedAt, isActive);
    return this.getById(id);
  },
};
