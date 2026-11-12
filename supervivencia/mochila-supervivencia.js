// Ruta: supervivencia/mochila-supervivencia.js
// Mochila con ranuras (5.7 / 5.8 paso 2) y conversión del guardado v2 → v3. Sin document ni Firebase.
// Una mochila es { ranuras: [ {id, n} | null, … ] } (se guarda tal cual en JSON).
import { item } from "./datos-supervivencia.js";

export const RANURAS_INICIALES = 20;   // 💡 est: cámbialo; la mochila básica de 10.2 podría ampliarlo

export const crearMochila = (n = RANURAS_INICIALES) => ({ ranuras: Array.from({ length: n }, () => null) });

export function cuenta(m, id) {
  let t = 0;
  for (const r of m.ranuras) if (r && r.id === id) t += r.n;
  return t;
}
export const tiene = (m, id, n = 1) => cuenta(m, id) >= n;
export const puedePagar = (m, costo) => costo.every(([id, n]) => tiene(m, id, n));

// Mete n objetos: primero rellena ranuras con el mismo id (hasta `apila`), luego usa ranuras vacías.
// Devuelve el SOBRANTE que no cupo (0 = todo entró). No cambia nada si el id no existe.
export function agregar(m, id, n = 1) {
  const it = item(id);
  n = Math.floor(Number(n)) || 0;
  if (!it || n <= 0) return Math.max(n, 0);
  for (const r of m.ranuras) {
    if (n <= 0) break;
    if (r && r.id === id && r.n < it.apila) { const k = Math.min(n, it.apila - r.n); r.n += k; n -= k; }
  }
  for (let i = 0; i < m.ranuras.length && n > 0; i++) {
    if (!m.ranuras[i]) { const k = Math.min(n, it.apila); m.ranuras[i] = { id, n: k }; n -= k; }
  }
  return n;
}
// Quita n objetos (de las últimas ranuras hacia atrás). Devuelve false y NO quita nada si no hay suficientes.
export function quitar(m, id, n = 1) {
  if (!tiene(m, id, n)) return false;
  for (let i = m.ranuras.length - 1; i >= 0 && n > 0; i--) {
    const r = m.ranuras[i];
    if (r && r.id === id) { const k = Math.min(n, r.n); r.n -= k; n -= k; if (r.n <= 0) m.ranuras[i] = null; }
  }
  return true;
}
// Paga un costo [[id, n], …] de golpe: todo o nada
export function gastar(m, costo) {
  if (!puedePagar(m, costo)) return false;
  for (const [id, n] of costo) quitar(m, id, n);
  return true;
}
// Refinar/fabricar: paga el costo y mete el resultado; si no cabe, devuelve todo como estaba
export function convertir(m, costo, da) {
  const antes = JSON.stringify(m);
  if (!gastar(m, costo)) return false;
  if (agregar(m, da[0], da[1]) > 0) { m.ranuras = JSON.parse(antes).ranuras; return false; }
  return true;
}

// ---------- Guardado v2 → v3 (5.7) ----------
// v2: { v:2, n, piso, obj, dano, inv, herr, x, y, t }. El README no dice la forma exacta de `inv` y `herr`,
// así que se aceptan las dos más probables: inv = {madera,piedra,fibra,bayas} o [madera,piedra,fibra,bayas];
// herr = {hacha:true,pico:true} o ["hacha","pico"]. REVISA contra juego-supervivencia.js antes de usarlo.
// v3: se quitan inv y herr y se agrega `mochila`; el resto (mapa, piso, golpes, x, y) queda igual.
const V2_A_ITEM = { madera: "leno-pino", piedra: "caliza", fibra: "fibra", bayas: "bayas" };
const ORDEN_V2 = ["madera", "piedra", "fibra", "bayas"];

export function migrarV2aV3(mundo) {
  if (!mundo || typeof mundo !== "object") return null;
  if (mundo.v === 3 && mundo.mochila) return mundo;
  const { inv, herr, ...resto } = mundo;
  const m = crearMochila();
  const cant = Array.isArray(inv) ? Object.fromEntries(ORDEN_V2.map((k, i) => [k, inv[i]])) : (inv || {});
  for (const k of ORDEN_V2) {
    const n = Math.floor(Number(cant[k])) || 0;
    if (n > 0) agregar(m, V2_A_ITEM[k], n);   // 20 ranuras × 50 de apilado: lo de un mundo v2 siempre cabe
  }
  const lista = Array.isArray(herr) ? herr : Object.keys(herr || {}).filter((k) => herr[k]);
  for (const h of lista) if (item(h) && item(h).tipo === "herramienta") agregar(m, h, 1);
  return { ...resto, v: 3, mochila: m };
}

// Une dos mundos v3 del mismo jugador (para progreso.js): gana el más reciente (`t`), igual que unirRecientes
export const fusionarV3 = (a, b) => (!a ? b || null : !b ? a : (Number(b.t) || 0) > (Number(a.t) || 0) ? b : a);
