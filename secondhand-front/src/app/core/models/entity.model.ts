/** Campos que la API devuelve en todas las entidades con CRUD (productos, categorías, usuarios…). */
export interface EntityRecord {
  _id: string;
  slug: string;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
