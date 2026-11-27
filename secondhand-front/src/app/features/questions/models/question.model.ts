export const QUESTION_MIN = 5;
export const QUESTION_MAX = 300;
export const ANSWER_MAX = 500;

/** Una pregunta de un anuncio, tal como la da la API. `can` lo calcula la API según quién mira. */
export interface Question {
  _id: string;
  text: string;
  /** «Usuario de Revishop» y `slug: null` si su cuenta ya no está activa. */
  asker: { name: string; slug: string | null };
  createdAt: string;
  answer: { text: string; answeredAt: string } | null;
  /** Solo la ven así el vendedor y los admin (el resto no recibe las ocultas). */
  hidden: boolean;
  can: { answer: boolean; hide: boolean; delete: boolean; report: boolean };
}

/** `GET /questions/mine/unanswered`: las que tengo sin responder en mis anuncios. */
export interface UnansweredQuestion {
  _id: string;
  text: string;
  createdAt: string;
  product: { title: string; slug: string } | null;
}

/**
 * «Suele responder en menos de 1 h» / «en unas 5 h» / «en 2 días». Redondeado y sin falsa precisión: es una
 * mediana orientativa. `null` si aún no ha respondido ninguna pregunta.
 */
export function responseTimeText(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return 'Suele responder en menos de 1 h';
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Suele responder en unas ${hours} h`;
  return `Suele responder en ${Math.round(hours / 24)} días`;
}
