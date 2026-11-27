import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { READ_OPTIONS } from '../../../core/services/entity-api.service';
import { ReportReason } from '../../reviews/models/review.model';
import { Question, UnansweredQuestion } from '../models/question.model';

/** Solo HTTP: las preguntas de los anuncios. Qué puede hacer cada uno lo dice la API en `question.can`. */
@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly api = inject(ApiService);

  /** Públicas; con sesión, cada una trae `can` y el vendedor ve también las ocultas. */
  list(slug: string): Promise<Question[]> {
    return this.api.get<Question[]>(`/shop/products/${encodeURIComponent(slug)}/questions`, READ_OPTIONS);
  }

  /** 422 (texto), 403 y 429 los pinta el formulario. */
  ask(productId: string, text: string): Promise<Question> {
    return this.api.post<Question>(`/products/${productId}/questions`, { text }, { inlineErrorStatuses: [403, 409, 422, 429], blocking: true });
  }

  answer(id: string, text: string): Promise<Question> {
    return this.api.post<Question>(`/questions/${id}/answer`, { text }, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  setHidden(id: string, hidden: boolean): Promise<Question> {
    return this.api.patch<Question>(`/questions/${id}/hidden`, { hidden }, { blocking: true });
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/questions/${id}`, { blocking: true });
  }

  report(id: string, reason: ReportReason): Promise<unknown> {
    return this.api.post(`/questions/${id}/report`, { reason }, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  mineUnanswered(): Promise<UnansweredQuestion[]> {
    return this.api.get<UnansweredQuestion[]>('/questions/mine/unanswered', READ_OPTIONS);
  }
}
