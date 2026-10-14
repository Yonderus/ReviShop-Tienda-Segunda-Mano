import { animate, style, transition, trigger } from '@angular/animations';

/** La fila se desliza y desvanece al salir de la lista (pasa a otra pestaña o a la papelera). */
export const rowLeave = trigger('rowLeave', [
  transition(':leave', [animate('220ms cubic-bezier(0.4, 0, 1, 1)', style({ opacity: 0, transform: 'translateX(12px)' }))]),
]);

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
