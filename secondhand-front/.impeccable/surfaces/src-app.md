---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: Revishop app (catálogo, detalle, publicar/editar)

## Scope and mode
Operate. Toda la SPA de productos: listado con filtros, detalle por slug, crear/editar, eliminar, estados vacío/error/404.

## Audience and job
Vendedor frecuente que gestiona varios anuncios: publicar rápido, localizar uno, corregir precio/estado, retirarlo. Comprador ocasional abre el detalle.

## Confirmed answers
- Listado con acciones rápidas (Editar / Eliminar) en cada card, además del enlace al detalle.
- Cabecera breve con claim de segunda vida y recuento real de anuncios; el catálogo aparece enseguida.
- Evitar: plantilla genérica, tono corporativo frío, recargado, infantil.
- Pinned by brief: Paleta A (azul #2563EB, ámbar #F59E0B, neutros slate), Poppins, Tailwind 3.4, SweetAlert2, ngx-skeleton-loader. Code-led: no image generation available.

## Direction contract
THESIS: Cada anuncio enseña cuánta vida le queda. La "escala de segunda vida" (condición en 5 tramos) es la firma del producto y sustituye a la etiqueta de texto suelta que usa cualquier marketplace; se rechaza la rejilla de cards gris con un único acento azul.
OWN-WORLD: Campo marino profundo (primary-900) que une navbar y cabecera a escala de página; suelo slate-50 frío; cards blancas con borde fino y sombra suave con desplazamiento; ámbar solo como CTA "Publicar" y chip de precio destacado; badges de estado verde/ámbar/pizarra AA; Poppins con pasos claros de peso; iconos de trazo 1.75 propios.
STORY: El vendedor entiende de un vistazo qué tiene publicado, en qué condición y estado, filtra sin recargar y edita o retira desde la propia card; el comprador ve la condición antes que el precio.
FIRST VIEWPORT: Navbar marino sticky (logo + Revishop, Inicio, CTA ámbar Publicar); debajo, misma franja marina con claim en 2 líneas y "N anuncios activos"; barra de filtros blanca que solapa el borde inferior de la franja; grid 1-2-3-4 columnas de cards con imagen 4:3, escala de vida, título, ubicación, precio y acciones.
FORM: Producto de marketplace estándar (shell top-bar + grid + filtros) con un movimiento firma: la escala de segunda vida en card, detalle, filtro y como selector segmentado en el formulario; transición compartida de imagen card→detalle con View Transitions. Brief-pinned world; no concept-seed roll. Waiver: the user's brief pins the world verbatim ("Implementa por defecto la Paleta A (continuidad con el #2563EB actual)", "mantén Poppins", Tailwind 3.4, SweetAlert2, ngx-skeleton-loader, componentes enumerados), the user then chose a product interview, which confirmed users, positioning and listing behaviour and asked for no change to the pinned world. In the filter the scale is a preview beside the native condition select (density of the filter bar; native select keeps keyboard/AT behaviour), not a segmented control.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
