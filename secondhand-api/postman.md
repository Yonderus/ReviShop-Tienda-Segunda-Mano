# Endpoints para Postman

Base URL: `http://localhost:3000/api`

Todas las respuestas tienen la forma `{ "success": true, "data": … }` o `{ "success": false, "message": "…" }`.

---

## Catálogo (solo lectura)

### Categorías

```
GET /api/categories
```

Devuelve las categorías publicadas, activas y sin borrar, con `parentId` (subcategorías) y `attributes` (opciones válidas de variante). Para los `select` del front.

```json
{ "_id": "…", "name": "Ropa", "slug": "ropa", "parentId": null, "order": 2,
  "attributes": [{ "key": "talla", "label": "Talla", "values": ["XS","S","M","L","XL"] }] }
```

### Vendedores

```
GET /api/sellers
```

Usuarios activos con rol `seller` o `admin`. Solo campos públicos: `_id`, `name`, `slug`, `location`.

> No hay POST, PATCH ni DELETE de categorías ni de usuarios.

---

## Productos

### 1. Listados

```
GET /api/products              activos y no eliminados (o ?isActive=false)
GET /api/products/actives      solo activos
GET /api/products/inactives    solo inactivos (no eliminados)
GET /api/products/trash        eliminados (soft delete), del más reciente al más antiguo
```

Cada producto incluye `category { name, slug }`, `seller { name, slug, location }`, `images` (solo la principal) y `variantsCount`.

**Query params opcionales:**

| Param | Ejemplo | Notas |
|---|---|---|
| `category` | `?category=electronica` | Slug; incluye sus subcategorías |
| `seller` | `?seller=lucia-martin` | Slug del vendedor |
| `condition` | `?condition=nuevo` | |
| `status` | `?status=disponible` | |
| `minPrice` / `maxPrice` | `?minPrice=10&maxPrice=500` | Sobre `basePrice` |
| `isActive` | `?isActive=false` | Solo en `GET /products` |

### 2. Detalle por slug (getBySlug)

```
GET /api/products/slug/:slug
GET /api/products/:id
```

Devuelve el producto con `category`, `seller`, **todas** las `images` (por `order`) y sus `variants` no eliminadas. Un producto en la papelera devuelve **404**.

### 3. Crear

```
POST /api/products
Content-Type: application/json
```

```json
{
  "title": "Chaqueta vaquera Levi's",
  "description": "Talla M, apenas usada, sin manchas ni roturas.",
  "basePrice": 40,
  "condition": "como_nuevo",
  "location": "Valencia",
  "categoryId": "<_id de GET /api/categories>",
  "sellerId": "<_id de GET /api/sellers>",
  "images": [
    { "url": "https://picsum.photos/id/1/800/600", "alt": "Chaqueta de frente" },
    { "url": "https://picsum.photos/id/2/800/600", "alt": "Detalle del bolsillo" }
  ]
}
```

- **201** con el producto completo. Se crea automáticamente su **variante por defecto** (`optionsKey: "default"`, SKU `SLUG-DEF`).
- La primera imagen es la portada (`kind: "cover"`, `isPrimary: true`); máximo 5 y sin repetir URL.
- **409** si el slug (generado desde `title`) ya existe, aunque el otro producto esté en la papelera.
- **422** si `categoryId` o `sellerId` no existen, están inactivos o la categoría no está publicada (el mensaje nombra el campo).

**Valores de `condition`:** `nuevo` · `como_nuevo` · `bueno` · `aceptable` · `mejorable`

### 4. Actualizar (parcial)

```
PATCH /api/products/:id
```

```json
{ "basePrice": 35, "title": "Chaqueta vaquera Levi's talla M" }
```

- Mismos campos que al crear, todos opcionales. **No acepta `status`** (va por `/status`).
- Si cambia el `title`, se regeneran el slug del producto (**409** si choca) y los de sus variantes.
- Si se envía `images`, sustituye el conjunto: las anteriores pasan a soft delete.

### 5. Cambiar estado de venta (changeStatus)

```
PATCH /api/products/:id/status
```

```json
{ "status": "reservado" }
```

- `status`: `disponible` · `reservado` · `vendido`.
- Con una sola variante actualiza la variante y recalcula el producto (**200**).
- Con varias variantes devuelve **422**: el estado se gestiona por variante.

### 6. Activar / desactivar (isActive)

```
PATCH /api/products/:id/active
```

```json
{ "isActive": false }
```

Solo cambia `isActive`. Si el producto está eliminado → **409** (hay que restaurarlo antes).

### 7. Eliminar (softDelete)

```
DELETE /api/products/:id
```

**204**. Pone `deletedAt` e `isActive: false` en el producto **y en cascada** en sus variantes e imágenes, con la misma fecha.

### 8. Restaurar (RestoreDelete)

```
PATCH /api/products/:id/restore
```

```json
{ "isActive": true }
```

| Body | Resultado |
|---|---|
| `{ "isActive": true }` | `deletedAt = null`, `isActive = true` |
| `{ "isActive": false }` o sin body | `deletedAt = null`, `isActive = false` |

Restaura también las variantes e imágenes **que se borraron con él** (misma fecha); las que se borraron antes por separado siguen borradas. Si el producto no está eliminado → **409**.

---

## Códigos de respuesta

| Código | Cuándo |
|---|---|
| 200 | GET, PATCH, restore, changeStatus |
| 201 | POST |
| 204 | DELETE |
| 404 | Recurso o ruta inexistente |
| 409 | Slug o email duplicado; activar un producto eliminado; restaurar uno no eliminado |
| 422 | Validación, ID mal formado, JSON mal formado, referencia inválida |
