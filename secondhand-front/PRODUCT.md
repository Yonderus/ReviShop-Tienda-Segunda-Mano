# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Vendedores frecuentes: personas que publican a menudo (pequeños vendedores, coleccionistas) y gestionan varios anuncios a la vez. Su trabajo en la app es publicar rápido, revisar sus anuncios, corregirlos (precio, estado de venta) y retirarlos. Los compradores que navegan y abren el detalle son una audiencia secundaria.

## Product Purpose

Revishop es un marketplace de productos de segunda mano: publicar, listar, filtrar, ver, editar y retirar anuncios. Existe para dar una segunda vida a los objetos. El éxito es que un vendedor gestione su catálogo sin fricción y que cada anuncio comunique con claridad qué se vende, en qué condición y a qué precio.

## Positioning

Economía circular: el mensaje del producto es alargar la vida útil de las cosas, no solo vender barato.

## Operating Context

Proyecto académico de 2º de DAW (Desarrollo de Aplicaciones Web), evaluado en el ciclo. Frontend Angular 18 que consume la API REST propia `secondhand-api` (Express + MongoDB). Los datos son de ejemplo (`npm run seed` en la API).

## Capabilities and Constraints

- Recurso único: producto (`title`, `slug`, `description`, `price`, `category`, `condition`, `location`, `images` por URL, `seller`, `status` disponible/reservado/vendido, `isActive`, `deletedAt`).
- Rutas públicas por `slug`; las mutaciones usan el `_id`.
- Borrado lógico en la API (`DELETE` → 204).
- Sin autenticación, usuarios, mensajería, pagos ni subida de ficheros: las imágenes son URLs. Futuras features (usuarios, reservas, pagos, reviews, favoritos) aún no decididas.

## Brand Commitments

- Nombre: **Revishop** (unificado por decisión del usuario).
- Logo existente: `src/assets/logo.svg` (flecha circular de reciclaje sobre azul `#2563EB`).
- Idioma: español de España, tono cercano y claro.

## Evidence on Hand

Solo los 5 productos de ejemplo del seed de la API. No hay usuarios, testimonios, cifras ni fotos reales: no deben inventarse.

## Product Principles

1. El vendedor recurrente es el usuario a servir: publicar y editar tiene que ser rápido y sin errores.
2. Cada anuncio dice lo esencial de un vistazo: qué es, condición, estado de venta y precio.
3. Segunda vida antes que oferta: el lenguaje refuerza reutilizar, no la ganga.
4. Honestidad de datos: sin cifras, valoraciones ni testimonios inventados.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste AA en textos y badges, navegación completa por teclado con foco visible, errores de formulario anunciados (aria-live/aria-describedby) y respeto a `prefers-reduced-motion`. Mobile-first (375 / 768 / 1280 px).
