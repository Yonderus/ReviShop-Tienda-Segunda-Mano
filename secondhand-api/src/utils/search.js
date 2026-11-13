/** Escapa los caracteres especiales de una expresión regular: lo que escribe el usuario se busca tal cual. */
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Cada vocal (y la n) coincide con sus variantes con tilde: "telefono" encuentra "Teléfono" y "teléfono".
const ACCENT_CLASSES = {
  a: "[aáàäâ]",
  e: "[eéèëê]",
  i: "[iíìïî]",
  o: "[oóòöô]",
  u: "[uúùüû]",
  n: "[nñ]",
};

/**
 * Patrón que busca `text` sin distinguir tildes (con la opción "i", tampoco mayúsculas). El texto se escapa
 * antes: no se puede inyectar ninguna expresión regular.
 */
export function accentInsensitivePattern(text) {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return escapeRegex(base).replace(/[aeioun]/g, (char) => ACCENT_CLASSES[char]);
}
