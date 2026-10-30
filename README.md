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
- **Categorías** en árbol (principales y subcategorías) con las mismas pestañas, filtro **Publicada · Borrador**, nº de productos y subcategorías, y formulario con los **atributos de variante** (clave, nombre y valores). No deja borrar una categoría con productos o subcategorías y avisa de cuántos tiene.
- **Usuarios** con las mismas pestañas, filtros por estado de cuenta y rol, y formulario con contraseña (obligatoria al crear, opcional al editar y con botón para verla). Nunca se precarga ni se devuelve. Siempre queda al menos un administrador activo.

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

`npm run seed` **vacía** la base antes de cargar los datos.

| Variable | Para qué |
|---|---|
| `PORT` | Puerto de la API (3000 por defecto) |
| `MONGODB_URI` | Conexión a MongoDB |
| `NODE_ENV` | `development` · `production` · `test` |
| `CORS_ORIGIN` | Orígenes permitidos en producción (en desarrollo, CORS abierto) |
| `SEED_DEFAULT_PASSWORD` | Contraseña de los usuarios del seed |
| `JWT_SECRET` | **Obligatoria.** Firma de los tokens de sesión: mínimo 32 caracteres, aleatoria y fuera del repositorio. Genera una con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Caducidad de los tokens: `15m`, `1h`, `7d`… (por defecto `1d`) |

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

`npm run seed` vacía la base y crea: **3 roles, 6 usuarios** (uno suspendido) con sus **6 perfiles**, **13 categorías** (9 principales, una de ellas en **borrador**, y 4 subcategorías con atributos), **20 productos** (14 activos, 3 inactivos y 3 en la papelera; 5 con variantes reales), **27 variantes** y **16 imágenes**. Así se pueden probar todos los filtros del panel.

| Usuario | Email | Rol |
|---|---|---|
| Admin Revishop | `admin@revishop.test` | admin |
| Lucía Martín | `lucia@revishop.test` | user |
| Juan Pérez | `juan@revishop.test` | user |
| Marta Gil | `marta@revishop.test` | user |
| Carlos Ruiz | `carlos@revishop.test` | user |
| Pablo Sanz | `pablo@revishop.test` | user · **suspendido** (no puede vender) |

Todos usan la contraseña de `SEED_DEFAULT_PASSWORD`, guardada con hash **Argon2id**. Para entrar al panel desde Swagger: `POST /auth/login` con `admin@revishop.test` y esa contraseña, y pega el `token` en **Authorize**.

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
| `constants/` · `utils/` | Valores fijos y funciones puras, sin base de datos (p. ej. `isEmail`, `isHttpUrl` y `hashPassword`, compartidas por validadores, modelos y seed) |

### Frontend: por features

```
componente → store (signals) → service → ApiService → interceptores → HttpClient
```

| Carpeta | Contenido |
|---|---|
| `core/` | Infraestructura sin dominio: `ApiService`, interceptores de errores y carga, `AlertService` (SweetAlert2) y el **store genérico** `EntityStore` |
| `features/products` · `catalog` · `users` · `admin` | Cada dominio con sus modelos, services y store; las páginas del panel van en `admin/` |
| `layouts/` | Tienda (navbar) y panel (sidebar vertical) |
| `shared/` | Piezas reutilizables: skeleton, estados de error y vacío, badges, pipes y validadores |

**Reglas que sigue el código:** `constants/` no importa nada del proyecto, `utils/` solo importa `constants/`, ningún componente usa `HttpClient` directamente, y los archivos de dominio se llaman `<entidad>.<capa>`.

---

## 🗃️ Modelo de datos

```
Role 1 ── N User 1 ── N Product N ── 1 Category (árbol de 2 niveles)
               │          │
               1          ├── 1 ── N ProductVariant
               │          │
            Profile
                          │
           Image (polimórfica: Profile (avatar) · Category · Product · ProductVariant)

   RevokedToken (blacklist del logout) N ── 1 User
```

| Colección | Claves |
|---|---|
| `roles` | `admin`, `moderator`, `user`, con sus permisos |
| `users` | La **cuenta**: `roleId`, email único, `passwordHash` (nunca sale en las respuestas), estado `pending · verified · suspended` |
| `profiles` | El **perfil** (teléfono, ubicación, bio y **avatar**), 1 a 1 con su usuario por `userId` único e inmutable. No tiene CRUD propio: nace, se edita, se borra y se restaura con su usuario, y la API lo sigue devolviendo dentro de él (el avatar, como `avatarUrl`) |
| `categories` | `parentId` (dos niveles como máximo), `status` `draft · published` y `attributes` (p. ej. talla o capacidad), que heredan las subcategorías que no tienen los suyos |
| `products` | `sellerId`, `categoryId`, `basePrice` y `status` **calculado** a partir de sus variantes |
| `productVariants` | Opciones, SKU único, precio propio (o el base) y stock |
| `images` | `ownerType` + `ownerId` (`refPath`); la primera es la portada. Al sustituirlas, las anteriores pasan a la papelera |
| `revoked_tokens` | La **blacklist del logout**: `jti` del token (único), `userId`, motivo y `expiresAt`. Un índice TTL borra cada fila cuando el token habría caducado. Es la excepción: sin `isActive`, papelera ni slug |

**En todas las colecciones:** `isActive`, `deletedAt`, `createdAt` y `updatedAt`, y `slug` en todas salvo `profiles` (se busca por su usuario). El **soft delete** es un plugin de Mongoose que oculta lo borrado en todas las consultas. El borrado es **en cascada** y la restauración es **exacta**: solo vuelve lo que se borró a la vez.

**Integridad referencial.** MongoDB no tiene claves foráneas (`ref` solo sirve para `populate`), así que la garantizan **los services**: el rol de un usuario tiene que existir y poder asignarse; el perfil solo lo crea, edita, borra y restaura el service de usuarios, siempre junto a su usuario; y no se borra una categoría o un usuario que tenga productos. Los índices ayudan (`profiles.userId` único, que asegura el 1 a 1, y `users.roleId`).

---

## 🔌 API

Base: `http://localhost:3000/api` · documentación interactiva en **`/api/docs`** (botón **Authorize** para probar con sesión).

### Sesión con JWT

1. `POST /api/auth/login` con `{ email, password }` devuelve `{ token, user }`.
2. Las demás peticiones llevan la cabecera `Authorization: Bearer <token>`.
3. `POST /api/auth/logout` apunta el token en la blacklist (`revoked_tokens`): desde ese momento da `401`, aunque no haya caducado.

En cada petición se comprueba la firma, que no haya caducado (`JWT_EXPIRES_IN`), que no esté en la blacklist, que el usuario siga activo y no suspendido y que no se haya cambiado su contraseña después. El rol se lee de la base de datos, no del token: si se lo cambian, manda el nuevo.

**Quién puede usar cada endpoint:** 🌐 público (si llega un token válido se tiene en cuenta; uno caducado se ignora) · 🔑 con sesión · 👤 su dueño o un admin · 🛡️ solo admin.

| Recurso | Endpoints |
|---|---|
| **Auth** | 🌐 `POST /auth/login` · 🔑 `GET /auth/me` · 🔑 `POST /auth/logout` |
| **Perfil** | 🔑 `GET /profile/me` · 🔑 `PATCH /profile/me` (teléfono, ubicación, bio y avatar; solo el suyo) |
| **Productos** | 🌐 `GET /products` (solo activos) · 🌐 `/slug/:slug` (uno inactivo, solo su dueño o un admin; al resto, 404) · 🛡️ `/actives` · `/inactives` · `/trash` · `/:id` · 🔑 `POST /products` (el vendedor es el de la sesión; un admin puede indicar otro) · 👤 `PATCH /:id` · `/:id/status` · `/:id/active` · `DELETE /:id` · 🛡️ `PATCH /:id/restore` |
| **Variantes** | 🌐 `GET /products/:id/variants` (las de un producto inactivo, igual que él) · 👤 `POST /products/:id/variants` · `PATCH /variants/:id` · `/:id/status` · `/:id/active` · `DELETE /variants/:id` (el dueño es el del producto) |
| **Categorías** | 🌐 `GET /categories` (publicadas y activas) · 🛡️ todo lo demás: `/actives` · `/inactives` · `/trash` (con `?status=`) · `/slug/:slug` · `/:id` · `POST` · `PATCH /:id` · `/:id/active` · `/:id/restore` · `DELETE /:id` |
| **Usuarios** | 🛡️ todo: `GET /users` (`?isActive=`) · `/actives` · `/inactives` · `/trash` (con `?status=` y `?role=`) · `/slug/:slug` · `/:id` · `POST` · `PATCH /:id` · `/:id/active` · `/:id/restore` · `DELETE /:id` |
| **Roles y vendedores** | 🛡️ `GET /roles` (los asignables, sin CRUD) · 🌐 `GET /sellers` (activos y no suspendidos) |

**Reglas del login:** email inexistente o contraseña mala dan el mismo `401` ("Email o contraseña incorrectos"), para no revelar qué emails existen; una cuenta inactiva, suspendida o eliminada da `403` aunque la contraseña sea buena. Contra quien prueba contraseñas: **10 intentos fallidos cada 15 minutos por IP y email, y 50 por IP** → `429` (con la cabecera `Retry-After`); los logins correctos no cuentan.

**Reglas de las categorías:** el nombre es único (también frente a las de la papelera, porque su slug sigue ocupado); solo se puede colgar de una categoría principal; una con subcategorías no puede pasar a ser hija; no se borra si tiene productos o subcategorías (`409` con cuántos); una subcategoría no se restaura si su padre sigue en la papelera; y un producto solo puede ir a una categoría **publicada y activa**.

**Reglas de los usuarios:** el email es único (si es de uno de la papelera, el `409` dice que lo restaures); la contraseña tiene entre 8 y 128 caracteres, se guarda con **Argon2id** (las antiguas en bcrypt se pasan a Argon2 al iniciar sesión) y no sale en ninguna respuesta; **cambiarla, desactivarlo, suspenderlo o borrarlo cierra todas sus sesiones** (si recupera el acceso, tiene que volver a iniciar sesión); el rol tiene que existir y poder asignarse; **siempre queda al menos un administrador activo** (al último no se le puede borrar, desactivar, suspender ni cambiar el rol); y no se borra un usuario con productos (sí se puede desactivar o suspender).

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
| `401` | Sin sesión, o con un token caducado, revocado (logout) o no válido · login con credenciales incorrectas |
| `403` | Con sesión pero sin permiso: no es admin, o el recurso no es suyo · login de una cuenta que no puede entrar |
| `404` | No existe o está en la papelera |
| `429` | Demasiados intentos de login fallidos (espera lo que diga `Retry-After`) |
| `409` | Choca con otro registro (título o email repetido) o con el estado (activar uno borrado, borrar una categoría con productos, quitar al último admin) |
| `422` | Datos no válidos (Zod, reglas del service o Mongoose) |

---

## 🅰️ Frontend

- **Angular 18** con componentes standalone, **Signals**, `OnPush` en todos los componentes, Reactive Forms y lazy loading con code splitting.
- **Store genérico** (`EntityStore`): colecciones, detalle, escrituras y visibilidad optimista. Cada entidad hereda y solo añade lo suyo (`ProductsStore`, `CategoriesStore`, `UsersStore`); el hook `afterWrite` permite refrescar lo que depende de ella (al cambiar una categoría o un usuario se recargan los select de categoría y vendedor).
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
| Categorías con **borrador** además de `isActive` | Se puede preparar una categoría (atributos, subcategorías) antes de que salga en la tienda |
| Borrar una categoría con productos da **409** en vez de borrar en cascada | Borrar una categoría no debería hacer desaparecer anuncios de otros usuarios |
| **Siempre queda un admin activo** | Si no, nadie podría volver a entrar al panel cuando llegue el login |
| Al cambiar las fotos, **primero se crean las nuevas** y luego se retiran las anteriores | Sin transacciones (necesitan *replica set*), es la forma de que un fallo no deje un producto sin fotos. Si falla una nueva, se borran las ya creadas |

---

## 🗺️ Estado y hoja de ruta

| Fase | Estado |
|---|---|
| CRUD de productos, soft delete, slug, estados y relaciones | ✅ |
| Plugins de soft delete y slug en todos los modelos | ✅ |
| Errores por campo + Swagger | ✅ |
| Store genérico + panel con pestañas | ✅ |
| CRUD de variantes + editor en el panel | ✅ |
| CRUD de categorías + panel en árbol | ✅ |
| CRUD de usuarios + `GET /roles` + panel | ✅ |
| Seed con 20 productos + fotos sin pérdidas ni huérfanas | ✅ |
| Perfil separado del usuario (con avatar) + integridad referencial | ✅ |
| Base del login: Argon2, JWT, blacklist del logout e integridad en los services | ✅ |
| JWT en la API: login, `/me`, logout, `/profile/me`, roles (RBAC) y propiedad (ABAC) | ✅ |
| JWT en el front: login, sesión, guards e interceptor | 🔜 |
| Carrito, reservas y pagos | 🔜 |

Cada proyecto tiene su README con más detalle: [`secondhand-api`](secondhand-api/README.md) · [`secondhand-front`](secondhand-front/README.md).
