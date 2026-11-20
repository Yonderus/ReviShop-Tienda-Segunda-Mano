// npm run seed: carga los datos de prueba de la API, después de confirmarlo, porque BORRA las colecciones de la
// base de datos que use la API (la de MONGODB_URI).
//
//   npm run seed             pregunta antes
//   npm run seed -- --yes    sin preguntar
import readline from "node:readline/promises";
import { SERVICES, bold, dirOf, fail, finished, installMissing, mongoUp, mongoUri, ok, red, run, safeUri, yellow } from "./lib.mjs";

const api = SERVICES.api;
const uri = mongoUri();

if (!uri) {
  fail(red("No hay MONGODB_URI (ni en el entorno ni en secondhand-api/.env). Copia secondhand-api\\.env.example a .env y rellénalo."));
  process.exit(1);
}
if ((await mongoUp(uri)) === false) {
  fail(red(`MongoDB no responde (${safeUri(uri)}). Arráncalo antes de cargar los datos.`));
  process.exit(1);
}
if (!(await installMissing([api]))) process.exit(1);

if (!process.argv.includes("--yes")) {
  console.log(yellow(`\nEl seed ${bold("borra")} los datos de ${bold(safeUri(uri))} y carga los de prueba.`));
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await prompt.question('¿Seguir? Escribe "si" para confirmar: ')).trim().toLowerCase();
  prompt.close();
  if (answer !== "si" && answer !== "sí") {
    console.log("No se ha tocado nada.");
    process.exit(0);
  }
}

const code = await finished(run("npm run seed", { cwd: dirOf(api) }));
if (code === 0) ok("Datos de prueba cargados. Todos los usuarios usan la contraseña de SEED_DEFAULT_PASSWORD (secondhand-api/.env).");
else fail(red(`El seed ha fallado (código ${code}). Revisa el error de arriba.`));
process.exit(code);
