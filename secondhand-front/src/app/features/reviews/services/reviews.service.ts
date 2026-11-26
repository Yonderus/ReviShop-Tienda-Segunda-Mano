import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { READ_OPTIONS } from '../../../core/services/entity-api.service';
import { OwnReview, PublicProfile, PublicReview, ReportReason, ReviewInput, ReviewPage, RevieweeRole } from '../models/review.model';

/** Solo HTTP: valorar, responder, denunciar y lo público (perfil y valoraciones). */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly api = inject(ApiService);

  /** 409 (ya valorada, fuera de plazo) y 422 (campos) los pinta el formulario. */
  create(saleId: string, input: ReviewInput): Promise<OwnReview> {
    return this.api.post<OwnReview>(`/sales/${saleId}/review`, input, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  reply(reviewId: string, text: string): Promise<PublicReview> {
    return this.api.post<PublicReview>(`/reviews/${reviewId}/reply`, { text }, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  report(reviewId: string, reason: ReportReason, note?: string): Promise<{ _id: string; status: string }> {
    return this.api.post(`/reviews/${reviewId}/report`, { reason, note }, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  profile(slug: string): Promise<PublicProfile> {
    return this.api.get<PublicProfile>(`/shop/sellers/${encodeURIComponent(slug)}`, READ_OPTIONS);
  }

  list(slug: string, query: { role: RevieweeRole; rating?: number | null; page?: number }, signal?: AbortSignal): Promise<ReviewPage> {
    return this.api.get<ReviewPage>(`/shop/sellers/${encodeURIComponent(slug)}/reviews`, {
      ...READ_OPTIONS,
      params: { role: query.role, rating: query.rating, page: query.page, limit: 10 },
      signal,
    });
  }
}
