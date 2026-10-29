import { IMAGE_KIND, IMAGE_OWNER, IMAGE_STATUS } from "../constants/image.constants.js";
import { ROLE } from "../constants/role.constants.js";
import { PROFILE_FIELDS, USER_STATUS } from "../constants/user.constants.js";
import { imageRepository } from "../repositories/image.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";

/*
 * El perfil (teléfono, ubicación, bio y avatar) es una parte del usuario: solo este service lo crea, lo
 * edita, lo desactiva, lo borra y lo restaura, y siempre junto a su usuario. Hacia fuera, la API sigue
 * devolviendo esos campos dentro del usuario (el avatar, como `avatarUrl`).
 */

const USER_FIELDS = ["name", "email", "roleId", "status"];
const pickFields = (data, fields) => Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key)));

/** Separa lo que llega del panel: lo que va a `User`, lo que va a `Profile` y el avatar (una `Image` del perfil). */
const splitInput = (data) => ({
  account: pickFields(data, USER_FIELDS),
  profile: pickFields(data, PROFILE_FIELDS),
  avatarUrl: data.avatarUrl,
});

/**
 * Usuario con su perfil poblado → la forma de siempre: los campos del perfil al mismo nivel y `avatarUrl`.
 * El avatar cuenta si está vivo como el perfil o, en la papelera, si se borró a la vez que él.
 */
function withProfileFields({ profile, ...user }) {
  for (const field of PROFILE_FIELDS) {
    if (profile?.[field] !== undefined) user[field] = profile[field];
  }
  const avatar = profile?.avatar;
  if (avatar && +(avatar.deletedAt ?? 0) === +(profile.deletedAt ?? 0)) user.avatarUrl = avatar.url;
  return user;
}

const buildAvatar = (profile, user, url) => ({
  ownerType: IMAGE_OWNER.PROFILE,
  ownerId: profile._id,
  kind: IMAGE_KIND.AVATAR,
  url,
  alt: `Avatar de ${user.name}`,
  isPrimary: true,
  uploadedBy: user._id,
  status: IMAGE_STATUS.READY,
});

/**
 * Cambia el avatar como las fotos de un producto: primero crea el nuevo y solo después retira el anterior,
 * así un fallo no deja el perfil sin foto. `url` null = quitarlo.
 */
async function replaceAvatar(profile, user, url) {
  const previousIds = await imageRepository.findIdsByOwner(IMAGE_OWNER.PROFILE, profile._id);
  if (url) await imageRepository.createMany([buildAvatar(profile, user, url)]);
  if (previousIds.length) await imageRepository.softDeleteByIds(previousIds, new Date());
}

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

  /**
   * Usuario, perfil y avatar nacen juntos: si el perfil o el avatar fallan, se deshace todo (sin transacciones).
   * Las imágenes a medias ya las borra `createMany`.
   */
  async create(data) {
    const { account, profile, avatarUrl } = splitInput(data);
    await assertEmailAvailable(account.email);
    await assertRole(account.roleId);

    const user = await userRepository.create({ ...account, passwordHash: await hashPassword(data.password) });
    try {
      const created = await profileRepository.create({ ...profile, userId: user._id });
      if (avatarUrl) await imageRepository.createMany([buildAvatar(created, user, avatarUrl)]);
    } catch (error) {
      await profileRepository.hardDeleteByUserId(user._id);
      await userRepository.hardDeleteById(user._id);
      throw error;
    }
    return this.getById(user._id);
  },

  /**
   * Parcial: cada campo va a su documento (cuenta, perfil o avatar) y solo se escribe el que cambia.
   * Si llega `password` se vuelve a hashear; si no, la contraseña no cambia. `avatarUrl: null` quita la foto.
   */
  async update(id, data) {
    const current = await findLiveUser(id);
    const { account, profile, avatarUrl } = splitInput(data);

    if (account.email !== undefined && account.email !== current.email) await assertEmailAvailable(account.email, id);
    if (account.roleId !== undefined && String(account.roleId) !== String(current.roleId)) {
      await assertRole(account.roleId);
      await assertNotLastAdmin(current, "cambiar su rol");
    }
    if (account.status === USER_STATUS.SUSPENDED && current.status !== USER_STATUS.SUSPENDED) {
      await assertNotLastAdmin(current, "suspender");
    }
    if (data.password) account.passwordHash = await hashPassword(data.password);

    if (Object.keys(account).length) await userRepository.updateById(id, account);
    if (Object.keys(profile).length) await profileRepository.updateByUserId(id, profile);
    if (avatarUrl !== undefined) {
      const ownProfile = await profileRepository.findByUserId(id);
      await replaceAvatar(ownProfile, { _id: current._id, name: account.name ?? current.name }, avatarUrl);
    }
    return this.getById(id);
  },

  async setActive(id, isActive) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (user.deletedAt) throw new ConflictError("El usuario está eliminado. Restáuralo antes de cambiar su visibilidad");
    if (!isActive) await assertNotLastAdmin(user, "desactivar");
    await userRepository.updateById(id, { isActive });
    await profileRepository.setActiveByUserId(id, isActive);
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

    // En cascada y con la misma fecha: perfil y su avatar.
    const profile = await profileRepository.findByUserId(id);
    const date = new Date();
    await userRepository.softDeleteById(id, date);
    await profileRepository.softDeleteByUserId(id, date);
    await imageRepository.softDeleteByOwners(IMAGE_OWNER.PROFILE, [profile._id], date);
  },

  /** Vuelve inactivo salvo que se pida isActive true. Con su perfil y su avatar, si se borraron con él. */
  async restore(id, isActive = false) {
    const user = await userRepository.findRawById(id);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (!user.deletedAt) throw new ConflictError("El usuario no está eliminado");

    const profile = await profileRepository.findRawByUserId(id);
    await userRepository.restoreById(id, user.deletedAt, isActive);
    await profileRepository.restoreByUserId(id, user.deletedAt, isActive);
    await imageRepository.restoreByOwners(IMAGE_OWNER.PROFILE, [profile._id], user.deletedAt);
    return this.getById(id);
  },
};

