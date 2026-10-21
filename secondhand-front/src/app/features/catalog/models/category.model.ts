export interface CategoryAttribute {
  key: string;
  label: string;
  values: string[];
}

/** Respuesta de GET /categories. */
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  attributes: CategoryAttribute[];
  order: number;
}

/** Lo que llega poblado dentro de un producto. */
export interface CategorySummary {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  attributes?: CategoryAttribute[];
}
