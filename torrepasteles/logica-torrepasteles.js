// Ruta: torrepasteles/logica-torrepasteles.js
// ESTRELLAS, MONEDAS Y BOOSTS de Torre de pasteles. Solo lógica: no usa document ni red, así que se puede probar en Node.
//
//   Estrellas   ★1, ★2, ★3 (doradas) y ★4, ★5, ★6 (MORADAS, ocultas: no se avisa de ellas hasta que se consiguen).
//               Se miden en PISOS apilados en el nivel (UMBRALES). Una estrella conseguida nunca se pierde.
//   Monedas     15 a 40 según las estrellas (MONEDAS_POR_ESTRELLAS). Se cobran UNA SOLA VEZ por nivel: la primera vez que se pasa.
//               Repetir el nivel o subir de estrellas después NO vuelve a dar monedas. La Partida libre no da estrellas ni monedas.
//   Boosts      «agrandar» y «precision» (BOOSTS). Se pueden comprar por adelantado (quedan en la mochila) o, al usarlos sin tener,
//               se compran en ese momento (estándar de los botones: «aún no lo tienes: se compra al usarlo»).
//
// Todo se guarda en UN SOLO objeto (una sola clave de localStorage), así que monedas y estrellas nunca quedan a medias.
// Las funciones no modifican lo que reciben: devuelven un objeto nuevo.

export const CLAVE_DATOS = "torrepasteles_datos_v1"; // { v, m: monedas, b: { agrandar, precision }, e: { "nivel": estrellas } }
export const NIVELES_TOTAL = 22600;                  // 226 etapas (32 estados + 194 países) × 100 niveles

// Pisos que hay que apilar para cada estrella (de ★1 a ★6). PROVISIONAL: se afinan al probar la partida.
// ★1-★3 son alcanzables; ★4-★6 (moradas) quedan bastante más arriba, para jugadores muy buenos.
export const UMBRALES = [10, 20, 30, 50, 70, 100];
// Hueco para después: si más adelante los niveles piden más o menos pisos, aquí se decide por nivel.
export const umbralesDe = (nivel) => UMBRALES; // eslint-disable-line no-unused-vars

export const MAX_ESTRELLAS = UMBRALES.length;
// Monedas por estrellas obtenidas (la posición es el número de estrellas; con 0 estrellas no se pasó el nivel)
export const MONEDAS_POR_ESTRELLAS = [0, 15, 20, 25, 30, 35, 40];

// Boosts. PROVISIONAL: precio de «precision», factor de «agrandar» y hasta cuándo dura (se decide con la partida).
export const BOOSTS = {
  agrandar: { id: "agrandar", nombre: "Agrandar pastel", icono: "🍰", precio: 100, factor: 1.25, texto: "El pastel que se acerca sale más grande." },
  precision: { id: "precision", nombre: "Precisión mejorada", icono: "🎯", precio: 50, duracion: 10, texto: "Durante 10 segundos es más fácil detener el pastel bien centrado." },
};
export const IDS_BOOSTS = Object.keys(BOOSTS);

// ---------- Estrellas y monedas ----------
const entero = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : 0; };

// Cuántas estrellas (0 a 6) da haber apilado esos pisos
export function estrellasPor(pisos, umbrales = UMBRALES) {
  const p = entero(pisos);
  let e = 0;
  for (const u of umbrales) if (p >= u) e++;
  return e;
}
export const monedasPor = (estrellas) => MONEDAS_POR_ESTRELLAS[Math.max(0, Math.min(MAX_ESTRELLAS, entero(estrellas)))];

// ---------- Datos guardados ----------
export const datosVacios = () => ({ v: 1, m: 0, b: { agrandar: 0, precision: 0 }, e: {} });

// Limpia cualquier cosa rara que venga de localStorage
export function normalizar(d) {
  const r = datosVacios();
  if (!d || typeof d !== "object") return r;
  r.m = Math.max(0, entero(d.m));
  for (const id of IDS_BOOSTS) r.b[id] = Math.max(0, entero(d.b && d.b[id]));
  for (const k in d.e || {}) {
    const n = entero(k), e = entero(d.e[k]);
    if (n >= 1 && n <= NIVELES_TOTAL && e >= 1) r.e[n] = Math.min(MAX_ESTRELLAS, e);
  }
  return r;
}
export function cargar(almacen = globalThis.localStorage) {
  try { return normalizar(JSON.parse(almacen.getItem(CLAVE_DATOS))); } catch (e) { return datosVacios(); }
}
export function guardar(d, almacen = globalThis.localStorage) {
  try { almacen.setItem(CLAVE_DATOS, JSON.stringify(normalizar(d))); return true; } catch (e) { return false; }
}
export const estrellasDe = (d, nivel) => (d && d.e && d.e[entero(nivel)]) || 0;

// ---------- Terminar un nivel ----------
// Devuelve { datos, estrellas, antes, mejoro, monedas, cobro }
//   estrellas  las de ESTA partida     antes  las que ya tenía el nivel     mejoro  estrellas > antes
//   monedas    las que se sumaron ahora (0 si ya las había cobrado)         cobro   true solo la primera vez que se pasa el nivel
export function terminarNivel(datos, nivel, pisos) {
  const d = normalizar(datos), n = entero(nivel);
  const res = { datos: d, estrellas: 0, antes: 0, mejoro: false, monedas: 0, cobro: false };
  if (n < 1 || n > NIVELES_TOTAL) return res;
  const est = estrellasPor(pisos, umbralesDe(n));
  const antes = d.e[n] || 0;
  res.estrellas = est; res.antes = antes;
  if (est > antes) { d.e[n] = est; res.mejoro = true; }
  if (antes === 0 && est > 0) { // primera vez que se pasa: único cobro posible de este nivel
    res.monedas = monedasPor(est);
    d.m += res.monedas;
    res.cobro = true;
  }
  return res;
}

// ---------- Boosts ----------
// Comprar por adelantado: { ok, datos, motivo }  (motivo: "boost" | "monedas")
export function comprar(datos, id, cantidad = 1) {
  const d = normalizar(datos), b = BOOSTS[id], c = Math.max(1, entero(cantidad));
  if (!b) return { ok: false, datos: d, motivo: "boost" };
  const total = b.precio * c;
  if (d.m < total) return { ok: false, datos: d, motivo: "monedas" };
  d.m -= total;
  d.b[id] += c;
  return { ok: true, datos: d, motivo: "" };
}
// Usar un boost al jugar: gasta uno de la mochila; si no hay, lo compra en ese momento. { ok, datos, pagado, motivo }
export function usar(datos, id) {
  const d = normalizar(datos), b = BOOSTS[id];
  if (!b) return { ok: false, datos: d, pagado: 0, motivo: "boost" };
  if (d.b[id] > 0) { d.b[id]--; return { ok: true, datos: d, pagado: 0, motivo: "" }; }
  if (d.m < b.precio) return { ok: false, datos: d, pagado: 0, motivo: "monedas" };
  d.m -= b.precio;
  return { ok: true, datos: d, pagado: b.precio, motivo: "" };
}
