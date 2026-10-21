# Prompt: Lo que falta en el backend (`secondhand-api`)

## 0. Rol y forma de trabajar

Actúa como **Senior Backend Engineer (Node.js + Express + MongoDB/Mongoose)**. Vas a completar la API de **Revishop**, un marketplace de segunda mano tipo Wallapop, siguiendo la checklist de clase (columna **Server** de la pizarra).

- Trabajas **solo en `secondhand-api/`**. Si algo rompe el contrato que usa el front, apúntalo en el resumen final; no toques `secondhand-front/`.
- **Audita primero:** lee todo `src/`, `postman.md`, `README.md` y [PROMPT.md](PROMPT.md), que contiene el modelo de datos completo y el diagrama entidad-relación. No asumas nada.
- Mantén ES Modules, la arquitectura `routes → controllers → services → repositories → models` y la carpeta `utils/` (AppError, response, errorHandler, slugify).
- Trabaja **por fases** (sección 4). Tras cada fase: `npm run dev`, `npm run seed` y peticiones reales a los endpoints. No avances si algo falla.
- Al terminar: resumen corto con lo hecho, las decisiones, los **cambios de contrato para el front** y lo pendiente.

---

## 1. Estado actual frente a la pizarra

| Punto de la pizarra | Estado | Qué hay hoy |
|---|---|---|
| Control de errores en **server** | 🟡 Parcial | `errorHandler` global con `AppError`. Falta 404 JSON para rutas inexistentes, JSON mal formado (hoy da 500), E11000 → 409 y `CastError` → 422 |
| Control de errores en **routes (Zod)** | 🟡 Parcial | `validate({ params, query, body })` con Zod en todas las rutas de productos. Faltan los schemas de los campos nuevos y de los endpoints nuevos |
| Control de errores en **services** | ✅ | Los services lanzan `BadRequestError`, `NotFoundError` y `ConflictError` |
| **models: relationships** | ❌ | Solo existe `Product`, sin referencias (`seller` y `category` son texto) |
| **repos: populate, slug** | 🟡 Parcial | `findBySlug` existe; no hay ningún `populate` |
| **services: relations, slug** | 🟡 Parcial | Slug con 409 en productos. No se valida ninguna relación porque no las hay |
| **ctrls: async/await, try-catch, const** | 🟡 Parcial | async/await sí, pero dentro de `catchAsync` y como métodos de un objeto: no hay `try/catch` ni funciones `const` |
| **getBySlug** | ✅ | `GET /products/slug/:slug`. Falta devolver las relaciones pobladas |
| **softDelete** | ✅ | `DELETE /products/:id`. Falta la cascada a variantes e imágenes |
| **RestoreDelete** | ✅ | `PATCH /products/:id/restore`. Falta la cascada |
| **isActive** | ✅ | `PATCH /products/:id/active` con `{ isActive }` |
| **changeStatus** | ❌ | No hay endpoint: el estado de venta solo cambia con el `PATCH` genérico |

---

## 2. Qué hay que hacer

### 2.1 Control de errores (server · routes · services)

**`utils/errorHandler.js`** (server):
- Error de duplicado de Mongo (`err.code === 11000`) → **409**, con el campo duplicado en el mensaje ("Ya existe un usuario con ese email").
- `mongoose.Error.CastError` → **422** ("ID no válido").
- `mongoose.Error.ValidationError` → **422**, con los mensajes de cada campo unidos.
- JSON mal formado (`err.type === 'entity.parse.failed'`) → **422** ("El cuerpo de la petición no es un JSON válido").
- Lo demás → **500** con mensaje genérico; el `console.error` solo fuera de producción.

**`server.js`**:
- Middleware de **ruta no encontrada** detrás de todas las rutas que lance `NotFoundError('Ruta no encontrada')` → `404` en JSON.

**routes (Zod)**: un schema para cada endpoint nuevo o modificado (sección 2.6), con mensajes en español que nombren el campo:
- ObjectId → `z.string().regex(/^[0-9a-fA-F]{24}$/, '<campo> no es un ID válido')`.

**services**: lanzan siempre errores de `AppError`, nunca `Error` a secas ni respuestas HTTP:
- **404** si el recurso principal no existe.
- **422** si una referencia (`categoryId`, `sellerId`) no existe, está inactiva o eliminada.
- **409** si hay duplicados.

### 2.2 Models: relationships

Implementa el modelo de datos de **[PROMPT.md](PROMPT.md)** (secciones 1 a 4): `Role`, `User`, `Category`, `Product` (modificado), `ProductVariant` e `Image`, con sus índices, sus `ref` y virtuals. Aplica además estas **correcciones** sobre ese documento:

1. **`Image.ownerType`** guarda el **nombre exacto del modelo** (`'User'`, `'Category'`, `'Product'`, `'ProductVariant'`) y `ownerId` usa `refPath: 'ownerType'`.
2. **Variante por defecto:** `options: []` y **`optionsKey: 'default'`**. En Mongoose, `required` rechaza la cadena vacía.
3. **SKU automático** de la variante por defecto: `slug` del producto en mayúsculas + `-DEF` (p. ej. `IPHONE-13-PRO-256GB-DEF`). Si ya existe, se añade un sufijo numérico.
4. **Virtuals en `Product`:**
   - `variants` (ref `ProductVariant`, `localField: '_id'`, `foreignField: 'productId'`);
   - `images` (ref `Image`, `foreignField: 'ownerId'`, `match: { ownerType: 'Product', deletedAt: null }`, ordenadas por `order`).

   Activa `toJSON: { virtuals: true }` y `toObject: { virtuals: true }`.
5. **Virtual `role` en `User`** sobre `roleId`. `passwordHash` lleva `select: false`, y un `toJSON` lo elimina siempre.
6. **Índice de texto** de `products` con `default_language: 'spanish'`.
7. **`deletedBy`:** queda en `null` mientras no haya login (el campo existe para cuando lo haya).

### 2.3 Repos: populate, slug

En **`repositories/product.repository.js`**:
- `findAll(filter, sort)`: `populate('category', 'name slug')`, `populate('seller', 'name slug location')` y la imagen principal (`populate({ path: 'images', match: { isPrimary: true } })`). Con `.lean({ virtuals: true })` o sin `lean` si los virtuals lo requieren.
- `findBySlug(slug)` y `findById(id)`: lo mismo, más **todas** las `images` y las `variants` activas y no borradas, ordenadas por `order`.
- Métodos de soporte para la cascada:
  - `softDeleteChildren(productId, date)`: variantes e imágenes del producto;
  - `restoreChildren(productId, date)`: **solo** los hijos cuyo `deletedAt` coincide con el del producto, para no revivir lo que se borró antes por separado.

Repositorios **mínimos** (solo lo que usan el service y el seed) para `category`, `user`, `productVariant` e `image`:
- `findActiveById`;
- `findBySlug` en categorías;
- las listas de solo lectura de la sección 2.6.

### 2.4 Services: relations, slug

En **`services/product.service.js`**:
- **Relaciones al crear y editar:** comprueba que `categoryId` existe, está activa, `published` y sin borrar, y que `sellerId` existe, está activo y sin borrar. Si no → **422** nombrando el campo.
- **Crear:** crea el producto y su **variante por defecto** en la misma operación, y `variantsCount = 1`. Si falla la variante, borra el producto creado para no dejarlo huérfano.
- **Editar el título:** regenera el `slug` del producto (409 si choca) **y los `slug` de sus variantes**.
- **Soft delete:** marca el producto y, en cascada, sus variantes e imágenes con la **misma** fecha.
- **Restore:** restaura el producto y **solo** los hijos borrados en esa misma fecha.
- **`status` calculado:**
  - todas las variantes vendidas → `vendido`;
  - si no, ninguna disponible y alguna reservada → `reservado`;
  - en cualquier otro caso → `disponible`.

  Función `recalculateStatus(productId)`.
- **Slugs:**
  - `products` mantiene la política de **409**;
  - `users`, `productVariants` e `images` usan un helper nuevo, `uniqueSlug(Model, base)`, en `utils/slugify.js`, que añade `-2`, `-3`…

### 2.5 Controllers: async/await, try-catch, const

Reescribe `controllers/product.controller.js` como **funciones `const` exportadas**, con `async/await` y `try/catch` explícito:

```js
export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getBySlug(req.params.slug);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};
```

- Un controller por endpoint (`getProducts`, `getProductBySlug`, `createProduct`, `updateProduct`, `changeProductStatus`, …).
- Los controllers no contienen lógica de negocio: leen `req`, llaman al service y responden con `sendSuccess`, `sendCreated` o `sendNoContent`.
- Elimina `utils/catchAsync.js` cuando ya no lo use nadie.
- Las rutas importan las funciones con nombre (`import { getProducts, … } from '../controllers/product.controller.js'`).

### 2.6 Endpoints

| Método | Ruta | Estado | Qué hacer |
|---|---|---|---|
| GET | `/api/products` | ✏️ | Devolver `category`, `seller`, imagen principal y `variantsCount` |
| GET | `/api/products/actives` · `/inactives` · `/trash` | ✏️ | Igual que el anterior |
| GET | `/api/products/slug/:slug` | ✏️ **getBySlug** | Producto con `category`, `seller`, todas las `images` y las `variants` |
| GET | `/api/products/:id` | ✏️ | Igual que por slug |
| POST | `/api/products` | ✏️ | Body: `title`, `description`, `basePrice`, `condition`, `categoryId`, `sellerId`, `location?`. Crea la variante por defecto. **201** |
| PATCH | `/api/products/:id` | ✏️ | Parcial. Ya no acepta `status` (va por `changeStatus`) |
| PATCH | `/api/products/:id/active` | ✅ **isActive** | Sin cambios |
| PATCH | `/api/products/:id/status` | 🆕 **changeStatus** | Body `{ status }` validado con Zod (`disponible` \| `reservado` \| `vendido`). Con una sola variante, actualiza la variante y recalcula el producto; con varias, **422** ("el estado se cambia por variante"). **404** si no existe o está borrado. **200** |
| DELETE | `/api/products/:id` | ✏️ **softDelete** | Más la cascada. **204** |
| PATCH | `/api/products/:id/restore` | ✏️ **RestoreDelete** | Más la cascada selectiva. **200** |
| GET | `/api/categories` | 🆕 solo lectura | Categorías `published`, activas y sin borrar, con `parentId` y `attributes`, ordenadas por `order`. Para los `select` del front |
| GET | `/api/sellers` | 🆕 solo lectura | Usuarios activos con rol `seller` o `admin`: **solo** `_id`, `name`, `slug`, `location`. Para el `select` de vendedor |

**No crees** POST, PATCH ni DELETE de roles, usuarios, categorías, variantes ni imágenes.

### 2.7 Seed y configuración

- **Seed:** el de [PROMPT.md](PROMPT.md) (sección 6), en orden de dependencias: roles → users → categories → products → productVariants → images.
  - Los usuarios del seed se crean con `status: 'verified'`.
  - Las categorías, con `status: 'published'`.
- **`config/env.js`** centraliza y valida el entorno con Zod: `PORT`, `MONGODB_URI` y `CORS_ORIGIN`. `SEED_DEFAULT_PASSWORD` es **opcional** ahí y solo el seed la exige, para que el servidor arranque sin ella.
- **`.env.example`** documenta todas las variables.
- **Dependencia nueva:** `bcryptjs`, solo para el hash de contraseñas del seed.

---

## 3. Códigos HTTP

| Código | Cuándo |
|---|---|
| 200 | GET, PATCH, restore, changeStatus |
| 201 | POST |
| 204 | DELETE (soft delete) |
| 404 | Recurso o ruta inexistente |
| 409 | Slug o email duplicado |
| 422 | Validación (Zod, Mongoose), ID mal formado, JSON roto, referencia inválida |
| 500 | Error no controlado |

Formato siempre: `{ success: true, data }` o `{ success: false, message }`.

## 4. Fases

1. **Errores y configuración:** `errorHandler`, 404 JSON, `config/env.js`, `.env.example` y `uniqueSlug`.
2. **Modelos:** los 6 modelos con relaciones, índices y virtuals.
3. **Repos y services:** populate, relaciones, cascada, `recalculateStatus` y slugs.
4. **Controllers y rutas:** funciones `const` con try/catch, `changeStatus`, `GET /categories`, `GET /sellers` y validadores Zod.
5. **Seed** completo.
6. **Documentación:** `postman.md` y `README.md` (modelo de datos, endpoints, variables de entorno) y resumen final.

## 5. Criterios de aceptación

- [ ] `npm run seed` funciona dos veces seguidas sin errores y muestra un resumen por colección.
- [ ] `GET /products/slug/:slug` devuelve `category`, `seller`, `images` y `variants` poblados, y nunca `passwordHash`.
- [ ] Un `categoryId` o `sellerId` inexistente al crear devuelve 422 con el campo en el mensaje; un slug duplicado, 409.
- [ ] Crear un producto genera su variante por defecto (`optionsKey: 'default'`, SKU `…-DEF`).
- [ ] `PATCH /products/:id/status` cambia el estado (200); con varias variantes devuelve 422; con un estado no válido, 422.
- [ ] El soft delete se propaga a variantes e imágenes, y el restore solo devuelve los hijos borrados con el producto.
- [ ] Una ruta inexistente devuelve 404 en JSON; un JSON mal formado, 422.
- [ ] Todos los controllers son funciones `const` con `async/await` y `try/catch` → `next(error)`.
- [ ] No hay CRUD de roles, usuarios, categorías, variantes ni imágenes; solo `GET /categories` y `GET /sellers`.
- [ ] El resumen final lista los cambios de contrato para el front:
  - `price` → `basePrice`;
  - `category` y `seller` pasan a ser objetos;
  - `images` pasa a ser un array de objetos;
  - `variants`;
  - `status` deja el PATCH genérico.
