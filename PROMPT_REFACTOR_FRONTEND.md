# Prompt: Refactor profesional del frontend `secondhand-front` (Angular 18)

## 0. Rol y forma de trabajar

Actúa como un **Senior Frontend Engineer especializado en Angular** con buen ojo de diseño de producto. Vas a refactorizar y ampliar el frontend existente de un marketplace de segunda mano estilo Wallapop. El monorepo tiene dos carpetas:

- `secondhand-api/` → API REST (Node + Express + Mongoose + Zod). **No la modifiques** salvo que te lo pida explícitamente; si detectas algo que convenga cambiar en el backend, lístalo al final como "propuestas para la API" sin tocarlo.
- `secondhand-front/` → Angular 18.2 (standalone, Signals, `provideHttpClient(withFetch())`, builder `application`, SCSS). **Aquí es donde trabajas.**

Método obligatorio:
1. **Audita primero** el código actual del front y de la API (lee los ficheros, no asumas). Lee también `secondhand-api/src/middlewares/validate.js` y `secondhand-api/postman.md` para conocer el formato exacto de los errores de validación.
2. Trabaja **por fases** (sección 12). Al terminar cada fase, ejecuta `npm run build` (y arranca la app) y no avances si hay errores o warnings.
3. No metas funcionalidades "para el futuro" que no se pidan (nada de módulos vacíos de usuarios/pagos). Solo deja la arquitectura **preparada** (sección 3).
4. Al final entrega un resumen corto: qué cambió, qué decisiones tomaste y qué dejaste pendiente.

---

## 1. Objetivo

Construir una SPA moderna, escalable y mantenible siguiendo las mejores prácticas actuales de Angular que:

- Consuma la API REST existente.
- Use **`slug` como identificador principal en las rutas** (`/products/iphone-13-pro-256gb`), no el `_id`.
- Tenga una arquitectura modular y desacoplada.
- Esté preparada para futuros módulos (usuarios, reservas, pagos, reviews, favoritos…).

---

## 2. Estado actual detectado (punto de partida real — verifícalo)

**Frontend actual (`secondhand-front/src/app`):**
- Estructura plana: `components/`, `pages/`, `services/`, `store/`, `models/`. Sin `core/`, `shared/`, `features/`, `layouts/`.
- Angular **18.2**, standalone, rutas con `loadComponent`, `ProductStore` con signals + `async/await`.
- **Sin** Tailwind, SweetAlert2, ngx-skeleton-loader ni interceptores.
- Rutas por `_id` (`products/:id`, `products/:id/edit`).
- Borrado con `confirm()` nativo; errores como string en el store y `<div class="alert">`.
- Formularios con solo `required` y `min(0)`; sin validación de URLs ni mensajes por campo accesibles.
- `Product` model sin `slug`, `isActive` ni `deletedAt`; las `images` existen pero **no se muestran** en ninguna card.
- `effect()` usado para parchear el formulario (en Angular 18 escribir en señales/forms dentro de `effect` requiere cuidado; ver sección 6).
- Entornos: `environment.ts` (dev, `http://localhost:3000/api`) y `environment.production.ts` (`/api`), con `fileReplacements` solo en producción.
- Marca inconsistente: `<title>` "Revivo", header "Revishop", alt "Revivo". **Unifica el nombre** (pregúntame o usa "Revivo" si no puedes preguntar) en `index.html`, navbar, logo y README.

**API (`secondhand-api`) — contrato real:**

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/products` | Filtros: `category, condition, status, seller, minPrice, maxPrice, isActive`. Por defecto solo activos y no eliminados |
| GET | `/api/products/actives` · `/inactives` | Mismos filtros salvo `isActive` |
| GET | `/api/products/slug/:slug` | **Detalle por slug** |
| GET | `/api/products/:id` | Por `_id` de Mongo (24 hex) |
| POST | `/api/products` | 201. Slug único autogenerado desde `title`; **409** si ya existe |
| PATCH | `/api/products/:id` | Actualización parcial |
| PATCH | `/api/products/:id/active` | Body `{ isActive: boolean }` |
| PATCH | `/api/products/:id/restore` | Restaurar eliminado |
| DELETE | `/api/products/:id` | **Borrado lógico**, responde **204 sin body** |

- Éxito: `{ success: true, data }`. Error: `{ success: false, message }` (revisa `validate.js` por si los errores de Zod traen detalle por campo).
- Modelo: `title, slug, description, price (≥0), category (enum), condition (enum), location?, images: string[] (URLs), seller, status (disponible|reservado|vendido), isActive, deletedAt, createdAt, updatedAt`.
- Enums: categorías `electronica, ropa, hogar, deportes, vehiculos, libros, juguetes, otros`; condiciones `nuevo, como_nuevo, bueno, aceptable, mejorable`.

**Bugs/desajustes que debes corregir en el front:**
1. `ProductService.update` usa **PUT**, pero la API solo expone **PATCH** → la edición hoy da 404. Cambiar a PATCH.
2. Las rutas usan `_id`; deben usar `slug`. Para detalle usa `GET /products/slug/:slug`. Para editar/borrar la API pide `_id`, así que **obtén el producto por slug y usa `product._id` en PATCH/DELETE**.
3. El slug se genera en un hook `pre('validate')` del modelo, que **no se ejecuta con `findByIdAndUpdate`** → si cambia el título al editar, el slug en BD probablemente **no cambia**. Verifícalo; en el front no dependas de que cambie: tras editar navega usando el `slug` que devuelva la respuesta. Si se confirma, añádelo a "propuestas para la API".
4. Un producto con título "New" tendría slug `new` y chocaría con la ruta `/products/new`. Declara `new` **antes** que `:slug` y anótalo como edge case.

---

## 3. Stack obligatorio (adaptado a la versión real del proyecto)

- **Angular 18.2 — no actualices de versión.** Todo lo pedido es posible en 18. Usa solo APIs estables en 18: standalone, control flow `@if/@for/@switch/@defer`, `signal/computed/effect`, `input()/output()`, `inject()`, interceptores funcionales (`HttpInterceptorFn`), `withComponentInputBinding()`, `withFetch()`, `withViewTransitions()`.
- Angular Router, HttpClient, Signals, **Reactive Forms**, RxJS.
- **TailwindCSS**: usa la versión que sea oficialmente compatible con Angular 18 (por defecto Tailwind **3.4** con PostCSS; solo usa v4 si verificas que funciona con el builder de 18). Convive con `styles.scss`: migra a Tailwind los estilos de los componentes y deja en SCSS solo lo estrictamente global. Respeta los budgets (`anyComponentStyle` 4 kB).
- **SweetAlert2** (`sweetalert2`).
- **ngx-skeleton-loader**: instala la versión cuyo peer dependency soporte Angular 18 (compruébalo antes de instalar).
- **Standalone components exclusivamente.** Prohibidos `NgModule` y `CommonModule` completo (importa solo lo necesario: `NgOptimizedImage`, `CurrencyPipe`, `DatePipe`…).
- Todos los ficheros en **TypeScript** (`.ts`), no `.js`.
- Mantén `zone.js` (zoneless es experimental en 18).

---

## 4. Arquitectura del proyecto

Reorganiza `secondhand-front/src/app` así (migra los ficheros existentes, no dupliques):

```
src/
├── app/
│   ├── core/
│   │   ├── services/        # api.service.ts, loading.service.ts, notification.service.ts (SweetAlert2)
│   │   ├── interceptors/    # error.interceptor.ts, loading.interceptor.ts, (timeout dentro de api/interceptor)
│   │   ├── models/          # api-response.model.ts, api-error.model.ts
│   │   └── config/          # api.tokens.ts (HttpContextToken para saltar loader/alert), app constants
│   ├── shared/
│   │   ├── components/      # navbar, loader, skeleton, empty-state, error-state, page-not-found, form-field-error
│   │   ├── ui/              # badges (estado, condición), botones si procede
│   │   └── utils/           # url validators, price formatters, trackBy, etc.
│   ├── layouts/
│   │   └── main-layout/     # navbar + <router-outlet/> + footer + loader global
│   ├── features/
│   │   └── products/        # (antes "experiences": aquí el recurso es PRODUCT)
│   │       ├── models/      # product.model.ts
│   │       ├── services/    # products.service.ts (usa ApiService)
│   │       ├── store/       # products.store.ts
│   │       ├── components/  # product-card, product-grid, product-form, product-filters
│   │       ├── pages/       # product-list-page, product-detail-page, product-create-page, product-edit-page
│   │       └── products.routes.ts   # rutas hijas lazy
│   ├── app.routes.ts
│   ├── app.config.ts
│   └── app.component.ts
├── environments/
│   ├── environment.ts               # producción (base)
│   └── environment.development.ts   # desarrollo
└── ...
```

Preparado para escalar: cada futura feature (`users`, `reservations`, `payments`, `reviews`, `favorites`) debe poder añadirse como `features/<nombre>/` con su propio `*.routes.ts`, store y servicios, **sin tocar `core/` ni `shared/`**. Documenta esta convención en el README (no crees carpetas vacías).

> Nota: el prompt original hablaba de "experiences" (card con "duración"). En este proyecto el dominio es **products**: usa `Product`, `ProductsStore`, etc. En la card, en lugar de "duración" muestra **condición** (y estado).

---

## 5. Configuración de API y entornos

**`ApiService`** (core, centralizado, `providedIn: 'root'`): métodos genéricos `get/post/patch/delete<T>` que:
- Usan `environment.apiUrl` como `baseUrl`.
- Aplican **timeout** (RxJS `timeout`, valor desde `environment.requestTimeoutMs`, p. ej. 10 000 ms).
- **Serializan/desempaquetan** la respuesta `{ success, data }` y devuelven `T`; tratan `204` sin body; **validan que la respuesta tenga la forma esperada** (si es inválida, lanza un `ApiError` tipado "respuesta inválida").
- Limpian parámetros `undefined/null/''` al construir query params.
- `ProductsService` solo conoce rutas de producto y delega en `ApiService`.

**Entornos (Angular 18):**
- `environment.ts` → producción: `apiUrl: '/api'`.
- `environment.development.ts` → desarrollo: `apiUrl: 'http://localhost:3000/api'` (equivale a `API_URL=http://localhost:3000/api`).
- Ambos exponen `production`, `apiUrl`, `requestTimeoutMs`.
- Configura `angular.json`: `fileReplacements` de `environment.ts` → `environment.development.ts` en la configuración **development** (y elimina el `environment.production.ts` y su replacement actual). Comprueba que `ng serve` usa desarrollo y `ng build` producción.
- Documenta en el README qué es `API_URL` y dónde se cambia.

---

## 6. Gestión de estado: `ProductsStore` (Signals)

Store global `providedIn: 'root'` que actúa como **caché**:

- Estado privado con `signal()`, expuesto con `asReadonly()`: `products`, `selectedProduct`, `loading`, `error`, más `saving` y `deletingId` para operaciones de escritura.
- `computed()` para derivados: `count`, `isEmpty`, `hasError`, lista filtrada/ordenada, `availableProducts`…
- **Carga única**: `loadAll()` no vuelve a pedir si ya hay datos cargados salvo `force: true`. Guarda un flag `loaded` (y la clave de filtros si hay filtrado servidor).
- **Sin peticiones duplicadas**: guarda la `Promise` en vuelo (`inFlight`) y reutilízala si se llama dos veces seguidas.
- `loadBySlug(slug)`: busca primero en la caché; solo hace `GET /products/slug/:slug` si no está. Cachea el resultado. Si el slug no existe → estado `notFound` (404), no un error genérico.
- Mutaciones (`create`, `update`, `remove`) mantienen la caché coherente (insertar/reemplazar/quitar) sin recargar todo, y actualizan `selectedProduct`.
- `effect()` **solo para efectos secundarios** (p. ej. log en dev o sincronizar algo externo). **No escribas señales dentro de un `effect`** (en Angular 18 exige `allowSignalWrites` y es mala práctica): para rellenar el formulario de edición usa un método explícito (`form.patchValue` cuando llegue el producto, vía `await store.loadBySlug` o un `computed`/`toObservable`), no un effect que escriba.
- Todas las operaciones async con **`try/catch/finally`** y errores normalizados a `ApiError`.
- Mantén el patrón actual `firstValueFrom` + `async/await` en el store para ser coherente.

---

## 7. Interceptores (funcionales, registrados con `withInterceptors([...])`)

**`errorInterceptor`**
- Captura: errores de red (`status 0`), timeout (`TimeoutError`), HTTP 4xx/5xx y errores del backend (`{ success:false, message }`).
- Normaliza a un `ApiError { kind: 'network' | 'timeout' | 'http' | 'validation' | 'invalid-response', status, message, details? }` y vuelve a lanzarlo.
- Mensajes **amigables en español** (no mostrar stacks ni texto técnico): 0 → "No hemos podido conectar con el servidor", 404, 409 ("Ya existe un producto con ese título"), 400/422, 5xx, timeout.
- Muestra **SweetAlert2** para errores en **mutaciones** (POST/PATCH/DELETE) y errores inesperados.
- **Política anti-duplicado:** los errores de **carga** (GET de lista/detalle) NO abren modal; se muestran en el componente `ErrorState` con botón "Reintentar". Implementa esto con un `HttpContextToken` (`SKIP_ERROR_ALERT`) que el servicio/store activa en los GET.

**`loadingInterceptor`**
- Contador de peticiones en curso en `LoadingService` (signal `pendingCount` → `isLoading = computed(...)`), con `finalize` para decrementar siempre.
- Muestra un **indicador global** discreto (barra superior de progreso o spinner en el layout). Evita parpadeo: pequeño retardo (~150–200 ms) antes de mostrarlo.
- Las pantallas que ya muestran **skeleton** no deben duplicar el loader: usa `HttpContextToken` `SKIP_GLOBAL_LOADER` en esos GET.

---

## 8. Modelos

- `Product` con todos los campos reales: `_id, title, slug, description, price, category: ProductCategory, condition: ProductCondition, location?, images: string[], seller, status: ProductStatus, isActive, deletedAt: string | null, createdAt, updatedAt`.
- Tipos literales/enums para `ProductCategory`, `ProductCondition`, `ProductStatus` y sus **etiquetas legibles** (`como_nuevo` → "Como nuevo") en un único sitio reutilizable (constantes, no hardcodeadas en plantillas).
- `ProductInput` / `ProductFormValue`, `ProductFilters`, `ApiResponse<T>`, `ApiError`.
- Sustituye todo `string` suelto por esos tipos.

---

## 9. Routing y lazy loading

- `provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withPreloading(PreloadAllModules))`.
- `app.routes.ts` carga el layout y la feature con `loadChildren: () => import('./features/products/products.routes')`.
- Rutas de la feature (con `title` y componentes `loadComponent`):
  - `''` → listado
  - `products/new` → crear (**antes** que `:slug`)
  - `products/:slug` → detalle
  - `products/:slug/edit` → editar
  - `**` → `PageNotFound` (404 real; deja de redirigir silenciosamente a `/`).
- Recibe el `slug` con `input()` gracias a `withComponentInputBinding()`.
- Usa `@defer` para partes pesadas no críticas (p. ej. galería de imágenes del detalle).
- Verifica con `ng build` que se generan chunks separados (code splitting).

---

## 10. Formularios y validaciones (Reactive Forms exclusivamente)

Un único `ProductFormComponent` reutilizable para crear y editar (entradas con `input()`, salida `output()` de submit), con `FormBuilder.nonNullable` y formulario tipado.

| Campo | Reglas |
|---|---|
| title | required, minLength 3, maxLength 80, no solo espacios |
| description | required, minLength 10, maxLength 2000 |
| price | required, numérico (`pattern` de número con hasta 2 decimales), **positivo (> 0)** |
| category / condition | required, valor dentro del enum |
| status | solo en edición, valor del enum |
| location | opcional, maxLength 100 |
| seller | required, minLength 2, maxLength 60 |
| images | `FormArray` de URLs; cada una con validador de **URL válida** (http/https, usando `URL` parse, no solo regex), máximo 5, sin duplicados |

Notas: la API acepta `price ≥ 0`; el front exigirá `> 0` por requisito. Deja el mínimo en una constante y menciónalo en el resumen. Alinear maxLength con Zod en la API sería una "propuesta para la API".

Accesibilidad de los mensajes de error:
- Componente `FormFieldError` reutilizable; mensajes claros en español ("El título debe tener al menos 3 caracteres").
- `aria-invalid`, `aria-describedby` apuntando al error, `role="alert"` o `aria-live="polite"`, `label` asociado a cada control, foco al primer campo inválido al enviar.
- Mostrar errores tras `touched` o tras intento de envío. Botón de submit deshabilitado mientras `saving()`.
- Mapea los errores de validación del backend (si traen detalle por campo) a los controles del formulario; si no, muestra el mensaje general.
- Al crear con título duplicado (409) → error en el campo `title`, no solo un modal.

---

## 11. UI / UX (nivel profesional/premium)

**Skills de diseño:** si tienes instaladas skills de diseño (p. ej. `frontend-design`, `design-taste-frontend`, `web-design-guidelines`, `design:accessibility-review`, `design:ux-copy`), **úsalas** al diseñar componentes y al revisar el resultado. Evita el aspecto genérico de plantilla: jerarquía tipográfica clara, espaciado consistente, microinteracciones sutiles (hover/focus/active, transiciones cortas respetando `prefers-reduced-motion`), sombras suaves y bordes redondeados coherentes.

**Paleta (azul formal, estilo marketplace de segunda mano).** Define los colores como **tokens** (CSS variables + `theme.extend.colors` de Tailwind) para poder cambiar de paleta en un solo fichero. Implementa por defecto la **Paleta A** (continuidad con el `#2563EB` actual) y deja las B y C documentadas en el README como alternativas intercambiables:

- **A · Azul Confianza** (recomendada): primary-50 `#EFF6FF`, 100 `#DBEAFE`, 200 `#BFDBFE`, 400 `#60A5FA`, 500 `#3B82F6`, 600 `#2563EB`, 700 `#1D4ED8`, 900 `#1E3A8A`. Acento ámbar `#F59E0B` (destacados/precio). Neutros slate (`#0F172A` texto, `#64748B` secundario, `#E2E8F0` bordes, `#F8FAFC` fondo).
- **B · Marino + Cian** (más corporativa): navy `#0B1F3A`, `#12386B`, primary `#1D4ED8`, acento cian `#06B6D4`, fondo `#F4F7FB`.
- **C · Índigo + Turquesa** (guiño a Wallapop): índigo 600 `#4F46E5`, 900 `#312E81`, acento turquesa `#14B8A6`, neutros stone.

Colores semánticos de estado: `disponible` verde, `reservado` ámbar, `vendido` gris pizarra, error rojo. **Contraste mínimo WCAG AA** en textos y badges (compruébalo). Tipografía: mantén Poppins (o propón una pareja mejor, cargada con `preconnect` + `font-display: swap`).

**Componentes mínimos** (todos standalone, `ChangeDetectionStrategy.OnPush`, `input()/output()`):
- **Navbar**: logo, navegación (Inicio, Publicar producto), responsive con menú hamburguesa accesible (teclado, `aria-expanded`), sticky.
- **ProductCard**: imagen (con `NgOptimizedImage`, `loading="lazy"`, aspect-ratio fijo y **placeholder** si no hay imagen o falla la carga), título, ubicación, precio formateado (`CurrencyPipe` EUR, `es-ES`), condición y badge de estado. Toda la card es enlace a `/products/:slug`.
- **ProductGrid**: grid responsive (1–2–3–4 columnas) de cards con `@for ... track product._id`.
- **ProductForm**: reutilizable crear/editar (sección 10), con preview de imágenes por URL.
- **Loader** global (consumiendo `LoadingService`).
- **SkeletonLoader**: con `ngx-skeleton-loader`, replicando el layout real de card y de detalle para evitar layout shift.
- **EmptyState** (sin productos / sin resultados de filtros) con CTA.
- **ErrorState** (error de API) con mensaje amigable y botón "Reintentar".
- **PageNotFound** y estado "Producto no encontrado" en el detalle.
- Sustituye `confirm()` por un diálogo de **SweetAlert2** (estilizado con la paleta) para eliminar, y usa toasts de SweetAlert2 para éxito (creado/actualizado/eliminado).
- Detalle de producto: galería de imágenes, precio destacado, datos del vendedor, condición, ubicación, fecha de publicación (`DatePipe` es-ES) y acciones Editar/Eliminar.

**Responsive:** mobile-first; verifica 375 px, 768 px y 1280 px sin scroll horizontal. Foco visible en todo elemento interactivo; navegable por teclado.

---

## 12. Funcionalidades

- **Listar** productos (con skeleton, vacío, error) y, aprovechando que la API ya lo soporta, **filtros** simples por categoría, condición, rango de precio y estado (componente `ProductFilters`, valores reflejados en query params de la URL). Si la API devuelve la lista completa sin paginar, filtra/ordena en cliente con `computed` cuando sea posible para no repetir peticiones; si usas filtrado en servidor, cachea por clave de filtros.
- **Ver detalle** por slug.
- **Crear** → al guardar, navega a `/products/<slug devuelto>`.
- **Editar** (PATCH, enviando solo lo que cambió o el payload completo, pero siempre con el `_id` del producto cargado) → navega al slug de la respuesta.
- **Eliminar** (DELETE → 204, borrado lógico) con confirmación SweetAlert2, actualización de la caché y redirección al listado si se borra desde el detalle.

---

## 13. Manejo de errores (transversal)

Todas las operaciones usan **try/catch/finally** (store y puntos de entrada de UI). Cubre explícitamente: timeout, API caída (status 0), errores HTTP (400/404/409/5xx), errores de validación (front y backend) y respuestas inválidas (forma inesperada). Nunca dejes un spinner infinito ni una promesa sin capturar. Mensajes siempre amigables y en español; el detalle técnico solo en `console` y solo en desarrollo.

---

## 14. Rendimiento

- `ChangeDetectionStrategy.OnPush` en todos los componentes + Signals.
- Lazy loading de rutas y `@defer` donde aporte; preloading de rutas.
- Skeleton loaders y caché global (sin peticiones repetidas al navegar lista ↔ detalle).
- `track` correcto en `@for`; sin funciones costosas en plantillas (usa `computed`/pipes puros).
- Imágenes con `NgOptimizedImage`/lazy y dimensiones reservadas.
- Respeta los budgets de `angular.json` (initial < 500 kB warning); informa del tamaño final del bundle.

---

## 15. Documentación: `secondhand-front/README.md`

README completo y real (verifica cada comando antes de escribirlo):
- Descripción y capturas/descripción de pantallas.
- Requisitos (Node, versión de Angular CLI) e **instalación**.
- **Ejecución**: cómo levantar la API (`secondhand-api`: `npm run dev`, `npm run seed`) y el front (`npm start`), build de producción.
- **Estructura del proyecto** (árbol de la sección 4 con una línea por carpeta) y convención para añadir nuevas features.
- **Variables de entorno**: `API_URL`/`apiUrl`, `requestTimeoutMs`, qué fichero se usa en cada configuración.
- Resumen del contrato de la API consumida.
- Sistema de diseño: tokens de color, paletas A/B/C y cómo cambiar de paleta.
- Decisiones técnicas (store como caché, política de errores/loader, por qué slug en rutas y `_id` en mutaciones).

---

## 16. Fases de entrega (haz build + prueba entre fases)

1. **Auditoría y base:** leer código, instalar Tailwind/SweetAlert2/ngx-skeleton-loader, entornos + `angular.json`, nueva estructura de carpetas, migrar ficheros existentes sin cambiar comportamiento.
2. **Core:** `ApiService`, modelos, interceptores, `LoadingService`, `NotificationService`.
3. **Estado:** `ProductsStore` con caché, dedupe y slug.
4. **UI base:** tokens/tema, layout, navbar, loader, skeleton, empty/error/404, card, grid.
5. **Páginas y formularios:** listado + filtros, detalle, crear/editar con validaciones, eliminar.
6. **Pulido y cierre:** accesibilidad, responsive, rendimiento, README, revisión final.

## 17. Criterios de aceptación (comprueba todos al terminar)

- [ ] `npm run build` (producción) y `ng build --configuration development` sin errores ni warnings; hay chunks lazy separados.
- [ ] Con la API y el seed levantados: listar, ver detalle por slug, crear, **editar (PATCH)** y eliminar funcionan de punta a punta.
- [ ] Ninguna ruta de usuario contiene `_id`; las URLs usan slug.
- [ ] Navegar lista → detalle → lista **no** repite peticiones GET innecesarias (compruébalo en la pestaña Network).
- [ ] Con la API apagada: se ve `ErrorState` con "Reintentar" en listado/detalle y modal SweetAlert2 en mutaciones; sin spinners colgados.
- [ ] Slug inexistente → pantalla "Producto no encontrado"; ruta desconocida → 404.
- [ ] Formularios: todas las validaciones de la sección 10, con mensajes accesibles; título duplicado → error 409 mostrado en el campo.
- [ ] Todos los componentes standalone + OnPush; sin `NgModule`, sin `CommonModule` completo, sin `confirm()`/`alert()` nativos.
- [ ] Capturas/inspección a 375, 768 y 1280 px sin scroll horizontal; contraste AA; navegación por teclado.
- [ ] README completo y verificado.
- [ ] Resumen final con decisiones, desviaciones del enunciado y lista de "propuestas para la API".
