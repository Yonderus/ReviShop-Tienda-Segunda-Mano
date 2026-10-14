import { BadgeTone } from '../../../shared/ui/badge.component';

export const PRODUCT_CATEGORIES = [
  'electronica',
  'ropa',
  'hogar',
  'deportes',
  'vehiculos',
  'libros',
  'juguetes',
  'otros',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CONDITIONS = ['nuevo', 'como_nuevo', 'bueno', 'aceptable', 'mejorable'] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_STATUSES = ['disponible', 'reservado', 'vendido'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  electronica: 'Electrónica',
  ropa: 'Ropa',
  hogar: 'Hogar',
  deportes: 'Deportes',
  vehiculos: 'Vehículos',
  libros: 'Libros',
  juguetes: 'Juguetes',
  otros: 'Otros',
};

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
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  location?: string;
  images: string[];
  seller: string;
  status: ProductStatus;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  location?: string;
  images: string[];
  seller: string;
  status?: ProductStatus;
}

export type ProductUpdate = Partial<ProductInput>;

export type ProductSort = 'recent' | 'price-asc' | 'price-desc';

export type ProductFilters = {
  category?: ProductCategory;
  condition?: ProductCondition;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};
