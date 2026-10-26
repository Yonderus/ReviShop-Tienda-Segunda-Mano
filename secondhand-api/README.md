# Secondhand API (Revishop)

API REST del marketplace de segunda mano **Revishop**: Express + MongoDB (Mongoose) + Zod.

## Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- [MongoDB](https://www.mongodb.com/) en local o una URI de MongoDB Atlas

## Instalación

```bash
cd secondhand-api
npm install
cp .env.example .env
```

### Variables de entorno

Se leen y validan en un único sitio, `src/config/env.js` (con Zod). Si falta alguna obligatoria, la API no arranca y dice cuál.

| Variable | Obligatoria | Uso |
|---|---|---|
| `NODE_ENV` | No (`development`) | `production` activa CORS restringido y oculta los logs de error |
| `PORT` | No (`3000`) | Puerto HTTP |
| `MONGODB_URI` | **Sí** | Conexión a MongoDB, p. ej. `mongodb://localhost:27017/secondhand-db` |
| `CORS_ORIGIN` | En producción | Orígenes permitidos, separados por comas (en desarrollo CORS está abierto) |
| `SEED_DEFAULT_PASSWORD` | Solo para el seed | Contraseña de todos los usuarios de prueba (mínimo 8 caracteres) |

### Arrancar

```bash
npm run dev     # desarrollo (node --watch)
npm start       # producción
```

### Seed (datos de prueba)

```bash
npm run seed
```

Vacía las 6 colecciones, sincroniza los índices e inserta, en orden de dependencias:

| Colección | Datos |
|---|---|
| `roles` | `admin`, `moderator`, `user` (`isSystem: true`) con sus permisos. No hay rol de vendedor: cualquier usuario compra y vende |
| `users` | 1 admin y 4 usuarios (emails `@revishop.test`, contraseña de `SEED_DEFAULT_PASSWORD`, hasheada con bcryptjs) |
| `categories` | 8 raíz + 4 subcategorías (Móviles, Ordenadores, Chaquetas, Pádel), con `attributes` de variante |
| `products` | 14: 8 activos, 3 inactivos y 3 en la papelera |
| `productvariants` | 1 por defecto por producto + tallas de la chaqueta y capacidades del iPhone |
| `images` | Fotos de producto (portada + galería) y avatares de usuario |

> **Cuidado:** borra todos los datos de esas colecciones cada vez que se ejecuta.

## Modelo de datos

6 colecciones con relaciones por referencia (`<entidad>Id` + `ref`). Diagrama completo en [`../PROMPT.md`](../PROMPT.md).

| Modelo | Colección | Relaciones |
|---|---|---|
| `Role` | `roles` | 1 → N `User` |
| `User` | `users` | `roleId` → `Role` · 1 → N `Product` (como vendedor) |
| `Category` | `categories` | `parentId` → `Category` (subcategorías) · 1 → N `Product` |
| `Product` | `products` | `sellerId` → `User` · `categoryId` → `Category` · 1 → N `ProductVariant` · 1 → N `Image` |
| `ProductVariant` | `productvariants` | `productId` → `Product` |
| `Image` | `images` | Polimórfica: `ownerType` + `ownerId` (`refPath`) → `User` · `Category` · `Product` · `ProductVariant` |

Todas tienen `isActive`, `status`, `deletedAt`, `deletedBy`, `slug`, `createdAt` y `updatedAt`.

**Reglas de negocio:**
- Todo producto tiene al menos una variante; la variante por defecto se crea con el producto.
- El `status` del producto se calcula a partir de sus variantes.
- El soft delete se propaga a variantes e imágenes, y el restore solo devuelve los hijos borrados con el producto.

## Estructura

```
src/
├── config/          env.js (entorno validado), db.js
├── constants/       permissions.js
├── models/          base.fields.js + role, user, category, product, productVariant, image
├── repositories/    acceso a datos y populate (product, productVariant, image, category, user)
├── services/        reglas de negocio (product, category, seller)
├── controllers/     funciones const con async/await y try/catch → next(error)
├── routes/          product.routes.js, catalog.routes.js (solo lectura)
├── validators/      schemas Zod de entrada
├── middlewares/     validate.js (params, query, body)
├── utils/           AppError, errorHandler, response, slugify (+ uniqueSlug)
├── seed.js
└── server.js
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/products` | Activos (o `?isActive=false`) con categoría, vendedor e imagen principal |
| GET | `/api/products/actives` · `/inactives` · `/trash` | Por estado de visibilidad |
| GET | `/api/products/slug/:slug` | **getBySlug**: detalle con imágenes y variantes |
| GET | `/api/products/:id` | Detalle por ID |
| POST | `/api/products` | Crear (201; 409 si el slug existe; 422 si la categoría o el vendedor no son válidos) |
| PATCH | `/api/products/:id` | Actualización parcial |
| PATCH | `/api/products/:id/status` | **changeStatus**: `{ status }` |
| PATCH | `/api/products/:id/active` | **isActive**: `{ isActive }` |
| DELETE | `/api/products/:id` | **softDelete** en cascada (204) |
| PATCH | `/api/products/:id/restore` | **RestoreDelete** selectivo |
| GET | `/api/categories` | Categorías publicadas (solo lectura) |
| GET | `/api/sellers` | Quién puede publicar: usuarios activos y no suspendidos, solo campos públicos (solo lectura) |

Ejemplos de petición y respuesta en [`postman.md`](postman.md).

## Manejo de errores

| Origen | Respuesta |
|---|---|
| Validación Zod en la ruta | 422 con los mensajes de cada campo |
| `AppError` lanzado por un service | Su código (404, 409, 422…) |
| Duplicado de Mongo (E11000) | 409 |
| `CastError` / `ValidationError` de Mongoose | 422 |
| JSON mal formado | 422 |
| Ruta inexistente | 404 en JSON |
| Cualquier otro | 500 "Error interno del servidor" |

## Tecnologías

Express · MongoDB + Mongoose · Zod · bcryptjs · Helmet · Morgan · CORS · dotenv
