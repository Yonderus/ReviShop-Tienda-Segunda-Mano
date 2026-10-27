export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Primer valor libre a partir de `base`: base, base-2, base-3… mientras `isTaken` diga que está ocupado.
 * Sirve para slugs y SKU. Recibe la comprobación como función para no depender de la base de datos.
 */
export async function withNumericSuffix(base, isTaken) {
  let candidate = base;
  for (let n = 2; await isTaken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

/**
 * Slug libre en la colección del modelo (ignora el propio documento). Cuenta también los eliminados: su
 * slug sigue ocupado en el índice único.
 */
export function uniqueSlug(Model, base, excludeId = null) {
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  const isTaken = (slug) => Model.exists({ slug, ...exclude }).setOptions({ withDeleted: true });
  return withNumericSuffix(slugify(base) || "item", isTaken);
}
