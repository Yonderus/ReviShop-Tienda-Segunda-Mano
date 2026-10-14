import { Product, ProductInput, ProductUpdate } from './product.model';

/** Solo los campos que han cambiado respecto al producto cargado. */
export function diffProduct(product: Product, input: ProductInput): ProductUpdate {
  const changes: ProductUpdate = {};
  for (const key of Object.keys(input) as (keyof ProductInput)[]) {
    const next = input[key];
    const prev = product[key];
    const same = Array.isArray(next) ? JSON.stringify(next) === JSON.stringify(prev) : (next ?? '') === (prev ?? '');
    if (!same) Object.assign(changes, { [key]: next });
  }
  return changes;
}
