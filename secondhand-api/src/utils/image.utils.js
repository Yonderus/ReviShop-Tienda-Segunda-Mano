import { IMAGE_KIND } from "../constants/image.constants.js";

/** Papel de una foto de producto según su posición: la primera es la portada y el resto, galería. */
export const imagePosition = (index) => ({
  kind: index === 0 ? IMAGE_KIND.COVER : IMAGE_KIND.GALLERY,
  isPrimary: index === 0,
  order: index,
});
