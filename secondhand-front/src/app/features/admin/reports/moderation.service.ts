import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { READ_OPTIONS } from '../../../core/services/entity-api.service';
import { CriterionKey, ReportReason, ReviewReply, RevieweeRole } from '../../reviews/models/review.model';

export type ReportView = 'open' | 'resolved';
export type ReportStatus = 'open' | 'dismissed' | 'actioned';
export type ReportAction = 'dismiss' | 'hide';

interface Person {
  name: string;
  slug: string;
}

/** Lo denunciado, tal como lo ve el admin: la valoración completa, quién la escribió, a quién y si está oculta. */
export interface ModeratedReview {
  _id: string;
  rating: number;
  criteria: Partial<Record<CriterionKey, number>>;
  comment: string | null;
  reply: ReviewReply | null;
  revieweeRole: RevieweeRole;
  product: { title: string; slug: string };
  author: Person | null;
  reviewee: Person | null;
  publishedAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
}

/** Una pregunta denunciada: el texto, la respuesta, quién preguntó y en qué anuncio. */
export interface ModeratedQuestion {
  _id: string;
  text: string;
  answer: { text: string; answeredAt: string } | null;
  product: { title: string; slug: string } | null;
  author: Person | null;
  createdAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
}

export interface AdminReport {
  _id: string;
  targetType: 'review' | 'question';
  reason: ReportReason;
  reasonLabel: string;
  note: string | null;
  status: ReportStatus;
  reporter: Person | null;
  createdAt: string;
  resolvedBy: Person | null;
  resolvedAt: string | null;
  /** Cuántas denuncias tiene lo mismo (varias personas pueden denunciar la misma valoración). */
  reportsOnTarget: number;
  /** Según `targetType`: una valoración o una pregunta. null si lo denunciado ya no existe. */
  target: ModeratedReview | ModeratedQuestion | null;
}

export interface ReportPage {
  items: AdminReport[];
  pagination: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  counts: { open: number; resolved: number };
}

/** Solo HTTP: la moderación del panel (`/api/reports` y ocultar o restaurar valoraciones). */
@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly api = inject(ApiService);

  list(view: ReportView, page = 1, signal?: AbortSignal): Promise<ReportPage> {
    return this.api.get<ReportPage>('/reports', { ...READ_OPTIONS, params: { status: view, page, limit: 20 }, signal });
  }

  /** Solo los contadores (el resumen del panel): una página de 1. */
  async counts(): Promise<ReportPage['counts']> {
    return (await this.api.get<ReportPage>('/reports', { ...READ_OPTIONS, params: { status: 'open', limit: 1 } })).counts;
  }

  /** 409 (ya resuelta por otro admin) lo avisa el errorInterceptor; la página recarga para enseñar cómo está. */
  resolve(id: string, action: ReportAction): Promise<{ _id: string; status: ReportStatus }> {
    return this.api.patch(`/reports/${id}`, { action }, { blocking: true });
  }

  setQuestionHidden(questionId: string, hidden: boolean, reason?: string): Promise<unknown> {
    return this.api.patch(`/questions/${questionId}/hidden`, { hidden, reason }, { blocking: true });
  }

  setReviewHidden(reviewId: string, hidden: boolean, reason?: string): Promise<{ _id: string; hiddenAt: string | null; hiddenReason: string | null }> {
    return this.api.patch(`/reviews/${reviewId}/hidden`, { hidden, reason }, { blocking: true });
  }
}
