import { Image } from "../models/image.model.js";

const ownersFilter = (ownerType, ownerIds) => ({ ownerType, ownerId: { $in: ownerIds } });

export const imageRepository = {
  /** En secuencia: el hook calcula un slug único y en paralelo dos imágenes podrían elegir el mismo. */
  async createMany(images) {
    const created = [];
    for (const image of images) created.push(await Image.create(image));
    return created;
  },

  softDeleteByOwners(ownerType, ownerIds, date) {
    return Image.softDeleteMany(ownersFilter(ownerType, ownerIds), date);
  },

  /** Solo las que se eliminaron con esa fecha: no revive las sustituidas antes al cambiar las fotos. */
  restoreByOwners(ownerType, ownerIds, date) {
    return Image.restoreMany(ownersFilter(ownerType, ownerIds), date, { isActive: true });
  },
};
