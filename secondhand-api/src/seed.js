import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { PERMISSIONS } from "./constants/permissions.js";
import { Category } from "./models/category.model.js";
import { Image } from "./models/image.model.js";
import { Product } from "./models/product.model.js";
import { ProductVariant } from "./models/productVariant.model.js";
import { Role } from "./models/role.model.js";
import { User } from "./models/user.model.js";
import { cascadeSoftDelete, productService } from "./services/product.service.js";
import { buildSku, variantSlugBase } from "./utils/productVariant.utils.js";
import { uniqueSlug } from "./utils/slugify.js";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const photo = (id, size = "800/600") => `https://picsum.photos/id/${id}/${size}`;

/* ---------- Datos ---------- */

const ROLES = [
  { name: "Administrador", slug: "admin", description: "Gestión completa de la plataforma", permissions: [...PERMISSIONS] },
  {
    name: "Moderador",
    slug: "moderator",
    description: "Revisa, retira y restaura anuncios",
    permissions: ["products:read", "products:write", "products:delete", "products:restore"],
  },
  {
    name: "Vendedor",
    slug: "seller",
    description: "Publica y gestiona sus anuncios",
    permissions: ["products:read", "products:write", "products:delete"],
  },
  { name: "Usuario", slug: "user", description: "Compra y consulta anuncios", permissions: ["products:read"] },
];

const USERS = [
  { key: "admin", name: "Admin Revishop", email: "admin@revishop.test", role: "admin", location: "Valencia", avatar: 338 },
  { key: "lucia", name: "Lucía Martín", email: "lucia@revishop.test", role: "seller", location: "Valencia", avatar: 64, bio: "Vendo lo que ya no uso antes de que coja polvo." },
  { key: "juan", name: "Juan Pérez", email: "juan@revishop.test", role: "seller", location: "Madrid", avatar: 91, bio: "Electrónica y bicis revisadas." },
  { key: "marta", name: "Marta Gil", email: "marta@revishop.test", role: "seller", location: "Zaragoza", avatar: 1027 },
  { key: "carlos", name: "Carlos Ruiz", email: "carlos@revishop.test", role: "user", location: "Bilbao", avatar: 1005 },
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
  const passwordHash = await bcrypt.hash(env.SEED_DEFAULT_PASSWORD, 10);
  const users = {};
  for (const { key, role, avatar: _avatar, ...data } of USERS) {
    users[key] = await User.create({
      ...data,
      roleId: roles[role]._id,
      passwordHash,
      status: "verified",
      emailVerifiedAt: new Date(),
    });
  }
  return users;
}

async function seedCategories() {
  const categories = {};
  for (const data of CATEGORIES) categories[data.slug] = await Category.create({ ...data, status: "published" });
  for (const { parent, ...data } of SUBCATEGORIES) {
    categories[data.slug] = await Category.create({ ...data, parentId: categories[parent]._id, status: "published" });
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
      ownerType: "Product",
      ownerId: product._id,
      kind: index === 0 ? "cover" : "gallery",
      url: image.url,
      alt: image.alt,
      order: index,
      isPrimary: index === 0,
      width: 800,
      height: 600,
      mimeType: "image/jpeg",
      uploadedBy: product.sellerId,
      status: "ready",
    });
  }
}

async function seedAvatars(users) {
  for (const { key, avatar } of USERS) {
    const user = users[key];
    await Image.create({
      ownerType: "User",
      ownerId: user._id,
      kind: "avatar",
      url: photo(avatar, "200/200"),
      alt: `Avatar de ${user.name}`,
      isPrimary: true,
      width: 200,
      height: 200,
      mimeType: "image/jpeg",
      uploadedBy: user._id,
      status: "ready",
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
    console.log("\nResumen:");
    console.log(`  roles            ${await Role.countDocuments()}`);
    console.log(`  users            ${await User.countDocuments()}`);
    console.log(`  categories       ${await Category.countDocuments()}`);
    console.log(
      `  products         ${products.length} (activos ${count((p) => !p.deletedAt && p.isActive)}, ` +
        `inactivos ${count((p) => !p.deletedAt && !p.isActive)}, papelera ${count((p) => p.deletedAt)})`
    );
    console.log(`  productvariants  ${await ProductVariant.countDocuments()}`);
    console.log(`  images           ${await Image.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el seed:", error.message ?? error);
    process.exit(1);
  }
}

seedDatabase();
