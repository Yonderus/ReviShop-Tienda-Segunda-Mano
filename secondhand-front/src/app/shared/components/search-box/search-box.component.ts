import { ChangeDetectionStrategy, Component, OnChanges, OnDestroy, SimpleChanges, input, output, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon.component';

/**
 * Buscador con **debounce**: emite cuando el usuario deja de escribir (300 ms por defecto), no en cada tecla,
 * así no se lanza una petición por letra. Con Enter emite al momento; con Escape o la ✕ se vacía.
 * Con menos de `minLength` caracteres emite `''` (sin búsqueda). Nunca emite dos veces el mismo valor.
 *
 * `value` es el valor de fuera (p. ej. el de la URL): si cambia (atrás/adelante), el input se pone al día.
 */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="search">
      <label [for]="inputId()" class="sr-only">{{ label() }}</label>
      <div class="relative">
        <app-icon name="search" [size]="18" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          [id]="inputId()"
          type="search"
          class="field-control pl-10 pr-11"
          autocomplete="off"
          enterkeyhint="search"
          [attr.maxlength]="maxLength()"
          [placeholder]="placeholder()"
          [value]="text()"
          [attr.aria-describedby]="tooShort() ? inputId() + '-hint' : null"
          (input)="onInput($any($event.target).value)"
          (keydown.enter)="$event.preventDefault(); flush()"
          (keydown.escape)="clear()"
        />
        @if (text()) {
          <button type="button" class="icon-btn absolute right-1 top-1/2 -translate-y-1/2" aria-label="Borrar la búsqueda" (click)="clear()">
            <app-icon name="close" [size]="16" />
          </button>
        }
      </div>
      @if (tooShort()) {
        <p [id]="inputId() + '-hint'" class="field-hint" aria-live="polite">Escribe al menos {{ minLength() }} caracteres.</p>
      }
    </div>
  `,
})
export class SearchBoxComponent implements OnChanges, OnDestroy {
  readonly value = input('');
  readonly label = input('Buscar');
  readonly placeholder = input('Buscar…');
  readonly inputId = input('search-box');
  readonly debounceMs = input(300);
  readonly minLength = input(2);
  readonly maxLength = input(80);
  readonly search = output<string>();

  protected readonly text = signal('');
  protected readonly tooShort = signal(false);
  private lastEmitted = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // El valor de fuera manda (p. ej. al volver atrás en el navegador), salvo que el usuario esté escribiendo o
    // que sea el eco de lo que acabamos de emitir (si no, se borraría lo que aún está escribiendo).
    if (changes['value'] && this.timer === null && this.value() !== this.lastEmitted) {
      this.text.set(this.value());
      this.lastEmitted = this.value();
      this.tooShort.set(false);
    }
  }

  ngOnDestroy(): void {
    this.cancelTimer();
  }

  protected onInput(value: string): void {
    this.text.set(value);
    this.cancelTimer();
    this.timer = setTimeout(() => this.flush(), this.debounceMs());
  }

  /** Emite ya (Enter, o al terminar el debounce). */
  protected flush(): void {
    this.cancelTimer();
    const term = this.text().trim();
    const valid = term.length >= this.minLength();
    this.tooShort.set(term.length > 0 && !valid);
    this.emit(valid ? term : '');
  }

  protected clear(): void {
    this.cancelTimer();
    this.text.set('');
    this.tooShort.set(false);
    this.emit('');
  }

  private emit(term: string): void {
    if (term === this.lastEmitted) return;
    this.lastEmitted = term;
    this.search.emit(term);
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
