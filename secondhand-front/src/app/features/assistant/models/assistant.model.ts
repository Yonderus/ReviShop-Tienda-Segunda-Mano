import { Product, ProductCondition, ProductStatus } from '../../products/models/product.model';
import { ShopSort } from '../../shop/models/shop.model';

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

// ── Asistente de compra (chat)

/** Lo que se manda a la API: solo texto de `user` y `assistant` (el servidor pone sus propias instrucciones). */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Los filtros de la última búsqueda del agente, con los nombres de los query params del shop. Sirven para el
 * botón "Ver todos en la tienda".
 */
export interface AssistantShopQuery {
  search?: string;
  category?: string[];
  location?: string[];
  condition?: ProductCondition[];
  status?: ProductStatus[];
  minPrice?: number;
  maxPrice?: number;
  sort?: ShopSort;
}

/** `POST /ai/chat`. `products` son los de la API tal cual (las tarjetas no dependen del texto del modelo). */
export interface ChatResponse {
  reply: string;
  products: Product[];
  shopQuery: AssistantShopQuery | null;
}

/** Un mensaje de la conversación tal como se pinta. */
export interface ChatMessage extends ChatTurn {
  id: number;
  products: Product[];
  shopQuery: AssistantShopQuery | null;
}
