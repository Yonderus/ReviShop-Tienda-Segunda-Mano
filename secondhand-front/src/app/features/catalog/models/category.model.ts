import { EntityRecord } from '../../../core/models/entity.model';
import { BadgeTone } from '../../../shared/ui/badge.component';

export const CATEGORY_STATUSES = ['draft', 'published'] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
};

export const CATEGORY_STATUS_TONES: Record<CategoryStatus, BadgeTone> = {
  draft: 'warning',
  published: 'success',
};

export interface CategoryAttribute {
  key: string;
  label: string;
  values: string[];
}

/** Respuesta de GET /categories (pública: solo publicadas y activas). */
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  attributes: CategoryAttribute[];
  order: number;
}

/** Lo que ve el panel: con estado editorial, visibilidad, papelera y cuántos productos y subcategorías tiene. */
export interface AdminCategory extends Category, EntityRecord {
  status: CategoryStatus;
  productsCount: number;
  childrenCount: number;
}

export interface CategoryInput {
  name: string;
  description: string;
  parentId: string | null;
  attributes: CategoryAttribute[];
  order: number;
  status: CategoryStatus;
}

/** Lo que llega poblado dentro de un producto. */
export interface CategorySummary {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  attributes?: CategoryAttribute[];
}
