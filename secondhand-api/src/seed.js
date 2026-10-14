import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { Product } from "./models/product.model.js";

dotenv.config();

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const photo = (id) => `https://picsum.photos/id/${id}/800/600`;

const activeProducts = [
  {
    title: "iPhone 13 Pro 256GB",
    description:
      "Estado impecable, con caja original y cargador. Sin arañazos.",
    price: 650,
    category: "electronica",
    condition: "como_nuevo",
    location: "Madrid",
    images: [],
    seller: "Juan",
  },
  {
    title: "Chaqueta North Face Thermoball",
    description: "Talla M, usada 2 veces. Color negro.",
    price: 85,
    category: "ropa",
    condition: "como_nuevo",
    location: "Barcelona",
    seller: "Maria",
  },
  {
    title: "Bicicleta de montaña BTT 29 pulgadas",
    description:
      "Cuadro aluminio, 27 velocidades, frenos de disco hidraulicos.",
    price: 320,
    category: "vehiculos",
    condition: "bueno",
    location: "Valencia",
    seller: "Pedro",
  },
  {
    title: "Mesa escritorio IKEA MALM",
    description: "140x65cm, color roble, en perfecto estado. Desmontada.",
    price: 45,
    category: "hogar",
    condition: "bueno",
    location: "Sevilla",
    seller: "Ana",
  },
  {
    title: "PlayStation 5 Digital Edition",
    description: "Con 2 mandos y 3 juegos digitales. Funciona perfectamente.",
    price: 380,
    category: "electronica",
    condition: "bueno",
    location: "Bilbao",
    seller: "Carlos",
  },
  {
    title: "Cámara analógica telemétrica años 60",
    description: "Revisada y funcionando. Ideal para colección o para disparar carrete.",
    price: 140,
    category: "electronica",
    condition: "bueno",
    location: "Granada",
    images: [photo(250)],
    seller: "Lucía",
    status: "reservado",
  },
  {
    title: "MacBook Air 13 pulgadas",
    description: "Batería al 82 %, teclado perfecto. Se entrega formateado.",
    price: 420,
    category: "electronica",
    condition: "aceptable",
    location: "Zaragoza",
    images: [photo(0), photo(180)],
    seller: "Marta",
    status: "vendido",
  },
  {
    title: "Raqueta de pádel Bullpadel Vertex",
    description: "Sin estrenar, con funda original.",
    price: 95,
    category: "deportes",
    condition: "nuevo",
    location: "Málaga",
    seller: "Sergio",
  },
];

const inactiveProducts = [
  {
    title: "Despertador vintage de cuerda",
    description: "Funciona, pero el cristal tiene una marca. Pieza decorativa.",
    price: 18,
    category: "hogar",
    condition: "mejorable",
    location: "Valladolid",
    images: [photo(175)],
    seller: "Elena",
    isActive: false,
  },
  {
    title: "Taza de cerámica coleccionable",
    description: "Edición ilustrada, nunca usada.",
    price: 12,
    category: "hogar",
    condition: "nuevo",
    location: "Cádiz",
    images: [photo(30)],
    seller: "Pablo",
    isActive: false,
  },
  {
    title: "LEGO Star Wars Halcón Milenario",
    description: "Completo, con instrucciones. Caja algo gastada.",
    price: 110,
    category: "juguetes",
    condition: "como_nuevo",
    location: "Murcia",
    seller: "Inés",
    status: "reservado",
    isActive: false,
  },
];

const trashedProducts = [
  {
    title: "iPhone SE 64GB",
    description: "Batería nueva. Retirado por el vendedor.",
    price: 90,
    category: "electronica",
    condition: "aceptable",
    location: "Alicante",
    images: [photo(160)],
    seller: "Raúl",
    isActive: false,
    deletedAt: daysAgo(2),
  },
  {
    title: "Pack de auriculares, reloj y cartera",
    description: "Lote de accesorios en buen estado.",
    price: 60,
    category: "otros",
    condition: "bueno",
    location: "Toledo",
    images: [photo(26)],
    seller: "Nuria",
    status: "vendido",
    isActive: false,
    deletedAt: daysAgo(9),
  },
  {
    title: "Colección Harry Potter tapa dura",
    description: "Los 7 libros, edición Salamandra.",
    price: 70,
    category: "libros",
    condition: "como_nuevo",
    location: "Oviedo",
    seller: "Jorge",
    isActive: false,
    deletedAt: daysAgo(21),
  },
];

async function insertAll(items) {
  const created = [];
  for (const data of items) created.push(await Product.create(data));
  return created;
}

async function seedDatabase() {
  try {
    await connectDB();

    await Product.deleteMany({});
    console.log("Coleccion de productos limpiada.");

    const groups = {
      Activos: await insertAll(activeProducts),
      Inactivos: await insertAll(inactiveProducts),
      Papelera: await insertAll(trashedProducts),
    };

    for (const [name, products] of Object.entries(groups)) {
      console.log(`\n${name} (${products.length}):`);
      for (const p of products) console.log(`  ${p.title} -> ${p.slug}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el seed:", error);
    process.exit(1);
  }
}

seedDatabase();
