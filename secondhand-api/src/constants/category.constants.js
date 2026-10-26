/** Estado editorial: solo las categorías publicadas se ofrecen en el front y admiten productos. */
export const CATEGORY_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
});
export const CATEGORY_STATUSES = Object.freeze(Object.values(CATEGORY_STATUS));
