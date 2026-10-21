import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldErrorComponent } from '../../../../shared/components/form-field-error/form-field-error.component';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { httpUrl, notBlank } from '../../../../shared/utils/validators';
import { ProductImageInput } from '../../models/image.model';

export const MAX_IMAGES = 5;

export type ImageGroup = FormGroup<{ url: FormControl<string>; alt: FormControl<string> }>;

export function createImageGroup(fb: NonNullableFormBuilder, image: Partial<ProductImageInput> = {}): ImageGroup {
  return fb.group({
    url: [image.url ?? '', [Validators.required, httpUrl]],
    alt: [image.alt ?? '', [Validators.required, notBlank, Validators.maxLength(120)]],
  });
}

/** Imágenes múltiples: URL + texto alternativo, la primera es la portada y se pueden reordenar. */
@Component({
  selector: 'app-product-images-field',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="pf-s-images" class="text-base font-semibold text-ink">Fotos</h2>
      <span class="text-xs tabular-nums text-ink-muted">{{ images().length }}/{{ max }}</span>
    </div>
    <p id="pf-images-hint" class="field-hint mt-1">
      Pega enlaces http(s) a tus fotos y describe cada una. La primera es la portada; usa las flechas para reordenarlas.
    </p>

    <ol class="mt-4 space-y-3" aria-describedby="pf-images-hint">
      @for (group of images().controls; track group; let i = $index; let first = $first; let last = $last) {
        <li class="rounded-xl border p-3" [class.border-primary-200]="first" [class.bg-primary-50]="first" [class.border-line]="!first" [formGroup]="group">
          <div class="flex items-start gap-3">
            <div class="relative mt-0.5 size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
              @if (group.controls.url.valid) {
                <img [src]="group.controls.url.value" [alt]="group.controls.alt.value" width="64" height="64" loading="lazy" class="size-full object-cover" />
              }
              @if (first) {
                <span class="absolute inset-x-0 bottom-0 bg-primary-600 py-0.5 text-center text-[0.625rem] font-semibold text-white">Portada</span>
              }
            </div>

            <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <div>
                <label [for]="'pf-image-' + i" class="sr-only">URL de la foto {{ i + 1 }}</label>
                <input
                  [id]="'pf-image-' + i"
                  type="url"
                  formControlName="url"
                  class="field-control"
                  placeholder="https://…"
                  inputmode="url"
                  [attr.aria-invalid]="show(group.controls.url)"
                  [attr.aria-describedby]="'pf-image-' + i + '-error'"
                />
                <app-form-field-error [errorId]="'pf-image-' + i + '-error'" label="La URL" [errors]="group.controls.url.errors" [show]="show(group.controls.url)" />
              </div>
              <div>
                <label [for]="'pf-image-alt-' + i" class="sr-only">Descripción de la foto {{ i + 1 }}</label>
                <input
                  [id]="'pf-image-alt-' + i"
                  type="text"
                  formControlName="alt"
                  class="field-control"
                  maxlength="120"
                  placeholder="Qué se ve (p. ej. «Vista frontal»)"
                  [attr.aria-invalid]="show(group.controls.alt)"
                  [attr.aria-describedby]="'pf-image-alt-' + i + '-error'"
                />
                <app-form-field-error [errorId]="'pf-image-alt-' + i + '-error'" label="El texto de la foto" [errors]="group.controls.alt.errors" [show]="show(group.controls.alt)" />
              </div>
            </div>

            <div class="flex shrink-0 flex-col gap-1 sm:flex-row">
              <button type="button" class="icon-btn -rotate-90" [disabled]="first" [attr.aria-label]="'Subir foto ' + (i + 1)" (click)="move(i, -1)">
                <app-icon name="chevronRight" [size]="18" />
              </button>
              <button type="button" class="icon-btn rotate-90" [disabled]="last" [attr.aria-label]="'Bajar foto ' + (i + 1)" (click)="move(i, 1)">
                <app-icon name="chevronRight" [size]="18" />
              </button>
              <button type="button" class="icon-btn hover:!bg-red-50 hover:!text-red-700" [attr.aria-label]="'Quitar foto ' + (i + 1)" (click)="remove(i)">
                <app-icon name="trash" [size]="18" />
              </button>
            </div>
          </div>
        </li>
      }
    </ol>

    @if (images().errors?.['duplicateValues']) {
      <p class="mt-2 text-sm font-medium text-red-700" role="alert">Hay fotos repetidas: cada URL solo puede aparecer una vez.</p>
    }

    <button id="pf-add-image" type="button" class="btn btn-secondary mt-4" [disabled]="images().length >= max" (click)="add()">
      <app-icon name="plus" [size]="18" />
      {{ images().length >= max ? 'Máximo de ' + max + ' fotos' : 'Añadir foto' }}
    </button>
  `,
})
export class ProductImagesFieldComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly images = input.required<FormArray<ImageGroup>>();
  readonly submitAttempted = input(false);

  protected readonly max = MAX_IMAGES;

  protected show(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected add(): void {
    if (this.images().length >= MAX_IMAGES) return;
    this.images().push(createImageGroup(this.fb));
    setTimeout(() => this.focus(`pf-image-${this.images().length - 1}`));
  }

  protected remove(index: number): void {
    this.images().removeAt(index);
  }

  /** Mueve la foto y conserva el foco en el mismo botón para poder seguir con el teclado. */
  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    const array = this.images();
    if (target < 0 || target >= array.length) return;
    const group = array.at(index);
    array.removeAt(index, { emitEvent: false });
    array.insert(target, group);
    const label = delta < 0 ? 'Subir' : 'Bajar';
    setTimeout(() => this.focus(null, `[aria-label="${label} foto ${target + 1}"]`));
  }

  private focus(id: string | null, selector?: string): void {
    const el = this.host.nativeElement.querySelector<HTMLElement>(selector ?? `#${id}`);
    (el && !(el as HTMLButtonElement).disabled ? el : this.host.nativeElement.querySelector<HTMLElement>(`#pf-image-${0}`))?.focus();
  }
}
