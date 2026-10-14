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

export function oneOf(allowed: readonly string[]): ValidatorFn {
  return (control) => (!control.value || allowed.includes(control.value) ? null : { oneOf: true });
}

export const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
