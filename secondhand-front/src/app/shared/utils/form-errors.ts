import { AbstractControl, ValidationErrors } from '@angular/forms';
import { ApiFieldError } from '../../core/models/api-error.model';

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
  email: () => 'Introduce un email válido, como nombre@dominio.com.',
  phoneNumber: () => 'Usa solo números, espacios y los signos + ( ) -.',
  lowerSnakeCase:() => 'Usa solo minúsculas sin acentos, números y guiones bajos (ej.: talla_zapato).',
  duplicateValues: (label) => `${label} no puede tener elementos repetidos.`,
  itemMaxLength: (label, v) => `Cada elemento de ${label.toLowerCase()} puede tener como mucho ${v['max']} caracteres.`,
  min: (label, v) => `${label} debe ser mayor o igual que ${v['min']}.`,
  integer: (label) => `${label} debe ser un número entero.`,
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

/**
 * Pinta cada error del backend junto a su control (`form.get` acepta rutas como "images.0.url") y
 * devuelve los que no tienen dónde mostrarse, para el aviso general del formulario. El error desaparece
 * solo en cuanto se edita el campo, porque los validadores vuelven a calcular sus errores.
 */
export function applyServerErrors(form: AbstractControl, errors: readonly ApiFieldError[]): ApiFieldError[] {
  const unplaced: ApiFieldError[] = [];
  for (const error of errors) {
    const control = error.field ? form.get(error.field) : null;
    if (!control) {
      unplaced.push(error);
      continue;
    }
    control.setErrors({ ...control.errors, server: { message: error.message } });
    control.markAsTouched();
  }
  return unplaced;
}
