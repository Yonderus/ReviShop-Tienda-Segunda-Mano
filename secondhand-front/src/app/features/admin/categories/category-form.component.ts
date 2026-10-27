import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, ApiFieldError } from '../../../core/models/api-error.model';
import { FormFieldErrorComponent } from '../../../shared/components/form-field-error/form-field-error.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { applyServerErrors } from '../../../shared/utils/form-errors';
import { commaList, integer, lowerSnakeCase, notBlank, splitList, uniqueField } from '../../../shared/utils/validators';
import {
  AdminCategory,
  CATEGORY_STATUSES,
  CATEGORY_STATUS_LABELS,
  CategoryAttribute,
  CategoryInput,
  CategoryStatus,
} from '../../catalog/models/category.model';
import { categoryToInput } from '../../catalog/models/category.utils';

/** Los mismos límites que el validador de la API. */
const MAX_ATTRIBUTES = 10;
const MAX_VALUE_LENGTH = 30;

const FIELD_ORDER = ['name', 'description', 'parentId', 'order'] as const;
type FieldName = (typeof FIELD_ORDER)[number] | 'status';

type AttributeGroup = FormGroup<{ key: FormControl<string>; label: FormControl<string>; values: FormControl<string> }>;
type AttributeField = 'key' | 'label' | 'values';

const STATUS_HINTS: Record<CategoryStatus, string> = {
  draft: 'Solo se ve en el panel. No admite productos.',
  published: 'Sale en la tienda y admite productos (si está activa).',
};

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass, FormFieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-6">
      @if (generalError(); as error) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p class="font-semibold">{{ error.message }}</p>
          @if (error.items.length) {
            <ul class="mt-2 list-disc space-y-1 pl-5">
              @for (item of error.items; track $index) {
                <li>{{ item.message }}</li>
              }
            </ul>
          }
        </div>
      }

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="cf-s-basics">
        <h2 id="cf-s-basics" class="text-base font-semibold text-ink">Datos de la categoría</h2>
        <div class="mt-5 space-y-5">
          <div>
            <div class="flex items-baseline justify-between gap-3">
              <label for="cf-name" class="field-label">Nombre</label>
              <span class="text-xs tabular-nums text-ink-muted" aria-hidden="true">{{ f.name.value.length }}/60</span>
            </div>
            <input
              id="cf-name"
              type="text"
              formControlName="name"
              class="field-control"
              placeholder="Ej.: Tablets"
              autocomplete="off"
              maxlength="60"
              [attr.aria-invalid]="showError('name')"
              aria-describedby="cf-name-hint cf-name-error"
            />
            <p id="cf-name-hint" class="field-hint">El slug de la URL se genera a partir del nombre.</p>
            <app-form-field-error errorId="cf-name-error" label="El nombre" [errors]="f.name.errors" [show]="showError('name')" />
          </div>

          <div>
            <div class="flex items-baseline justify-between gap-3">
              <label for="cf-description" class="field-label">Descripción <span class="font-normal text-ink-muted">(opcional)</span></label>
              <span class="text-xs tabular-nums text-ink-muted" aria-hidden="true">{{ f.description.value.length }}/300</span>
            </div>
            <textarea
              id="cf-description"
              formControlName="description"
              rows="2"
              class="field-control"
              maxlength="300"
              [attr.aria-invalid]="showError('description')"
              aria-describedby="cf-description-error"
            ></textarea>
            <app-form-field-error errorId="cf-description-error" label="La descripción" [errors]="f.description.errors" [show]="showError('description')" />
          </div>

          <div class="grid gap-5 sm:grid-cols-[1fr_9rem]">
            <div>
              <label for="cf-parentId" class="field-label">Categoría padre</label>
              <select
                id="cf-parentId"
                formControlName="parentId"
                class="field-control"
                [attr.aria-invalid]="showError('parentId')"
                aria-describedby="cf-parentId-hint cf-parentId-error"
              >
                <option value="">Ninguna (es una categoría principal)</option>
                @for (parent of parentOptions(); track parent._id) {
                  <option [value]="parent._id">{{ parentLabel(parent) }}</option>
                }
              </select>
              <p id="cf-parentId-hint" class="field-hint">
                @if (hasChildren()) {
                  Tiene subcategorías, así que tiene que seguir siendo principal (como máximo hay dos niveles).
                } @else {
                  Solo se puede colgar de una categoría principal: como máximo hay dos niveles.
                }
              </p>
              <app-form-field-error errorId="cf-parentId-error" label="La categoría padre" [errors]="f.parentId.errors" [show]="showError('parentId')" />
            </div>
            <div>
              <label for="cf-order" class="field-label">Orden</label>
              <input
                id="cf-order"
                type="number"
                formControlName="order"
                class="field-control tabular-nums"
                min="0"
                step="1"
                inputmode="numeric"
                [attr.aria-invalid]="showError('order')"
                aria-describedby="cf-order-hint cf-order-error"
              />
              <p id="cf-order-hint" class="field-hint">Menor, antes.</p>
              <app-form-field-error errorId="cf-order-error" label="El orden" [errors]="f.order.errors" [show]="showError('order')" />
            </div>
          </div>

          <fieldset>
            <legend class="field-label">Estado</legend>
            <div class="mt-1 grid gap-2 sm:grid-cols-2">
              @for (s of statuses; track s; let i = $index) {
                <label
                  class="relative flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3.5 py-3 transition-colors duration-150"
                  [ngClass]="f.status.value === s ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-line hover:border-primary-200 hover:bg-canvas'"
                >
                  <input [id]="'cf-status-' + i" type="radio" formControlName="status" [value]="s" class="peer sr-only" />
                  <span class="text-sm font-semibold text-ink">{{ statusLabels[s] }}</span>
                  <span class="text-xs text-ink-muted">{{ statusHints[s] }}</span>
                  <span class="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2"></span>
                </label>
              }
            </div>
            <app-form-field-error errorId="cf-status-error" label="El estado" [errors]="f.status.errors" [show]="showError('status')" />
          </fieldset>
        </div>
      </section>

      <section class="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="cf-s-attributes">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="cf-s-attributes" class="text-base font-semibold text-ink">Atributos de variante</h2>
          <span class="text-xs tabular-nums text-ink-muted">{{ f.attributes.length }}/{{ maxAttributes }}</span>
        </div>
        <p class="field-hint mt-1">
          Las opciones que pueden tener las variantes de sus productos (talla, capacidad…). Los valores se separan por comas;
          si los dejas vacíos, el valor se escribe a mano en cada variante.
        </p>
        @if (inheritedAttributes().length && f.attributes.length === 0) {
          <p class="mt-3 rounded-xl bg-canvas px-3.5 py-2.5 text-sm text-ink-muted">
            Sin atributos propios hereda los de su categoría padre:
            <span class="font-medium text-ink">{{ inheritedLabels() }}</span>.
          </p>
        }

        <ul class="mt-4 space-y-3" aria-label="Atributos">
          @for (group of f.attributes.controls; track group; let i = $index) {
            <li class="rounded-xl border border-line p-3.5" [formGroup]="group">
              <div class="grid gap-3 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-start">
                <div>
                  <label class="field-label" [for]="'cf-attr-' + i + '-key'">Clave</label>
                  <input
                    [id]="'cf-attr-' + i + '-key'"
                    type="text"
                    formControlName="key"
                    class="field-control font-mono text-sm"
                    placeholder="talla"
                    maxlength="30"
                    autocomplete="off"
                    [attr.aria-invalid]="showAttrError(group, 'key')"
                    [attr.aria-describedby]="'cf-attr-' + i + '-key-error'"
                  />
                  <app-form-field-error [errorId]="'cf-attr-' + i + '-key-error'" label="La clave" [errors]="group.controls.key.errors" [show]="showAttrError(group, 'key')" />
                </div>
                <div>
                  <label class="field-label" [for]="'cf-attr-' + i + '-label'">Nombre visible</label>
                  <input
                    [id]="'cf-attr-' + i + '-label'"
                    type="text"
                    formControlName="label"
                    class="field-control"
                    placeholder="Talla"
                    maxlength="40"
                    [attr.aria-invalid]="showAttrError(group, 'label')"
                    [attr.aria-describedby]="'cf-attr-' + i + '-label-error'"
                  />
                  <app-form-field-error [errorId]="'cf-attr-' + i + '-label-error'" label="El nombre" [errors]="group.controls.label.errors" [show]="showAttrError(group, 'label')" />
                </div>
                <div>
                  <label class="field-label" [for]="'cf-attr-' + i + '-values'">Valores</label>
                  <input
                    [id]="'cf-attr-' + i + '-values'"
                    type="text"
                    formControlName="values"
                    class="field-control"
                    placeholder="S, M, L, XL"
                    [attr.aria-invalid]="showAttrError(group, 'values')"
                    [attr.aria-describedby]="'cf-attr-' + i + '-values-error'"
                  />
                  <app-form-field-error [errorId]="'cf-attr-' + i + '-values-error'" label="La lista de valores" [errors]="group.controls.values.errors" [show]="showAttrError(group, 'values')" />
                </div>
                <button
                  type="button"
                  class="icon-btn self-end hover:!bg-red-50 hover:!text-red-700 sm:mt-6 sm:self-start"
                  [attr.aria-label]="'Quitar el atributo ' + (group.controls.label.value || i + 1)"
                  title="Quitar atributo"
                  (click)="removeAttribute(i)"
                >
                  <app-icon name="trash" [size]="18" />
                </button>
              </div>
            </li>
          }
        </ul>
        <app-form-field-error errorId="cf-attributes-error" label="La lista de claves" [errors]="f.attributes.errors" [show]="f.attributes.invalid" />

        <button id="cf-add-attribute" type="button" class="btn btn-secondary mt-4" [disabled]="f.attributes.length >= maxAttributes" (click)="addAttribute()">
          <app-icon name="plus" [size]="18" />
          Añadir atributo
        </button>
      </section>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a [routerLink]="cancelLink()" class="btn btn-secondary">Cancelar</a>
        <button type="submit" class="btn btn-primary min-w-44" [disabled]="saving()" [attr.aria-busy]="saving()">
          {{ saving() ? 'Guardando…' : isEdit() ? 'Guardar cambios' : 'Crear categoría' }}
        </button>
      </div>
    </form>
  `,
})
export class CategoryFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly category = input<AdminCategory | null>(null);
  /** Categorías no eliminadas: de aquí salen los posibles padres. */
  readonly categories = input<readonly AdminCategory[]>([]);
  readonly saving = input(false);
  readonly serverError = input<ApiError | null>(null);
  readonly cancelLink = input('/admin/categories');
  readonly submitted = output<CategoryInput>();

  protected readonly statuses = CATEGORY_STATUSES;
  protected readonly statusLabels = CATEGORY_STATUS_LABELS;
  protected readonly statusHints = STATUS_HINTS;
  protected readonly maxAttributes = MAX_ATTRIBUTES;

  protected readonly submitAttempted = signal(false);
  protected readonly isEdit = computed(() => this.category() !== null);
  protected readonly hasChildren = computed(() => (this.category()?.childrenCount ?? 0) > 0);

  private readonly unplacedErrors = signal<readonly ApiFieldError[]>([]);

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    const items = this.unplacedErrors();
    if (!error || (error.errors.length > 0 && items.length === 0)) return null;
    return { message: error.message, items };
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(60)]],
    description: ['', [Validators.maxLength(300)]],
    parentId: [''],
    order: this.fb.control<number | null>(0, [Validators.required, Validators.min(0), integer]),
    status: this.fb.control<CategoryStatus>('draft', [Validators.required]),
    attributes: this.fb.array<AttributeGroup>([], [Validators.maxLength(MAX_ATTRIBUTES), uniqueField('key')]),
  });

  protected readonly f = this.form.controls;

  private readonly parentId = toSignal(this.f.parentId.valueChanges, { initialValue: '' });

  /** Solo las principales, sin la propia categoría. */
  protected readonly parentOptions = computed(() =>
    this.categories()
      .filter((c) => !c.parentId && c._id !== this.category()?._id)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es')),
  );

  protected readonly inheritedAttributes = computed<CategoryAttribute[]>(() => {
    const parentId = this.parentId();
    return (parentId && this.categories().find((c) => c._id === parentId)?.attributes) || [];
  });
  protected readonly inheritedLabels = computed(() => this.inheritedAttributes().map((a) => a.label).join(', '));

  ngOnInit(): void {
    const category = this.category();
    if (!category) return;
    const input = categoryToInput(category);
    this.form.patchValue({ ...input, parentId: input.parentId ?? '', attributes: [] });
    input.attributes.forEach((attribute) => this.f.attributes.push(this.attributeGroup(attribute)));
    if (this.hasChildren()) this.f.parentId.disable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['serverError']) return;
    const errors = this.serverError()?.errors ?? [];
    const unplaced = applyServerErrors(this.form, errors);
    this.unplacedErrors.set(unplaced);
    const firstPlaced = errors.find((error) => !unplaced.includes(error));
    if (firstPlaced?.field) this.focusField(firstPlaced.field);
  }

  protected parentLabel(parent: AdminCategory): string {
    const notes = [parent.status === 'draft' ? 'borrador' : '', parent.isActive ? '' : 'inactiva'].filter(Boolean);
    return notes.length ? `${parent.name} (${notes.join(', ')})` : parent.name;
  }

  protected showError(name: FieldName): boolean {
    const control = this.f[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected showAttrError(group: AttributeGroup, name: AttributeField): boolean {
    const control = group.controls[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected addAttribute(): void {
    this.f.attributes.push(this.attributeGroup());
    const index = this.f.attributes.length - 1;
    // Tras pintar la fila nueva.
    setTimeout(() => this.focus(`cf-attr-${index}-key`));
  }

  protected removeAttribute(index: number): void {
    this.f.attributes.removeAt(index);
    this.focus('cf-add-attribute');
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    this.submitted.emit(this.toInput());
  }

  private attributeGroup(attribute?: CategoryAttribute): AttributeGroup {
    return this.fb.group({
      key: [attribute?.key ?? '', [Validators.required, Validators.maxLength(30), lowerSnakeCase]],
      label: [attribute?.label ?? '', [Validators.required, notBlank, Validators.maxLength(40)]],
      values: [attribute?.values.join(', ') ?? '', [commaList(MAX_VALUE_LENGTH)]],
    });
  }

  private toInput(): CategoryInput {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      description: v.description.trim(),
      parentId: v.parentId || null,
      order: Number(v.order),
      status: v.status,
      attributes: v.attributes.map((a) => ({ key: a.key.trim(), label: a.label.trim(), values: splitList(a.values) })),
    };
  }

  private focusFirstInvalid(): void {
    const name = FIELD_ORDER.find((field) => this.f[field].invalid);
    if (name) return this.focusField(name);
    const index = this.f.attributes.controls.findIndex((group) => group.invalid);
    if (index >= 0) {
      const field = (['key', 'label', 'values'] as const).find((key) => this.f.attributes.at(index).controls[key].invalid);
      return this.focus(`cf-attr-${index}-${field}`);
    }
    if (this.f.attributes.invalid) this.focus('cf-attr-0-key');
  }

  /** Lleva el foco al campo de una ruta del formulario ("name", "attributes.0.key"…). */
  private focusField(path: string): void {
    const attribute = /^attributes\.(\d+)\.(key|label|values)$/.exec(path);
    if (attribute) return this.focus(`cf-attr-${attribute[1]}-${attribute[2]}`);
    if (path === 'attributes') return this.focus('cf-add-attribute');
    if (path === 'status') return this.focus('cf-status-0');
    this.focus(`cf-${path}`);
  }

  private focus(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
