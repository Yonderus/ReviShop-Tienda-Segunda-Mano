import { changedFields } from '../../../shared/utils/diff';
import { AdminCategory, CategoryInput } from './category.model';

export interface CategoryRow {
  category: AdminCategory;
  /** 0 = principal, 1 = subcategoría. */
  depth: 0 | 1;
  /** Nombre del padre cuando no está en la misma lista (p. ej. hija activa de un padre inactivo). */
  orphanOf: string | null;
}

const byOrder = (a: AdminCategory, b: AdminCategory) => a.order - b.order || a.name.localeCompare(b.name, 'es');

/**
 * Las categorías de una lista en forma de árbol: cada principal seguida de sus hijas, por orden y nombre.
 * Las hijas cuyo padre no está en la lista van al final, con el nombre del padre (de `names`).
 */
export function categoryTree(categories: readonly AdminCategory[], names: ReadonlyMap<string, string>): CategoryRow[] {
  const ids = new Set(categories.map((c) => c._id));
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id).sort(byOrder);
  const roots = categories.filter((c) => !c.parentId).sort(byOrder);
  const orphans = categories.filter((c) => c.parentId && !ids.has(c.parentId)).sort(byOrder);
  return [
    ...roots.flatMap((root) => [
      { category: root, depth: 0 as const, orphanOf: null },
      ...childrenOf(root._id).map((child) => ({ category: child, depth: 1 as const, orphanOf: null })),
    ]),
    ...orphans.map((child) => ({ category: child, depth: 1 as const, orphanOf: names.get(child.parentId!) ?? 'otra categoría' })),
  ];
}

/** "2 productos y 1 subcategoría": lo que impide borrarla. Vacío si se puede borrar. */
export function deleteBlockers(category: Pick<AdminCategory, 'productsCount' | 'childrenCount'>): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  return [
    category.productsCount ? plural(category.productsCount, 'producto', 'productos') : '',
    category.childrenCount ? plural(category.childrenCount, 'subcategoría', 'subcategorías') : '',
  ]
    .filter(Boolean)
    .join(' y ');
}

/** Lo que el formulario necesita para editar una categoría cargada. */
export function categoryToInput(category: AdminCategory): CategoryInput {
  return {
    name: category.name,
    description: category.description ?? '',
    parentId: category.parentId,
    attributes: category.attributes.map(({ key, label, values }) => ({ key, label, values: [...values] })),
    order: category.order,
    status: category.status,
  };
}

/** Solo los campos que han cambiado respecto a la categoría cargada (PATCH parcial). */
export function diffCategory(category: AdminCategory, input: CategoryInput): Partial<CategoryInput> {
  return changedFields(categoryToInput(category), input);
}
