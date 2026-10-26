import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";
import { IMAGE_KINDS } from "../constants/image.constants.js";
import { PRODUCT_CONDITIONS, SALE_STATUSES } from "../constants/product.constants.js";

// Cada ruta se documenta con un comentario @openapi en su archivo de rutas. swagger-jsdoc usa globs,
// que en Windows necesitan barras normales.
const routesGlob = join(dirname(fileURLToPath(import.meta.url)), "..", "routes", "*.js").replaceAll("\\", "/");

const objectId = { type: "string", pattern: "^[0-9a-fA-F]{24}$", example: "6ad905f8134234eb591295e5" };
const nullableDate = { type: "string", format: "date-time", nullable: true };
const success = (data) => ({
  type: "object",
  properties: { success: { type: "boolean", example: true }, data },
});
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
        "`{ success: true, data }` y los errores en `{ success: false, message, errors? }`.",
    },
    servers: [{ url: "/api" }],
    tags: [
      { name: "Productos", description: "CRUD de productos, visibilidad, papelera y estado de venta" },
      { name: "Catálogo", description: "Datos de referencia para los select del front (solo lectura)" },
    ],
    components: {
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
            attributes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string", example: "almacenamiento" },
                  label: { type: "string", example: "Almacenamiento" },
                  values: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        Seller: {
          type: "object",
          properties: {
            _id: objectId,
            name: { type: "string", example: "Lucía Martín" },
            slug: { type: "string", example: "lucia-martin" },
            location: { type: "string", example: "Valencia" },
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
            seller: { $ref: "#/components/schemas/Seller" },
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
          required: ["title", "description", "basePrice", "condition", "categoryId", "sellerId"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 80, example: "Silla de madera" },
            description: { type: "string", minLength: 10, maxLength: 2000, example: "Silla maciza, sin marcas." },
            basePrice: { type: "number", minimum: 0, example: 25 },
            condition: { type: "string", enum: PRODUCT_CONDITIONS },
            location: { type: "string", maxLength: 100, example: "Valencia" },
            categoryId: objectId,
            sellerId: objectId,
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
        SellerListResponse: success({ type: "array", items: { $ref: "#/components/schemas/Seller" } }),
      },
      parameters: {
        ProductId: { name: "id", in: "path", required: true, schema: objectId },
        ProductSlug: { name: "slug", in: "path", required: true, schema: { type: "string", example: "iphone-13-pro" } },
        Category: { name: "category", in: "query", description: "Slug; incluye sus subcategorías", schema: { type: "string" } },
        Seller: { name: "seller", in: "query", description: "Slug del vendedor", schema: { type: "string" } },
        Condition: { name: "condition", in: "query", schema: { type: "string", enum: PRODUCT_CONDITIONS } },
        Status: { name: "status", in: "query", schema: { type: "string", enum: SALE_STATUSES } },
        MinPrice: { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
        MaxPrice: { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
      },
      responses: {
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
