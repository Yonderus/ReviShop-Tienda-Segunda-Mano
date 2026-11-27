/** Datos públicos del vendedor (GET /sellers y `product.seller`). */
export interface Seller {
  _id: string;
  name: string;
  slug: string;
  location?: string;
  /** Solo en la ficha de la tienda (`GET /shop/products/:slug`): su nota como vendedor. */
  rating?: { average: number | null; count: number };
  /** Solo en la ficha de la tienda: mediana de lo que tarda en responder preguntas (null si aún no ha respondido). */
  responseMinutes?: number | null;
}
