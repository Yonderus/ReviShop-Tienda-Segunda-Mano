# Prompt: Lo que falta en el frontend (`secondhand-front`)

## 0. Rol y forma de trabajar

Actúa como **Senior Frontend Engineer especializado en Angular 18** (standalone, Signals, Reactive Forms, Tailwind 3.4). Vas a completar el front de **Revishop** siguiendo la checklist de clase (columna **Client** de la pizarra).

- **Requisito previo:** se ejecuta **después** de [PROMPT_BACKEND.md](PROMPT_BACKEND.md). Antes de empezar, comprueba con peticiones reales que la API ya devuelve `category`, `seller`, `images` y `variants` como objetos, y que existen `PATCH /products/:id/status`, `GET /categories` y `GET /sellers`. Si no, para y avisa.
- Trabajas **solo en `secondhand-front/`**. Lo que convenga cambiar en la API va al final como "propuestas para la API".
- **Audita primero:** lee `src/app/core`, `shared`, `layouts`, `features/products`, `features/admin`, `app.routes.ts`, `app.config.ts` y el `README.md`. No asumas nada.
- Mantén lo que ya funciona: standalone + `OnPush`, Signals, interceptores, skeletons, estados de error y vacío, el estilo "retirado" y los tokens de color. Sin `NgModule`, sin `CommonModule` completo, sin `@let` (es developer preview en Angular 18).
- Trabaja **por fases** (sección 4). Tras cada fase: `npm run build` y `ng build --configuration development` **sin errores ni warnings**, y prueba en el navegador con la API y el seed.
- Al terminar: resumen corto con lo hecho, las decisiones y lo pendiente.

---

## 1. Estado actual frente a la pizarra

| Punto de la pizarra | Estado | Qué hay hoy |
|---|---|---|
| **core: interceptor error** | ✅ | `errorInterceptor` (timeout, validación de la respuesta, `ApiError`, alertas) y `loadingInterceptor` |
| **services: apiService → HttpClient, async-Promise** | 🟡 Parcial | `ApiService` usa `HttpClient`, pero **devuelve `Observable`**; el `firstValueFrom` lo hace el store |
| **services: alertService → SweetAlert2** | 🟡 Parcial | Existe como `NotificationService` (SweetAlert2 cargado bajo demanda); falta el nombre de la pizarra |
| **stores: signals** | ✅ | `ProductsStore` con colecciones, caché, deduplicación y `computed`. Falta el store de categorías y vendedores |
| **models: relationships** | ❌ | `Product` es plano: `category` enum, `seller` string, `images: string[]`, sin variantes |
| **routes: lazyload, codesplitting → import** | ✅ | `loadChildren`/`loadComponent` con `import()`, precarga, chunks separados |
| **comps: error, skeleton** | ✅ | `ErrorStateComponent` y `SkeletonComponent` (variantes cards, detail, table, stats, form) |
| **layout: navbar** | ✅ | `MainLayout` con navbar y `AdminLayout` con sidebar |
| **features → components: Form → reactive forms, selects** | 🟡 Parcial | Formulario reactivo tipado con `select` de categoría, condición y estado, pero con **valores fijos en el código**: no hay `select` de categoría desde la API, ni de vendedor, ni de opciones de variante |
| **features → pages: List, Edit, Create** | ✅ | Públicas y del admin. Hay que adaptarlas a los modelos con relaciones |
| **pages → components: Error, Skeleton** | ✅ | Todas las páginas los usan |
| **pages → labels** | 🟡 Parcial | Etiquetas legibles para condición, estado y categoría, pero las de categoría están fijas en el código; deben venir de la API |
| **pages → múltiples imágenes** | 🟡 Parcial | `FormArray` de hasta 5 URLs. Falta adaptarlo a la entidad `Image` (`alt`, portada, orden) |
| **features → routes** | ✅ | `products.routes.ts` y `admin.routes.ts` |
| **changeStatus** (lado servidor) | ❌ | No hay UI para cambiar el estado de venta fuera del formulario de edición |

---

## 2. Qué hay que hacer

### 2.1 Services

**`ApiService` asíncrono** (`core/services/api.service.ts`):
- Los métodos `get`, `post`, `patch` y `delete` pasan a ser **`async`** y devuelven **`Promise<T>`** (`firstValueFrom` **dentro** del servicio).
- Se mantienen el desempaquetado de `{ success, data }`, el tratamiento del 204, la limpieza de params y las opciones (`skipErrorAlert`, `skipGlobalLoader`, `inlineErrorStatuses`, `blocking`).
- `ProductsService` y los services nuevos devuelven `Promise` y los stores hacen `await` directamente, sin `firstValueFrom`.
- RxJS queda solo en los interceptores y en `toSignal` del layout.

**`AlertService`** (`core/services/alert.service.ts`):
- Renombra `NotificationService` → `AlertService`, con la misma API (`error`, `success`, `confirm`) y SweetAlert2 cargado bajo demanda.
- Actualiza todos los imports y el `errorInterceptor`, y borra el fichero antiguo.

**Services de catálogo** (`features/catalog/services/`):
- `CategoriesService.list()` → `GET /categories`.
- `SellersService.list()` → `GET /sellers`.
- Los dos con lectura sin modal ni loader global, como el resto de cargas.

### 2.2 Models: relationships

En `features/products/models/` (y `features/catalog/models/` para lo compartido):

| Fichero | Interfaz | Campos clave |
|---|---|---|
| `category.model.ts` | `Category` | `_id`, `name`, `slug`, `parentId: string \| null`, `attributes: CategoryAttribute[]`, `order` |
| `category.model.ts` | `CategoryAttribute` | `key`, `label`, `values: string[]` |
| `seller.model.ts` | `Seller` | `_id`, `name`, `slug`, `location?` |
| `image.model.ts` | `ProductImage` | `_id`, `url`, `alt`, `kind`, `isPrimary`, `order`, `width?`, `height?` |
| `product-variant.model.ts` | `ProductVariant` | `_id`, `sku`, `slug`, `options: { key, value }[]`, `optionsKey`, `price: number \| null`, `stock`, `status`, `isDefault`, `isActive` |
| `product.model.ts` | `Product` | `_id`, `title`, `slug`, `description`, `basePrice`, `condition`, `location?`, `status`, `isActive`, `deletedAt`, `createdAt`, `updatedAt`, **`category: CategorySummary`**, **`seller: Seller`**, **`images: ProductImage[]`**, **`variants?: ProductVariant[]`**, `variantsCount` |
| `product.model.ts` | `ProductInput` | `title`, `description`, `basePrice`, `condition`, `categoryId`, `sellerId`, `location?`, `images: { url, alt }[]` |

- Desaparecen `PRODUCT_CATEGORIES` y `CATEGORY_LABELS`: las categorías y sus nombres vienen de la API.
- Se quedan las constantes de `condition` y `status`, que son estados del dominio.
- Helpers puros en `product.utils.ts`:
  - `primaryImage(product)`;
  - `displayPrice(product)` (precio de la variante por defecto o `basePrice`, y "desde X €" si las variantes tienen precios distintos);
  - `variantLabel(variant)` ("Talla M · Negro").

### 2.3 Stores: signals

- **`ProductsStore`:** adáptalo a los services con `Promise` y a los nuevos modelos (`basePrice`, `category.slug` para los filtros del catálogo, `seller`).
  - Añade **`changeStatus(product, status)`**: optimista, con rollback, `pendingIds` y recálculo de `statusBreakdown`, igual que `setActive`.
  - Si la API responde 422 porque el producto tiene varias variantes, muestra "El estado se cambia por variante" con `AlertService`.
- **`CatalogStore`** (nuevo, `features/catalog/store/catalog.store.ts`, `providedIn: 'root'`):
  - `categories` y `sellers` con **carga única** y deduplicación, como `ProductsStore`;
  - `computed`: `rootCategories`, `childrenOf(parentId)`, `categoryBySlug` y `attributesFor(categoryId)` (con la herencia del padre).

### 2.4 Components: Form → reactive forms, selects

`ProductFormComponent` (reutilizado en las páginas públicas y del admin):

| Campo | Control | Datos | Validación |
|---|---|---|---|
| Categoría | `select` con `optgroup` por categoría raíz | `CatalogStore.categories` | requerida, `categoryId` válido |
| Vendedor | `select` | `CatalogStore.sellers` | requerido |
| Condición | Selector segmentado actual (escala de vida) | Constantes | requerida |
| Precio base | `input number` | — | requerido, > 0, 2 decimales como máximo |
| Estado de venta | **Fuera del formulario**: va por `changeStatus` (2.6) | — | — |
| Opciones de variante | Solo en edición, de solo lectura: lista de variantes con su `variantLabel` | `product.variants` | — (no hay CRUD de variantes en la API) |

- Mientras cargan las categorías y los vendedores, los `select` muestran un skeleton y están deshabilitados.
- Si fallan, aparece un mensaje en línea con "Reintentar".
- Cada `select` lleva su `label`, `aria-invalid` y `aria-describedby`, igual que el resto de campos.

### 2.5 Pages: List, Edit, Create · labels · múltiples imágenes

**Labels (etiquetas):**
- El nombre de la categoría sale de `product.category.name`.
- El vendedor, de `product.seller.name`.
- La condición y el estado siguen usando sus constantes.
- Ningún texto de categoría queda fijo en el código.

**Múltiples imágenes** (`components/product-images-field`):
- Un `FormArray` de `{ url, alt }`, con **máximo 5** y sin URLs repetidas.
- La URL se valida con `URL` (http/https).
- El `alt` es requerido y tiene como máximo 120 caracteres.
- Vista previa de cada imagen; se puede **marcar la portada** (la primera = `isPrimary`) y **reordenar** con botones subir/bajar accesibles por teclado.
- En la card y en las listas del admin se muestra `primaryImage(product)`.
- En el detalle, la galería recorre `product.images` ordenadas por `order`, con su `alt`.

**List:**
- El catálogo público y las tablas del admin muestran la categoría, el vendedor, la imagen principal, `displayPrice` y `variantsCount` ("3 variantes").
- El filtro de categoría del catálogo usa las categorías de la API (por `slug` en la URL).

**Edit:**
- Carga por slug y rellena el formulario desde los objetos (`categoryId = product.category._id`…).
- Envía `PATCH` solo con los campos cambiados.

**Create:**
- Envía `categoryId`, `sellerId`, `basePrice` e `images`.
- Navega al slug devuelto.

**Detalle:**
- Si el producto tiene más de una variante, un selector accesible (`radiogroup`) con su `variantLabel`, precio y estado.
- El precio y la disponibilidad cambian según la variante elegida.

### 2.6 changeStatus en el admin

- En la tabla de productos, la columna **Venta** pasa de badge a un **`select` compacto** (`disponible`, `reservado`, `vendido`) que llama a `ProductsStore.changeStatus`.
  - El cambio es optimista, con rollback y deshabilitado mientras está pendiente.
  - En móvil, lo mismo dentro de la tarjeta.
- Si el producto tiene varias variantes, el `select` sale **deshabilitado**, con una pista "Se gestiona por variante".
- El resumen del dashboard se actualiza solo, porque los KPIs son `computed`.

---

## 3. Contrato que hay que adaptar

| Antes | Ahora |
|---|---|
| `price` | `basePrice` (+ `variants[].price`) |
| `category: "electronica"` | `category: { _id, name, slug }`; al escribir, `categoryId` |
| `seller: "Juan"` | `seller: { _id, name, slug, location }`; al escribir, `sellerId` |
| `images: string[]` | `images: { _id, url, alt, kind, isPrimary, order }[]`; al escribir, `{ url, alt }[]` |
| `status` en el PATCH genérico | `PATCH /products/:id/status` |
| — | `variants`, `variantsCount` |

## 4. Fases

1. **Services:** `ApiService` asíncrono, `AlertService`, services de catálogo.
2. **Models y stores:** modelos con relaciones, `CatalogStore`, adaptación de `ProductsStore` y `changeStatus`.
3. **Formulario:** `select` desde la API, campo de imágenes múltiples.
4. **Páginas:** listas, detalle con variantes, crear y editar, y `changeStatus` en el admin.
5. **Pulido y cierre:** accesibilidad, responsive (375/768/1280/1440 px), README actualizado y prueba completa con el seed.

## 5. Criterios de aceptación

- [ ] Las dos builds compilan sin errores ni warnings; el admin y el catálogo siguen en chunks lazy separados.
- [ ] `ApiService` y los services devuelven `Promise`; ningún store usa `firstValueFrom`.
- [ ] Ya no existe `NotificationService`: todo usa `AlertService` (SweetAlert2).
- [ ] Ninguna categoría está fija en el código: los `select`, las etiquetas y los filtros salen de `GET /categories`.
- [ ] El formulario de crear y editar usa los `select` de categoría y vendedor desde la API, con skeleton mientras cargan y error en línea si fallan.
- [ ] Se pueden añadir hasta 5 imágenes con `alt`, elegir la portada y reordenarlas; la card muestra la portada y el detalle, la galería en orden.
- [ ] En el detalle de un producto con variantes se puede elegir la variante y cambian el precio y el estado.
- [ ] `changeStatus` en el admin funciona con UI optimista y rollback, y está deshabilitado en productos con varias variantes.
- [ ] `getBySlug`, soft delete, restore e `isActive` siguen funcionando de punta a punta.
- [ ] Contraste AA, navegación por teclado y sin scroll horizontal en 375, 768, 1280 y 1440 px.
