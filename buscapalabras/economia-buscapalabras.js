// Ruta: buscapalabras/economia-buscapalabras.js
// Estrellas, monedas y boosts de Buscapalabras. Solo datos y reglas: NO usa document ni Firebase (se puede probar en Node).
//
// ESTRELLAS (solo en los niveles del mapa; la partida libre no da estrellas ni monedas):
//   ★    terminar el nivel                       → 20 monedas
//   ★★   terminar dentro de 2 × el tiempo de par → 30 monedas
//   ★★★  terminar dentro del tiempo de par SIN usar boosts de ayuda → 40 monedas
//   Usar un boost de ayuda (💡 🔀 🔍) limita el nivel a ★★. «Congelar tiempo» no cuenta como ayuda.
// MONEDAS: cada nivel da entre 20 y 40 en total. Repetir un nivel solo paga la DIFERENCIA si mejoras tus estrellas (no se puede «farmear»).
// BOOSTS: se compran con monedas en la tienda y se guardan como cantidad (stock). Su efecto lo aplica el tablero (aún pendiente).
//
// ESTADO (todo son contadores que solo suben, para poder unir dos aparatos sin perder ni duplicar nada; ver fusionar):
//   { est: { "nivel": estrellas }, g: monedas ganadas en total, s: monedas gastadas en total, bc: { boost: comprados }, bu: { boost: usados } }
//   saldo = g − s · cantidad de un boost = bc − bu

export const BOOSTS = [
  { id: "pista", nombre: "Pista", icono: "💡", precio: 100, ayuda: true, texto: "Resalta la primera letra de una palabra que aún no encuentras." },
  { id: "reordenar", nombre: "Reordenar", icono: "🔀", precio: 100, ayuda: true, texto: "Cambia de lugar las palabras que faltan por encontrar; lo que ya encontraste se queda." },
  // Ideas propuestas (se pueden quitar o cambiar de precio):
  { id: "lupa", nombre: "Lupa", icono: "🔍", precio: 200, ayuda: true, texto: "Marca completa una palabra que aún no encuentras." },
  { id: "congelar", nombre: "Congelar tiempo", icono: "⏱️", precio: 150, ayuda: false, texto: "Detiene el cronómetro 30 segundos para no perder la ★★★." },
];
export const boostDe = (id) => BOOSTS.find((b) => b.id === id) || null;

export const MONEDAS_POR_ESTRELLAS = [0, 20, 30, 40]; // índice = estrellas
export const SEG_POR_PALABRA = [14, 16, 18, 20, 22];  // tiempo de par por palabra según la dificultad (1 a 5). PROVISIONAL: se afina probando
export const CLAVE_PROGRESO = "buscapalabras_progreso_v1";

const ent = (x) => Math.max(0, Math.floor(Number(x)) || 0);
const copiaMapa = (m) => { const r = {}; for (const k in m || {}) { const v = ent(m[k]); if (v) r[k] = v; } return r; };

export const vacio = () => ({ est: {}, g: 0, s: 0, bc: {}, bu: {} });
// Acepta cualquier cosa (JSON viejo, nube, null) y devuelve un estado válido
export function normalizar(p) {
  if (!p || typeof p !== "object") return vacio();
  const est = {};
  for (const k in p.est || {}) { const v = Math.min(3, ent(p.est[k])); if (v && ent(k) >= 1) est[ent(k)] = v; }
  return { est, g: ent(p.g), s: ent(p.s), bc: copiaMapa(p.bc), bu: copiaMapa(p.bu) };
}

export const saldo = (p) => Math.max(0, p.g - p.s);
export const stock = (p, id) => Math.max(0, ent(p.bc[id]) - ent(p.bu[id]));
export const estrellasNivel = (p, n) => ent(p.est[n]);
export const monedasPorEstrellas = (e) => MONEDAS_POR_ESTRELLAS[Math.max(0, Math.min(3, ent(e)))];

// Tiempo de par de un nivel (segundos): palabras × segundos por palabra de la dificultad × (tamaño / 10)
export function parSegundos({ palabras, dif, tam }) {
  const s = SEG_POR_PALABRA[Math.max(1, Math.min(5, ent(dif) || 1)) - 1];
  return Math.max(10, Math.round(ent(palabras) * s * (ent(tam) || 10) / 10));
}
// Estrellas de una partida terminada. ayudas = cuántos boosts de ayuda se usaron
export function estrellasDe({ segundos, parSeg, ayudas = 0 }) {
  const e = segundos <= parSeg ? 3 : segundos <= parSeg * 2 ? 2 : 1;
  return ayudas > 0 ? Math.min(e, 2) : e;
}

// Anota un nivel terminado. Devuelve { estado, monedas (las que se pagan ahora), mejoro }
export function registrarNivel(p, nivel, estrellas) {
  const e = Math.max(1, Math.min(3, ent(estrellas))), antes = estrellasNivel(p, nivel);
  if (e <= antes) return { estado: p, monedas: 0, mejoro: false };
  const monedas = monedasPorEstrellas(e) - monedasPorEstrellas(antes);
  return { estado: { ...p, est: { ...p.est, [nivel]: e }, g: p.g + monedas }, monedas, mejoro: true };
}
export function comprar(p, id) {
  const b = boostDe(id);
  if (!b) return { estado: p, ok: false, motivo: "no existe" };
  if (saldo(p) < b.precio) return { estado: p, ok: false, motivo: "faltan monedas" };
  return { estado: { ...p, s: p.s + b.precio, bc: { ...p.bc, [id]: ent(p.bc[id]) + 1 } }, ok: true };
}
export function usar(p, id) {
  if (!boostDe(id) || stock(p, id) < 1) return { estado: p, ok: false };
  return { estado: { ...p, bu: { ...p.bu, [id]: ent(p.bu[id]) + 1 } }, ok: true };
}
export const darMonedas = (p, n) => ({ ...p, g: p.g + ent(n) }); // solo para pruebas

// Los niveles se abren en orden: max = nivel más alto desbloqueado, hecho = nivel más alto con alguna estrella
export function progresoDe(p, total) {
  let hecho = 0;
  for (const k in p.est) hecho = Math.max(hecho, ent(k));
  return { hecho: Math.min(hecho, total), max: Math.min(hecho + 1, total) };
}

// Une dos estados (aparato y nube): cada contador se queda con el mayor. Como solo suben, comprar o gastar en un lado no se pierde al unir.
// (Si juegas SIN internet en dos aparatos a la vez, se queda el contador mayor de cada uno.)
export function fusionar(a, b) {
  if (!a && !b) return null;
  a = normalizar(a); b = normalizar(b);
  const mx = (x, y) => { const r = { ...y }; for (const k in x) r[k] = Math.max(ent(x[k]), ent(r[k])); return r; };
  return { est: mx(a.est, b.est), g: Math.max(a.g, b.g), s: Math.max(a.s, b.s), bc: mx(a.bc, b.bc), bu: mx(a.bu, b.bu) };
}
