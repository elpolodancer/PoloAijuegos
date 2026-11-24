// Ruta: agua/economia-agua.js
// Estrellas, monedas y tienda de «Agua». Solo datos y reglas: no usa document ni Firebase (se puede probar en Node).
//
// Todo vive en UN objeto guardado en localStorage (CLAVE) y sincronizado con compartido/progreso.js:
//   { max, hecho, est: {nivel: 1..3}, ganadas, gastadas, bon: {...}, comp: {id: n}, usa: {id: n}, skin, t }
// Las monedas se gastan, así que NO se guardan como saldo: se guardan dos contadores que solo suben (ganadas y gastadas)
// y el saldo es ganadas − gastadas. Así dos dispositivos se unen sin perder ni duplicar monedas (gana el mayor de cada contador).
// Lo mismo con lo comprado (comp) y lo usado (usa): lo que tienes = comp − usa.
//
// ESTRELLAS (por nivel): ★1 llegar a la meta · ★2 que llegue al menos p2 del agua (60 %) · ★3 que llegue al menos p3 (90 %).
//   Cada nivel puede traer sus propias metas { p2, p3 }. «fraccion» = agua que llegó ÷ agua que salió (0 a 1).
// MONEDAS: solo se pagan las estrellas NUEVAS de un nivel (repetirlo no da nada, para que no se pueda abusar):
//   ★1 = 10, ★2 = +15, ★3 = +25 (50 con las tres) · bono de 200 al pasar los 20 niveles de un país
//   · bono de 500 al tener las 3 estrellas en los 20. El Modo libre no da monedas.
// MAPA (ESTANDARES-juegos.md, A-bis y 13): solo países, 195 × 20 niveles = 3 900. Antes eran 32 estados + 194 países × 100 = 22 600 (se cambió el 24 nov 2026, antes de publicar y de que existiera la pantalla de juego).
import { PAISES_MUNDO } from "../compartido/etapas-mapa.js";

export const CLAVE = "agua_progreso_v1";
export const POR_ETAPA = 20;                        // niveles por país
export const TOTAL = PAISES_MUNDO.length * POR_ETAPA; // 195 países × 20 = 3 900
export const PREMIOS = [10, 15, 25];
export const BONO_ETAPA = 200;
export const BONO_PERFECTA = 500;

// En qué se gastan las monedas. «consumible» se compra por unidades; «skin» se compra una vez y se elige cuál usar.
export const TIENDA = [
  { id: "pista", tipo: "consumible", icono: "💡", nombre: "Pista", precio: 40, ayuda: "Te enseña por dónde cavar en el nivel." },
  { id: "saltar", tipo: "consumible", icono: "⏭️", nombre: "Saltar nivel", precio: 150, ayuda: "Pasa el nivel en el que vas con 1 estrella y sin monedas." },
  { id: "azul", tipo: "skin", icono: "💧", nombre: "Agua azul", precio: 0, color: "#3aa7ff", ayuda: "El agua de siempre." },
  { id: "verde", tipo: "skin", icono: "🟢", nombre: "Agua verde", precio: 200, color: "#3fcf4a", ayuda: "Solo cambia el color; no cambia el juego." },
  { id: "rosa", tipo: "skin", icono: "🌸", nombre: "Agua rosa", precio: 200, color: "#ff7ab8", ayuda: "Solo cambia el color; no cambia el juego." },
  { id: "arcoiris", tipo: "skin", icono: "🌈", nombre: "Agua arcoíris", precio: 500, color: "arcoiris", ayuda: "El agua cambia de color mientras corre." },
];
export const objeto = (id) => TIENDA.find((x) => x.id === id);

// ----- Datos: normalizar, leer, guardar, unir -----
const ent = (v) => Math.max(0, Math.floor(Number(v)) || 0);
function contadores(o, tope) {
  const r = {};
  if (o && typeof o === "object") for (const k of Object.keys(o)) { const v = Math.min(tope, ent(o[k])); if (v > 0) r[k] = v; }
  return r;
}
// Devuelve SIEMPRE una copia limpia (los números en su rango, sin claves raras)
export function normalizar(p) {
  p = p && typeof p === "object" ? p : {};
  const hecho = Math.min(TOTAL, ent(p.hecho));
  const est = {};
  if (p.est && typeof p.est === "object") for (const k of Object.keys(p.est)) {
    const n = ent(k), v = Math.min(3, ent(p.est[k]));
    if (n >= 1 && n <= TOTAL && v > 0) est[n] = v;
  }
  return {
    max: Math.min(TOTAL, Math.max(hecho + 1, ent(p.max) || 1)), hecho, est,
    ganadas: ent(p.ganadas), gastadas: ent(p.gastadas),
    bon: contadores(p.bon, 1), comp: contadores(p.comp, 1e6), usa: contadores(p.usa, 1e6),
    skin: typeof p.skin === "string" && p.skin ? p.skin.slice(0, 30) : "azul",
    t: ent(p.t),
  };
}
export function leer() {
  try { return normalizar(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return normalizar(null); }
}
export function guardar(d) {
  const n = normalizar(d);
  n.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch (e) {}
  return n;
}
const mayor = (a, b) => { const r = { ...a }; for (const k in b) r[k] = Math.max(r[k] || 0, b[k]); return r; };
// «fusionar» de compartido/progreso.js conectar(): une el progreso local con el de la cuenta (cualquiera puede ser null)
export function fusionar(a, b) {
  if (!a && !b) return null;
  a = normalizar(a); b = normalizar(b);
  return normalizar({
    max: Math.max(a.max, b.max), hecho: Math.max(a.hecho, b.hecho), est: mayor(a.est, b.est),
    ganadas: Math.max(a.ganadas, b.ganadas), gastadas: Math.max(a.gastadas, b.gastadas),
    bon: mayor(a.bon, b.bon), comp: mayor(a.comp, b.comp), usa: mayor(a.usa, b.usa),
    skin: (b.t > a.t ? b : a).skin, t: Math.max(a.t, b.t), // el color de agua elegido más recientemente
  });
}

// ----- Consultas -----
export const saldo = (d) => Math.max(0, d.ganadas - d.gastadas);
export const estrellasDe = (d, n) => d.est[n] || 0;
export const estrellasTotal = (d) => Object.values(d.est).reduce((s, v) => s + v, 0);
export const stock = (d, id) => Math.max(0, (d.comp[id] || 0) - (d.usa[id] || 0));
export const tiene = (d, id) => { const o = objeto(id); return !!o && (o.precio === 0 || (d.comp[id] || 0) >= 1); };
export const colorAgua = (d) => (objeto(d.skin) || objeto("azul")).color;

// ----- Estrellas de un nivel terminado -----
export function calcularEstrellas({ llego, fraccion } = {}, { p2 = 0.6, p3 = 0.9 } = {}) {
  if (!llego) return 0;
  const f = Number(fraccion) || 0;
  return f >= p3 ? 3 : f >= p2 ? 2 : 1;
}

// Anota un nivel terminado con 1 a 3 estrellas. No modifica «d»: devuelve { datos, monedas, nuevas, bonos }
// (monedas = todo lo ganado ahora, con los bonos; nuevas = estrellas nuevas en ese nivel)
export function registrarNivel(d, n, estrellas) {
  n = Math.floor(Number(n));
  estrellas = Math.min(3, Math.max(0, Math.floor(Number(estrellas)) || 0));
  const c = normalizar(d);
  if (!(n >= 1 && n <= TOTAL) || estrellas < 1) return { datos: c, monedas: 0, nuevas: 0, bonos: [] };
  const antes = c.est[n] || 0;
  c.est[n] = Math.max(antes, estrellas);
  c.hecho = Math.max(c.hecho, n);
  c.max = Math.min(TOTAL, Math.max(c.max, n + 1));
  let monedas = 0;
  for (let i = antes; i < estrellas; i++) monedas += PREMIOS[i];
  // Bonos de etapa (país): se pagan una sola vez
  const bonos = [], e = Math.floor((n - 1) / POR_ETAPA), base = e * POR_ETAPA;
  let pasada = true, perfecta = true;
  for (let k = 1; k <= POR_ETAPA; k++) {
    const v = c.est[base + k] || 0;
    if (v < 1) { pasada = false; perfecta = false; break; }
    if (v < 3) perfecta = false;
  }
  if (pasada && !c.bon["c" + e]) { c.bon["c" + e] = 1; monedas += BONO_ETAPA; bonos.push({ tipo: "etapa", monedas: BONO_ETAPA }); }
  if (perfecta && !c.bon["p" + e]) { c.bon["p" + e] = 1; monedas += BONO_PERFECTA; bonos.push({ tipo: "perfecta", monedas: BONO_PERFECTA }); }
  c.ganadas += monedas;
  return { datos: c, monedas, nuevas: Math.max(0, estrellas - antes), bonos };
}

// ----- Tienda -----
export function comprar(d, id) {
  const o = objeto(id), c = normalizar(d);
  if (!o) return { ok: false, motivo: "No existe" };
  if (o.tipo === "skin" && tiene(c, id)) return { ok: false, motivo: "Ya lo tienes" };
  if (saldo(c) < o.precio) return { ok: false, motivo: "Te faltan monedas" };
  c.gastadas += o.precio;
  c.comp[id] = (c.comp[id] || 0) + 1;
  if (o.tipo === "skin") c.skin = id; // el color recién comprado se pone solo
  return { ok: true, datos: c };
}
export function elegirSkin(d, id) {
  const o = objeto(id), c = normalizar(d);
  if (!o || o.tipo !== "skin" || !tiene(c, id)) return { ok: false, datos: c };
  c.skin = id;
  return { ok: true, datos: c };
}
// Gasta una unidad de un consumible (por ejemplo una pista al pedirla en un nivel)
export function usar(d, id) {
  const o = objeto(id), c = normalizar(d);
  if (!o || o.tipo !== "consumible" || stock(c, id) < 1) return { ok: false, datos: c };
  c.usa[id] = (c.usa[id] || 0) + 1;
  return { ok: true, datos: c };
}
// «Saltar nivel»: solo el nivel en el que vas (el más alto abierto). Gasta 1, lo pasa con 1 estrella y no da monedas.
export function saltarNivel(d, n) {
  const c = normalizar(d);
  if (n !== c.max || c.hecho >= n) return { ok: false, datos: c };
  const u = usar(c, "saltar");
  if (!u.ok) return { ok: false, datos: c };
  const r = u.datos;
  r.est[n] = Math.max(r.est[n] || 0, 1);
  r.hecho = Math.max(r.hecho, n);
  r.max = Math.min(TOTAL, Math.max(r.max, n + 1));
  return { ok: true, datos: r };
}
