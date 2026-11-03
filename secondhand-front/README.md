<div align="center">

<img src="src/assets/logo.svg" alt="Revishop" width="84" height="84" />

# Revishop · Frontend

**Cada objeto merece una segunda vida.**
SPA del marketplace de segunda mano Revishop: catálogo público, publicación de anuncios, Mi perfil y un panel de administración completo.

![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Signals](https://img.shields.io/badge/Estado-Signals-1E3A8A?style=for-the-badge)
![JWT](https://img.shields.io/badge/Sesión-JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

[Puesta en marcha](#-puesta-en-marcha) · [Sesión y permisos](#-sesión-y-permisos) · [Pantallas](#️-pantallas) · [API](#-api-consumida) · [Estructura](#-estructura) · [Diseño](#-sistema-de-diseño) · [Decisiones](#-decisiones-técnicas)

</div>

---

## ✨ Qué hace

<table>
<tr>
<td width="50%" valign="top">

### 🛍️ Tienda
- Catálogo con filtros (categoría, condición, estado, precio y orden) **guardados en la URL**.
- Ficha por **slug** con galería, variantes y la *escala de segunda vida*.
- Publicar, editar y retirar **tus** anuncios.
- **Mi perfil**: foto, teléfono, ubicación y bio.

</td>
<td width="50%" valign="top">

### 🛡️ Panel de administración
- Resumen con datos reales del inventario.
- CRUD de **productos** (con variantes), **categorías** (en árbol) y **usuarios** (con avatar).
- Pestañas Activos · Inactivos · Papelera, con cambios **optimistas**.
- Solo para el rol `admin`.

</td>
</tr>
</table>

Todas las pantallas cubren los estados de **carga** (skeleton con la forma real), **vacío**, **sin resultados**, **error con Reintentar** y **no encontrado**.

---

## 🚀 Puesta en marcha

> **Requisitos:** Node.js **18.19+, 20.11+ o 22** (con Node 24 funciona, pero el CLI avisa) · npm 10+ · MongoDB en local para la API.

```bash
# 1 · API (en otra terminal)
cd ../secondhand-api
npm install
npm run seed     # 6 usuarios, categorías y 20 productos (borra los datos de prueba)
npm run dev      # http://localhost:3000/api

# 2 · Front
cd ../secondhand-front
npm install
npm start        # http://localhost:4200
```

> [!IMPORTANT]
> La API necesita un `.env` con `JWT_SECRET` (y `SEED_DEFAULT_PASSWORD` para el seed). Mira [`secondhand-api/README.md`](../secondhand-api/README.md).

### 👥 Usuarios de prueba

Todos usan la contraseña de **`SEED_DEFAULT_PASSWORD`** del `.env` de la API.

| | Email | Rol | Qué puede hacer |
|:-:|---|---|---|
| 🛡️ | `admin@revishop.test` | admin | Todo, panel incluido |
| 🙋 | `lucia@revishop.test` | user | Comprar, publicar y gestionar lo suyo |
| 🙋 | `juan@revishop.test` · `marta@revishop.test` · `carlos@revishop.test` | user | Igual que Lucía |
| ⛔ | `pablo@revishop.test` | user, **suspendido** | No puede iniciar sesión (403) |

**Iniciar sesión:** botón de la barra superior → `/login`. El admin llega a `/admin` y el resto a la tienda. **Cerrar sesión** está en el menú de tu foto.

### 📦 Build

```bash
npm run build                               # producción → dist/secondhand-front
npx ng build --configuration development    # desarrollo
```

---

## 🔐 Sesión y permisos

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuario
    participant F as Front (AuthStore)
    participant B as Navegador
    participant A as API
    U->>F: email + contraseña
    F->>A: POST /auth/login
    A-->>B: Set-Cookie revishop_session (HttpOnly)
    A-->>F: { user } (el token nunca llega a JavaScript)
    Note over F,A: Cada petición a la API sale con withCredentials<br/>y el navegador añade la cookie
    U->>F: recarga la página
    F->>A: GET /auth/me (APP_INITIALIZER, siempre)
    A-->>F: usuario actual · o 401 = no hay sesión
    U->>F: Cerrar sesión
    F->>A: POST /auth/logout
    A-->>B: token a la blacklist y cookie borrada
    F->>F: borra la sesión local y vacía las colecciones del panel
```

| Pieza | Dónde | Qué hace |
|---|---|---|
| **`AuthStore`** | `core/auth/auth.store.ts` | Signals `user`, `restoring`, `isAuthenticated`, `role`, `isAdmin`, `hasRole()` e `isOwnerOrAdmin()` (la misma regla que la API). `restore()`, `login()`, `logout()` y `onSessionEnd()`. **No guarda ningún token** |
| **`AuthService`** | `core/auth/auth.service.ts` | Solo HTTP: `login`, `me` y `logout` |
| **`authInterceptor`** | `core/auth/auth.interceptor.ts` | Pone `withCredentials` (para que viaje la cookie) **solo** en las peticiones a `environment.apiUrl`, y las marca con `SENT_WITH_SESSION` si salen con la sesión abierta |
| **`errorInterceptor`** | `core/interceptors/` | `401` de una petición `SENT_WITH_SESSION` → cierra la sesión, avisa **una vez** y lleva a `/login?returnUrl=…`. `403` y `429` → mensaje de la API |
| **Guards** (`canMatch`) | `core/auth/*.guard.ts` | Deciden qué rutas se pueden abrir (tabla de abajo) |

| Guard | Rutas | Si no se cumple |
|---|---|---|
| `guestGuard` | `/login` | Con sesión → `/admin` (admin) o `/` |
| `authGuard` | `/profile` · `/products/new` · `/products/:slug/edit` | → `/login?returnUrl=…` y vuelve después |
| `adminGuard` | `/admin/**` | Sin sesión → login · sin permiso → `/forbidden` |

> [!NOTE]
> Los guards y los botones ocultos son **comodidad**, no seguridad: la API comprueba cada permiso otra vez.

### 🍪 Por qué una cookie y no `localStorage`

El token vive en la cookie `revishop_session` que pone la API (`HttpOnly`, `SameSite=Strict`, `Path=/api`). El front **nunca lo ve**: `document.cookie` no la muestra y no hay nada en `localStorage` ni en `sessionStorage`. Así, un script malicioso en la página no puede copiar el token y usarlo desde otro sitio.

| | Consecuencia en el front |
|---|---|
| No se puede leer la cookie | `restore()` no sabe si hay sesión: **siempre** pregunta a `GET /auth/me`. Sin sesión, ese `401` es silencioso (el navegador lo anota en la consola, pero la app no avisa) |
| Front y API en orígenes distintos en desarrollo (`:4200` → `:3000`) | Las peticiones necesitan `withCredentials`; la API solo acepta el origen de `CORS_ORIGIN` |
| JavaScript no puede borrar la cookie | La borra la API: en el logout (siempre) y en cualquier `401` por un token que ya no vale |
| Versión anterior | Al arrancar se borra el `revishop.token` que guardaba `localStorage` |

> [!TIP]
> Si sirves el front desde otro origen (p. ej. `ng serve --port 4300`), añádelo a `CORS_ORIGIN` en el `.env` de la API; si no, CORS y la comprobación de `Origin` bloquearán las peticiones.

**Lo tuyo y lo de los demás:** "Editar" y "Retirar" solo aparecen en tus anuncios (o en todos si eres admin), el select **Vendedor** solo lo ve el admin (el resto publica a su nombre) y un anuncio **inactivo** solo lo ven su vendedor y el admin.

---

## 🗺️ Pantallas

**Leyenda:** 🌐 público · 🔑 con sesión · 👤 su dueño o un admin · 🛡️ solo admin · 🚪 solo sin sesión

### 🛍️ Tienda

| Ruta | | Pantalla |
|---|:-:|---|
| `/` | 🌐 | Catálogo: recuento real, filtros en la URL y tarjetas (con *Editar / Eliminar* en lo tuyo) |
| `/products/:slug` | 🌐 | Ficha: galería diferida, variantes con su precio, condición, vendedor y ubicación |
| `/login` | 🚪 | Iniciar sesión, con los errores de la API (credenciales, cuenta bloqueada, demasiados intentos) |
| `/profile` | 🔑 | **Mi perfil**: foto con vista previa, teléfono, ubicación y bio (`PATCH` solo con lo cambiado) |
| `/products/new` | 🔑 | Publicar un anuncio |
| `/products/:slug/edit` | 👤 | Editar (`PATCH` solo con los campos cambiados) |
| `/forbidden` | 🔑 | Acceso denegado |
| `**` | 🌐 | 404 real; un slug inexistente muestra "Producto no encontrado" |

### 🛡️ Panel (`/admin`)

| Ruta | Pantalla |
|---|---|
| `/admin` | Resumen: inventario con barra proporcional, estado de venta, reparto por categoría y últimos productos |
| `/admin/products` · `/inactive` · `/trash` | Productos: interruptor de visibilidad y estado de venta **optimistas**, editor de variantes, papelera restaurable |
| `/admin/categories` · `/inactive` · `/trash` | Categorías en árbol, con borrador y atributos heredados |
| `/admin/users` · `/inactive` · `/trash` | Usuarios con foto, rol, estado y **Avatar (URL)** en el formulario |
| `…/new` · `…/:slug/edit` | Crear y editar cada entidad |

Mensajes, Reservas, Valoraciones, Pagos y Envíos aparecen en el menú como **Próximamente** (`PLATFORM_MODULES` en `features/admin/admin-nav.config.ts`): sin rutas ni datos todavía.

---

## 🔌 API consumida

Base: `environment.apiUrl` · respuestas `{ success: true, data }` o `{ success: false, message, errors? }`.

| Recurso | Endpoints | Uso |
|---|---|---|
| 🔐 **Auth** | `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` | Sesión |
| 👤 **Perfil** | `GET` · `PATCH /profile/me` | Mi perfil |
| 📦 **Productos** | `GET /products` · `/slug/:slug` | Catálogo público y ficha |
| | `GET /products/actives` · `/inactives` · `/trash` | Pestañas del panel |
| | `POST /products` · `PATCH /:id` · `/:id/status` · `/:id/active` · `/:id/restore` · `DELETE /:id` | Escrituras |
| 🎨 **Variantes** | `/products/:id/variants` · `/variants/:id` (+ `/status`, `/active`) | Editor de variantes |
| 🏷️ **Categorías** | `/categories` (CRUD completo) | Filtros, formulario y panel |
| 🙋 **Usuarios** | `/users` (CRUD completo) · `GET /roles` · `GET /sellers` | Panel y select de vendedor |

---

## 🧱 Estructura

```
src/app/
├── core/                    Infraestructura transversal (no conoce productos)
│   ├── auth/                AuthStore, AuthService, authInterceptor y guards
│   ├── config/              HttpContextTokens y constantes
│   ├── interceptors/        errorInterceptor (401/403/429, timeout, alertas) y loadingInterceptor
│   ├── models/              ApiResponse<T>, ApiError
│   ├── services/            ApiService (Observable → Promise), EntityApiService, LoadingService, AlertService
│   └── store/               EntityStore y RemoteCollection (base de todos los stores)
├── shared/
│   ├── components/          navbar, user-menu, loader, skeleton, empty-state, error-state, page-not-found…
│   ├── ui/                  icon, avatar, badge, level-meter, stat-card, toggle-switch
│   └── utils/               validadores, mensajes de error, diff para PATCH, pipes
├── layouts/                 main-layout (tienda) y admin-layout (sidebar + drawer móvil)
├── features/
│   ├── auth/                login y acceso denegado
│   ├── profile/             Mi perfil
│   ├── catalog/             categorías y vendedores compartidos (CatalogStore)
│   ├── products/            modelo, servicios, ProductsStore, componentes y páginas
│   ├── users/               modelo, servicios y UsersStore
│   └── admin/               panel: dashboard, products, categories, users
├── app.routes.ts            /admin (adminGuard) + tienda + 404
└── app.config.ts            router, interceptores, APP_INITIALIZER (restaura la sesión), locale es-ES
```

<details>
<summary><b>➕ Añadir una feature nueva</b></summary>

<br/>

Cada módulo (reservas, pagos, favoritos…) va en `features/<nombre>/` con sus `models/`, `services/` (sobre `ApiService` o `EntityApiService`), `store/` (sobre `EntityStore`), `components/`, `pages/` y un `<nombre>.routes.ts`. Los interceptores, las alertas, el loader, la sesión y los estados de error ya funcionan para cualquier petición.

- **Rutas en la tienda:** añádelas sueltas en `app.routes.ts` (`...MIS_RUTAS`), **no** como `{ path: '', loadChildren }` delante del catálogo: un grupo `''` lazy se queda con la URL vacía aunque ninguno de sus hijos coincida y la portada sale en blanco. Las páginas siguen siendo lazy con `loadComponent`.
- **Si guarda datos del usuario:** el `EntityStore` ya se vacía al cerrar sesión; un store propio puede usar `authStore.onSessionEnd()`.
- **En el panel:** crea su ruta en `features/admin/admin.routes.ts` y mueve su entrada de `PLATFORM_MODULES` a `ADMIN_NAV`.

</details>

---

## 🎨 Sistema de diseño

| | |
|---|---|
| **Tipografía** | Poppins (400–700) con `preconnect` y `display=swap` |
| **Tokens** | Colores en `src/styles.scss` (`:root`) como canales RGB; Tailwind los usa como `primary-*`, `accent`, `ink`, `line`, `canvas`, `surface`. **Cambiar de paleta = cambiar el bloque `:root`** |
| **Escala de segunda vida** | La condición en 5 tramos (Nuevo = 5 … Mejorable = 1) en la tarjeta, la ficha y el formulario |
| **Estados de venta** | 🟢 disponible · 🟠 reservado · ⚫ vendido. Todos los pares texto/fondo cumplen **WCAG AA** (≥ 4,54:1) |
| **Movimiento** | View Transitions de la tarjeta a la ficha; se desactivan con `prefers-reduced-motion` |
| **Responsive** | Sin scroll horizontal desde **375 px**; el panel usa un drawer accesible en móvil |

<details>
<summary><b>🎨 Paletas intercambiables</b></summary>

<br/>

| Token | A · Azul Confianza (activa) | B · Marino + Cian | C · Índigo + Turquesa |
| --- | --- | --- | --- |
| `--color-primary-600` | `37 99 235` (#2563EB) | `29 78 216` (#1D4ED8) | `79 70 229` (#4F46E5) |
| `--color-primary-900` | `30 58 138` (#1E3A8A) | `11 31 58` (#0B1F3A) | `49 46 129` (#312E81) |
| `--color-primary-700` | `29 78 216` | `18 56 107` (#12386B) | `67 56 202` |
| `--color-accent` | `245 158 11` (#F59E0B) | `6 182 212` (#06B6D4) | `20 184 166` (#14B8A6) |
| `--color-canvas` | `248 250 252` (#F8FAFC) | `244 247 251` (#F4F7FB) | `250 250 249` (stone-50) |
| `--color-ink-muted` | `71 85 105` | `71 85 105` | `87 83 78` (stone-600) |

Al cambiar de paleta, revisa también `primary-50/100/200/400/500` y el contraste del texto sobre `accent`. Con B y C el acento es claro, así que el texto del botón "Publicar" debe seguir siendo `ink`.

</details>

---

## 🧠 Decisiones técnicas

<details>
<summary><b>🗄️ Datos y estado</b></summary>

<br/>

- **Capa asíncrona sin RxJS:** `ApiService` convierte el `Observable` de `HttpClient` en `Promise` (el único `firstValueFrom` de la app). Services y stores usan `async/await`; RxJS solo queda en los interceptores.
- **Store genérico (`EntityStore`):** colecciones (activos, inactivos, papelera), caché de detalle y escrituras optimistas. Cada entidad hereda y solo añade lo suyo; `afterWrite` refresca lo que depende de ella. Los signals son privados y se exponen con `asReadonly()` y `computed()`.
- **Catálogo público aparte:** la tienda usa `GET /products` (solo activos) y el panel sus propias colecciones, así un usuario nunca pide endpoints de admin.
- **`CatalogStore`:** categorías y vendedores se cargan una vez y los comparten el formulario, los filtros y las etiquetas. Ninguna categoría está escrita en el código.
- **Slug en las URLs, `_id` en las escrituras:** las rutas son legibles, pero `PATCH` y `DELETE` usan el `_id`. Tras editar se navega al slug de la respuesta, porque cambia con el título.

</details>

<details>
<summary><b>🚨 Errores y carga</b></summary>

<br/>

- **`errorInterceptor`:** timeout (`requestTimeoutMs`), valida la forma `{ success, data }` y lo normaliza todo a `ApiError` con mensajes en español.
  - Las cargas (GET) muestran el error **en la pantalla** con *Reintentar*, nunca en un modal.
  - Las escrituras muestran un modal (SweetAlert2), salvo 400/409/422 al guardar, que el formulario pinta **junto a cada campo**.
  - `401` con sesión → cierra la sesión y va al login; las peticiones de la propia sesión (`login`, `me`, `logout`) lo evitan con `SKIP_AUTH_REDIRECT`.
- **Loader global** con retardo de 180 ms para que no parpadee; las pantallas con skeleton lo omiten (`SKIP_GLOBAL_LOADER`).
- **Spinner bloqueante** (ngx-spinner) solo para lo que el usuario espera activamente (guardar, borrar, restaurar), marcado con `BLOCKING_REQUEST`.

</details>

<details>
<summary><b>📦 Productos</b></summary>

<br/>

- **Variantes:** todo producto tiene al menos una. En la ficha, si hay varias, un `radiogroup` cambia precio y disponibilidad; la vendida sale tachada. La tarjeta muestra el mínimo con "desde".
- **Estado de venta:** se cambia desde el panel (`PATCH /products/:id/status`); con varias variantes el selector sale deshabilitado (la API da 422).
- **Imágenes:** hasta 5 por producto, con texto alternativo obligatorio; la primera es la portada y se reordenan con botones accesibles por teclado.
- **Precio:** la API acepta `≥ 0`, el front exige `> 0` (`PRICE_MIN_EXCLUSIVE`).
- **`products/new` va antes que `products/:slug`:** un producto titulado "New" tendría slug `new` y su ficha no sería accesible (caso límite conocido).

</details>

<details>
<summary><b>⚡ Rendimiento y UX</b></summary>

<br/>

- Todo **standalone** y **`OnPush`**; rutas lazy con precarga, galería en `@defer`, SweetAlert2 bajo demanda y `NgOptimizedImage` con hueco reservado.
- **View Transitions:** se omite la inicial y se capturan los rechazos (con la pestaña oculta el navegador aborta la transición y, sin ese `catch`, la vista se quedaba en blanco).
- **Sin parpadeo de sesión:** mientras se restaura, el menú de usuario muestra un círculo gris en lugar de "Iniciar sesión".
- **Accesibilidad:** labels, `aria-*`, foco al primer error, `aria-live` en los avisos, menús con Escape y clic fuera.

</details>

---

## ⚙️ Variables de entorno

Angular no lee `.env`: la configuración vive en `src/environments/`.

| Fichero | Cuándo se usa | `apiUrl` |
| --- | --- | --- |
| `environment.ts` | `npm run build` (producción) | `/api` (mismo dominio, detrás de un proxy) |
| `environment.development.ts` | `npm start` y `ng build --configuration development` | `http://localhost:3000/api` |

Ambos exponen `production` (logs técnicos solo en desarrollo), `apiUrl` (cámbialo si la API va en otro host o puerto) y `requestTimeoutMs` (10 000 ms; pasado ese tiempo se muestra "El servidor está tardando demasiado…").

---

<div align="center">

Hecho con ☕ y Angular para **2º DAW** · [README general](../README.md) · [API](../secondhand-api/README.md)

</div>
