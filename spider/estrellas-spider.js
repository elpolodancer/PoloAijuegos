// Ruta: spider/estrellas-spider.js
// RÉCORD DE TIEMPO y ESTRELLAS de cada nivel de la campaña. Módulo puro: no usa document, ni Firebase, ni localStorage
// (se prueba en Node: node spider/prueba-estrellas-spider.mjs). Los números salen de README-spider.md, sección 6.
//
// Cada nivel tiene 3 estrellas, que se ganan por separado (pueden ganarse en intentos distintos):
//   ★ 1  pasar el nivel
//   ★ 2  pasarlo en menos del TIEMPO «PAR» del nivel (depende de los palos y de la dificultad)
//   ★ 3  un RETO que cambia de nivel en nivel (siempre el mismo para el mismo nivel): ⚡ rapidísimo · ↶ sin Deshacer · 💡 sin Pista · 🧠 sin ninguna ayuda
// Las estrellas no dan monedas (la economía de economia-spider.js no cambia). Se guardan como una máscara de bits (1, 2, 4) y se unen con «O»:
// una estrella ganada nunca se pierde. El mejor tiempo de cada nivel se une con «el menor».
//
// ⚠️ Los tiempos PAR son una primera estimación (no medidos con jugadores): se ajustan cambiando PAR_BASE y FACTOR_DIF.

export const PAR_BASE = { 1: 360, 2: 540, 3: 780, 4: 1020 };      // segundos para ★★ con dificultad Fácil, según los palos (6, 9, 13 y 17 min)
export const FACTOR_DIF = { 1: 1, 2: 1.1, 3: 1.25, 4: 1.4, 5: 1.6 }; // los repartos más difíciles dan más tiempo
export const RAPIDO = 0.6;                                         // ⚡: pasarlo en el 60 % del tiempo par
export const TIPOS_RETO = ["rapido", "sin_deshacer", "sin_pista", "sin_ayudas"];
export const BIT = { paso: 1, tiempo: 2, reto: 4 };
const MAX_T = 99999;                                               // tope de segundos que se guarda (≈ 27 h)
const MAX_NIVEL = 3900;

const mezcla = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0; };

export const parDe = (palos, dif) => Math.round(((PAR_BASE[palos] || PAR_BASE[1]) * (FACTOR_DIF[dif] || 1)) / 10) * 10;
// El reto de la 3.ª estrella del nivel n (fijo para todos los jugadores). En Maestro no hay Deshacer, así que ese reto no sale.
export function retoDe(n, dif) {
  const lista = dif === 5 ? TIPOS_RETO.filter((t) => t !== "sin_deshacer") : TIPOS_RETO;
  return lista[mezcla(Math.floor(Number(n)) * 2 + 12345) % lista.length];
}
export const formatoTiempo = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// Las metas del nivel, con su texto: { par, reto, textos: [«Pasar el nivel», «⏱️ …», «⚡ …»] }
export function metasDe(n, palos, dif) {
  const par = parDe(palos, dif), reto = retoDe(n, dif);
  const textoReto = {
    rapido: "⚡ En menos de " + formatoTiempo(Math.round(par * RAPIDO)),
    sin_deshacer: "↶ Sin usar Deshacer",
    sin_pista: "💡 Sin pedir pista",
    sin_ayudas: "🧠 Sin Deshacer ni Pista",
  }[reto];
  return { par, reto, textos: ["Pasar el nivel", "⏱️ En menos de " + formatoTiempo(par), textoReto] };
}
// Qué estrellas se ganaron en esta partida: { mask, estrellas, tiempo, reto } (retros / pistas = veces que el JUGADOR pidió Deshacer / Pista; la pista automática no cuenta)
export function evaluar({ nivel, palos, dif, segundos, retros = 0, pistas = 0 }) {
  const { par, reto } = metasDe(nivel, palos, dif);
  const s = Math.round(segundos);
  const tiempo = s <= par;
  const cumple = {
    rapido: s <= Math.round(par * RAPIDO),
    sin_deshacer: retros === 0,
    sin_pista: pistas === 0,
    sin_ayudas: retros === 0 && pistas === 0,
  }[reto];
  const mask = BIT.paso | (tiempo ? BIT.tiempo : 0) | (cumple ? BIT.reto : 0);
  return { mask, estrellas: contar(mask), tiempo, reto: cumple };
}
export const contar = (mask) => ((mask & 1) ? 1 : 0) + ((mask & 2) ? 1 : 0) + ((mask & 4) ? 1 : 0);
export const textoEstrellas = (mask) => ((mask & 1) ? "★" : "☆") + ((mask & 2) ? "★" : "☆") + ((mask & 4) ? "★" : "☆");

// ---------- Récords guardados: rec = { "<nivel>": tiempo × 8 + máscara } ----------
export const empaquetar = (t, mask) => t * 8 + (mask & 7);
export function desempaquetar(v) {
  v = Math.floor(Number(v));
  if (!(v >= 8)) return { t: 0, mask: 0 };
  return { t: Math.min(MAX_T, Math.floor(v / 8)), mask: v & 7 };
}
// Anota el resultado de una partida ganada. Modifica rec. Devuelve { previo (tiempo anterior o 0), nuevoRecord, mask (todas las estrellas del nivel), nuevas (máscara de las ganadas ahora por primera vez) }
export function registrar(rec, nivel, segundos, mask) {
  const previo = desempaquetar(rec[nivel]);
  const t = Math.max(1, Math.min(MAX_T, Math.round(segundos)));
  const nuevoT = previo.t ? Math.min(previo.t, t) : t;
  const total = previo.mask | (mask & 7) | BIT.paso;
  rec[nivel] = empaquetar(nuevoT, total);
  return { previo: previo.t, nuevoRecord: !previo.t || t < previo.t, mask: total, nuevas: total & ~previo.mask & 7 };
}
// Une dos conjuntos de récords: el menor tiempo de cada nivel y todas las estrellas ganadas en cualquiera. Acepta basura (datos de la nube).
// Devuelve null si no hay ninguno. Las claves salen en orden numérico (el texto JSON es siempre el mismo: progreso.js compara textos).
export function unirRec(a, b) {
  const t = {}, m = {};
  for (const r of [a, b]) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) {
      const n = Math.floor(Number(k));
      if (!(n >= 1 && n <= MAX_NIVEL) || String(n) !== k) continue;
      const x = desempaquetar(r[k]);
      if (!x.t) continue;
      t[n] = t[n] ? Math.min(t[n], x.t) : x.t;
      m[n] = (m[n] || 0) | x.mask | BIT.paso;
    }
  }
  const claves = Object.keys(t).map(Number).sort((x, y) => x - y);
  if (!claves.length) return null;
  const r = {};
  for (const n of claves) r[n] = empaquetar(t[n], m[n]);
  return r;
}
