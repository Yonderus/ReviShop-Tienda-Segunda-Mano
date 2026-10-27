import { Image } from "../models/image.model.js";

const ownersFilter = (ownerType, ownerIds) => ({ ownerType, ownerId: { $in: ownerIds } });

export const imageRepository = {
  /**
   * Todo o nada: si una falla, se borran las que ya se habían creado y se relanza el error.
   * En secuencia: el hook calcula un slug único y en paralelo dos imágenes podrían elegir el mismo.
   */
  async createMany(images) {
    const created = [];
    try {
      for (const image of images) created.push(await Image.create(image));
    } catch (error) {
      if (created.length) await Image.deleteMany({ _id: { $in: created.map((image) => image._id) } });
      throw error;
    }
    return created;
  },

  /** Ids de las imágenes no eliminadas de un dueño (para sustituirlas después). */
  findIdsByOwner(ownerType, ownerId) {
    return Image.find({ ownerType, ownerId }).distinct("_id");
  },

  softDeleteByIds(ids, date) {
    return Image.softDeleteMany({ _id: { $in: ids } }, date);
  },

  softDeleteByOwners(ownerType, ownerIds, date) {
    return Image.softDeleteMany(ownersFilter(ownerType, ownerIds), date);
  },

  /** Solo las que se eliminaron con esa fecha: no revive las sustituidas antes al cambiar las fotos. */
  restoreByOwners(ownerType, ownerIds, date) {
    return Image.restoreMany(ownersFilter(ownerType, ownerIds), date, { isActive: true });
  },

  /** Borrado físico: solo para deshacer una creación que falló a medias. */
  hardDeleteByOwners(ownerType, ownerIds) {
    return Image.deleteMany(ownersFilter(ownerType, ownerIds)).setOptions({ withDeleted: true });
  },
};
