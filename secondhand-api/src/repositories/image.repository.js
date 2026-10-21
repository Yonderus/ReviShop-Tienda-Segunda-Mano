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
    return Image.updateMany({ ...ownersFilter(ownerType, ownerIds), deletedAt: null }, { deletedAt: date, isActive: false });
  },

  restoreByOwners(ownerType, ownerIds, date) {
    return Image.updateMany({ ...ownersFilter(ownerType, ownerIds), deletedAt: date }, { deletedAt: null, isActive: true });
  },
};
