import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { CATEGORY_STATUS } from "./constants/category.constants.js";
import { IMAGE_KIND, IMAGE_OWNER, IMAGE_STATUS } from "./constants/image.constants.js";
import { PERMISSIONS, ROLE } from "./constants/role.constants.js";
import { USER_STATUS } from "./constants/user.constants.js";
import { Category } from "./models/category.model.js";
import { Image } from "./models/image.model.js";
import { Product } from "./models/product.model.js";
import { ProductVariant } from "./models/productVariant.model.js";
import { Role } from "./models/role.model.js";
import { User } from "./models/user.model.js";
import { cascadeSoftDelete, productService } from "./services/product.service.js";
import { imagePosition } from "./utils/image.utils.js";
import { hashPassword } from "./utils/password.js";
import { buildSku, variantSlugBase } from "./utils/productVariant.utils.js";
import { uniqueSlug } from "./utils/slugify.js";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const photo = (id, size = "800/600") => `https://picsum.photos/id/${id}/${size}`;

/* ---------- Datos ---------- */

const ROLES = [
  { name: "Administrador", slug: ROLE.ADMIN, description: "Gestión completa de la plataforma", permissions: [...PERMISSIONS] },
  {
    name: "Moderador",
    slug: ROLE.MODERATOR,
    description: "Revisa, retira y restaura anuncios",
    permissions: ["products:read", "products:write", "products:delete", "products:restore"],
  },
  // Cualquier usuario compra y vende. Que solo toque sus propios anuncios se controlará con el JWT.
  {
    name: "Usuario",
    slug: ROLE.USER,
    description: "Compra y publica sus anuncios",
    permissions: ["products:read", "products:write", "products:delete"],
  },
];

const USERS = [
  { key: "admin", name: "Admin Revishop", email: "admin@revishop.test", role: ROLE.ADMIN, location: "Valencia", avatar: 338 },
  { key: "lucia", name: "Lucía Martín", email: "lucia@revishop.test", role: ROLE.USER, location: "Valencia", avatar: 64, bio: "Vendo lo que ya no uso antes de que coja polvo." },
  { key: "juan", name: "Juan Pérez", email: "juan@revishop.test", role: ROLE.USER, location: "Madrid", avatar: 91, bio: "Electrónica y bicis revisadas." },
  { key: "marta", name: "Marta Gil", email: "marta@revishop.test", role: ROLE.USER, location: "Zaragoza", avatar: 1027 },
  { key: "carlos", name: "Carlos Ruiz", email: "carlos@revishop.test", role: ROLE.USER, location: "Bilbao", avatar: 1005 },
  // Suspendido: no puede vender ni sale en el select de vendedor.
  { key: "pablo", name: "Pablo Sanz", email: "pablo@revishop.test", role: ROLE.USER, location: "Sevilla", avatar: 1012, status: USER_STATUS.SUSPENDED },
];

const CATEGORIES = [
  {
    name: "Electrónica",
    slug: "electronica",
    order: 1,
    attributes: [
      { key: "capacidad", label: "Capacidad", values: ["64 GB", "128 GB", "256 GB", "512 GB"] },
      { key: "color", label: "Color", values: ["Negro", "Blanco", "Plata", "Azul"] },
    ],
  },
  {
    name: "Ropa",
    slug: "ropa",
    order: 2,
    attributes: [
      { key: "talla", label: "Talla", values: ["XS", "S", "M", "L", "XL"] },
      { key: "color", label: "Color", values: ["Negro", "Blanco", "Azul", "Rojo", "Verde"] },
    ],
  },
  { name: "Hogar", slug: "hogar", order: 3 },
  { name: "Deportes", slug: "deportes", order: 4 },
  { name: "Vehículos", slug: "vehiculos", order: 5 },
  { name: "Libros", slug: "libros", order: 6 },
  { name: "Juguetes", slug: "juguetes", order: 7 },
  { name: "Otros", slug: "otros", order: 8 },
  // En borrador: se está preparando y aún no sale en la tienda ni admite productos.
  {
    name: "Instrumentos musicales",
    slug: "instrumentos-musicales",
    order: 9,
    status: CATEGORY_STATUS.DRAFT,
    attributes: [{ key: "tipo", label: "Tipo", values: ["Guitarra", "Teclado", "Batería", "Viento"] }],
  },
];

/** Las subcategorías sin `attributes` heredan los del padre. */
const SUBCATEGORIES = [
  { name: "Móviles", slug: "moviles", parent: "electronica", order: 1 },
  {
    name: "Ordenadores",
    slug: "ordenadores",
    parent: "electronica",
    order: 2,
    attributes: [{ key: "memoria", label: "Memoria RAM", values: ["8 GB", "16 GB", "32 GB"] }],
  },
  { name: "Chaquetas", slug: "chaquetas", parent: "ropa", order: 1 },
  { name: "Pádel", slug: "padel", parent: "deportes", order: 1 },
];

const PRODUCTS = [
  // Activos
  {
    title: "iPhone 13 Pro",
    description: "Estado impecable, con caja original y cargador. Sin arañazos.",
    basePrice: 600,
    category: "moviles",
    seller: "juan",
    condition: "como_nuevo",
    location: "Madrid",
    variants: [
      { options: [{ key: "capacidad", value: "128 GB" }], price: 600 },
      { options: [{ key: "capacidad", value: "256 GB" }], price: 650 },
    ],
  },
  {
    title: "Chaqueta North Face Thermoball",
    description: "Usada dos temporadas, sin roturas. Color negro.",
    basePrice: 85,
    category: "chaquetas",
    seller: "lucia",
    condition: "como_nuevo",
    location: "Valencia",
    variants: [
      { options: [{ key: "talla", value: "S" }, { key: "color", value: "Negro" }], price: 80, status: "vendido" },
      { options: [{ key: "talla", value: "M" }, { key: "color", value: "Negro" }], status: "reservado" },
      { options: [{ key: "talla", value: "L" }, { key: "color", value: "Negro" }] },
    ],
  },
  {
    title: "Bicicleta de montaña BTT 29 pulgadas",
    description: "Cuadro aluminio, 27 velocidades, frenos de disco hidráulicos.",
    basePrice: 320,
    category: "vehiculos",
    seller: "juan",
    condition: "bueno",
    location: "Madrid",
  },
  {
    title: "Mesa escritorio IKEA MALM",
    description: "140x65cm, color roble, en perfecto estado. Desmontada.",
    basePrice: 45,
    category: "hogar",
    seller: "marta",
    condition: "bueno",
    location: "Zaragoza",
  },
  {
    title: "PlayStation 5 Digital Edition",
    description: "Con 2 mandos y 3 juegos digitales. Funciona perfectamente.",
    basePrice: 380,
    category: "electronica",
    seller: "juan",
    condition: "bueno",
    location: "Madrid",
  },
  {
    title: "Cámara analógica telemétrica años 60",
    description: "Revisada y funcionando. Ideal para colección o para disparar carrete.",
    basePrice: 140,
    category: "electronica",
    seller: "lucia",
    condition: "bueno",
    location: "Valencia",
    status: "reservado",
    images: [{ url: photo(250), alt: "Cámara analógica telemétrica sobre un piano" }],
  },
  {
    title: "MacBook Air 13 pulgadas",
    description: "Batería al 82 %, teclado perfecto. Se entrega formateado.",
    basePrice: 420,
    category: "ordenadores",
    seller: "marta",
    condition: "aceptable",
    location: "Zaragoza",
    status: "vendido",
    images: [
      { url: photo(0), alt: "MacBook Air sobre una mesa de madera" },
      { url: photo(180), alt: "MacBook Air abierto junto a una libreta" },
    ],
  },
  {
    title: "Raqueta de pádel Bullpadel Vertex",
    description: "Sin estrenar, con funda original.",
    basePrice: 95,
    category: "padel",
    seller: "lucia",
    condition: "nuevo",
    location: "Valencia",
  },
  {
    title: "Sudadera Adidas Originals",
    description: "Algodón grueso, lavada pocas veces. Sin bolitas ni manchas.",
    basePrice: 30,
    category: "ropa",
    seller: "lucia",
    condition: "como_nuevo",
    location: "Valencia",
    variants: [
      { options: [{ key: "talla", value: "S" }, { key: "color", value: "Azul" }] },
      { options: [{ key: "talla", value: "M" }, { key: "color", value: "Azul" }] },
      { options: [{ key: "talla", value: "L" }, { key: "color", value: "Verde" }], price: 25 },
    ],
    images: [{ url: photo(1059), alt: "Sudadera doblada sobre una silla" }],
  },
  {
    title: "Portátil Lenovo ThinkPad T14",
    description: "Procesador i5, SSD de 512 GB. Batería que aguanta una jornada.",
    basePrice: 380,
    category: "ordenadores",
    seller: "juan",
    condition: "bueno",
    location: "Madrid",
    variants: [
      { options: [{ key: "memoria", value: "8 GB" }], price: 380 },
      { options: [{ key: "memoria", value: "16 GB" }], price: 430, status: "reservado" },
    ],
    images: [{ url: photo(2), alt: "Portátil abierto sobre un escritorio" }],
  },
  {
    title: "Samsung Galaxy S21",
    description: "Pantalla sin arañazos, siempre con funda. Libre de operador.",
    basePrice: 260,
    category: "moviles",
    seller: "carlos",
    condition: "bueno",
    location: "Bilbao",
    variants: [
      { options: [{ key: "capacidad", value: "128 GB" }, { key: "color", value: "Negro" }], price: 260 },
      { options: [{ key: "capacidad", value: "256 GB" }, { key: "color", value: "Plata" }], price: 300 },
    ],
  },
  {
    title: "Sofá de dos plazas gris",
    description: "Tela lavable, 160 cm de ancho. Hay que recogerlo en Bilbao.",
    basePrice: 150,
    category: "hogar",
    seller: "carlos",
    condition: "aceptable",
    location: "Bilbao",
    images: [{ url: photo(1080), alt: "Sofá gris en un salón luminoso" }],
  },
  {
    title: "Patines en línea Oxelo",
    description: "Talla 40, ruedas cambiadas hace un mes. Incluye protecciones.",
    basePrice: 40,
    category: "deportes",
    seller: "marta",
    condition: "bueno",
    location: "Zaragoza",
  },
  {
    title: "Trilogía El Señor de los Anillos",
    description: "Edición de bolsillo, los tres tomos. Lomos algo gastados.",
    basePrice: 22,
    category: "libros",
    seller: "carlos",
    condition: "aceptable",
    location: "Bilbao",
    status: "vendido",
  },
  // Inactivos
  {
    title: "Despertador vintage de cuerda",
    description: "Funciona, pero el cristal tiene una marca. Pieza decorativa.",
    basePrice: 18,
    category: "hogar",
    seller: "marta",
    condition: "mejorable",
    location: "Zaragoza",
    isActive: false,
    images: [{ url: photo(175), alt: "Despertador vintage de esfera blanca" }],
  },
  {
    title: "Taza de cerámica coleccionable",
    description: "Edición ilustrada, nunca usada.",
    basePrice: 12,
    category: "hogar",
    seller: "lucia",
    condition: "nuevo",
    location: "Valencia",
    isActive: false,
    images: [{ url: photo(30), alt: "Taza de cerámica ilustrada" }],
  },
  {
    title: "LEGO Star Wars Halcón Milenario",
    description: "Completo, con instrucciones. Caja algo gastada.",
    basePrice: 110,
    category: "juguetes",
    seller: "juan",
    condition: "como_nuevo",
    location: "Madrid",
    status: "reservado",
    isActive: false,
  },
  // Papelera
  {
    title: "iPhone SE 64GB",
    description: "Batería nueva. Retirado por el vendedor.",
    basePrice: 90,
    category: "moviles",
    seller: "juan",
    condition: "aceptable",
    location: "Madrid",
    deletedAt: daysAgo(2),
    images: [{ url: photo(160), alt: "iPhone SE sobre una mesa" }],
  },
  {
    title: "Pack de auriculares, reloj y cartera",
    description: "Lote de accesorios en buen estado.",
    basePrice: 60,
    category: "otros",
    seller: "marta",
    condition: "bueno",
    location: "Zaragoza",
    status: "vendido",
    deletedAt: daysAgo(9),
    images: [{ url: photo(26), alt: "Auriculares, reloj, cartera y gafas sobre fondo gris" }],
  },
  {
    title: "Colección Harry Potter tapa dura",
    description: "Los 7 libros, edición Salamandra.",
    basePrice: 70,
    category: "libros",
    seller: "lucia",
    condition: "como_nuevo",
    location: "Valencia",
    deletedAt: daysAgo(21),
  },
];

const MODELS = [Role, User, Category, Product, ProductVariant, Image];

/* ---------- Pasos (en orden de dependencias) ---------- */

async function seedRoles() {
  const roles = {};
  for (const data of ROLES) roles[data.slug] = await Role.create({ ...data, isSystem: true });
  return roles;
}

async function seedUsers(roles) {
  if (!env.SEED_DEFAULT_PASSWORD) {
    throw new Error("Define SEED_DEFAULT_PASSWORD en .env (mínimo 8 caracteres) para crear los usuarios de prueba");
  }
  const passwordHash = await hashPassword(env.SEED_DEFAULT_PASSWORD);
  const users = {};
  for (const { key, role, avatar: _avatar, status = USER_STATUS.VERIFIED, ...data } of USERS) {
    users[key] = await User.create({
      ...data,
      roleId: roles[role]._id,
      passwordHash,
      status,
      emailVerifiedAt: status === USER_STATUS.VERIFIED ? new Date() : null,
    });
  }
  return users;
}

async function seedCategories() {
  const categories = {};
  for (const { status = CATEGORY_STATUS.PUBLISHED, ...data } of CATEGORIES) {
    categories[data.slug] = await Category.create({ ...data, status });
  }
  for (const { parent, ...data } of SUBCATEGORIES) {
    categories[data.slug] = await Category.create({ ...data, parentId: categories[parent]._id, status: CATEGORY_STATUS.PUBLISHED });
  }
  return categories;
}

async function seedVariants(product, spec) {
  if (!spec.variants) {
    await ProductVariant.create({
      productId: product._id,
      sku: buildSku(product.slug),
      slug: await uniqueSlug(ProductVariant, variantSlugBase(product.slug)),
      options: [],
      isDefault: true,
      status: spec.status ?? "disponible",
    });
    return;
  }
  for (const [index, variant] of spec.variants.entries()) {
    const values = variant.options.map((o) => o.value);
    await ProductVariant.create({
      productId: product._id,
      sku: buildSku(product.slug, values),
      slug: await uniqueSlug(ProductVariant, variantSlugBase(product.slug, values)),
      options: variant.options,
      price: variant.price ?? null,
      isDefault: index === 0,
      order: index,
      status: variant.status ?? "disponible",
    });
  }
}

async function seedProductImages(product, images = []) {
  for (const [index, image] of images.entries()) {
    await Image.create({
      ownerType: IMAGE_OWNER.PRODUCT,
      ownerId: product._id,
      url: image.url,
      alt: image.alt,
      ...imagePosition(index),
      width: 800,
      height: 600,
      mimeType: "image/jpeg",
      uploadedBy: product.sellerId,
      status: IMAGE_STATUS.READY,
    });
  }
}

async function seedAvatars(users) {
  for (const { key, avatar } of USERS) {
    const user = users[key];
    await Image.create({
      ownerType: IMAGE_OWNER.USER,
      ownerId: user._id,
      kind: IMAGE_KIND.AVATAR,
      url: photo(avatar, "200/200"),
      alt: `Avatar de ${user.name}`,
      isPrimary: true,
      width: 200,
      height: 200,
      mimeType: "image/jpeg",
      uploadedBy: user._id,
      status: IMAGE_STATUS.READY,
    });
  }
}

async function seedProducts(users, categories) {
  const created = [];
  for (const spec of PRODUCTS) {
    const { variants, images, category, seller, status, deletedAt, ...data } = spec;
    const product = await Product.create({
      ...data,
      categoryId: categories[category]._id,
      sellerId: users[seller]._id,
      isActive: deletedAt ? false : (data.isActive ?? true),
      deletedAt: deletedAt ?? null,
    });
    await seedVariants(product, spec);
    await seedProductImages(product, images);
    await productService.recalculateStatus(product._id);
    // Los de la papelera arrastran a sus variantes e imágenes con la misma fecha.
    if (deletedAt) await cascadeSoftDelete(product._id, deletedAt);
    created.push(product);
  }
  return created;
}

/* ---------- Ejecución ---------- */

async function seedDatabase() {
  try {
    await connectDB();
    for (const Model of MODELS) await Model.deleteMany({});
    await Promise.all(MODELS.map((Model) => Model.syncIndexes()));
    console.log("Colecciones limpiadas e índices sincronizados.");

    const roles = await seedRoles();
    const users = await seedUsers(roles);
    const categories = await seedCategories();
    const products = await seedProducts(users, categories);
    await seedAvatars(users);

    const count = (filter) => products.filter(filter).length;
    // Totales con la papelera incluida (el plugin de soft delete la oculta por defecto).
    const total = (Model) => Model.countDocuments().setOptions({ withDeleted: true });
    console.log("\nResumen:");
    console.log(`  roles            ${await total(Role)}`);
    console.log(`  users            ${await total(User)}`);
    console.log(`  categories       ${await total(Category)}`);
    console.log(
      `  products         ${products.length} (activos ${count((p) => !p.deletedAt && p.isActive)}, ` +
        `inactivos ${count((p) => !p.deletedAt && !p.isActive)}, papelera ${count((p) => p.deletedAt)})`
    );
    console.log(`  productvariants  ${await total(ProductVariant)}`);
    console.log(`  images           ${await total(Image)}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el seed:", error.message ?? error);
    process.exit(1);
  }
}

seedDatabase();
