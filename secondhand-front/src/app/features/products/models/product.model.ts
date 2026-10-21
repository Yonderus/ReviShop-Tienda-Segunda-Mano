import { BadgeTone } from '../../../shared/ui/badge.component';
import { CategorySummary } from '../../catalog/models/category.model';
import { Seller } from '../../catalog/models/seller.model';
import { ProductImage, ProductImageInput } from './image.model';
import { ProductVariant } from './product-variant.model';

export const PRODUCT_CONDITIONS = ['nuevo', 'como_nuevo', 'bueno', 'aceptable', 'mejorable'] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_STATUSES = ['disponible', 'reservado', 'vendido'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: 'Nuevo',
  como_nuevo: 'Como nuevo',
  bueno: 'Buen estado',
  aceptable: 'Aceptable',
  mejorable: 'Mejorable',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

/** Escala de segunda vida: cuántos tramos de vida útil conserva el objeto (5 = nuevo). */
export const CONDITION_LEVEL: Record<ProductCondition, number> = {
  nuevo: 5,
  como_nuevo: 4,
  bueno: 3,
  aceptable: 2,
  mejorable: 1,
};

export const STATUS_TONES: Record<ProductStatus, BadgeTone> = {
  disponible: 'success',
  reservado: 'warning',
  vendido: 'neutral',
};

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  basePrice: number;
  condition: ProductCondition;
  location?: string;
  /** Calculado por la API a partir de las variantes. */
  status: ProductStatus;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  sellerId: string;
  category: CategorySummary;
  seller: Seller;
  /** En listados solo llega la portada; en el detalle, todas ordenadas. */
  images: ProductImage[];
  /** Solo en el detalle. */
  variants?: ProductVariant[];
  variantsCount: number;
}

export interface ProductInput {
  title: string;
  description: string;
  basePrice: number;
  condition: ProductCondition;
  location?: string;
  categoryId: string;
  sellerId: string;
  images: ProductImageInput[];
}

export type ProductUpdate = Partial<ProductInput>;

export type ProductSort = 'recent' | 'price-asc' | 'price-desc';

export type ProductFilters = {
  /** Slug de la categoría (incluye sus subcategorías). */
  category?: string;
  condition?: ProductCondition;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};
