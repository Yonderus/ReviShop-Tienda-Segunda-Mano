import { formatCurrency } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/** "380 €" para enteros y "890,50 €" con decimales (nunca "890,5 €"). */
@Pipe({ name: 'price', standalone: true })
export class PricePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const digits = Number.isInteger(value) ? '1.0-0' : '1.2-2';
    return formatCurrency(value, this.locale, '€', 'EUR', digits);
  }
}
