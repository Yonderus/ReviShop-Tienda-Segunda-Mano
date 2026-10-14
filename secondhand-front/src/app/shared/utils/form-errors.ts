import { ValidationErrors } from '@angular/forms';

type Describer = (label: string, value: Record<string, unknown>) => string;

const DESCRIBERS: Record<string, Describer> = {
  required: (label) => `${label} es un campo obligatorio.`,
  blank: (label) => `${label} no puede contener solo espacios.`,
  minlength: (label, v) => `${label} debe tener al menos ${v['requiredLength']} caracteres.`,
  maxlength: (label, v) => `${label} no puede superar los ${v['requiredLength']} caracteres.`,
  pattern: () => 'Introduce un número válido con hasta 2 decimales.',
  greaterThan: (label, v) => `${label} debe ser mayor que ${v['min']}.`,
  oneOf: () => 'Selecciona una de las opciones disponibles.',
  url: () => 'Introduce una URL válida que empiece por http:// o https://.',
  duplicate: () => 'Ya existe un producto con ese título. Prueba con otro.',
  server: (_label, v) => String(v['message'] ?? 'Este valor no es válido.'),
};

/** Devuelve el mensaje del primer error, en español y con el nombre del campo. */
export function describeError(errors: ValidationErrors | null, label: string): string | null {
  if (!errors) return null;
  const [key, value] = Object.entries(errors)[0] ?? [];
  if (!key) return null;
  const describe = DESCRIBERS[key];
  return describe ? describe(label, typeof value === 'object' && value ? value : {}) : `${label} no es válido.`;
}
