import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "hace 3 días", "ayer", "hace un momento". Pura: se calcula al pintar, no se refresca sola. */
@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  private readonly format = new Intl.RelativeTimeFormat(inject(LOCALE_ID), { numeric: 'auto' });

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const seconds = (new Date(value).getTime() - Date.now()) / 1000;
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) return this.format.format(Math.round(seconds / size), unit);
    }
    return 'hace un momento';
  }
}
