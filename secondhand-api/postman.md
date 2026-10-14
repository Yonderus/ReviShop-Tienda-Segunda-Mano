# Endpoints para Postman

Base URL: `http://localhost:3000/api`

---

## Productos

### 1. Obtener todos los productos

```
GET http://localhost:3000/api/products
```

> Por defecto solo devuelve productos activos (`isActive: true`) y no eliminados (`deletedAt: null`).

**Query params opcionales:**

| Param     | Ejemplo               |
| --------- | --------------------- |
| category  | `?category=electronica` |
| condition | `?condition=nuevo`      |
| status    | `?status=disponible`    |
| seller    | `?seller=Juan`          |
| minPrice  | `?minPrice=10`          |
| maxPrice  | `?maxPrice=500`         |
| isActive  | `?isActive=false`       |

Ejemplo con filtros:

```
GET http://localhost:3000/api/products?category=electronica&minPrice=50&maxPrice=300
```

### 1b. Obtener solo activos / solo inactivos

```
GET http://localhost:3000/api/products/actives
GET http://localhost:3000/api/products/inactives
```

> Ambos excluyen los productos eliminados. Aceptan los mismos query params que el listado, salvo `isActive`.

### 1c. Papelera: productos con soft delete

```
GET http://localhost:3000/api/products/trash
```

> Solo lectura. Devuelve los productos con `deletedAt` (borrados con `DELETE /:id`), del más reciente al más antiguo. Acepta los mismos query params que `/actives`. Para recuperarlos usa `PATCH /:id/restore`.

---

### 2. Obtener un producto por ID

```
GET http://localhost:3000/api/products/:id
```

Ejemplo:

```
GET http://localhost:3000/api/products/64f1a2b3c4d5e6f7a8b9c0d1
```

---

### 3. Obtener un producto por slug

```
GET http://localhost:3000/api/products/slug/:slug
```

Ejemplo:

```
GET http://localhost:3000/api/products/slug/iphone-13-pro-256gb
```

---

### 4. Crear un producto

```
POST http://localhost:3000/api/products
```

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "title": "iPhone 13 Pro",
  "description": "iPhone 13 Pro 256GB, estado impecable, con caja original y cargador",
  "price": 650,
  "category": "electronica",
  "condition": "como_nuevo",
  "location": "Madrid",
  "images": ["https://ejemplo.com/iphone1.jpg", "https://ejemplo.com/iphone2.jpg"],
  "seller": "Juan"
}
```

> El `slug` se genera automaticamente a partir del `title` y debe ser unico: si ya existe otro producto con ese slug (aunque este eliminado) devuelve `409 Conflict`.
> `isActive` es `true` por defecto. `deletedAt` es `null` por defecto.

**Valores posibles para `category`:**

`electronica` | `ropa` | `hogar` | `deportes` | `vehiculos` | `libros` | `juguetes` | `otros`

**Valores posibles para `condition`:**

`nuevo` | `como_nuevo` | `bueno` | `aceptable` | `mejorable`

**Valores posibles para `status`:**

`disponible` | `reservado` | `vendido`

> `status` es opcional al crear, por defecto es `disponible`.

---

### 5. Actualizar un producto (parcial)

```
PATCH http://localhost:3000/api/products/:id
```

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON) - solo los campos a actualizar:**

```json
{
  "price": 600,
  "status": "reservado"
}
```

> Si se actualiza el `title`, el `slug` se regenera automaticamente (409 si choca con otro producto).
> `isActive` y `deletedAt` no se pueden modificar desde aqui: usa `/active`, `/restore` y `DELETE`.

---

### 6. Activar / Desactivar un producto

```
PATCH http://localhost:3000/api/products/:id/active
```

**Body (raw JSON) - obligatorio:**

```json
{
  "isActive": false
}
```

> Cambia solo `isActive`, nunca toca `deletedAt`.
> Si el producto esta eliminado devuelve `409 Conflict`: hay que restaurarlo primero.

---

### 7. Eliminar un producto (soft delete)

```
DELETE http://localhost:3000/api/products/:id
```

> No elimina el producto de la base de datos. Establece `deletedAt` con la fecha actual y `isActive` a `false`.

---

### 8. Restaurar un producto eliminado

```
PATCH http://localhost:3000/api/products/:id/restore
```

**Body (raw JSON) - opcional:**

```json
{
  "isActive": true
}
```

| Body                   | Resultado                                |
| ---------------------- | ---------------------------------------- |
| `{ "isActive": true }` | `deletedAt = null`, `isActive = true`    |
| `{ "isActive": false }`| `deletedAt = null`, `isActive = false`   |
| sin body               | `deletedAt = null`, `isActive = false`   |

> Si el producto no esta eliminado devuelve `409 Conflict`.

---

## Ejemplos adicionales de body para crear productos

### Ropa

```json
{
  "title": "Chaqueta North Face",
  "description": "Talla M, usada 2 veces, como nueva",
  "price": 85,
  "category": "ropa",
  "condition": "como_nuevo",
  "location": "Barcelona",
  "seller": "Maria"
}
```

### Vehiculo

```json
{
  "title": "Bicicleta de montana BTT",
  "description": "Cuadro aluminio, 27 velocidades, ruedas 29 pulgadas",
  "price": 320,
  "category": "vehiculos",
  "condition": "bueno",
  "location": "Valencia",
  "seller": "Pedro"
}
```

### Hogar

```json
{
  "title": "Mesa escritorio IKEA MALM",
  "description": "140x65cm, color roble, en perfecto estado",
  "price": 45,
  "category": "hogar",
  "condition": "bueno",
  "location": "Sevilla",
  "seller": "Ana"
}
```
