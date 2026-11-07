// Ruta: botellascolores/generar-botellascolores.mjs
// Genera niveles-botellascolores.js: 12 etapas (estados de México, ver ETAPAS en mapa.js) × 100 niveles. Se corre en tu compu (Node 18+), NO lo carga el juego:
//   node generar-botellascolores.mjs
// Cada nivel tiene de 5 a 10 botellas, capacidad de 3 a 8 y 1 o 2 botellas vacías. Un nivel solo se acepta si:
//   1) el solucionador de logica-botellascolores.js lo resuelve (y la solución se reproduce con las reglas reales), y
//   2) al menos 2 primeros movimientos distintos no lo arruinan (hay mínimo 2 formas de resolverlo).
// La dificultad sube dentro de cada etapa y de una etapa a la siguiente; el último nivel de cada decena es más duro.
import { readFileSync, writeFileSync } from "node:fs";
import { crear, resolver, puedeVerter, verter, resuelto, azarSemilla } from "./logica-botellascolores.js";
import { ETAPAS } from "./mapa.js"; // solo se usan los nombres de los estados para los comentarios

const ARCHIVO = "./niveles-botellascolores.js";
const MUNDOS_N = 12, POR_MUNDO = 100, LIMITE = 300000;
const NIEBLA = [8, 10, 11]; // etapas con modo niebla (la 9, la 11 y la 12); se cuentan desde 0
const MIN_FORMAS = 2;

function formas(est, cap) { // primeros movimientos que no arruinan el nivel
  let n = 0;
  for (let a = 0; a < est.length; a++) for (let b = 0; b < est.length; b++) {
    if (a === b || !puedeVerter(est[a], est[b], cap)) continue;
    const h = est.map((x) => x.slice());
    verter(h, a, b, cap);
    if (resolver(h, cap, LIMITE)) n++;
  }
  return n;
}
function valido(n) {
  const est = crear(n), cap = n.capacidad;
  const sol = resolver(est, cap, LIMITE);
  if (!sol) return false;
  const h = est.map((b) => b.slice());
  for (const [a, b] of sol) verter(h, a, b, cap);
  return resuelto(h, cap) && formas(est, cap) >= MIN_FORMAS;
}

const niveles = [];
for (let w = 0; w < MUNDOS_N; w++) {
  const niebla = NIEBLA.includes(w);
  for (let k = 1; k <= POR_MUNDO; k++) {
    const r = azarSemilla(w * 1000 + k + 7);
    const p = (k - 1) / (POR_MUNDO - 1);
    let s = 0.6 * (w / (MUNDOS_N - 1)) + 0.4 * p + (r() - 0.5) * 0.2;
    if (k % 10 === 0) s += 0.12;
    s = Math.max(0.02, Math.min(1, s));
    let objetivo = 9 + s * 55;       // capas totales: de 9 a 64
    if (niebla) objetivo *= 0.7;     // en niebla se ve menos, así que se piden menos capas
    const preferidas = w >= 2 && (k % 10 === 0 || (s > 0.55 && r() < 0.25)) ? 1 : 2;
    let nivel = null;
    // Si con una sola botella vacía no sale un nivel que cumpla, se prueba con 2 vacías
    for (const vacias of preferidas === 1 ? [1, 2] : [2]) {
      if (nivel) break;
      const combos = [];
      for (let t = 5; t <= 10; t++) for (let c = 3; c <= 8; c++) {
        const col = t - vacias, d = (col * c - objetivo) / 6;
        combos.push({ t, c, col, peso: Math.exp(-d * d) });
      }
      for (let intento = 0; intento < 12 && !nivel; intento++) {
        const total = combos.reduce((a, x) => a + x.peso, 0);
        if (!(total > 0)) combos.forEach((q) => (q.peso = 1));
        let x = r() * combos.reduce((a, q) => a + q.peso, 0), el = combos[0];
        for (const q of combos) { x -= q.peso; if (x <= 0) { el = q; break; } }
        for (let a = 0; a < 25 && !nivel; a++) {
          const n = { botellas: el.t, colores: el.col, capacidad: el.c, semilla: (w + 1) * 100000 + k * 100 + a };
          if (niebla) n.oculto = true;
          if (valido(n)) nivel = n;
        }
        el.peso = 0; // si esta forma no dio resultado, prueba otra
      }
    }
    if (!nivel) throw new Error("No se pudo generar el nivel " + k + " del mundo " + (w + 1));
    niveles.push(nivel);
  }
  console.log("Etapa", w + 1, ETAPAS[w].nombre, "lista");
}

// Se conserva todo lo que sigue a NIVELES (PALETA y MUNDOS) del archivo actual
const viejo = readFileSync(ARCHIVO, "utf8");
const i = viejo.indexOf("// 16 colores vivos");
if (i < 0) throw new Error("No encontré «// 16 colores vivos» en " + ARCHIVO);
const cola = viejo.slice(i).replace(/export const NIVELES_POR_MUNDO = \d+;/, "export const NIVELES_POR_MUNDO = " + POR_MUNDO + ";");
let txt = "// Ruta: botellascolores/niveles-botellascolores.js\n" +
  "// ARCHIVO GENERADO por generar-botellascolores.mjs: no se edita a mano (se pierde al volver a generar).\n" +
  "// Cada nivel: botellas (5 a 10 en total; las que sobran de «colores» quedan vacías), colores (distintos),\n" +
  "// capacidad (capas por botella, 3 a 8) y semilla (fija la mezcla). «oculto: true» = modo niebla.\n" +
  "// 12 etapas × 100 niveles (Colima, Baja California Sur, Campeche…). Cada uno tiene solución comprobada y al menos 2 formas de empezar a resolverlo.\n" +
  "export const NIVELES = [\n";
for (let w = 0; w < MUNDOS_N; w++) {
  txt += "  // Etapa " + (w + 1) + " · " + ETAPAS[w].nombre + ", niveles " + (w * POR_MUNDO + 1) + " a " + (w + 1) * POR_MUNDO + "\n";
  for (const n of niveles.slice(w * POR_MUNDO, (w + 1) * POR_MUNDO))
    txt += "  { botellas: " + n.botellas + ", colores: " + n.colores + ", capacidad: " + n.capacidad + ", semilla: " + n.semilla + (n.oculto ? ", oculto: true" : "") + " },\n";
}
txt += "];\n\n" + cola;
writeFileSync(ARCHIVO, txt);
console.log("Escribí", niveles.length, "niveles en", ARCHIVO);
