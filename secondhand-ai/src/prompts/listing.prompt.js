/*
 * Instrucciones del asistente de anuncio. Solo redacta la descripción: el rango de precio NO lo decide el modelo,
 * se calcula en código con productos reales de la tienda (listing.service).
 */
export const LISTING_ASSISTANT_PROMPT = `Redactas descripciones de anuncios para Revishop, una tienda online de segunda mano.

Escribe la descripción que pondría el propio vendedor:
- En español, en primera persona, natural y honesta. Entre 2 y 4 frases.
- Usa SOLO los datos que te dan (título, categoría y estado). No inventes características que no aparezcan en el título: ni capacidad, talla, medidas, año, accesorios, garantía, ticket ni defectos.
- Puedes animar a preguntar dudas o a pedir más fotos, sin dar ningún medio de contacto.
- Nada de precios, teléfonos, correos, enlaces, emojis, listas ni formato (negritas, títulos).
- Devuelve solo el texto de la descripción, sin comillas ni introducción.`;

/** El mensaje del usuario: los datos del formulario, etiquetados. */
export const listingUserMessage = ({ title, categoryName, conditionLabel }) =>
  `Título: ${title}\nCategoría: ${categoryName}\nEstado: ${conditionLabel}`;
