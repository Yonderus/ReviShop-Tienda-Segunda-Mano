import { ProductImage } from './image.model';
import type { ProductStatus } from './product.model';

export interface VariantOption {
  key: string;
  value: string;
}

/** Lo que se envía al crear una variante; en un PATCH solo se aceptan `price` y `stock`. */
export interface VariantInput {
  options: VariantOption[];
  /** null = usa el basePrice del producto. */
  price?: number | null;
  stock?: number;
}

export interface ProductVariant {
  _id: string;
  productId: string;
  sku: string;
  slug: string;
  options: VariantOption[];
  /** "default" en la variante sin opciones. */
  optionsKey: string;
  /** null = usa el basePrice del producto. */
  price: number | null;
  stock: number;
  status: ProductStatus;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  images?: ProductImage[];
}
