// Piezas comunes de los comandos de la raíz (npm run dev, seed y check). Solo usan Node, sin dependencias:
// funcionan recién clonado el repositorio, antes de instalar nada.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";

// ── Los servicios ──

/**
 * Lo que arranca `npm run dev`. `ready` es una URL que responde cuando el servicio ya atiende; `links` es lo que
 * sale en el resumen. El puerto se puede cambiar con DEV_PORT_<NOMBRE> (p. ej. para levantar una segunda copia
 * en otros puertos sin parar la primera); lo normal es no tocarlo.
 */
function service({ name, dir, command, port, readyPath, color, links, portFlag = false }) {
  const finalPort = Number(process.env[`DEV_PORT_${name.toUpperCase()}`] ?? port);
  const base = `http://localhost:${finalPort}`;
  return {
    name,
    dir,
    // ng serve no lee PORT: el puerto va como argumento.
    command: portFlag ? `${command} -- --port ${finalPort}` : command,
    port: finalPort,
    ready: `${base}${readyPath}`,
    color,
    links: links(base),
  };
}

export const SERVICES = {
  api: service({
    name: "api",
    dir: "secondhand-api",
    command: "npm run dev",
    port: 3000,
    // La API no tiene /health: una lectura pública y barata de la tienda.
    readyPath: "/api/shop/categories",
    color: 36,
    links: (base) => [["API", `${base}/api`, `Swagger: ${base}/api/docs`]],
  }),
  ia: service({
    name: "ia",
    dir: "secondhand-ai",
    command: "npm run dev",
    port: 3001,
    readyPath: "/api/ai/health",
    color: 35,
    links: (base) => [["IA", `${base}/api/ai/health`, "Asistente de compra y de anuncio (sin base de datos)"]],
  }),
  gateway: service({
    name: "gateway",
    dir: "secondhand-gateway",
    command: "npm run dev",
    port: 4000,
    readyPath: "/health",
    color: 34,
    links: (base) => [["Gateway", `${base}/api`, "Lo que usa el front: /api/ai → IA y el resto de /api → API"]],
  }),
  front: service({
    name: "front",
    dir: "secondhand-front",
    command: "npm start",
    port: 4200,
    readyPath: "/",
    color: 32,
    portFlag: true,
    links: (base) => [
      ["Tienda", base, "Home, Shop y fichas"],
      ["Panel", `${base}/admin`, "admin@revishop.test (contraseña: SEED_DEFAULT_PASSWORD del .env de la API)"],
    ],
  }),
};

/** `npm run dev -- ai` también vale para la IA, y `gw` para el gateway. */
export const ALIASES = { ai: "ia", web: "front", gw: "gateway" };

export const dirOf = (svc) => path.join(ROOT, svc.dir);

// ── Colores y mensajes ──

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));
export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const dim = paint(2);
export const bold = paint(1);
export const colored = (code, text) => paint(code)(text);
export const stripColors = (text) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

export const title = (text) => console.log(`\n${bold(text)}`);
export const ok = (text) => console.log(`${green("✓")} ${text}`);
export const fail = (text) => console.log(`${red("✗")} ${text}`);
export const warn = (text) => console.log(`${yellow("!")} ${yellow(text)}`);
export const info = (text) => console.log(`${dim("·")} ${text}`);

/**
 * ¿Es una línea de error? Lo justo para pintarla en rojo: "Error: …", "[ERROR]", "npm ERR!", "EADDRINUSE"…
 * y no frases como "0 errors" ni nuestros propios mensajes de error de validación en los logs de acceso.
 */
export function looksLikeError(line) {
  const text = stripColors(line);
  if (/\b0 (errors?|failed)\b/i.test(text)) return false;
  return /\b[A-Z]\w*Error\b:|\[ERROR\]|\bERR!|✘|\bEADDRINUSE\b|\bECONNREFUSED\b|Failed running|Excepción no capturada|Configuración de entorno no válida|ya está en uso|Database connection failed/i.test(
    text,
  );
}

// ── Procesos ──

/**
 * Arranca un comando en la carpeta de un servicio. Con `onLine`, cada línea de su salida pasa por ahí (para
 * ponerle el prefijo); sin él, la salida va directa a esta terminal.
 */
export function run(command, { cwd = ROOT, env = {}, onLine } = {}) {
  const child = spawn(command, {
    cwd,
    shell: true,
    // En Linux y macOS, en su propio grupo de procesos para poder pararlo entero; en Windows se usa taskkill /T.
    detached: !IS_WINDOWS,
    windowsHide: true,
    // Sin entrada: ningún servicio se queda esperando una respuesta por teclado (p. ej. "¿usar otro puerto?").
    stdio: onLine ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...env },
  });
  if (onLine) {
    for (const stream of [child.stdout, child.stderr]) {
      let rest = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        const lines = (rest + chunk).split(/\r?\n/);
        rest = lines.pop();
        for (const line of lines) onLine(line);
      });
      stream.on("end", () => rest && onLine(rest));
    }
  }
  return child;
}

/** Espera a que termine un proceso y devuelve su código de salida. */
export const finished = (child) => new Promise((resolve) => child.on("close", (code) => resolve(code ?? 1)));

/** Para un proceso y todo lo que haya arrancado (npm → node --watch → node, ng serve → esbuild…). */
export function stopTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (IS_WINDOWS) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // Ya había terminado.
    }
  }
}

// ── Comprobaciones ──

/** ¿Escucha algo en ese puerto? Se mira en IPv4 y en IPv6: `ng serve` a veces solo escucha en `::1`. */
export async function portInUse(port, hosts = ["127.0.0.1", "::1"]) {
  const probe = (host) =>
    new Promise((resolve) => {
      const socket = net.connect({ port, host });
      socket.setTimeout(700);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("error", () => resolve(false));
    });
  return (await Promise.all(hosts.map(probe))).some(Boolean);
}

/** Lee un `.env` sencillo (CLAVE=valor). Solo para comprobaciones: nunca se imprimen los valores secretos. */
export function readEnvFile(file) {
  if (!existsSync(file)) return null;
  const values = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

/** La URI de MongoDB que usará la API: la del entorno si está (manda sobre el .env, como en dotenv) o la del .env. */
export function mongoUri() {
  return process.env.MONGODB_URI || readEnvFile(path.join(dirOf(SERVICES.api), ".env"))?.MONGODB_URI || null;
}

/** La URI sin usuario ni contraseña, para enseñarla. */
export const safeUri = (uri) => uri?.replace(/\/\/[^@/]*@/, "//***@") ?? "(sin MONGODB_URI)";

/**
 * ¿Responde MongoDB? Solo para `mongodb://host:puerto`; con `mongodb+srv://` (Atlas) el host real lo decide
 * el DNS, así que no se comprueba (devuelve null).
 */
export async function mongoUp(uri = mongoUri()) {
  if (!uri) return false;
  if (uri.startsWith("mongodb+srv://")) return null;
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^:/,?]+)(?::(\d+))?/.exec(uri);
  if (!match) return false;
  const host = match[1] === "localhost" ? ["127.0.0.1", "::1"] : [match[1]];
  return portInUse(Number(match[2] ?? 27017), host);
}

/** Lo que pide el proyecto: Angular 18 admite 18.19+, 20.11+ y 22+, pero el gateway (http-proxy-middleware 4) pide 22.15+ o 24+. */
export const NODE_REQUIREMENT = "22.15 o más (o 24+)";

export function nodeIsSupported(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  return major >= 24 || (major === 22 && minor >= 15);
}

export const hasModules = (svc) => existsSync(path.join(dirOf(svc), "node_modules"));

/** Instala las dependencias de los servicios que no las tienen. false si alguna instalación falla. */
export async function installMissing(services) {
  for (const svc of services) {
    if (hasModules(svc)) continue;
    info(`${svc.dir} no tiene node_modules: npm install…`);
    const code = await finished(run("npm install", { cwd: dirOf(svc) }));
    if (code !== 0) {
      fail(red(`npm install en ${svc.dir} ha fallado (código ${code}). Revisa el error de arriba.`));
      return false;
    }
    ok(`Dependencias de ${svc.dir} instaladas`);
  }
  return true;
}

/** Los servicios que se piden por argumento (`api ia`), o todos. Sale con un mensaje si alguno no existe. */
export function selectServices(args) {
  const names = args.filter((arg) => !arg.startsWith("-")).map((arg) => ALIASES[arg] ?? arg);
  const unknown = names.filter((name) => !SERVICES[name]);
  if (unknown.length) {
    fail(`No sé qué es ${unknown.map((name) => `"${name}"`).join(", ")}. Puedes elegir: ${Object.keys(SERVICES).join(", ")}.`);
    process.exit(1);
  }
  return (names.length ? [...new Set(names)] : Object.keys(SERVICES)).map((name) => SERVICES[name]);
}
