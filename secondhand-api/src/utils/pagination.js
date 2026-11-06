/** Cuántos saltar para llegar a `page` (empieza en 1). */
export const skipFor = (page, limit) => (page - 1) * limit;

/**
 * Lo que necesita el front para pintar la paginación. Una página fuera de rango no es un error: llega vacía,
 * con `totalPages` para que el front pueda volver a una válida.
 */
export function paginationOf(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
