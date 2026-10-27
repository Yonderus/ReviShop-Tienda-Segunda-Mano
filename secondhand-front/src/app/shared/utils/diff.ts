/**
 * Solo los campos que han cambiado (para un PATCH parcial). Los arrays se comparan por contenido y
 * null, undefined y '' cuentan como "vacío".
 */
export function changedFields<T extends object>(original: T, next: T): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const value = next[key];
    const prev = original[key];
    const same = Array.isArray(value) ? JSON.stringify(value) === JSON.stringify(prev) : (value ?? '') === (prev ?? '');
    if (!same) changes[key] = value;
  }
  return changes;
}
