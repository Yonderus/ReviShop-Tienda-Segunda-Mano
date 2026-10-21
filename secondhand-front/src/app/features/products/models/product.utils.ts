import { ProductImage } from './image.model';
import { ProductVariant } from './product-variant.model';
import { Product, ProductInput, ProductUpdate } from './product.model';

export function primaryImage(product: Pick<Product, 'images'>): ProductImage | undefined {
  return product.images.find((image) => image.isPrimary) ?? product.images[0];
}

export const variantPrice = (product: Pick<Product, 'basePrice'>, variant: ProductVariant): number =>
  variant.price ?? product.basePrice;

/** Precio a mostrar: el mínimo de las variantes y `from` si hay varios precios distintos. */
export function displayPrice(product: Product): { amount: number; from: boolean } {
  const prices = (product.variants ?? []).filter((v) => v.isActive).map((v) => variantPrice(product, v));
  if (prices.length === 0) return { amount: product.basePrice, from: false };
  const min = Math.min(...prices);
  return { amount: min, from: new Set(prices).size > 1 };
}

/** "Talla M · Negro"; la variante sin opciones es "Única". */
export function variantLabel(variant: Pick<ProductVariant, 'options'>): string {
  if (variant.options.length === 0) return 'Única';
  return variant.options.map((o, i) => (i === 0 ? `${capitalize(o.key)} ${o.value}` : o.value)).join(' · ');
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Lo que el formulario necesita para editar un producto cargado. */
export function productToInput(product: Product): ProductInput {
  return {
    title: product.title,
    description: product.description,
    basePrice: product.basePrice,
    condition: product.condition,
    location: product.location,
    categoryId: product.categoryId ?? product.category._id,
    sellerId: product.sellerId ?? product.seller._id,
    images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })),
  };
}

/** Solo los campos que han cambiado respecto al producto cargado (PATCH parcial). */
export function diffProduct(product: Product, input: ProductInput): ProductUpdate {
  const original = productToInput(product);
  const changes: ProductUpdate = {};
  for (const key of Object.keys(input) as (keyof ProductInput)[]) {
    const next = input[key];
    const prev = original[key];
    const same = Array.isArray(next) ? JSON.stringify(next) === JSON.stringify(prev) : (next ?? '') === (prev ?? '');
    if (!same) Object.assign(changes, { [key]: next });
  }
  return changes;
}
