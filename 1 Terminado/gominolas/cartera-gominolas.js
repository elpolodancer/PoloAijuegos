// Ruta: gominolas/cartera-gominolas.js
// MONEDAS, CARTERA y ESTRELLAS de «Conecta gominolas». Módulo puro: no usa document, ni Firebase, ni localStorage (se prueba en Node:
// node gominolas/prueba-cartera-gominolas.mjs). El juego guarda y sincroniza lo que aquí se calcula (juego-gominolas.js + compartido/progreso.js).
//
// ESTRELLAS (por nivel de la campaña): 1★ = pasar el nivel · 2★ = pasarlo con al menos 45 % de los movimientos sin usar · 3★ = con al menos 65 %.
//   Umbrales medidos con el bot (node gominolas/bot-gominolas.mjs estrellas): una persona casual saca 3★ en ~12–40 % de sus victorias, un experto en ~28–65 %.
//   Se guardan como un TEXTO con un dígito (0–3) por nivel: «estrellas[n-1]». Con 22 600 niveles pesa ≤ 22 KB. Se unen tomando el mayor de cada nivel.
//
// MONEDAS: se ganan al pasar un nivel de la campaña (no en el modo libre, para que no se pueda repetir sin límite):
//   · PRIMERA vez que se pasa: monedas base según la dificultad del nivel + MONEDAS.porEstrella por cada estrella obtenida.
//   · Al repetirlo: solo se pagan las estrellas NUEVAS (mejorar de 1★ a 3★ paga 2 estrellas). Repetir sin mejorar no da nada.
//   · Nivel jefe: todo × MONEDAS.jefe. Nivel sorpresa (🎁, siempre difícil): todo × MONEDAS.sorpresa.
//   Se gastan en boosts (PRECIOS): quitar una gominola, revolver las gominolas y colocar un boost de color (borra un color completo).
//
// CARTERA: las monedas se GASTAN, así que no se pueden unir con «el mayor» (como los récords): si el celular gasta 50 y la computadora no se entera,
//   el máximo devolvería las monedas gastadas. Por eso cada dispositivo lleva sus propios contadores { g: ganadas, s: gastadas } y el saldo es la
//   suma de todos los dispositivos (ganadas − gastadas). Al unir dos copias se toma, POR DISPOSITIVO, el mayor de cada contador (un contador solo crece).
//   Así nunca se pierden monedas ganadas en otro dispositivo ni se recuperan las gastadas. Único caso raro: gastar las MISMAS monedas en dos
//   dispositivos sin conexión a la vez; el saldo puede quedar en 0 (nunca negativo).
//   Forma guardada:  cartera = { d: { "<id del dispositivo>": { g: número, s: número } } }

export const PRECIOS = { quitar: 50, revolver: 50, color: 50 }; // monedas por boost
export const MONEDAS = { base: { facil: 8, medio: 15, dificil: 25 }, porEstrella: 5, jefe: 3, sorpresa: 2 };
export const UMBRALES_ESTRELLAS = [0.45, 0.65]; // [para 2★, para 3★]: fracción de movimientos que sobran

// ---------- Estrellas ----------
// movsSobrantes = movimientos que quedaron al ganar; movsIni = con los que empezó el nivel
export function estrellasDe(movsSobrantes, movsIni) {
  if (!(movsIni > 0)) return 1;
  const f = Math.max(0, movsSobrantes) / movsIni;
  return f >= UMBRALES_ESTRELLAS[1] ? 3 : f >= UMBRALES_ESTRELLAS[0] ? 2 : 1;
}
export function estrellasDeNivel(texto, n) {
  const e = String(texto || "").charCodeAt(n - 1) - 48;
  return e >= 1 && e <= 3 ? e : 0;
}
// Devuelve el texto nuevo (solo sube, nunca baja las estrellas de un nivel)
export function ponerEstrellas(texto, n, e) {
  e = Math.max(0, Math.min(3, Math.floor(e)));
  const a = String(texto || "").split("");
  while (a.length < n) a.push("0");
  if (e > estrellasDeNivel(texto, n)) a[n - 1] = String(e);
  return a.join("");
}
export function unirEstrellas(a, b) {
  a = String(a || ""); b = String(b || "");
  const r = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Math.max(estrellasDeNivel(a, i + 1), estrellasDeNivel(b, i + 1));
    r.push(String(x));
  }
  return r.join("").replace(/0+$/, "");
}
export const totalEstrellas = (texto) => [...String(texto || "")].reduce((s, c) => s + (c >= "1" && c <= "3" ? Number(c) : 0), 0);

// ---------- Recompensa ----------
// nv = nivelDe(n) del catálogo (usa dificultad y tipo); estrellas = las de esta victoria; previas = las que ya tenía el nivel
export function recompensa(nv, estrellas, previas = 0) {
  const nuevas = Math.max(0, estrellas - previas);
  if (!nuevas) return 0;
  const base = previas === 0 ? (MONEDAS.base[nv.dificultad] || 0) : 0;
  const m = base + nuevas * MONEDAS.porEstrella;
  return nv.tipo === "jefe" ? m * MONEDAS.jefe : nv.tipo === "sorpresa" ? m * MONEDAS.sorpresa : m;
}

// ---------- Cartera ----------
const num = (x) => { x = Math.floor(Number(x)); return x > 0 ? x : 0; };
export const carteraVacia = () => ({ d: {} });
function limpia(c) { // acepta cualquier cosa (datos de la nube) y devuelve una cartera válida
  const r = carteraVacia();
  const d = c && typeof c === "object" && c.d && typeof c.d === "object" ? c.d : {};
  for (const id of Object.keys(d)) r.d[id] = { g: num(d[id] && d[id].g), s: num(d[id] && d[id].s) };
  return r;
}
export function saldo(c) {
  let t = 0;
  const d = limpia(c).d;
  for (const id in d) t += d[id].g - d[id].s;
  return Math.max(0, t);
}
// Anota monedas ganadas por este dispositivo (id). Modifica y devuelve la cartera.
export function ganarMonedas(c, id, n) {
  n = num(n);
  if (!n) return c;
  c.d = c.d || {};
  const x = (c.d[id] = c.d[id] || { g: 0, s: 0 });
  x.g = num(x.g) + n;
  return c;
}
// Gasta n monedas si alcanzan. Devuelve true si se cobró (si no, no cambia nada).
export function gastarMonedas(c, id, n) {
  n = num(n);
  if (!n || saldo(c) < n) return false;
  c.d = c.d || {};
  const x = (c.d[id] = c.d[id] || { g: 0, s: 0 });
  x.s = num(x.s) + n;
  return true;
}
export function unirCarteras(a, b) {
  const A = limpia(a).d, B = limpia(b).d, r = carteraVacia();
  for (const id of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) { // claves ordenadas: el texto JSON del resultado es siempre el mismo (progreso.js compara textos para decidir si sube a la nube)
    r.d[id] = { g: Math.max(A[id] ? A[id].g : 0, B[id] ? B[id].g : 0), s: Math.max(A[id] ? A[id].s : 0, B[id] ? B[id].s : 0) };
  }
  return r;
}

// ---------- Progreso completo del juego (lo que se sincroniza con la cuenta) ----------
// Forma: { mejor, nivel, l_6x8_facil…: números (se unen con el mayor), est: texto de estrellas, cartera: {d:{…}} }
// Se pasa como «fusionar» de conectar() en compartido/progreso.js (en lugar de unirMaximos, que solo sabe de números).
export function unirProgresoGominolas(a, b) {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const r = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === "est" || k === "cartera") continue;
    r[k] = Math.max(Number(a[k]) || 0, Number(b[k]) || 0);
  }
  const est = unirEstrellas(a.est, b.est);
  if (est) r.est = est;
  const car = unirCarteras(a.cartera, b.cartera);
  if (Object.keys(car.d).length) r.cartera = car;
  return Object.fromEntries(Object.entries(r).sort(([x], [y]) => (x < y ? -1 : 1))); // claves ordenadas (mismo motivo)
}
