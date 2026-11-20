// npm run dev: la API, el servicio de IA, el API Gateway y el front en una sola terminal.
//
//   npm run dev               todos
//   npm run dev -- api ia     solo esos (también valen "ai" y "gw")
//
// Antes de arrancar comprueba lo que suele fallar (Node, MongoDB, los .env, las dependencias y los puertos) y
// dice cómo arreglarlo; si algo impide arrancar, no arranca nada. Cada línea lleva el nombre de quien la
// escribe y los errores salen en rojo. Si uno se cae, se avisa con sus últimas líneas y los demás siguen.
// Cuando todos responden, un resumen con las direcciones. Ctrl+C lo para todo.
import path from "node:path";
import {
  SERVICES,
  bold,
  colored,
  dim,
  dirOf,
  fail,
  green,
  info,
  installMissing,
  looksLikeError,
  mongoUp,
  mongoUri,
  NODE_REQUIREMENT,
  nodeIsSupported,
  ok,
  portInUse,
  readEnvFile,
  red,
  run,
  safeUri,
  selectServices,
  stopTree,
  title,
  warn,
} from "./lib.mjs";

const READY_TIMEOUT_MS = 180_000;
const TAIL_LINES = 15;

const selected = selectServices(process.argv.slice(2));
const has = (svc) => selected.includes(svc);
const { api, ia, gateway, front } = SERVICES;

// ── Comprobaciones ──

title("Comprobando…");
const problems = [];

if (nodeIsSupported()) ok(`Node ${process.versions.node}`);
else problems.push(`Node ${process.versions.node} es antiguo: el proyecto pide Node ${NODE_REQUIREMENT}. Instala la LTS de https://nodejs.org`);

if (has(api)) {
  const env = readEnvFile(path.join(dirOf(api), ".env"));
  if (!env) {
    problems.push("Falta secondhand-api/.env. Copia la plantilla: copy secondhand-api\\.env.example secondhand-api\\.env y rellena MONGODB_URI, JWT_SECRET y SEED_DEFAULT_PASSWORD.");
  } else {
    ok("secondhand-api/.env existe");
    if (!(process.env.JWT_SECRET || env.JWT_SECRET)) problems.push("Falta JWT_SECRET en secondhand-api/.env (la API no arranca sin ella; el .env.example dice cómo generarla).");
  }

  const uri = mongoUri();
  const up = await mongoUp(uri);
  if (up === null) info(`MongoDB en Atlas (${safeUri(uri)}): no se comprueba antes de arrancar`);
  else if (up) ok(`MongoDB responde (${safeUri(uri)})`);
  else
    problems.push(
      `MongoDB no responde (${safeUri(uri)}). Arráncalo: en Windows, "net start MongoDB" en una terminal de administrador, o abre MongoDB Compass y comprueba que conecta.`,
    );
}

// La IA arranca sin .env (con todo por defecto), pero entonces el asistente responde "desactivado": se avisa y sigue.
if (has(ia)) {
  const env = readEnvFile(path.join(dirOf(ia), ".env"));
  if (!env) {
    warn("secondhand-ai no tiene .env: arranca, pero el asistente estará desactivado. Copia la plantilla (copy secondhand-ai\\.env.example secondhand-ai\\.env) y pon tu GROQ_API_KEY y AI_MODEL, o AI_PROVIDER=fake.");
  } else {
    const provider = process.env.AI_PROVIDER || env.AI_PROVIDER || "groq";
    const keyName = { groq: "GROQ_API_KEY", openrouter: "OPENROUTER_API_KEY", xai: "XAI_API_KEY" }[provider];
    const model = process.env.AI_MODEL || env.AI_MODEL;
    if (provider === "fake") ok("IA: proveedor fake (respuestas de prueba, sin key)");
    else if (keyName && (process.env[keyName] || env[keyName]) && model) ok(`IA: proveedor ${provider} con ${model}`);
    else warn(`IA: el asistente estará desactivado (falta ${keyName ?? "un proveedor válido"}${model ? "" : " o AI_MODEL"} en secondhand-ai/.env). El resto funciona.`);
  }
  if (!has(api)) warn(`La IA pide la sesión y los productos a la API (puerto ${api.port}): si no está arrancada, responderá 503.`);
}

if (has(gateway) && !(has(api) && has(ia))) {
  const missing = [api, ia].filter((svc) => !has(svc)).map((svc) => `${svc.name} (${svc.port})`);
  warn(`El gateway reparte a ${missing.join(" y ")}, que no se va a arrancar: esas rutas responderán 502.`);
}
if (has(front) && !has(gateway)) warn(`El front solo habla con el gateway (puerto ${gateway.port}): si no está arrancado, la tienda no cargará datos.`);

for (const svc of selected) {
  if (await portInUse(svc.port)) {
    const others = selected.filter((other) => other !== svc).map((other) => other.name);
    problems.push(
      `El puerto ${svc.port} (${svc.name}) está ocupado: ¿ya lo tienes arrancado en otra terminal? Ciérralo${others.length ? `, o arranca solo lo demás: npm run dev -- ${others.join(" ")}` : ""}.`,
    );
  } else {
    ok(`Puerto ${svc.port} libre (${svc.name})`);
  }
}

if (problems.length) {
  console.log("");
  for (const problem of problems) fail(red(problem));
  console.log(`\n${red(bold("No se ha arrancado nada."))} Arregla lo de arriba y vuelve a lanzar ${bold("npm run dev")}.`);
  process.exit(1);
}

if (!(await installMissing(selected))) process.exit(1);

// ── Arrancar ──

const width = Math.max(...selected.map((svc) => svc.name.length));
const prefixOf = (svc) => colored(svc.color, `[${svc.name.padEnd(width)}]`);
const children = new Map();
const tails = new Map(selected.map((svc) => [svc, []]));
const crashed = new Set();
let stopping = false;

function report(svc, reason) {
  console.log(`\n${red(bold(`━━ ${svc.name} ${reason} ━━`))}`);
  for (const line of tails.get(svc)) console.log(red(`   ${line}`));
  const others = selected.filter((other) => other !== svc && children.has(other) && !crashed.has(other));
  console.log(
    `${red(bold("━━"))}${others.length ? ` Los demás siguen: ${others.map((other) => other.name).join(", ")}.` : ""}` +
      ` Arréglalo y guarda: se reinicia solo. Si se ha parado del todo: ${bold(`npm run dev -- ${svc.name}`)}\n`,
  );
}

function printLine(svc, line) {
  const tail = tails.get(svc);
  tail.push(line);
  if (tail.length > TAIL_LINES) tail.shift();
  console.log(`${prefixOf(svc)} ${looksLikeError(line) ? red(line) : line}`);
  // `node --watch` no termina cuando el servidor se cae: lo dice con esta línea y espera a que guardes un cambio.
  if (/Failed running/i.test(line)) {
    crashed.add(svc);
    report(svc, "se ha caído (node --watch espera a que guardes un cambio)");
  } else if (/^Restarting /i.test(line)) {
    crashed.delete(svc);
  }
}

function stopAll() {
  if (stopping) return;
  stopping = true;
  console.log(`\n${dim("Parando…")}`);
  for (const child of children.values()) stopTree(child);
  setTimeout(() => process.exit(0), 600);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

/*
 * Cada servicio con su puerto: un PORT que venga del entorno no puede mandar a dos al mismo sitio.
 * Si se han movido de puerto (DEV_PORT_*), cada uno busca a los demás en el suyo: la IA a la API, el gateway a la
 * API y a la IA, y todos aceptan al front en el suyo.
 */
const moved = (name) => Boolean(process.env[`DEV_PORT_${name.toUpperCase()}`]);
const envFor = (svc) => {
  if (svc === front) return {};
  return {
    PORT: String(svc.port),
    ...(svc === ia && moved("api") ? { CORE_API_URL: `http://localhost:${api.port}/api` } : {}),
    ...(svc === gateway && moved("api") ? { API_URL: `http://localhost:${api.port}` } : {}),
    ...(svc === gateway && moved("ia") ? { AI_URL: `http://localhost:${ia.port}` } : {}),
    ...(moved("front") ? { CORS_ORIGIN: `http://localhost:${front.port}` } : {}),
  };
};

title(`Arrancando ${selected.map((svc) => svc.name).join(", ")}… ${dim("(Ctrl+C para todo)")}`);
for (const svc of selected) {
  const child = run(svc.command, { cwd: dirOf(svc), env: envFor(svc), onLine: (line) => printLine(svc, line) });
  children.set(svc, child);
  child.on("close", (code) => {
    children.delete(svc);
    if (stopping) return;
    crashed.add(svc);
    report(svc, `se ha parado (código ${code ?? "?"})`);
    if (children.size === 0) {
      console.log(red("No queda nada en marcha."));
      process.exit(1);
    }
  });
}

// ── Cuando responden ──

async function waitReady(svc) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS && !stopping) {
    if (!children.has(svc) || crashed.has(svc)) return false;
    try {
      const response = await fetch(svc.ready, { signal: AbortSignal.timeout(2000) });
      if (response.status < 500) return true;
    } catch {
      // Todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

const results = await Promise.all(selected.map(async (svc) => [svc, await waitReady(svc)]));
if (!stopping) {
  console.log(`\n${green(bold("━━ En marcha ━━"))}`);
  // Las direcciones alineadas en columna: el ancho sale de la etiqueta más larga (+1 espacio).
  const labelWidth = Math.max(...results.flatMap(([svc]) => svc.links.map(([label]) => label.length))) + 1;
  for (const [svc, ready] of results) {
    for (const [label, url, note] of svc.links) {
      if (ready) console.log(`   ${green("●")} ${bold(label.padEnd(labelWidth))}${url}   ${dim(note)}`);
      else console.log(`   ${red("●")} ${bold(label.padEnd(labelWidth))}${red("no responde: mira sus líneas en rojo")}`);
    }
  }
  console.log(dim("   Ctrl+C para todo."));
  if (results.every(([, ready]) => ready)) info("Los cambios se recargan solos: no hace falta volver a lanzar nada.\n");
}
