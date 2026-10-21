import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Seller } from '../models/seller.model';

@Injectable({ providedIn: 'root' })
export class SellersService {
  private readonly api = inject(ApiService);

  list(): Promise<Seller[]> {
    return this.api.get<Seller[]>('/sellers', { skipErrorAlert: true, skipGlobalLoader: true });
  }
}
