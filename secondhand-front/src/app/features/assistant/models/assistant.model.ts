import { ProductCondition } from '../../products/models/product.model';

/** Lo que necesita el asistente de anuncio: lo que ya hay en el formulario. */
export interface ListingDraftInput {
  title: string;
  categoryId: string;
  condition: ProductCondition;
  /** Al editar: el propio anuncio no cuenta para el rango de precio. */
  excludeSlug?: string;
}

/**
 * Rango de precio de productos reales de la tienda (percentiles 25–75), calculado por el servidor, no por el
 * modelo. `basis`: `similar` = por título dentro de la categoría; `category` = toda la categoría (había pocos).
 */
export interface PriceRange {
  min: number;
  max: number;
  basedOn: number;
  basis: 'similar' | 'category';
}

export interface ListingDraft {
  description: string;
  priceRange: PriceRange | null;
  category: { name: string; slug: string };
}
