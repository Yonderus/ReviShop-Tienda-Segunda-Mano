# Secondhand API

API REST para marketplace de productos de segunda mano.

## Requisitos previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [MongoDB](https://www.mongodb.com/) corriendo en local o una URI de MongoDB Atlas

## Instalacion

### 1. Instalar dependencias

```bash
cd secondhand-api
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raiz del proyecto copiando el ejemplo:

```bash
cp .env.example .env
```

Contenido del `.env`:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/secondhand-db
```

> Si usas MongoDB Atlas, sustituye la URI por tu string de conexion:
> `MONGODB_URI=mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/secondhand-db`

### 3. Arrancar el servidor

**Modo desarrollo (con hot reload):**

```bash
npm run dev
```

**Modo produccion:**

```bash
npm start
```

El servidor arrancara en `http://localhost:3000`.

### 4. Seed (datos de prueba)

```bash
npm run seed
```

Vacía la colección de productos e inserta 14 de ejemplo para probar todo el CRUD:

- 8 activos (con estados disponible, reservado y vendido)
- 3 inactivos (`isActive: false`)
- 3 en la papelera (`deletedAt` con fechas distintas)

## Estructura del proyecto

```
secondhand-api/
├── src/
│   ├── config/
│   │   └── db.js                    # Conexion a MongoDB
│   ├── models/
│   │   └── product.model.js         # Esquema de Mongoose
│   ├── repositories/
│   │   └── product.repository.js    # Acceso a base de datos
│   ├── services/
│   │   └── product.service.js       # Logica de negocio
│   ├── controllers/
│   │   └── product.controller.js    # Manejo de peticiones HTTP
│   ├── routes/
│   │   └── product.routes.js        # Definicion de rutas
│   ├── seed.js                      # Script de datos de prueba
│   └── server.js                    # Punto de entrada
├── .env.example
├── .gitignore
├── package.json
├── postman.md
└── README.md
```

## Endpoints

| Metodo | Ruta                          | Descripcion                                      |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/api/products`               | Listar productos (activos por defecto)           |
| GET    | `/api/products/actives`       | Listar solo productos activos                    |
| GET    | `/api/products/inactives`     | Listar solo productos inactivos (no eliminados)  |
| GET    | `/api/products/trash`         | Papelera: productos con soft delete (solo lectura) |
| GET    | `/api/products/slug/:slug`    | Obtener un producto por slug                     |
| GET    | `/api/products/:id`           | Obtener un producto por ID                       |
| POST   | `/api/products`               | Crear un producto (slug unico, 409 si existe)    |
| PATCH  | `/api/products/:id`           | Actualizar parcialmente un producto              |
| PATCH  | `/api/products/:id/active`    | Cambiar `isActive` (body `{ "isActive": bool }`) |
| PATCH  | `/api/products/:id/restore`   | Restaurar un producto eliminado                  |
| DELETE | `/api/products/:id`           | Borrado logico (`deletedAt` + inactivo)          |

Consulta `postman.md` para ver los body de ejemplo y los query params disponibles.

## Tecnologias

- Express
- MongoDB + Mongoose
- CORS
- dotenv
