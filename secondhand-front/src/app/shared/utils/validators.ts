import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

export const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.length > 0 && control.value.trim().length === 0
    ? { blank: true }
    : null;

export function greaterThan(min: number): ValidatorFn {
  return (control) => {
    const value = control.value;
    if (value === null || value === '' || value === undefined) return null;
    return Number(value) > min ? null : { greaterThan: { min } };
  };
}

/** Valida con el parser nativo `URL` y exige http/https. */
export const httpUrl: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
};

export const uniqueValues: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!(control instanceof FormArray)) return null;
  const values = control.controls.map((c) => String(c.value ?? '').trim()).filter(Boolean);
  return new Set(values).size === values.length ? null : { duplicateValues: true };
};

/** En un FormArray de grupos: el campo `field` no puede repetirse entre elementos. */
export function uniqueField(field: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormArray)) return null;
    const values = control.controls.map((c) => String(c.get(field)?.value ?? '').trim()).filter(Boolean);
    return new Set(values).size === values.length ? null : { duplicateValues: true };
  };
}

export const integer: ValidatorFn = (control) => {
  const value = control.value;
  if (value === null || value === '' || value === undefined) return null;
  return Number.isInteger(Number(value)) ? null : { integer: true };
};

/** Teléfono escrito a mano: números, espacios y + ( ) -. */
export const phoneNumber: ValidatorFn = (control) =>
  /^[\d\s+()-]*$/.test(String(control.value ?? '')) ? null : { phoneNumber: true };

/** Identificadores internos ("talla", "talla_zapato"): minúsculas sin acentos, números y guiones bajos. */
export const lowerSnakeCase: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();
  return !value || /^[a-z0-9_]+$/.test(value) ? null : { lowerSnakeCase: true };
};

/** Un texto con elementos separados por comas: sin repetidos y cada uno de `max` caracteres como mucho. */
export function commaList(max: number): ValidatorFn {
  return (control) => {
    const items = splitList(String(control.value ?? ''));
    if (items.some((item) => item.length > max)) return { itemMaxLength: { max } };
    return new Set(items).size === items.length ? null : { duplicateValues: true };
  };
}

export const splitList = (text: string): string[] =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function oneOf(allowed: readonly string[]): ValidatorFn {
  return (control) => (!control.value || allowed.includes(control.value) ? null : { oneOf: true });
}

export const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
