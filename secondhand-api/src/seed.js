import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { CATEGORY_STATUS } from "./constants/category.constants.js";
import { IMAGE_KIND, IMAGE_OWNER, IMAGE_STATUS } from "./constants/image.constants.js";
import { PERMISSIONS, ROLE } from "./constants/role.constants.js";
import { PROFILE_FIELDS, USER_STATUS } from "./constants/user.constants.js";
import { Category } from "./models/category.model.js";
import { Image } from "./models/image.model.js";
import { Product } from "./models/product.model.js";
import { ProductVariant } from "./models/productVariant.model.js";
import { Profile } from "./models/profile.model.js";
import { RefreshToken } from "./models/refreshToken.model.js";
import { RevokedToken } from "./models/revokedToken.model.js";
import { Role } from "./models/role.model.js";
import { Question } from "./models/question.model.js";
import { Report } from "./models/report.model.js";
import { Review } from "./models/review.model.js";
import { Sale } from "./models/sale.model.js";
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

/*
 * ---------- Actividad de ejemplo: ventas, valoraciones, preguntas y una denuncia ----------
 *
 * Para enseñar el perfil público con medias, barras y el resumen de la IA (que necesita al menos 3 comentarios), y
 * para probar en vivo lo que queda pendiente. Se inserta directamente (con fechas del pasado), como el resto del seed.
 *
 * Las ventas antiguas son de anuncios que ya se vendieron y se retiraron (SOLD_LISTINGS, en la papelera): así hay
 * historial sin marcar como vendido medio catálogo. La venta guarda su copia (snapshot), como las de verdad.
 */
const SOLD_LISTINGS = [
  { key: "bolso", title: "Bolso de piel marrón", basePrice: 35, category: "otros", seller: "lucia", photo: 1062 },
  { key: "lampara", title: "Lámpara de mesa nórdica", basePrice: 25, category: "hogar", seller: "lucia", photo: 1080 },
  { key: "botas", title: "Botas de montaña talla 38", basePrice: 40, category: "ropa", seller: "lucia", photo: 103 },
  { key: "cocina", title: "Libro de cocina mediterránea", basePrice: 12, category: "libros", seller: "lucia", photo: 24 },
  { key: "estatica", title: "Bicicleta estática plegable", basePrice: 90, category: "deportes", seller: "lucia", photo: 106 },
  { key: "cafe", title: "Juego de café de porcelana", basePrice: 30, category: "hogar", seller: "lucia", photo: 225 },
  { key: "sony", title: "Auriculares Sony WH-1000XM4", basePrice: 180, category: "electronica", seller: "juan", photo: 3 },
  { key: "teclado", title: "Teclado mecánico Keychron K2", basePrice: 70, category: "ordenadores", seller: "juan", photo: 0 },
  { key: "monitor", title: "Monitor Dell de 24 pulgadas", basePrice: 95, category: "ordenadores", seller: "juan", photo: 2 },
  { key: "carretera", title: "Bicicleta de carretera talla M", basePrice: 320, category: "deportes", seller: "juan", photo: 1043 },
  { key: "router", title: "Router WiFi 6 TP-Link", basePrice: 45, category: "electronica", seller: "juan", photo: 48 },
  { key: "jbl", title: "Altavoz JBL Flip 5", basePrice: 60, category: "electronica", seller: "carlos", photo: 96 },
];

/** Una valoración: nota general, criterios (al vendedor también "asDescribed") y comentario opcional. */
const stars = (rating, asDescribed, communication, punctuality, comment) => ({
  rating,
  criteria: { ...(asDescribed !== null && { asDescribed }), communication, punctuality },
  ...(comment && { comment }),
});
const toBuyer = (rating, comment) => stars(rating, null, rating, rating, comment);

/**
 * Ventas confirmadas y valoradas por los dos lados (ya públicas). `listing`: un anuncio vendido de SOLD_LISTINGS o
 * `{ slug, variant }` de uno del catálogo que ya estaba vendido. `days`: hace cuántos días se confirmó.
 * Lucía queda con 6 comentarios y Juan con 5: los dos tienen resumen de la IA. La de Pablo (suspendido) sale como
 * «Usuario de Revishop».
 */
const SALES = [
  { listing: "bolso", buyer: "juan", days: 60, toSeller: stars(5, 5, 5, 5, "Todo perfecto: el bolso estaba como en las fotos y Lucía fue muy amable."), toBuyer: toBuyer(5, "Puntual y simpático.") },
  { listing: "lampara", buyer: "marta", days: 45, toSeller: stars(5, 5, 5, 4, "Muy buen trato y respondió rápido a todas mis dudas."), toBuyer: toBuyer(5) },
  { listing: "botas", buyer: "carlos", days: 38, toSeller: stars(4, 4, 5, 4, "Las botas estaban bien, algo más gastadas de lo que parecía, pero a buen precio."), toBuyer: toBuyer(4) },
  { listing: "cocina", buyer: "pablo", days: 30, toSeller: stars(5, 5, 5, 5, "Libro impecable y entrega rápida."), toBuyer: toBuyer(5) },
  {
    listing: "estatica",
    buyer: "juan",
    days: 20,
    toSeller: stars(2, 2, 3, 3, "La bicicleta hacía un ruido que no se mencionaba en el anuncio. Eso sí, Lucía se ofreció a revisarla."),
    toBuyer: toBuyer(4),
    reply: "Gracias por avisar, Juan. No lo había notado; quedamos en revisarla juntos.",
  },
  { listing: { slug: "chaqueta-north-face-thermoball", variant: "S" }, buyer: "marta", days: 10, toSeller: stars(5, 5, 4, 5, "La chaqueta llegó como nueva. Repetiría sin dudarlo."), toBuyer: toBuyer(5) },
  { listing: "cafe", buyer: "carlos", days: 6, toSeller: stars(4, 4, 4, 4), toBuyer: toBuyer(5) },
  { listing: "sony", buyer: "lucia", days: 50, toSeller: stars(5, 5, 5, 5, "Auriculares perfectos y con su caja. Juan es muy serio."), toBuyer: toBuyer(5, "Pago y recogida sin problemas.") },
  { listing: "teclado", buyer: "marta", days: 40, toSeller: stars(4, 4, 4, 3, "Buen teclado, aunque tardó un par de días en contestar."), toBuyer: toBuyer(4) },
  {
    listing: "monitor",
    buyer: "carlos",
    days: 25,
    toSeller: stars(3, 3, 4, 3, "El monitor tiene un píxel muerto que no se veía en las fotos. Por lo demás, bien."),
    toBuyer: toBuyer(5),
    reply: "Tienes razón, se me pasó. Por eso te rebajé el precio al final.",
  },
  { listing: "carretera", buyer: "lucia", days: 15, toSeller: stars(5, 5, 5, 5, "Bici revisada como decía el anuncio. Trato excelente."), toBuyer: toBuyer(5) },
  { listing: "router", buyer: "marta", days: 8, toSeller: stars(5, 5, 5, 4, "Router como nuevo; quedamos en la estación sin problemas."), toBuyer: toBuyer(4) },
  { listing: { slug: "macbook-air-13-pulgadas" }, buyer: "carlos", days: 35, toSeller: stars(5, 5, 5, 5, "El MacBook funciona perfecto y la batería aguanta muy bien."), toBuyer: toBuyer(5) },
  { listing: { slug: "trilogia-el-senor-de-los-anillos" }, buyer: "lucia", days: 28, toSeller: stars(4, 4, 4, 5, "Libros en buen estado, con algún subrayado."), toBuyer: toBuyer(5) },
];

/**
 * Preguntas en anuncios del catálogo. `answerAfter`: minutos que tardó el vendedor en responder (el "suele responder
 * en…"); sin él, queda sin responder (sale en Mi actividad del vendedor).
 */
const QUESTIONS = [
  { product: "raqueta-de-padel-bullpadel-vertex", asker: "marta", days: 5, text: "¿La funda es la original?", answer: "Sí, es la funda original de Bullpadel.", answerAfter: 40 },
  { product: "raqueta-de-padel-bullpadel-vertex", asker: "carlos", days: 1, text: "¿Aceptarías 80 €?" },
  { product: "iphone-13-pro", asker: "lucia", days: 9, text: "¿Qué porcentaje de batería tiene?", answer: "Al 89 %. Si quieres te paso una captura.", answerAfter: 120 },
  { product: "iphone-13-pro", asker: "carlos", days: 7, text: "¿Tiene algún golpe en los bordes?", answer: "Ninguno, siempre ha ido con funda.", answerAfter: 300 },
  { product: "iphone-13-pro", asker: "marta", days: 2, text: "¿Lo envías a Zaragoza?" },
  { product: "mesa-escritorio-ikea-malm", asker: "juan", days: 4, text: "¿Qué medidas tiene exactamente?", answer: "140 x 65 cm, la de dos cajones.", answerAfter: 60 },
];

// Las sesiones (refresh_tokens) y la blacklist (revoked_tokens) también se vacían: los usuarios se crean de nuevo.
// Las ventas, valoraciones, denuncias y preguntas, igual: apuntan a usuarios y variantes que el seed vuelve a crear con
// otros ids. Después se vuelven a crear las de ejemplo (seedActivity).
const MODELS = [Role, User, Profile, Category, Product, ProductVariant, Image, RevokedToken, RefreshToken, Sale, Review, Report, Question];

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
    // Cada usuario nace con su perfil, como en el panel: lo que es de perfil va a Profile.
    const profile = Object.fromEntries(PROFILE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
    const account = Object.fromEntries(Object.entries(data).filter(([field]) => !PROFILE_FIELDS.includes(field)));
    users[key] = await User.create({
      ...account,
      roleId: roles[role]._id,
      passwordHash,
      status,
      emailVerifiedAt: status === USER_STATUS.VERIFIED ? new Date() : null,
    });
    await Profile.create({ ...profile, userId: users[key]._id });
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

/** El avatar es del perfil, no de la cuenta. */
async function seedAvatars(users) {
  for (const { key, avatar } of USERS) {
    const user = users[key];
    const profile = await Profile.findOne({ userId: user._id });
    await Image.create({
      ownerType: IMAGE_OWNER.PROFILE,
      ownerId: profile._id,
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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WITH_DELETED = { withDeleted: true };

/** Fechas del pasado: `timestamps` pone "ahora" al crear, así que se corrigen después (en la colección, a mano). */
const backdate = (Model, id, createdAt) => Model.collection.updateOne({ _id: id }, { $set: { createdAt, updatedAt: createdAt } });

/** Un anuncio que ya se vendió y se retiró: en la papelera, con su foto y su única variante vendida. */
async function seedSoldListing(spec, users, categories, soldAt) {
  const { key: _key, photo: photoId, category, seller, ...data } = spec;
  const deletedAt = new Date(soldAt.getTime() + DAY_MS);
  const product = await Product.create({
    ...data,
    description: `${data.title}. Vendido y retirado.`,
    condition: "bueno",
    location: USERS.find((u) => u.key === seller).location,
    categoryId: categories[category]._id,
    sellerId: users[seller]._id,
    isActive: false,
    deletedAt,
  });
  await seedVariants(product, { status: "vendido" });
  await seedProductImages(product, [{ url: photo(photoId), alt: data.title }]);
  await productService.recalculateStatus(product._id);
  await cascadeSoftDelete(product._id, deletedAt);
  return product;
}

/** La copia de lo vendido que guarda la venta (como hace sale.service al registrarla). */
async function snapshotOf(product, variant) {
  const image = await Image.findOne({ ownerType: IMAGE_OWNER.PRODUCT, ownerId: product._id, isPrimary: true }).setOptions(WITH_DELETED);
  return {
    title: product.title,
    slug: product.slug,
    variantLabel: variant.options.length ? variant.options.map((o) => o.value).join(" · ") : null,
    price: variant.price ?? product.basePrice,
    imageUrl: image?.url ?? null,
  };
}

/** Una venta confirmada hace `days` días (registrada el día antes). Devuelve la venta. */
async function seedSale({ product, variant, buyer, confirmedAt, previousVariantStatus = "disponible", reviewWindowEndsAt }) {
  const createdAt = new Date(confirmedAt.getTime() - DAY_MS);
  const sale = await Sale.create({
    productId: product._id,
    variantId: variant._id,
    sellerId: product.sellerId,
    buyerId: buyer._id,
    snapshot: await snapshotOf(product, variant),
    previousVariantStatus,
    status: "confirmed",
    expiresAt: new Date(createdAt.getTime() + 7 * DAY_MS),
    confirmedAt,
    reviewWindowEndsAt: reviewWindowEndsAt ?? new Date(confirmedAt.getTime() + 72 * HOUR_MS),
  });
  await backdate(Sale, sale._id, createdAt);
  return sale;
}

/** Una valoración de `reviewer` a `reviewee` sobre la venta, pública desde `visibleAt`. */
async function seedReview(sale, { reviewer, reviewee, revieweeRole, review, createdAt, visibleAt, reply }) {
  const created = await Review.create({
    saleId: sale._id,
    reviewerId: reviewer._id,
    revieweeId: reviewee._id,
    revieweeRole,
    ...review,
    comment: review.comment ?? null,
    reply: reply ? { text: reply, createdAt: new Date(visibleAt.getTime() + 3 * HOUR_MS) } : null,
    snapshot: { productTitle: sale.snapshot.title, productSlug: sale.snapshot.slug },
    visibleAt,
  });
  await backdate(Review, created._id, createdAt);
  return created;
}

/**
 * Ventas con sus valoraciones, preguntas, una denuncia y dos cosas pendientes para enseñar en vivo con Lucía:
 * - una compra pendiente de confirmar (Juan le registra el LEGO);
 * - una venta confirmada ayer en la que Carlos ya la ha valorado y ella no (sistema ciego: aún no se ve).
 */
async function seedActivity(users, categories) {
  const listings = {};
  for (const spec of SOLD_LISTINGS) {
    const sale = SALES.find((item) => item.listing === spec.key);
    // El del altavoz se vende ayer (lo de la demo); el resto, el día de su venta.
    const soldAt = sale ? new Date(Date.now() - sale.days * DAY_MS) : new Date(Date.now() - DAY_MS);
    listings[spec.key] = await seedSoldListing(spec, users, categories, soldAt);
  }
  const variantOf = async (product, label) => {
    const variants = await ProductVariant.find({ productId: product._id }).setOptions(WITH_DELETED);
    return label ? variants.find((v) => v.options.some((o) => o.value === label)) : variants[0];
  };

  const sales = [];
  const reviews = [];
  for (const spec of SALES) {
    const product = typeof spec.listing === "string" ? listings[spec.listing] : await Product.findOne({ slug: spec.listing.slug });
    const variant = await variantOf(product, spec.listing.variant);
    const seller = Object.values(users).find((u) => String(u._id) === String(product.sellerId));
    const buyer = users[spec.buyer];
    const confirmedAt = new Date(Date.now() - spec.days * DAY_MS);
    const sale = await seedSale({ product, variant, buyer, confirmedAt });
    // El comprador valora al día siguiente y el vendedor unas horas después: entonces se publican las dos.
    const buyerAt = new Date(confirmedAt.getTime() + DAY_MS);
    const visibleAt = new Date(buyerAt.getTime() + 6 * HOUR_MS);
    reviews.push(
      await seedReview(sale, { reviewer: buyer, reviewee: seller, revieweeRole: "seller", review: spec.toSeller, createdAt: buyerAt, visibleAt, reply: spec.reply }),
    );
    await seedReview(sale, { reviewer: seller, reviewee: buyer, revieweeRole: "buyer", review: spec.toBuyer, createdAt: visibleAt, visibleAt });
    sales.push(sale);
  }

  // Demo 1: Carlos le vendió ayer el altavoz a Lucía y ya la ha valorado; ella no (ciega hasta que valore o pasen 72 h).
  const jblConfirmed = new Date(Date.now() - DAY_MS);
  const jblWindow = new Date(jblConfirmed.getTime() + 72 * HOUR_MS);
  const jbl = await seedSale({ product: listings.jbl, variant: await variantOf(listings.jbl), buyer: users.lucia, confirmedAt: jblConfirmed, reviewWindowEndsAt: jblWindow });
  await seedReview(jbl, {
    reviewer: users.carlos,
    reviewee: users.lucia,
    revieweeRole: "buyer",
    review: toBuyer(5, "Compradora de diez: puntual y muy simpática."),
    createdAt: new Date(jblConfirmed.getTime() + 2 * HOUR_MS),
    visibleAt: jblWindow,
  });

  // Demo 2: Juan le ha registrado a Lucía el LEGO (estaba reservado) y ella aún no lo ha confirmado.
  const lego = await Product.findOne({ slug: "lego-star-wars-halcon-milenario" });
  const legoVariant = await variantOf(lego);
  const legoCreated = new Date(Date.now() - 6 * HOUR_MS);
  const pending = await Sale.create({
    productId: lego._id,
    variantId: legoVariant._id,
    sellerId: lego.sellerId,
    buyerId: users.lucia._id,
    snapshot: await snapshotOf(lego, legoVariant),
    previousVariantStatus: legoVariant.status,
    status: "pending",
    expiresAt: new Date(legoCreated.getTime() + 7 * DAY_MS),
  });
  await backdate(Sale, pending._id, legoCreated);
  await ProductVariant.updateOne({ _id: legoVariant._id }, { status: "vendido" });
  await productService.recalculateStatus(lego._id);

  // Preguntas (respondidas en `answerAfter` minutos, o sin responder).
  for (const spec of QUESTIONS) {
    const product = await Product.findOne({ slug: spec.product });
    const createdAt = new Date(Date.now() - spec.days * DAY_MS);
    const question = await Question.create({
      productId: product._id,
      sellerId: product.sellerId,
      askerId: users[spec.asker]._id,
      text: spec.text,
      answer: spec.answer ? { text: spec.answer, answeredAt: new Date(createdAt.getTime() + spec.answerAfter * 60 * 1000), answeredBy: product.sellerId } : null,
    });
    await backdate(Question, question._id, createdAt);
  }

  // Una denuncia abierta para el panel: Lucía denuncia la de 2 estrellas de Juan (el admin decidirá).
  const lowReview = reviews.find((review) => review.rating === 2);
  await Report.create({ targetType: "review", targetId: lowReview._id, reporterId: users.lucia._id, reason: "no_tiene_que_ver", note: "Ya lo arreglamos en persona." });
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
    await seedActivity(users, categories);

    const count = (filter) => products.filter(filter).length;
    // Totales con la papelera incluida (el plugin de soft delete la oculta por defecto).
    const total = (Model) => Model.countDocuments().setOptions({ withDeleted: true });
    console.log("\nResumen:");
    console.log(`  roles            ${await total(Role)}`);
    console.log(`  users            ${await total(User)}`);
    console.log(`  profiles         ${await total(Profile)}`);
    console.log(`  categories       ${await total(Category)}`);
    console.log(
      `  products         ${products.length} (activos ${count((p) => !p.deletedAt && p.isActive)}, ` +
        `inactivos ${count((p) => !p.deletedAt && !p.isActive)}, papelera ${count((p) => p.deletedAt)})`
    );
    console.log(`  + vendidos       ${SOLD_LISTINGS.length} anuncios ya vendidos y retirados (papelera), con su venta`);
    console.log(`  productvariants  ${await total(ProductVariant)}`);
    console.log(`  images           ${await total(Image)}`);
    console.log(`  sales            ${await total(Sale)} (confirmadas ${await Sale.countDocuments({ status: "confirmed" })}, pendientes ${await Sale.countDocuments({ status: "pending" })})`);
    console.log(`  reviews          ${await total(Review)}`);
    console.log(`  questions        ${await total(Question)} (sin responder ${await Question.countDocuments({ answer: null })})`);
    console.log(`  reports          ${await total(Report)}`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el seed:", error.message ?? error);
    process.exit(1);
  }
}

seedDatabase();
