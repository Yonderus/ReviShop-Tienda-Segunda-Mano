import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";
import { CATEGORY_STATUSES } from "../constants/category.constants.js";
import { IMAGE_KINDS } from "../constants/image.constants.js";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_STATUSES } from "../constants/user.constants.js";

// Cada ruta se documenta con un comentario @openapi en su archivo de rutas. swagger-jsdoc usa globs,
// que en Windows necesitan barras normales.
const routesGlob = join(dirname(fileURLToPath(import.meta.url)), "..", "routes", "*.js").replaceAll("\\", "/");

const objectId = { type: "string", pattern: "^[0-9a-fA-F]{24}$", example: "6ad905f8134234eb591295e5" };
const nullableDate = { type: "string", format: "date-time", nullable: true };
const success = (data) => ({
  type: "object",
  properties: { success: { type: "boolean", example: true }, data },
});
const categoryAttributes = {
  type: "array",
  description: "Opciones que pueden tener las variantes de sus productos. Las subcategorías sin atributos heredan los del padre.",
  items: {
    type: "object",
    properties: {
      key: { type: "string", pattern: "^[a-z0-9_]+$", example: "almacenamiento" },
      label: { type: "string", example: "Almacenamiento" },
      values: { type: "array", items: { type: "string" }, example: ["64 GB", "128 GB"] },
    },
  },
};
const errorResponse = (description, example) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example } },
});

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Revishop API",
      version: "1.0.0",
      description:
        "API REST del marketplace de segunda mano Revishop. Todas las respuestas correctas van en " +
        "`{ success: true, data }` y los errores en `{ success: false, message, errors? }`.\n\n" +
        "**Sesión:** `POST /auth/login` devuelve un token; pulsa **Authorize** y pégalo para probar las rutas " +
        "protegidas. Cada ruta indica si es pública, con sesión, del dueño (o un admin) o solo de admin.",
    },
    servers: [{ url: "/api" }],
    tags: [
      { name: "Auth", description: "Login con JWT, usuario de la sesión y logout (blacklist)" },
      { name: "Perfil", description: "Mi perfil: teléfono, ubicación, bio y avatar" },
      { name: "Productos", description: "CRUD de productos, visibilidad, papelera y estado de venta" },
      { name: "Variantes", description: "Opciones de un producto (talla, capacidad…) con su precio, stock y estado" },
      { name: "Categorías", description: "Árbol de dos niveles, atributos de variante, visibilidad y papelera" },
      { name: "Usuarios", description: "Cuentas (cualquiera compra y vende), roles, visibilidad y papelera" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "El `token` de `POST /auth/login` (sin la palabra Bearer: la añade Swagger).",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Los datos enviados no son válidos" },
            errors: {
              type: "array",
              description: "Solo si el error va ligado a campos. `field` es la ruta con puntos.",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "images.0.url" },
                  message: { type: "string", example: "Cada imagen debe tener una URL http(s) válida" },
                },
              },
            },
          },
        },
        Image: {
          type: "object",
          properties: {
            _id: objectId,
            ownerId: objectId,
            url: { type: "string", format: "uri" },
            alt: { type: "string" },
            kind: { type: "string", enum: IMAGE_KINDS },
            isPrimary: { type: "boolean" },
            order: { type: "integer" },
            width: { type: "integer" },
            height: { type: "integer" },
          },
        },
        Variant: {
          type: "object",
          properties: {
            _id: objectId,
            productId: objectId,
            sku: { type: "string", example: "IPHONE-13-PRO-128GB" },
            slug: { type: "string", example: "iphone-13-pro-128-gb" },
            options: {
              type: "array",
              items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } } },
            },
            optionsKey: { type: "string", example: "almacenamiento:128 gb" },
            price: { type: "number", nullable: true, description: "null = usa el basePrice del producto" },
            stock: { type: "integer" },
            isDefault: { type: "boolean" },
            order: { type: "integer" },
            status: { type: "string", enum: SALE_STATUSES },
            isActive: { type: "boolean" },
            images: { type: "array", items: { $ref: "#/components/schemas/Image" } },
          },
        },
        CategorySummary: {
          type: "object",
          properties: { _id: objectId, name: { type: "string" }, slug: { type: "string" } },
        },
        Category: {
          type: "object",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Móviles" },
            slug: { type: "string", example: "moviles" },
            description: { type: "string" },
            parentId: { ...objectId, nullable: true },
            order: { type: "integer" },
            attributes: categoryAttributes,
          },
        },
        CategoryAdmin: {
          description: "Como Category, con lo que solo ve el panel.",
          allOf: [
            { $ref: "#/components/schemas/Category" },
            {
              type: "object",
              properties: {
                status: { type: "string", enum: CATEGORY_STATUSES, description: "Solo las publicadas salen en la tienda" },
                isActive: { type: "boolean" },
                deletedAt: nullableDate,
                productsCount: { type: "integer", description: "Productos no eliminados" },
                childrenCount: { type: "integer", description: "Subcategorías no eliminadas" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          ],
        },
        CategoryInput: {
          type: "object",
          required: ["name"],
          description: "En un PATCH todos los campos son opcionales.",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 60, example: "Tablets" },
            description: { type: "string", maxLength: 300 },
            parentId: { ...objectId, nullable: true, description: "Una categoría principal; null para que lo sea ella" },
            attributes: { ...categoryAttributes, maxItems: 10 },
            order: { type: "integer", minimum: 0 },
            status: { type: "string", enum: CATEGORY_STATUSES },
          },
        },
        SellerSummary: {
          type: "object",
          description: "El vendedor dentro de un producto. La ubicación que cuenta es la del producto.",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Lucía Martín" },
            slug: { type: "string", example: "lucia-martin" },
          },
        },
        Seller: {
          description: "Para el select de vendedor: con la ubicación de su perfil, si la tiene.",
          allOf: [
            { $ref: "#/components/schemas/SellerSummary" },
            { type: "object", properties: { location: { type: "string", example: "Valencia" } } },
          ],
        },
        Role: {
          type: "object",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Administrador" },
            slug: { type: "string", example: "admin" },
            description: { type: "string" },
          },
        },
        User: {
          type: "object",
          description: "Nunca incluye la contraseña ni su hash.",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Lucía Martín" },
            slug: { type: "string", example: "lucia-martin" },
            email: { type: "string", format: "email", example: "lucia@revishop.test" },
            roleId: objectId,
            role: { type: "object", properties: { _id: objectId, name: { type: "string" }, slug: { type: "string" } } },
            phone: { type: "string" },
            location: { type: "string", example: "Valencia" },
            bio: { type: "string" },
            avatarUrl: { type: "string", format: "uri", description: "Foto del perfil. No aparece si no tiene" },
            status: { type: "string", enum: USER_STATUSES, description: "suspended = no puede vender" },
            isActive: { type: "boolean" },
            deletedAt: nullableDate,
            lastLoginAt: nullableDate,
            emailVerifiedAt: nullableDate,
            productsCount: { type: "integer", description: "Productos no eliminados" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        UserInput: {
          type: "object",
          required: ["name", "email", "password", "roleId"],
          description: "En un PATCH todos los campos son opcionales; password solo si se quiere cambiar.",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 60, example: "Ana López" },
            email: { type: "string", format: "email", example: "ana@revishop.test" },
            password: { type: "string", format: "password", minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
            roleId: objectId,
            phone: { type: "string", maxLength: 20, example: "+34 600 000 000" },
            location: { type: "string", maxLength: 100, example: "Valencia" },
            bio: { type: "string", maxLength: 300 },
            avatarUrl: {
              type: "string",
              format: "uri",
              nullable: true,
              example: "https://picsum.photos/id/64/200/200",
              description: "URL http(s) de la foto del perfil; null la quita. Al cambiarla, la anterior va a la papelera",
            },
            status: { type: "string", enum: USER_STATUSES },
          },
        },
        Product: {
          type: "object",
          description: "En los listados, `images` solo trae la portada.",
          properties: {
            _id: objectId,
            title: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            condition: { type: "string", enum: PRODUCT_CONDITIONS },
            basePrice: { type: "number" },
            location: { type: "string" },
            status: { type: "string", enum: SALE_STATUSES, description: "Calculado a partir de las variantes" },
            variantsCount: { type: "integer" },
            viewsCount: { type: "integer" },
            isActive: { type: "boolean" },
            deletedAt: nullableDate,
            categoryId: objectId,
            sellerId: objectId,
            category: { $ref: "#/components/schemas/CategorySummary" },
            seller: { $ref: "#/components/schemas/SellerSummary" },
            images: { type: "array", items: { $ref: "#/components/schemas/Image" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ProductDetail: {
          description: "Como Product, con todas las imágenes y las variantes no eliminadas.",
          allOf: [
            { $ref: "#/components/schemas/Product" },
            {
              type: "object",
              properties: { variants: { type: "array", items: { $ref: "#/components/schemas/Variant" } } },
            },
          ],
        },
        ProductInput: {
          type: "object",
          required: ["title", "description", "basePrice", "condition", "categoryId"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 80, example: "Silla de madera" },
            description: { type: "string", minLength: 10, maxLength: 2000, example: "Silla maciza, sin marcas." },
            basePrice: { type: "number", minimum: 0, example: 25 },
            condition: { type: "string", enum: PRODUCT_CONDITIONS },
            location: { type: "string", maxLength: 100, example: "Valencia" },
            categoryId: objectId,
            sellerId: {
              ...objectId,
              description: "Solo para un admin (publicar o pasar el producto a otro vendedor). Para el resto se ignora: el vendedor es el de la sesión",
            },
            images: {
              type: "array",
              maxItems: 5,
              description: "La primera es la portada. En un PATCH sustituye el conjunto completo.",
              items: {
                type: "object",
                required: ["url"],
                properties: { url: { type: "string", format: "uri" }, alt: { type: "string", maxLength: 120 } },
              },
            },
          },
        },
        VariantInput: {
          type: "object",
          required: ["options"],
          properties: {
            options: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["key", "value"],
                properties: { key: { type: "string", example: "capacidad" }, value: { type: "string", example: "512 GB" } },
              },
            },
            price: { type: "number", minimum: 0, nullable: true, description: "null o sin enviar = precio base del producto" },
            stock: { type: "integer", minimum: 0, example: 1 },
          },
        },
        VariantUpdate: {
          type: "object",
          properties: { price: { type: "number", minimum: 0, nullable: true }, stock: { type: "integer", minimum: 0 } },
        },
        VariantResponse: success({ $ref: "#/components/schemas/Variant" }),
        VariantListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Variant" } }),
        StatusInput: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: SALE_STATUSES } },
        },
        ActiveInput: { type: "object", required: ["isActive"], properties: { isActive: { type: "boolean" } } },
        RestoreInput: {
          type: "object",
          properties: { isActive: { type: "boolean", description: "true para restaurarlo ya visible" } },
        },
        ProductResponse: success({ $ref: "#/components/schemas/ProductDetail" }),
        ProductListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Product" } }),
        CategoryListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Category" } }),
        CategoryResponse: success({ $ref: "#/components/schemas/CategoryAdmin" }),
        CategoryAdminListResponse: success({ type: "array", items: { $ref: "#/components/schemas/CategoryAdmin" } }),
        SellerListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Seller" } }),
        UserResponse: success({ $ref: "#/components/schemas/User" }),
        UserListResponse: success({ type: "array", items: { $ref: "#/components/schemas/User" } }),
        RoleListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Role" } }),
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@revishop.test" },
            password: { type: "string", format: "password", maxLength: PASSWORD_MAX_LENGTH },
          },
        },
        Profile: {
          type: "object",
          description: "Solo aparecen los campos que tenga.",
          properties: {
            phone: { type: "string", example: "+34 600 000 000" },
            location: { type: "string", example: "Valencia" },
            bio: { type: "string" },
            avatarUrl: { type: "string", format: "uri" },
          },
        },
        ProfileInput: {
          type: "object",
          description: "Todo opcional; solo cambia lo que llegue. Cualquier otro campo (userId, role…) se ignora.",
          properties: {
            phone: { type: "string", maxLength: 20 },
            location: { type: "string", maxLength: 100 },
            bio: { type: "string", maxLength: 300 },
            avatarUrl: { type: "string", format: "uri", nullable: true, description: "null quita el avatar" },
          },
        },
        Me: {
          type: "object",
          description: "El usuario de la sesión. Nunca la contraseña.",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Admin Revishop" },
            slug: { type: "string", example: "admin-revishop" },
            email: { type: "string", format: "email" },
            status: { type: "string", enum: USER_STATUSES },
            role: { type: "object", properties: { name: { type: "string" }, slug: { type: "string", example: "admin" } } },
            avatarUrl: { type: "string", format: "uri" },
            profile: { type: "object", properties: { phone: { type: "string" }, location: { type: "string" }, bio: { type: "string" } } },
          },
        },
        LoginResponse: success({
          type: "object",
          properties: {
            token: { type: "string", description: "JWT. Va en `Authorization: Bearer <token>`. Caduca según JWT_EXPIRES_IN" },
            user: { $ref: "#/components/schemas/Me" },
          },
        }),
        MeResponse: success({ $ref: "#/components/schemas/Me" }),
        ProfileResponse: success({ $ref: "#/components/schemas/Profile" }),
      },
      parameters: {
        ProductId: { name: "id", in: "path", required: true, schema: objectId },
        VariantId: { name: "id", in: "path", required: true, schema: objectId },
        CategoryId: { name: "id", in: "path", required: true, schema: objectId },
        CategoryStatus: { name: "status", in: "query", schema: { type: "string", enum: CATEGORY_STATUSES } },
        UserId: { name: "id", in: "path", required: true, schema: objectId },
        UserStatus: { name: "status", in: "query", schema: { type: "string", enum: USER_STATUSES } },
        UserRole: { name: "role", in: "query", description: "Slug del rol", schema: { type: "string", example: "admin" } },
        ProductSlug: { name: "slug", in: "path", required: true, schema: { type: "string", example: "iphone-13-pro" } },
        Category: { name: "category", in: "query", description: "Slug; incluye sus subcategorías", schema: { type: "string" } },
        Seller: { name: "seller", in: "query", description: "Slug del vendedor", schema: { type: "string" } },
        Condition: { name: "condition", in: "query", schema: { type: "string", enum: PRODUCT_CONDITIONS } },
        Status: { name: "status", in: "query", schema: { type: "string", enum: SALE_STATUSES } },
        MinPrice: { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
        MaxPrice: { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
      },
      responses: {
        Unauthorized: errorResponse("Sin sesión, o con un token caducado, revocado (logout) o no válido", {
          success: false,
          message: "Necesitas iniciar sesión",
        }),
        Forbidden: errorResponse("Con sesión, pero sin permiso: no es admin, o el recurso no es suyo", {
          success: false,
          message: "No tienes permiso para esto",
        }),
        BadCredentials: errorResponse("Email o contraseña incorrectos (el mismo mensaje en los dos casos)", {
          success: false,
          message: "Email o contraseña incorrectos",
        }),
        NotFound: errorResponse("No existe (o está en la papelera)", { success: false, message: "Producto no encontrado" }),
        ValidationError: errorResponse("Datos no válidos", {
          success: false,
          message: "Los datos enviados no son válidos",
          errors: [{ field: "title", message: "El título debe tener al menos 3 caracteres" }],
        }),
        Conflict: errorResponse("Choca con el estado actual o con otro registro", {
          success: false,
          message: "Ya existe un producto con ese título. Prueba con otro",
          errors: [{ field: "title", message: "Ya existe un producto con ese título. Prueba con otro" }],
        }),
      },
    },
  },
  apis: [routesGlob],
});
