export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Slug libre en la colección del modelo: añade -2, -3… si ya existe (ignora el propio documento).
 * Cuenta también los eliminados: su slug sigue ocupado en el índice único.
 */
export async function uniqueSlug(Model, base, excludeId = null) {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let n = 2; ; n++) {
    const filter = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    if (!(await Model.exists(filter).setOptions({ withDeleted: true }))) return candidate;
    candidate = `${root}-${n}`;
  }
}
