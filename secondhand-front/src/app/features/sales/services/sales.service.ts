import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Sale, SalePage, SalesQuery } from '../models/sale.model';

/** Solo HTTP: `/api/sales`. Las reglas (quién confirma, quién cancela) las decide la API y llegan en `sale.can`. */
@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly api = inject(ApiService);

  /** 409 (ya tiene una venta) y 422 (email) los pinta el formulario, junto al campo. */
  register(variantId: string, buyerEmail: string): Promise<Sale> {
    return this.api.post<Sale>('/sales', { variantId, buyerEmail }, { inlineErrorStatuses: [409, 422], blocking: true });
  }

  /** Las cargas pintan su error en la pantalla (con Reintentar), sin modal. */
  mine(query: SalesQuery, signal?: AbortSignal): Promise<SalePage> {
    return this.api.get<SalePage>('/sales/mine', { params: { ...query }, signal, skipErrorAlert: true, skipGlobalLoader: true });
  }

  confirm(id: string): Promise<Sale> {
    return this.api.post<Sale>(`/sales/${id}/confirm`, {}, { blocking: true });
  }

  reject(id: string): Promise<Sale> {
    return this.api.post<Sale>(`/sales/${id}/reject`, {}, { blocking: true });
  }

  cancel(id: string): Promise<Sale> {
    return this.api.post<Sale>(`/sales/${id}/cancel`, {}, { blocking: true });
  }
}
