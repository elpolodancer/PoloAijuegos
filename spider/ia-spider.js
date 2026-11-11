// Ruta: spider/ia-spider.js
// BOT DE BACKTRACKING del Spider: busca una solución completa de un reparto para comprobar que el nivel se puede ganar.
// Lo usan el juego (para «✔ con solución» en el modo libre) y verificar-spider.mjs (comprobar muchos niveles de una vez).
//  - El bot ve TODAS las cartas (también las boca abajo): «ganable con información perfecta». Una persona no las ve, así que
//    es una cota optimista; para niveles fijos es lo habitual y suficiente.
//  - Es CORRECTO pero no completo: si devuelve una solución, esa solución es válida (se re-comprueba con comprobar());
//    si se queda sin presupuesto devuelve «no se sabe» (resuelto:false, agotado:true), nunca «imposible».
//  - Búsqueda en profundidad con memoria de estados ya vistos (el orden de las columnas no cuenta), jugadas ordenadas por una
//    heurística y repartir del mazo siempre al final.
import { jugadas, mover, repartir, puedeRepartir, puedeMover, clonar, ganada, nuevaPartida, aleatorio, palo, rango, NUM_COL } from "./logica-spider.js";

const ahora = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const mezcla = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return (x ^ (x >>> 16)) >>> 0; };

// Huella de 53 bits del estado; no depende del orden de las columnas
function huella(e) {
  let a = 0, b = 0;
  for (let c = 0; c < NUM_COL; c++) {
    const col = e.cols[c], o = e.ocultas[c];
    let h1 = 2166136261, h2 = 5381;
    for (let i = 0; i < col.length; i++) { const v = col[i] + 1 + (i < o ? 64 : 0); h1 = Math.imul(h1 ^ v, 16777619); h2 = Math.imul(h2, 33) ^ v; }
    a = (a + mezcla(h1 ^ col.length)) >>> 0; b = (b + mezcla(h2 + 7 * col.length)) >>> 0;
  }
  a = (a + mezcla(e.rep * 977 + e.hechos * 31)) >>> 0;
  return (a & 0x1fffff) * 4294967296 + b;
}
// Qué tan prometedor se ve un estado (más es mejor)
function valor(e) {
  let v = e.hechos * 600;
  for (let c = 0; c < NUM_COL; c++) {
    const col = e.cols[c], o = e.ocultas[c], n = col.length;
    v -= o * 10;                                   // cada carta boca abajo pesa
    if (!n) { v += 40; continue; }                 // columna vacía: muy útil
    let tramos = 1;                                // cuántos «bloques» tiene la parte visible (menos = más ordenada)
    for (let i = Math.max(o, 0) + 1; i < n; i++) {
      const a = col[i - 1], b = col[i];
      if (rango(a) === rango(b) + 1) v += palo(a) === palo(b) ? 10 : 1;
      if (!(rango(a) === rango(b) + 1 && palo(a) === palo(b))) tramos++;
    }
    v -= tramos * 3;
    v += Math.min(o === 0 ? n : 0, 0);
  }
  v -= (e.reparto.length / NUM_COL - e.rep) * 0; // repartir no se castiga: es parte del juego
  return v;
}

// Busca una solución. Devuelve { resuelto, agotado, nodos, ms, solucion:[{de,k,a} | {rep:1}] }
export function resolver(e0, { maxNodos = 60000, maxMs = 1500, maxProfundidad = 1200, reinicios = 30, ancho = 6 } = {}) {
  const t0 = ahora(), porIntento = Math.ceil(maxNodos / reinicios);
  let nodos = 0, total = 0, agotado = false, vistos, sol, ruido = 0, azar;
  function dfs(e, prof) {
    if (ganada(e)) return true;
    if (++nodos > porIntento || ((nodos & 255) === 0 && ahora() - t0 > maxMs)) { agotado = true; return false; }
    const h = huella(e);
    if (vistos.has(h)) return false;
    vistos.add(h);
    if (prof >= maxProfundidad) return false;
    // Orden: 1) jugadas que avanzan (destapan, juntan escalera del mismo palo o abren columna vacía), 2) repartir, 3) el resto
    const utiles = [], otras = [];
    for (const j of jugadas(e)) {
      const n = clonar(e); mover(n, j.de, j.k, j.a);
      (j.rev || j.mismo || j.vacia || n.hechos > e.hechos ? utiles : otras).push({ j, n, v: valor(n) + (ruido ? azar() * ruido : 0) });
    }
    const orden = (x, y) => (y.n.hechos - x.n.hechos) || (y.j.rev - x.j.rev) || (y.v - x.v); // primero series, luego destapar
    utiles.sort(orden); otras.sort(orden);
    const probar = (lista) => {
      for (const { j, n } of lista.slice(0, ancho)) {
        sol.push({ de: j.de, k: j.k, a: j.a });
        if (dfs(n, prof + 1)) return true;
        sol.pop();
        if (agotado) return false;
      }
      return false;
    };
    if (probar(utiles)) return true;
    if (agotado) return false;
    if (puedeRepartir(e)) {
      const n = clonar(e); repartir(n); sol.push({ rep: 1 });
      if (dfs(n, prof + 1)) return true;
      sol.pop();
      if (agotado) return false;
    }
    if (probar(otras)) return true;
    return false;
  }
  // Varios intentos cortos con un poco de azar en el orden (un solo intento largo se atora en un rincón sin salida)
  let resuelto = false, solucion = null;
  for (let i = 0; i < reinicios && !resuelto; i++) {
    vistos = new Set(); sol = []; nodos = 0; agotado = false; ruido = i === 0 ? 0 : 6 + i; azar = aleatorio(i * 7919 + 1);
    resuelto = dfs(clonar(e0), 0);
    total += nodos;
    if (resuelto) solucion = sol.slice();
    if (ahora() - t0 > maxMs) break;
  }
  return { resuelto, agotado: !resuelto, nodos: total, ms: Math.round(ahora() - t0), solucion };
}

// Repite la solución con las reglas del juego, jugada por jugada, sin usar nada del bot: prueba independiente de que sirve
export function comprobar(e0, solucion) {
  const e = clonar(e0);
  for (const s of solucion || []) {
    if (s.rep) { if (!puedeRepartir(e)) return false; repartir(e); }
    else { if (!puedeMover(e, s.de, s.k, s.a)) return false; mover(e, s.de, s.k, s.a); }
  }
  return ganada(e);
}
// Ajustes medidos por dificultad (ver verificar-spider.mjs): 1-2 palos resuelven casi siempre; 3 a medias; 4 solo algunos repartos
export const AJUSTES = { 1: {}, 2: {}, 3: { ancho: 14, reinicios: 10 }, 4: { ancho: 3, reinicios: 60 }, 5: { ancho: 3, reinicios: 60 } };
// Reparto (dificultad, semilla) con solución comprobada, o { resuelto:false } si el presupuesto no alcanzó
export function verificar(dif, semilla, opciones) {
  const e = nuevaPartida(dif, semilla), r = resolver(e, { ...(AJUSTES[dif] || {}), ...opciones });
  return { dif, semilla, ...r, resuelto: r.resuelto && comprobar(e, r.solucion) };
}
// Prueba semillas consecutivas hasta hallar un reparto con solución. Devuelve { semilla, estado, nodos } o null
export function generarVerificada(dif, semilla, { intentos = 5, ...opciones } = {}) {
  for (let i = 0; i < intentos; i++) {
    const r = verificar(dif, semilla + i, opciones);
    if (r.resuelto) return { semilla: semilla + i, estado: nuevaPartida(dif, semilla + i), nodos: r.nodos, solucion: r.solucion };
  }
  return null;
}
