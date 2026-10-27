# ♻️ Revishop

**Marketplace de segunda mano: cualquier usuario compra y vende, y cada objeto encuentra una segunda vida.**

Proyecto de 2º de DAW formado por una **API REST** (Express + MongoDB) y una **SPA** (Angular 18) con catálogo público y panel de administración.

![Node](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?logo=mongodb&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1)
![Angular](https://img.shields.io/badge/Angular-18-DD0031?logo=angular&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Swagger](https://img.shields.io/badge/Docs-Swagger-85EA2D?logo=swagger&logoColor=black)

---

## 📑 Índice

- [Qué hace](#-qué-hace)
- [Puesta en marcha](#-puesta-en-marcha)
- [Arquitectura](#-arquitectura)
- [Modelo de datos](#-modelo-de-datos)
- [API](#-api)
- [Frontend](#-frontend)
- [Decisiones de diseño](#-decisiones-de-diseño)
- [Estado y hoja de ruta](#-estado-y-hoja-de-ruta)

---

## ✨ Qué hace

### Tienda pública
- **Catálogo** con filtros por categoría (incluye sus subcategorías), condición, estado de venta y precio, y orden por fecha o precio.
- **Ficha de producto** con galería de fotos, nivel de conservación y **selector de variantes** (talla, capacidad…) con su propio precio y estado.
- **Publicar y editar** anuncios con hasta 5 fotos. Los errores del servidor se pintan **junto al campo** que los provoca.

### Panel de administración (`/admin`)
- **Resumen** con métricas del inventario: activos, inactivos, papelera, estados de venta y reparto por categoría.
- **Productos** en pestañas **Activos · Inactivos · Papelera**, con contadores.
- Cambios **optimistas**: activar, desactivar o cambiar el estado se ve al instante y **vuelve atrás** si la API falla.
- **Papelera** (soft delete): restaurar como activo o como inactivo, con sus variantes y fotos.
- **Editor de variantes**: precio, stock, estado y visibilidad de cada una, y alta de variantes nuevas con los atributos de la categoría.

---

## 🚀 Puesta en marcha

**Requisitos:** Node.js 18 o superior y MongoDB en local (o una URI de Atlas).

### 1. API

```bash
cd secondhand-api
npm install
cp .env.example .env    # y rellena SEED_DEFAULT_PASSWORD (mínimo 8 caracteres)
npm run seed            # carga los datos de prueba
npm run dev             # http://localhost:3000
```

| Variable | Para qué |
|---|---|
| `PORT` | Puerto de la API (3000 por defecto) |
| `MONGODB_URI` | Conexión a MongoDB |
| `NODE_ENV` | `development` · `production` · `test` |
| `CORS_ORIGIN` | Orígenes permitidos en producción (en desarrollo, CORS abierto) |
| `SEED_DEFAULT_PASSWORD` | Contraseña de los usuarios del seed |

El entorno se valida con Zod al arrancar: si falta algo obligatorio, la API no arranca y dice qué falta.

### 2. Frontend

```bash
cd secondhand-front
npm install
npm start               # http://localhost:4200
```

### 3. Abre

| | URL |
|---|---|
| 🛍️ Tienda | http://localhost:4200 |
| 🛠️ Panel | http://localhost:4200/admin |
| 📖 Documentación de la API | http://localhost:3000/api/docs |

### Datos de prueba

`npm run seed` vacía la base y crea: **3 roles, 5 usuarios, 12 categorías** (8 principales y 4 subcategorías con atributos), **14 productos** (8 activos, 3 inactivos y 3 en la papelera), **17 variantes** y **12 imágenes**.

| Usuario | Email | Rol |
|---|---|---|
| Admin Revishop | `admin@revishop.test` | admin |
| Lucía Martín | `lucia@revishop.test` | user |
| Juan Pérez | `juan@revishop.test` | user |
| Marta Gil | `marta@revishop.test` | user |
| Carlos Ruiz | `carlos@revishop.test` | user |

Todos usan la contraseña de `SEED_DEFAULT_PASSWORD`, guardada con hash bcrypt.

---

## 🏗️ Arquitectura

```
Aplicación Segunda Mano/
├── secondhand-api/      API REST · Express + Mongoose + Zod
└── secondhand-front/    SPA · Angular 18 standalone + Signals + Tailwind
```

### Backend: por capas

```
routes → validate (Zod) → controllers → services → repositories → models → MongoDB
```

| Capa | Responsabilidad |
|---|---|
| `routes/` | URL, validador y controlador, con su documentación Swagger al lado |
| `middlewares/validate.js` | Valida `params`, `query` y `body` con Zod |
| `controllers/` | Funciones `const` con `try/catch` que devuelven el código HTTP |
| `services/` | **Reglas de negocio** (lo único que decide) |
| `repositories/` | Las únicas que tocan Mongo: consultas y populate |
| `models/` | Esquemas, relaciones y los plugins de soft delete y slug |
| `constants/` · `utils/` | Valores fijos y funciones puras, sin base de datos |

### Frontend: por features

```
componente → store (signals) → service → ApiService → interceptores → HttpClient
```

| Carpeta | Contenido |
|---|---|
| `core/` | Infraestructura sin dominio: `ApiService`, interceptores de errores y carga, `AlertService` (SweetAlert2) y el **store genérico** `EntityStore` |
| `features/products` · `catalog` · `admin` | Cada dominio con sus modelos, services, store, componentes y páginas |
| `layouts/` | Tienda (navbar) y panel (sidebar vertical) |
| `shared/` | Piezas reutilizables: skeleton, estados de error y vacío, badges, pipes y validadores |

**Reglas que sigue el código:** `constants/` no importa nada del proyecto, `utils/` solo importa `constants/`, ningún componente usa `HttpClient` directamente, y los archivos de dominio se llaman `<entidad>.<capa>`.

---

## 🗃️ Modelo de datos

```
Role 1 ── N User 1 ── N Product N ── 1 Category (árbol de 2 niveles)
                          │
                          ├── 1 ── N ProductVariant
                          │
           Image (polimórfica: User · Category · Product · ProductVariant)
```

| Colección | Claves |
|---|---|
| `roles` | `admin`, `moderator`, `user`, con sus permisos |
| `users` | `roleId`, email único, `passwordHash` (nunca sale en las respuestas), estado `pending · verified · suspended` |
| `categories` | `parentId` y `attributes` (p. ej. talla o capacidad), que heredan las subcategorías |
| `products` | `sellerId`, `categoryId`, `basePrice` y `status` **calculado** a partir de sus variantes |
| `productVariants` | Opciones, SKU único, precio propio (o el base) y stock |
| `images` | `ownerType` + `ownerId` (`refPath`); la primera es la portada |

**En todas las colecciones:** `isActive`, `deletedAt`, `slug`, `createdAt` y `updatedAt`. El **soft delete** es un plugin de Mongoose que oculta lo borrado en todas las consultas. El borrado es **en cascada** y la restauración es **exacta**: solo vuelve lo que se borró a la vez.

---

## 🔌 API

Base: `http://localhost:3000/api` · documentación interactiva en **`/api/docs`**.

| Recurso | Endpoints |
|---|---|
| **Productos** | `GET /products` · `/actives` · `/inactives` · `/trash` · `/slug/:slug` · `/:id` · `POST /products` · `PATCH /:id` · `PATCH /:id/status` · `PATCH /:id/active` · `PATCH /:id/restore` · `DELETE /:id` |
| **Variantes** | `GET` y `POST /products/:id/variants` · `PATCH /variants/:id` · `/:id/status` · `/:id/active` · `DELETE /variants/:id` |
| **Catálogo** | `GET /categories` · `GET /sellers` |

**Formato de respuesta único:**

```jsonc
// éxito
{ "success": true, "data": { … } }

// error: `errors` aparece si va ligado a campos
{ "success": false, "message": "Los datos enviados no son válidos",
  "errors": [{ "field": "images.0.url", "message": "Cada imagen debe tener una URL http(s) válida" }] }
```

| Código | Cuándo |
|---|---|
| `200` · `201` · `204` | Lectura o edición · creación · borrado |
| `404` | No existe o está en la papelera |
| `409` | Choca con otro registro (título repetido) o con el estado (activar uno borrado) |
| `422` | Datos no válidos (Zod, reglas del service o Mongoose) |

---

## 🅰️ Frontend

- **Angular 18** con componentes standalone, **Signals**, `OnPush` en todos los componentes, Reactive Forms y lazy loading con code splitting.
- **Store genérico** (`EntityStore`): colecciones, detalle, escrituras y visibilidad optimista. Cada entidad hereda y solo añade lo suyo.
- **Interceptores:** traducen los errores a mensajes en español y gestionan un loader global con retardo para que no parpadee.
- **UX:** skeletons, estados vacíos y de error con "Reintentar", View Transitions, sin scroll horizontal desde 375 px y accesibilidad (labels, `aria-*` y foco al primer error).

---

## 🧭 Decisiones de diseño

| Decisión | Por qué |
|---|---|
| **Zod** en lugar de express-validator | Lo pide la pizarra; además, una misma regla (p. ej. la URL) la usan el validador y el modelo |
| **Todo el mundo vende** | Como Wallapop: no hay rol de vendedor; `/sellers` son los usuarios activos y no suspendidos |
| El vendedor es un **User** (no hay `hosts`) | En un marketplace de segunda mano quien vende es un usuario más |
| La **ubicación** es texto | Suficiente mientras no haga falta filtrar por ciudad |
| **`isActive` y `deletedAt` independientes** | Ocultar un anuncio no es lo mismo que borrarlo |
| El **estado del producto se calcula** a partir de sus variantes | Un solo origen de verdad: disponible, reservado o vendido |

---

## 🗺️ Estado y hoja de ruta

| Fase | Estado |
|---|---|
| CRUD de productos, soft delete, slug, estados y relaciones | ✅ |
| Plugins de soft delete y slug en todos los modelos | ✅ |
| Errores por campo + Swagger | ✅ |
| Store genérico + panel con pestañas | ✅ |
| CRUD de variantes + editor en el panel | ✅ |
| CRUD de categorías en el panel | ⏳ |
| CRUD de usuarios + roles, y seed con 20 o más productos | ⏳ |
| JWT: login, roles USER/ADMIN y perfil | 🔜 |
| Carrito, reservas y pagos | 🔜 |

Cada proyecto tiene su README con más detalle: [`secondhand-api`](secondhand-api/README.md) · [`secondhand-front`](secondhand-front/README.md).
