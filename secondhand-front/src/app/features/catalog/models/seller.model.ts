/** Datos públicos del vendedor (GET /sellers y `product.seller`). */
export interface Seller {
  _id: string;
  name: string;
  slug: string;
  location?: string;
  /** Solo en la ficha de la tienda (`GET /shop/products/:slug`): su nota como vendedor. */
  rating?: { average: number | null; count: number };
}
