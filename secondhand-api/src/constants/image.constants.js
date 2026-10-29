/**
 * Dueños posibles de una imagen. Son los nombres exactos de los modelos porque `refPath` los usa para
 * resolver la referencia: un nombre mal escrito no da error, simplemente no encuentra nada.
 */
export const IMAGE_OWNER = Object.freeze({
  // El avatar es un dato del perfil, no de la cuenta.
  PROFILE: "Profile",
  CATEGORY: "Category",
  PRODUCT: "Product",
  PRODUCT_VARIANT: "ProductVariant",
});
export const IMAGE_OWNER_TYPES = Object.freeze(Object.values(IMAGE_OWNER));

/** Papel de la imagen: avatar del perfil, icono de categoría, o portada y galería de un producto. */
export const IMAGE_KIND = Object.freeze({
  AVATAR: "avatar",
  ICON: "icon",
  COVER: "cover",
  GALLERY: "gallery",
});
export const IMAGE_KINDS = Object.freeze(Object.values(IMAGE_KIND));

/** Estado del procesado. Mientras no haya subida de archivos, las imágenes nacen ya en READY. */
export const IMAGE_STATUS = Object.freeze({
  PENDING: "pending",
  READY: "ready",
  FAILED: "failed",
});
export const IMAGE_STATUSES = Object.freeze(Object.values(IMAGE_STATUS));
