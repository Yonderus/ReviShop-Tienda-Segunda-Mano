/** Datos públicos del vendedor (GET /sellers y `product.seller`). */
export interface Seller {
  _id: string;
  name: string;
  slug: string;
  location?: string;
}
