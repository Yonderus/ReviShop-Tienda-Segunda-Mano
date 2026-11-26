/** A quién se valora: al vendedor (lo hace el comprador) o al comprador (lo hace el vendedor). */
export type RevieweeRole = 'seller' | 'buyer';

export type CriterionKey = 'asDescribed' | 'communication' | 'punctuality';

/** Los criterios de cada lado, en el orden en que se preguntan (los mismos que la API). */
export const REVIEW_CRITERIA: Record<RevieweeRole, readonly CriterionKey[]> = {
  seller: ['asDescribed', 'communication', 'punctuality'],
  buyer: ['communication', 'punctuality'],
};

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  asDescribed: 'Estado como se anunciaba',
  communication: 'Trato y comunicación',
  punctuality: 'Puntualidad',
};

/** Con esta nota o menos, el comentario es obligatorio (como en la API). */
export const REVIEW_LOW_RATING = 2;
export const REVIEW_COMMENT_MIN_WHEN_LOW = 20;
export const REVIEW_COMMENT_MAX = 1000;
export const REVIEW_REPLY_MAX = 500;

export type ReviewCriteria = Partial<Record<CriterionKey, number>>;

export interface ReviewInput {
  rating: number;
  criteria: ReviewCriteria;
  comment?: string;
}

export interface ReviewReply {
  text: string;
  createdAt: string;
}

/** Una valoración tal como se ve en público. */
export interface PublicReview {
  _id: string;
  revieweeRole: RevieweeRole;
  rating: number;
  criteria: ReviewCriteria;
  comment: string | null;
  reply: ReviewReply | null;
  product: { title: string; slug: string };
  /** «Usuario de Revishop» y `slug: null` si su cuenta ya no está activa. */
  reviewer: { name: string; slug: string | null };
  publishedAt: string;
}

/** Mi valoración, también antes de publicarse. */
export interface OwnReview {
  _id: string;
  rating: number;
  criteria: ReviewCriteria;
  comment: string | null;
  reply: ReviewReply | null;
  /** Cuándo es (o será) pública: cuando valore el otro o al terminar la ventana. */
  visibleAt: string;
  isPublished: boolean;
  createdAt: string;
}

/** Las medias de un papel: nota, cuántas, barras de 5 a 1 y media de cada criterio. */
export interface RatingSummary {
  average: number | null;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  criteria: ReviewCriteria;
}

/** `GET /shop/sellers/:slug`. */
export interface PublicProfile {
  _id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  memberSince: string;
  salesCount: number;
  ratings: { asSeller: RatingSummary; asBuyer: RatingSummary };
}

export interface ReviewPage {
  items: PublicReview[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export const REPORT_REASONS = ['insultos', 'datos_personales', 'no_tiene_que_ver', 'spam', 'otro'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  insultos: 'Insultos o faltas de respeto',
  datos_personales: 'Datos personales',
  no_tiene_que_ver: 'No tiene que ver con la venta',
  spam: 'Spam o publicidad',
  otro: 'Otro motivo',
};

/** "4,5" con coma; sin valoraciones, "–". */
export const formatRating = (value: number | null | undefined): string =>
  value === null || value === undefined ? '–' : value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
