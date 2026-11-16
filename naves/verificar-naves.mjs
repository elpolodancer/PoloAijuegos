// Ruta: naves/verificar-naves.mjs  (herramienta de desarrollo: NO se sube al service worker)
// Corre los bots de ia-naves.js sobre los niveles y deja anotado en niveles-naves.js (FACIL) cuáles necesitan ser más fáciles.
//   node naves/verificar-naves.mjs                  todos los niveles (1..320) y reescribe FACIL
//   node naves/verificar-naves.mjs 1 40             solo del 1 al 40 (no reescribe FACIL; usa --escribir para forzarlo)
//   node naves/verificar-naves.mjs --solo-base      solo mira si pasan con la dificultad base (facil = 0), sin ajustar
// Para correrlo en Node necesitas un package.json con {"type":"module"} en la carpeta naves/ (o ejecutar con --experimental-default-type=module).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generarNivel, NIVELES, tierDe } from "./niveles-naves.js";
import { verificar } from "./ia-naves.js";

const args = process.argv.slice(2);
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const desde = nums[0] || 1, hasta = nums[1] || NIVELES;
const soloBase = args.includes("--solo-base");
const escribir = args.includes("--escribir") || (!nums.length && !soloBase);
const MAX_FACIL = 10;

const FACIL = {};
let fallos = 0, t0 = Date.now();
console.log("nivel tier facil  ok  nodos retro vidas fugas  seg");
for (let n = desde; n <= hasta; n++) {
  const ts = Date.now();
  let r = null, f = 0;
  for (; f <= (soloBase ? 0 : MAX_FACIL); f++) {
    r = verificar(generarNivel(n, f));
    if (r.ok) break;
  }
  if (!r.ok) { fallos++; }
  else if (f > 0) FACIL[n] = f;
  console.log(String(n).padStart(5), String(tierDe(n)).padStart(4), String(r.ok ? f : "-").padStart(5), r.ok ? " sí" : " NO", String(r.nodos).padStart(6), String(r.retrocesos).padStart(5), String(r.vidas ?? "-").padStart(5), String(r.fugas ?? "-").padStart(5), ((Date.now() - ts) / 1000).toFixed(1).padStart(5));
}
const conAjuste = Object.keys(FACIL).length;
console.log(`\n${hasta - desde + 1} niveles · ${conAjuste} con ajuste · ${fallos} SIN solución · ${((Date.now() - t0) / 1000).toFixed(0)} s`);

if (escribir) {
  const ruta = fileURLToPath(new URL("./niveles-naves.js", import.meta.url));
  let txt = readFileSync(ruta, "utf8");
  const nuevo = "/*FACIL*/ export const FACIL = " + JSON.stringify(FACIL) + ";/*FIN*/";
  txt = txt.replace(/\/\*FACIL\*\/[\s\S]*?\/\*FIN\*\//, nuevo);
  writeFileSync(ruta, txt);
  console.log("FACIL reescrito en niveles-naves.js");
}
process.exit(fallos ? 1 : 0);
