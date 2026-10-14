import { Injectable } from '@angular/core';
import type { SweetAlertOptions } from 'sweetalert2';

type Swal = typeof import('sweetalert2').default;

export interface ConfirmOptions {
  title: string;
  text: string;
  confirmText: string;
  cancelText?: string;
  danger?: boolean;
}

/** Iconos con el mismo trazo que el resto de la app (Lucide, ISC), en vez de los de SweetAlert2. */
const svg = (size: number, ...paths: string[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;

const ICONS = {
  alert: svg(28, 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'),
  trash: svg(28, 'M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'),
  question: svg(28, 'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'),
  check: svg(18, 'M20 6 9 17l-5-5'),
};

const baseClasses: SweetAlertOptions['customClass'] = {
  popup: 'swal-popup',
  title: 'swal-title',
  htmlContainer: 'swal-text',
  actions: 'swal-actions',
  confirmButton: 'btn btn-primary',
  cancelButton: 'btn btn-secondary',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private swal?: Promise<Swal>;

  /** SweetAlert2 se carga bajo demanda para no inflar el bundle inicial. */
  private load(): Promise<Swal> {
    return (this.swal ??= import('sweetalert2').then((m) => m.default));
  }

  async error(message: string, details: readonly string[] = []): Promise<void> {
    const swal = await this.load();
    await swal.fire({
      icon: 'error',
      iconHtml: ICONS.alert,
      title: 'Algo no ha ido bien',
      html: this.buildBody(message, details),
      confirmButtonText: 'Entendido',
      buttonsStyling: false,
      customClass: { ...baseClasses, icon: 'swal-icon swal-icon--danger' },
    });
  }

  async success(message: string): Promise<void> {
    const swal = await this.load();
    await swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      iconHtml: ICONS.check,
      title: message,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
      customClass: { popup: 'swal-toast', icon: 'swal-icon swal-icon--success' },
    });
  }

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const swal = await this.load();
    const result = await swal.fire({
      icon: options.danger ? 'warning' : 'question',
      iconHtml: options.danger ? ICONS.trash : ICONS.question,
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText,
      cancelButtonText: options.cancelText ?? 'Cancelar',
      reverseButtons: true,
      focusCancel: options.danger,
      buttonsStyling: false,
      customClass: {
        ...baseClasses,
        confirmButton: options.danger ? 'btn btn-danger' : 'btn btn-primary',
        icon: options.danger ? 'swal-icon swal-icon--danger' : 'swal-icon swal-icon--info',
      },
    });
    return result.isConfirmed;
  }

  private buildBody(message: string, details: readonly string[]): HTMLElement {
    const container = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    container.append(paragraph);

    if (details.length) {
      const list = document.createElement('ul');
      list.className = 'swal-details';
      for (const detail of details) {
        const item = document.createElement('li');
        item.textContent = detail;
        list.append(item);
      }
      container.append(list);
    }
    return container;
  }
}
