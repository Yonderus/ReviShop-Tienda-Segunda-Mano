import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, IconName } from '../../../../shared/ui/icon.component';

export interface AdminTab {
  label: string;
  icon: IconName;
  link: string;
  /** null mientras la colección no se ha cargado: no se pinta un 0 que no es real. */
  count: number | null;
}

/** Pestañas de una sección del panel (Activos · Inactivos · Papelera). La actual la marca el router. */
@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabs mb-5 flex gap-1" [attr.aria-label]="label()">
      @for (tab of tabs(); track tab.link) {
        <a
          [routerLink]="tab.link"
          routerLinkActive="is-current"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="tab"
        >
          <app-icon [name]="tab.icon" [size]="17" />
          {{ tab.label }}
          @if (tab.count !== null) {
            <span class="tab-count">{{ tab.count }}</span>
          }
        </a>
      }
    </nav>
  `,
  styles: `
    /*
     * En móvil las tres pestañas no caben (≈430 px): se desplazan en horizontal, sin barra visible (la
     * pestaña cortada ya indica que hay más). La línea inferior es una sombra interior y no un borde,
     * porque con overflow las pestañas no pueden sobresalir 1 px para taparla (saldría una barra vertical).
     */
    .tabs {
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      box-shadow: inset 0 -1px 0 rgb(var(--color-line));
    }
    .tabs::-webkit-scrollbar {
      display: none;
    }
    .tab {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgb(var(--color-ink-muted));
      transition: color 150ms ease-out, border-color 150ms ease-out;
    }
    .tab:hover {
      color: rgb(var(--color-ink));
    }
    .tab.is-current {
      color: rgb(var(--color-primary-700));
      border-color: rgb(var(--color-primary-600));
    }
    .tab-count {
      border-radius: 9999px;
      background: rgb(var(--color-canvas));
      padding: 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: rgb(var(--color-ink-muted));
    }
    .tab.is-current .tab-count {
      background: rgb(var(--color-primary-50));
      color: rgb(var(--color-primary-700));
    }
  `,
})
export class AdminTabsComponent {
  readonly tabs = input.required<readonly AdminTab[]>();
  /** Nombre accesible de la navegación, p. ej. "Secciones de productos". */
  readonly label = input.required<string>();
}
