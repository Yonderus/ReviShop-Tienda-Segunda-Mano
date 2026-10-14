import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { describeError } from '../../utils/form-errors';

/** Región aria-live siempre presente: el lector de pantalla anuncia el mensaje cuando aparece. */
@Component({
  selector: 'app-form-field-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-live': 'polite' },
  template: `
    @if (message(); as text) {
      <p [id]="errorId()" class="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">{{ text }}</p>
    }
  `,
})
export class FormFieldErrorComponent {
  readonly errorId = input.required<string>();
  readonly errors = input<ValidationErrors | null>(null);
  readonly show = input(false);
  readonly label = input.required<string>();

  protected readonly message = computed(() =>
    this.show() ? describeError(this.errors(), this.label()) : null,
  );
}
