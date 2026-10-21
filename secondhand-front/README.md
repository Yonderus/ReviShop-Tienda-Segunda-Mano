# Revishop · Frontend

SPA en **Angular 18** para Revishop, un marketplace de productos de segunda mano. Consume la API REST de `../secondhand-api` (Express + MongoDB). Permite listar y filtrar anuncios, ver el detalle por **slug**, publicar, editar y retirar productos.

## Pantallas

| Ruta | Pantalla |
| --- | --- |
| `/` | Catálogo: cabecera con el recuento real de anuncios, filtros (categoría, condición, estado, rango de precio, orden) reflejados en la URL y rejilla de cards con acciones rápidas *Editar / Eliminar*. |
| `/products/new` | Publicar producto (formulario reactivo con validaciones accesibles). |
| `/products/:slug` | Detalle: galería diferida, selector de variantes (si hay más de una), precio según la variante, escala de condición, vendedor, ubicación, fecha y acciones. |
| `/products/:slug/edit` | Editar (envía `PATCH` solo con los campos modificados). |
| `**` | 404 real. Un slug inexistente muestra "Producto no encontrado". |

### Panel de administración (`/admin`)

Sidebar vertical (drawer accesible en móvil) y sin login todavía (ver *Autenticación*).

| Ruta | Pantalla |
| --- | --- |
| `/admin` | Resumen con datos reales: inventario (publicados, activos, inactivos, en papelera) con barra proporcional, estado de venta, reparto por categoría, últimos productos y módulos futuros deshabilitados. |
| `/admin/products` · `/admin/products/inactive` | Pestañas Activos / Inactivos: tabla (tarjetas en móvil) con interruptor de visibilidad y selector de estado de venta, ambos optimistas, editar y mover a la papelera. |
| `/admin/products/new` · `/admin/products/:slug/edit` | Crear y editar reutilizando el mismo formulario que la tienda. |
| `/admin/trash` | Papelera (soft delete): productos borrados con su fecha, restaurables como activos o como inactivos. |

Los cambios se reflejan al instante en todas las vistas, porque comparten `ProductsStore`. Por ejemplo, al desactivar un producto baja el contador de Activos y sube el de Inactivos y el del resumen, sin recargar.

Usuarios, Mensajes, Reservas, Valoraciones, Pagos y Envíos son **solo nombres estáticos** en `features/admin/admin-nav.config.ts` (`PLATFORM_MODULES`), sin rutas, peticiones ni datos. Se ven con el mismo estilo "retirado" que la papelera: borde discontinuo, icono desaturado y etiqueta *Próximamente*.

Estados cubiertos en todas las pantallas: carga (skeleton con la forma real), vacío, sin resultados de filtros, error con **Reintentar** y no encontrado.

## Requisitos

- Node.js **18.19+, 20.11+ o 22** (versiones soportadas por Angular 18; con Node 24 funciona pero el CLI avisa de que no está soportado).
- npm 10+.
- MongoDB en local para la API.
- Angular CLI 18 (incluido en `devDependencies`, se usa vía `npx ng` o los scripts npm).

## Instalación y ejecución

```bash
# 1. API (otra terminal)
cd ../secondhand-api
npm install
npm run seed     # carga 5 productos de ejemplo (borra la colección)
npm run dev      # http://localhost:3000/api

# 2. Front
cd ../secondhand-front
npm install
npm start        # ng serve → http://localhost:4200 (configuración development)
```

Build de producción (sale en `dist/secondhand-front`):

```bash
npm run build                                  # producción (por defecto)
npx ng build --configuration development      # build de desarrollo
```

## Variables de entorno

Angular no lee `.env`: la URL de la API (`API_URL`) vive en los ficheros de `src/environments/`.

| Fichero | Cuándo se usa | `apiUrl` |
| --- | --- | --- |
| `environment.ts` | `npm run build` (producción, base) | `/api` (mismo dominio, detrás de un proxy) |
| `environment.development.ts` | `npm start` y `ng build --configuration development` (sustituye al anterior vía `fileReplacements` en `angular.json`) | `http://localhost:3000/api` |

Ambos exponen:

- `production`: activa o desactiva los logs técnicos en consola (solo en desarrollo).
- `apiUrl`: equivale a `API_URL`. Cámbialo aquí si la API corre en otro host o puerto.
- `requestTimeoutMs`: tiempo máximo por petición (10 000 ms). Pasado ese tiempo se muestra "El servidor está tardando demasiado…".

## Estructura

```
src/app/
├── core/                    # Infraestructura transversal (no conoce productos)
│   ├── auth/                # AuthService (sin sesión todavía) y adminGuard (canMatch, hoy permite el paso)
│   ├── config/              # HttpContextTokens (SKIP_ERROR_ALERT, SKIP_GLOBAL_LOADER, BLOCKING_REQUEST, INLINE_ERROR_STATUSES) y constantes
│   ├── interceptors/        # errorInterceptor (timeout, normalización, alertas) y loadingInterceptor
│   ├── models/              # ApiResponse<T>, ApiError
│   └── services/            # ApiService (async/await → Promise), LoadingService, AlertService (SweetAlert2)
├── shared/                  # Piezas reutilizables sin dominio
│   ├── components/          # navbar, loader, blocking-spinner (ngx-spinner), skeleton, empty-state, error-state, page-not-found, form-field-error
│   ├── ui/                  # icon, badge, level-meter, stat-card, toggle-switch
│   └── utils/               # validadores, mensajes de error de formulario, pipes de precio y tiempo relativo
├── layouts/
│   ├── main-layout/         # tienda: navbar + router-outlet + footer + loader global
│   └── admin-layout/        # admin: sidebar vertical / drawer móvil + topbar con migas
├── features/catalog/        # Datos de referencia compartidos (categorías y vendedores)
│   ├── models/              # Category, CategoryAttribute, Seller
│   ├── services/            # CategoriesService, SellersService
│   └── store/               # CatalogStore (carga única, árbol de categorías, atributos heredados)
├── features/admin/          # Panel de administración (usa el modelo, servicio y store de products)
│   ├── admin-nav.config.ts  # navegación y módulos estáticos deshabilitados
│   ├── components/          # admin-sidebar, admin-thumb
│   ├── dashboard/           # resumen
│   ├── products/            # productos (activos/inactivos), papelera, crear, editar
│   └── admin.routes.ts      # rutas hijas lazy con migas en `data`
├── features/products/       # Todo lo del recurso Product
│   ├── models/              # tipos, enums, etiquetas legibles, diff para PATCH
│   ├── services/            # ProductsService (rutas de producto sobre ApiService, devuelve Promise)
│   ├── store/               # ProductsStore: colecciones activos/inactivos/papelera, caché y KPIs
│   ├── components/          # product-card, product-grid, product-filters, product-form, product-images-field, product-variant-picker, product-image, product-gallery
│   ├── pages/               # list, detail, create, edit
│   └── products.routes.ts   # rutas hijas lazy
├── app.routes.ts            # /admin (canMatch adminGuard) + tienda + 404
└── app.config.ts            # router, HttpClient con interceptores, locale es-ES
```

### Añadir una feature nueva

Cada módulo futuro (usuarios, reservas, pagos, reviews, favoritos…) va en `features/<nombre>/` con sus propios `models/`, `services/` (sobre `ApiService`), `store/`, `components/`, `pages/` y un `<nombre>.routes.ts`. Se registra con un `loadChildren` en `app.routes.ts`. No hace falta tocar `core/` ni `shared/`: los interceptores, las alertas, el loader y los estados de error ya funcionan para cualquier petición.

Para activar en el admin una de las entidades de `PLATFORM_MODULES`:
1. crea su `features/<entidad>/`;
2. añade su ruta en `features/admin/admin.routes.ts`;
3. mueve la entrada de `PLATFORM_MODULES` a `ADMIN_NAV` con su `path`.

## API consumida

| Método | Ruta | Uso en el front |
| --- | --- | --- |
| GET | `/api/products` | Catálogo (una sola carga; filtra y ordena en cliente) |
| GET | `/api/products/slug/:slug` | Detalle y edición cuando el producto no está en caché |
| POST | `/api/products` | Publicar (201; **409** si el slug/título ya existe) |
| GET | `/api/products/inactives` | Admin: pestaña Inactivos |
| GET | `/api/products/trash` | Admin: papelera (productos con soft delete) |
| GET | `/api/categories` · `/api/sellers` | Opciones de los `select` del formulario y del filtro de categoría |
| PATCH | `/api/products/:id` | Editar (solo campos modificados) |
| PATCH | `/api/products/:id/status` | Admin: estado de venta (`{ status }`, optimista; 422 si hay varias variantes) |
| PATCH | `/api/products/:id/active` | Admin: interruptor de visibilidad (`{ isActive }`, optimista) |
| PATCH | `/api/products/:id/restore` | Admin: restaurar desde la papelera (`{ isActive }`) |
| DELETE | `/api/products/:id` | Retirar / mover a la papelera (soft delete, 204 sin body) |

Formato: éxito `{ success: true, data }`; error `{ success: false, message }`.

Un producto llega con sus relaciones ya resueltas: `category { name, slug }`, `seller { name, slug, location }`, `images[]` (objetos con `url`, `alt`, `isPrimary` y `order`) y, en el detalle, `variants[]`. El precio del producto es `basePrice`; cada variante puede tener el suyo.

## Sistema de diseño

- **Tipografía:** Poppins (400–700) con `preconnect` y `display=swap`.
- **Tokens:** los colores están en `src/styles.scss` (`:root`) como canales RGB y Tailwind los consume desde `tailwind.config.js` (`primary-*`, `accent`, `ink`, `line`, `canvas`, `surface`). **Para cambiar de paleta basta con sustituir el bloque `:root`**.
- **Firma del producto:** la *escala de segunda vida* muestra la condición en 5 tramos (Nuevo = 5 … Mejorable = 1) en la card, el detalle y el selector del formulario. Al ir de la card al detalle, la imagen se transforma con View Transitions; la animación se desactiva con `prefers-reduced-motion`.
- **Estados:** disponible (verde), reservado (ámbar), vendido (pizarra). Todos los pares de texto y fondo cumplen WCAG AA (mínimo 4,54:1).

### Paletas intercambiables

| Token | A · Azul Confianza (activa) | B · Marino + Cian | C · Índigo + Turquesa |
| --- | --- | --- | --- |
| `--color-primary-600` | `37 99 235` (#2563EB) | `29 78 216` (#1D4ED8) | `79 70 229` (#4F46E5) |
| `--color-primary-900` | `30 58 138` (#1E3A8A) | `11 31 58` (#0B1F3A) | `49 46 129` (#312E81) |
| `--color-primary-700` | `29 78 216` | `18 56 107` (#12386B) | `67 56 202` |
| `--color-accent` | `245 158 11` (#F59E0B) | `6 182 212` (#06B6D4) | `20 184 166` (#14B8A6) |
| `--color-canvas` | `248 250 252` (#F8FAFC) | `244 247 251` (#F4F7FB) | `250 250 249` (stone-50) |
| `--color-ink-muted` | `71 85 105` | `71 85 105` | `87 83 78` (stone-600) |

Al cambiar de paleta, revisa también `primary-50/100/200/400/500` (tonos claros del mismo matiz) y el contraste del texto sobre `accent`. Con B y C el acento es claro, así que el texto del botón "Publicar" debe seguir siendo `ink`.

## Decisiones técnicas

- **Store como caché (`ProductsStore`):** la lista se carga una sola vez (`loadAll({ force })`) y una segunda llamada simultánea reutiliza la promesa en vuelo. `loadBySlug` busca primero en caché y crear, editar o retirar actualizan la caché sin recargar. Ir de la lista al detalle y volver no repite peticiones. Los signals son privados y se exponen con `asReadonly()` y `computed()`, y nunca se escriben dentro de un `effect()`.
- **Slug en las URLs, `_id` en las mutaciones:** las rutas públicas son legibles (`/products/iphone-13-pro-256gb`), pero la API identifica por `_id`. Por eso el producto se obtiene por slug y `PATCH`/`DELETE` usan su `_id`. Tras editar se navega al slug de la respuesta, porque cambia si cambia el título.
- **`products/new` se declara antes que `products/:slug`.** Edge case conocido: un producto titulado "New" tendría slug `new` y su detalle no sería accesible.
- **Política de errores:** el `errorInterceptor` aplica el timeout, valida que la respuesta tenga la forma `{ success, data }` y normaliza todo a `ApiError` (`network`, `timeout`, `http`, `validation` o `invalid-response`) con mensajes en español.
  - Las cargas (GET) llevan `SKIP_ERROR_ALERT`: el error se muestra en la pantalla con *Reintentar*, nunca en un modal.
  - Las mutaciones muestran un modal de SweetAlert2, salvo los códigos 400/409/422 al guardar, que el formulario pinta en línea (por ejemplo, título duplicado → error en el campo *Título*).
- **Loader global:** contador de peticiones con retardo de 180 ms para evitar parpadeos. Las pantallas con skeleton usan `SKIP_GLOBAL_LOADER` para no mostrar dos indicadores a la vez.
- **Rendimiento:** todo es standalone y `OnPush`. Rutas lazy con precarga, galería en `@defer`, SweetAlert2 cargado bajo demanda (chunk aparte), `NgOptimizedImage` con hueco reservado y bundle inicial de unos 423 kB (118 kB transferidos; el admin va en chunks lazy aparte).
- **Validación de precio:** la API acepta `price ≥ 0`, pero el front exige `> 0` (`PRICE_MIN_EXCLUSIVE` en `product-form.component.ts`).
- **Spinner bloqueante (ngx-spinner):** solo para lo que el usuario espera de forma activa (guardar, borrar, restaurar), marcado con `BLOCKING_REQUEST`. Lo gestiona el mismo `LoadingService` que la barra superior, con dos contadores. El interruptor de visibilidad no bloquea porque es optimista: cambia al instante y se revierte si la API falla. Ante un 409 (producto ya en la papelera) muestra un mensaje específico y recarga las colecciones.
- **Autenticación preparada, sin implementar:** `/admin` pasa por `adminGuard` (`canMatch`), que hoy siempre deja pasar. `AuthService.currentUser` es `null`, y el futuro `authInterceptor` (cabecera `Authorization`) irá al principio de la lista de interceptores en `app.config.ts`.
- **Datos de prueba:** el admin trabaja contra la API y la base de desarrollo reales. `npm run seed` en `secondhand-api` deja 8 activos, 3 inactivos y 3 en la papelera.
- **Capa de datos asíncrona:** `ApiService` convierte el `Observable` de `HttpClient` en `Promise` (único `firstValueFrom` de la aplicación), así que services y stores usan `async/await` sin RxJS. RxJS solo queda en los interceptores.
- **`CatalogStore`:** categorías y vendedores se cargan una vez y los comparten el formulario, el filtro del catálogo y las etiquetas. Ninguna categoría está escrita en el código: vienen de `GET /categories`, incluidas las subcategorías (filtrar por "Electrónica" incluye "Móviles" y "Ordenadores").
- **Variantes:** todo producto tiene al menos una. En el detalle, si hay más de una se muestra un `radiogroup` que cambia precio y disponibilidad; la vendida aparece tachada y no se puede elegir. El precio de la card usa el mínimo de las variantes y añade "desde" cuando difieren.
- **Estado de venta:** se cambia desde la lista del panel con `PATCH /products/:id/status`, nunca desde el formulario. En productos con varias variantes el selector sale deshabilitado, porque la API responde 422.
- **Imágenes múltiples:** hasta 5 por producto, cada una con URL y texto alternativo obligatorio. La primera es la portada y se pueden reordenar con botones accesibles por teclado.
- **View Transitions:** se omite la transición inicial y se capturan los rechazos de la animación. El navegador aborta la transición si la pestaña está oculta, y sin ese `catch` la vista se quedaba en blanco.
