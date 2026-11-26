import type { BadgeTone } from '../../../shared/ui/badge.component';

/** El estado del REGISTRO de la venta (no confundir con el estado de venta del producto: disponible, reservado…). */
export const SALE_STATES = ['pending', 'confirmed', 'rejected', 'cancelled', 'expired'] as const;
export type SaleState = (typeof SALE_STATES)[number];

/** Desde qué lado se mira: mis ventas o mis compras. */
export type SaleRole = 'seller' | 'buyer';

export type SaleCloseReason = 'buyer_rejected' | 'seller_cancelled' | 'product_deleted' | 'variant_deleted' | 'expired';

export const SALE_STATE_LABELS: Record<SaleState, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  expired: 'Caducada',
};

export const SALE_STATE_TONES: Record<SaleState, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'neutral',
  cancelled: 'neutral',
  expired: 'neutral',
};

/** Por qué se cerró sin confirmar, contado desde cada lado. */
export const CLOSE_REASON_TEXT: Record<SaleCloseReason, Record<SaleRole, string>> = {
  buyer_rejected: { seller: 'El comprador dijo que no había sido él.', buyer: 'Dijiste que no habías sido tú.' },
  seller_cancelled: { seller: 'La cancelaste.', buyer: 'El vendedor la canceló.' },
  product_deleted: { seller: 'Se retiró el anuncio.', buyer: 'El vendedor retiró el anuncio.' },
  variant_deleted: { seller: 'Se borró esa variante.', buyer: 'El vendedor borró esa variante.' },
  expired: { seller: 'El comprador no la confirmó a tiempo.', buyer: 'No la confirmaste a tiempo.' },
};

export interface SaleParty {
  _id: string;
  name: string;
  slug: string;
}

/** Una venta vista por una de sus partes. La API nunca manda emails. */
export interface Sale {
  _id: string;
  status: SaleState;
  role: SaleRole;
  productId: string;
  variantId: string;
  /** Copia de lo vendido al registrar la venta: se mantiene aunque el anuncio cambie o se borre. */
  product: { title: string; slug: string; variantLabel: string | null; price: number; imageUrl: string | null };
  seller: SaleParty | null;
  buyer: SaleParty | null;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  reviewWindowEndsAt: string | null;
  closedAt: string | null;
  closeReason: SaleCloseReason | null;
  /** Lo que puede hacer ahora quien la mira: lo decide la API, el front no repite las reglas. */
  can: { confirm: boolean; reject: boolean; cancel: boolean; review: boolean };
}

export interface SalePage {
  items: Sale[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export interface SalesQuery {
  as: SaleRole;
  status?: SaleState;
  productId?: string;
  page?: number;
  limit?: number;
}

/** Las que ocupan una variante: mientras exista una, no se puede registrar otra. */
export const isLiveSale = (sale: Pick<Sale, 'status'>): boolean => sale.status === 'pending' || sale.status === 'confirmed';
