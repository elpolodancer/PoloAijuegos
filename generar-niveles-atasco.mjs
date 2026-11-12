// Ruta: atasco/generar-niveles-atasco.mjs   (SOLO para consola con Node 18+; no se guarda sin internet ni lo usa el juego)
// Bot que HACE y COMPRUEBA los 22 600 niveles. Cada nivel se resuelve con el solucionador por backtracking (logica-atasco.js → resolver):
// solo se queda si tiene solución y sus movimientos mínimos caen en la banda de su clase y tamaño (BANDAS).
//   node generar-niveles-atasco.mjs [desde] [hasta]   hace las etapas desde..hasta (1..226; por defecto todas). Guarda una por una en generados/ y SALTA las ya hechas,
//                                                     así que se puede cortar y seguir. Para ir más rápido abre varias consolas con rangos distintos (1 60, 61 120…).
//   node generar-niveles-atasco.mjs --paralelo[=N]    lo mismo repartido en N procesos (por defecto, uno por núcleo del procesador). Al terminar, haz --unir
//   node generar-niveles-atasco.mjs --unir            junta generados/etapa-*.json en datos-niveles-atasco.js (exige las 226 etapas). Si dos procesos hicieron
//                                                     el mismo tablero, rehace el repetido antes de unir
//   node generar-niveles-atasco.mjs --verificar       vuelve a resolver TODOS los niveles de datos-niveles-atasco.js y revisa el plan completo
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crearRng, resolver, deTexto, claseDeMinimo, planEtapa, mezclaEtapa, ETAPAS_TOTAL, NIVELES_ETAPA, TAMANOS_NIVELES, BANDAS, CLASES, MAX_COCHES } from "./logica-atasco.js";
import { crearContexto, fabricar } from "./generador-atasco.js";

const aqui = path.dirname(fileURLToPath(import.meta.url)), carpeta = path.join(aqui, "generados"), datos = path.join(aqui, "datos-niveles-atasco.js");
const archivo = (s) => path.join(carpeta, "etapa-" + String(s + 1).padStart(3, "0") + ".json");
const leerEtapa = (s) => JSON.parse(fs.readFileSync(archivo(s), "utf8")).niveles;
const arg = process.argv.slice(2);

if (arg[0] === "--unir") {
  const e = [], ctx = crearContexto(); let rehechos = 0;
  for (let s = 0; s < ETAPAS_TOTAL; s++) { if (!fs.existsSync(archivo(s))) { console.error("Falta la etapa " + (s + 1)); process.exit(1); } }
  for (let s = 0; s < ETAPAS_TOTAL; s++) {
    let cambio = false;
    const lineas = leerEtapa(s).map((ln, k) => {
      const tx = ln.split("|")[0];
      if (!ctx.vistos.has(tx)) { ctx.vistos.add(tx); return ln; }
      const p = planEtapa(s)[k], num = s * NIVELES_ETAPA + k + 1, r = fabricar(p.n, p.clase, crearRng((num * 2654435761 + 12345) >>> 0), ctx); // tablero repetido: se rehace
      cambio = true; rehechos++; return r.texto + "|" + r.minimo;
    });
    if (cambio) fs.writeFileSync(archivo(s), JSON.stringify({ etapa: s + 1, niveles: lineas }));
    e.push(lineas.join("\n"));
  }
  if (rehechos) console.log("Se rehicieron " + rehechos + " niveles repetidos");
  fs.writeFileSync(datos, "// Ruta: atasco/datos-niveles-atasco.js — GENERADO por generar-niveles-atasco.mjs --unir. No se edita a mano.\n// ETAPAS[e] = 100 líneas «tablero|movimientos mínimos» (nivel (e*100)+1 … (e*100)+100).\nexport const ETAPAS = " + JSON.stringify(e) + ";\n");
  console.log("Escrito " + datos + " (" + (fs.statSync(datos).size / 1048576).toFixed(2) + " MB)");
} else if (arg[0] === "--verificar") {
  const { ETAPAS } = await import(pathToFileURL(datos).href);
  let mal = 0, total = 0; const vistos = new Set(), porTam = {}, porClase = [0, 0, 0]; let conMacetas = 0;
  const falla = (m) => { if (++mal <= 30) console.log("✗ " + m); };
  if (ETAPAS.length !== ETAPAS_TOTAL) falla("hay " + ETAPAS.length + " etapas y deben ser " + ETAPAS_TOTAL);
  for (let s = 0; s < ETAPAS.length; s++) {
    const lineas = ETAPAS[s].split("\n"), plan = planEtapa(s), hay = [0, 0, 0];
    if (lineas.length !== NIVELES_ETAPA) falla("etapa " + (s + 1) + ": " + lineas.length + " niveles");
    lineas.forEach((ln, k) => {
      const num = s * NIVELES_ETAPA + k + 1, [texto, min] = ln.split("|"), t = deTexto(texto), p = plan[k], r = resolver(t, 2000000);
      total++;
      if (t.n !== p.n) falla("nivel " + num + ": tamaño " + t.n + " y el plan dice " + p.n);
      if (!r) falla("nivel " + num + ": SIN SOLUCIÓN"); else if (r.minimo !== Number(min)) falla("nivel " + num + ": mínimo " + r.minimo + " y el archivo dice " + min);
      const c = claseDeMinimo(t.n, Number(min)); if (c !== p.clase) falla("nivel " + num + ": clase " + c + " y el plan dice " + p.clase);
      if (t.coches.length - 1 > MAX_COCHES) falla("nivel " + num + ": demasiados carros");
      if (t.macetas.some((m) => Math.floor(m / t.n) === t.coches[0].f)) falla("nivel " + num + ": maceta en la fila de salida");
      if (vistos.has(texto)) falla("nivel " + num + ": tablero repetido"); vistos.add(texto);
      hay[c >= 0 ? c : 0]++; porTam[t.n] = (porTam[t.n] || 0) + 1; porClase[c]++; if (t.macetas.length) conMacetas++;
    });
    const m = mezclaEtapa(s); if (hay.join() !== m.join()) falla("etapa " + (s + 1) + ": mezcla " + hay + " y debe ser " + m);
    if (s % 20 === 19) console.log("… etapa " + (s + 1) + "/" + ETAPAS.length);
  }
  console.log(`\n${total} niveles revisados. Tamaños: ${TAMANOS_NIVELES.map((n) => n + "×" + n + "=" + porTam[n]).join(", ")}`);
  console.log(`Clases: ${CLASES.map((c, i) => c + "=" + porClase[i]).join(", ")} · con macetas: ${conMacetas} (${((100 * conMacetas) / total).toFixed(1)} %)`);
  console.log(mal ? "✗ " + mal + " problemas" : "✓ Todo correcto");
  process.exit(mal ? 1 : 0);
} else if (arg[0] && arg[0].startsWith("--paralelo")) {
  const N = Math.max(1, Number(arg[0].split("=")[1]) || os.cpus().length);
  console.log("Lanzando " + N + " procesos…");
  let vivos = N;
  for (let j = 0; j < N; j++) spawn(process.execPath, [fileURLToPath(import.meta.url), "1", String(ETAPAS_TOTAL), "--mod=" + N + "," + j], { stdio: "inherit" })
    .on("exit", () => { if (--vivos === 0) console.log("Listo. Ahora: node generar-niveles-atasco.mjs --unir"); });
} else {
  const mod = (arg.find((a) => a.startsWith("--mod=")) || "").slice(6).split(",").map(Number), [cada, resto] = mod.length === 2 ? mod : [1, 0];
  const desde = Math.max(1, Number(arg[0]) || 1), hasta = Math.min(ETAPAS_TOTAL, Number(arg[1]) || ETAPAS_TOTAL);
  fs.mkdirSync(carpeta, { recursive: true });
  const ctx = crearContexto();
  for (let s = 0; s < ETAPAS_TOTAL; s++) if (fs.existsSync(archivo(s))) for (const ln of leerEtapa(s)) ctx.vistos.add(ln.split("|")[0]);
  const t0 = Date.now();
  for (let s = desde - 1; s < hasta; s++) {
    if (s % cada !== resto) continue;
    if (fs.existsSync(archivo(s))) { console.log("Etapa " + (s + 1) + ": ya está"); continue; }
    const plan = planEtapa(s), niveles = [];
    plan.forEach((p, k) => {
      const num = s * NIVELES_ETAPA + k + 1, rng = crearRng((num * 2654435761) >>> 0), r = fabricar(p.n, p.clase, rng, ctx);
      niveles.push(r.texto + "|" + r.minimo);
    });
    fs.writeFileSync(archivo(s), JSON.stringify({ etapa: s + 1, niveles }));
    console.log("Etapa " + (s + 1) + " lista · " + ((Date.now() - t0) / 1000).toFixed(0) + " s");
  }
}
