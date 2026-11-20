// npm run check: lo de antes de un commit. No arranca nada ni toca la base de datos.
//   1. La API y la IA no tienen errores de sintaxis (node --check en cada archivo de src/).
//   2. La IA sigue sin acceso a la base de datos (ni mongoose/mongodb en sus dependencias, ni imports de la API).
//   3. El front compila como en producción (npm run build).
// Termina con código 1 si algo falla, y dice qué.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { SERVICES, bold, dim, dirOf, fail, finished, green, installMissing, looksLikeError, ok, red, run, title } from "./lib.mjs";

let broken = false;
const { api, ia, front } = SERVICES;

if (!(await installMissing([api, ia, front]))) process.exit(1);

/** Todos los .js de una carpeta, recursivamente. */
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

// 1 · Sintaxis de la API y la IA
for (const svc of [api, ia]) {
  title(`Sintaxis de ${svc.name} ${dim("(node --check)")}`);
  const files = jsFiles(path.join(dirOf(svc), "src"));
  const errors = [];
  for (const file of files) {
    const lines = [];
    const code = await finished(run(`node --check "${file}"`, { cwd: dirOf(svc), onLine: (line) => lines.push(line) }));
    if (code !== 0) errors.push([path.relative(dirOf(svc), file), lines.filter((line) => line.trim()).slice(0, 6)]);
  }
  if (!errors.length) ok(`${svc.name}: ${files.length} archivos sin errores`);
  else {
    broken = true;
    for (const [file, lines] of errors) {
      fail(red(`${svc.name}: ${file}`));
      for (const line of lines) console.log(red(`   ${line}`));
    }
  }
}

// 2 · La IA sin base de datos (una regla del proyecto: todo lo pide a la API por HTTP)
title("La IA sin acceso a la base de datos");
const aiPackage = JSON.parse(readFileSync(path.join(dirOf(ia), "package.json"), "utf8"));
const aiDeps = Object.keys({ ...aiPackage.dependencies, ...aiPackage.devDependencies });
const dbDeps = aiDeps.filter((dep) => /mongo/i.test(dep));
const apiImports = jsFiles(path.join(dirOf(ia), "src")).filter((file) => /from\s+["'][^"']*secondhand-api/.test(readFileSync(file, "utf8")));
if (!dbDeps.length && !apiImports.length) ok("Sin mongoose/mongodb y sin imports de secondhand-api");
else {
  broken = true;
  if (dbDeps.length) fail(red(`secondhand-ai depende de: ${dbDeps.join(", ")}`));
  for (const file of apiImports) fail(red(`${path.relative(dirOf(ia), file)} importa código de secondhand-api`));
}

// 3 · Build de producción del front
title(`Compilando el front ${dim("(npm run build)")}`);
const lines = [];
const started = Date.now();
const code = await finished(run("npm run build", { cwd: dirOf(front), env: { FORCE_COLOR: "0" }, onLine: (line) => lines.push(line) }));
const seconds = ((Date.now() - started) / 1000).toFixed(0);
if (code === 0) {
  const size = lines.find((line) => /Initial total/.test(line));
  ok(`El front compila en ${seconds} s${size ? dim(`  ${size.replace(/\s+/g, " ").trim()}`) : ""}`);
} else {
  broken = true;
  fail(red("El front no compila"));
  const errors = lines.filter(looksLikeError);
  for (const line of (errors.length ? errors : lines.slice(-20)).slice(0, 40)) console.log(red(`   ${line}`));
}

console.log(broken ? `\n${red(bold("npm run check: hay algo que arreglar"))} (mira lo que sale en rojo).` : `\n${green(bold("npm run check: todo correcto."))}`);
process.exit(broken ? 1 : 0);
