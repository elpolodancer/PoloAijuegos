// Ruta: solitario/juego-solitario.js (lógica del juego «solitario»: Klondike clásico)
import { encolarPuntos } from "../compartido/cola-puntos.js"; // no usa Firebase: anota puntos aunque no haya internet o sesión
import { DIFICULTADES, TOTAL_NIVELES, PLAN, SEMILLAS, nivel } from "./niveles-solitario.js";
import { animarVictoria } from "./victoria-solitario.js";

const ID = "solitario"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---- Ajustes ----
const PTS = { descarteATablero: 5, aBase: 10, voltear: 5, baseATablero: -15, reciclar: -100 };
const bonoVictoria = (seg) => 100 + Math.max(0, Math.round((600 - seg) / 6)); // más rápido = más bono
const POR_PAGINA = 50; // niveles que se ven por página en la lista
const CLAVE_PROGRESO = "solitario-niveles"; // localStorage: { [nivel]: mejor puntaje }
const CLAVE_MONEDAS = "solitario-monedas";  // localStorage: número de monedas
const CLAVE_TIEMPOS = "solitario-tiempos";  // localStorage: { [nivel]: mejor tiempo en segundos }
const PREMIO_RAPIDA = 25; // monedas por ganar una partida rápida
const PREMIO_NIVEL = 50;  // monedas por ganar un nivel
const COSTO_BOOST = 10;   // precio del boost «deshacer»
const AYUDA = "Arrastra una carta, o tócala y luego toca el lugar donde quieres ponerla. Toca una carta seleccionada otra vez para subirla a la base.";
const DURACION_VUELO = 170; // «Rellenar todo»: ms que tarda cada carta en volar a su base
const PAUSA_CARTA = 45;     // «Rellenar todo»: ms de pausa entre una carta y la siguiente
const PAUSA_ROBAR = 60;     // «Rellenar todo»: ms de pausa al robar del mazo
const UMBRAL_ARRASTRE = 6;  // píxeles que hay que mover una carta para que cuente como arrastre (menos = toque normal)
const CLIC_FANTASMA_MS = 120; // tras soltar una carta se ignora el «click» automático del navegador durante este tiempo

const PALOS = ["♠", "♥", "♦", "♣"];
const VALS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const $ = (id) => document.getElementById(id);
const tablero = $("tablero"), estado = $("estado"), btnEntrar = $("entrar");
const rojo = (c) => c.s === 1 || c.s === 2;
// Los botones de la partida solo llevan emoji: su texto va en title y aria-label
function rotular(id, texto) { const b = $(id); b.title = texto; b.setAttribute("aria-label", texto); }

let mazo, descarte, base, tab, puntos, movs, sel, historial, inicioT, reloj, terminado, guardado, usuario = null;
let cfg = { robar: 1, reciclajes: Infinity }, reciclados = 0, actual = null, pagina = 0;
let boost = false;          // boost «deshacer» activo en el nivel actual
let deshechoSeguido = false; // true si ya se deshizo y aún no hay un movimiento nuevo
let llenando = false, llenadoId = 0; // «Rellenar todo» en marcha / número de la tanda (si cambia, la tanda se cancela)
let bloqueaClicHasta = 0;            // tras un arrastre se ignora el «click» que el navegador manda al soltar

// La sesión y la nube se cargan aparte: si Firebase no está disponible (sin conexión la primera vez), el juego funciona igual
let entrarFn = null, nube = null;
import("../compartido/jugador.js").then((m) => { entrarFn = m.entrar; m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; }); }).catch(() => {});
btnEntrar.addEventListener("click", () => { if (entrarFn) entrarFn().catch((e) => { estado.textContent = e.message; }); });

// ---- Progreso de niveles (en este dispositivo) ----
function leerProgreso() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {}; } catch (e) { return {}; }
}
function guardarProgreso(n, pts) {
  const p = leerProgreso();
  p[n] = Math.max(p[n] || 0, pts);
  try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(p)); } catch (e) {}
  guardarCopia(true);
}

// ---- Récords de tiempo por nivel (en este dispositivo) ----
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
function leerTiempos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_TIEMPOS)) || {}; } catch (e) { return {}; }
}
// Guarda el tiempo si es el primero o mejora el récord; devuelve true si se guardó
function guardarTiempo(n, seg) {
  const t = leerTiempos();
  if (t[n] !== undefined && seg >= t[n]) return false;
  t[n] = seg;
  try { localStorage.setItem(CLAVE_TIEMPOS, JSON.stringify(t)); } catch (e) {}
  guardarCopia(true);
  return true;
}
function pintarRecord() {
  const n = actual && actual.nivel;
  $("record-wrap").hidden = !n;
  if (n) { const t = leerTiempos()[n]; $("record").textContent = t === undefined ? "–" : fmt(t); }
}

// ---- Monedas (en este dispositivo) ----
function leerMonedas() {
  try { return Math.max(0, Math.floor(Number(localStorage.getItem(CLAVE_MONEDAS))) || 0); } catch (e) { return 0; }
}
function ponerMonedas(n) {
  try { localStorage.setItem(CLAVE_MONEDAS, String(Math.max(0, Math.floor(n)))); } catch (e) {}
  guardarCopia(true);
  pintarMonedas();
}
function pintarMonedas() { $("monedas-barra").textContent = "🪙 " + leerMonedas(); }

// ---- Copia para la nube ----
// { n: mejor puntaje por nivel, t: mejor tiempo por nivel, g / s: monedas ganadas y gastadas EN TOTAL (monedas = g − s) }.
// Se une así: puntajes y totales por el mayor, tiempos por el menor. Gastar en un dispositivo no se «devuelve» al sincronizar con otro.
const CLAVE_NUBE = "solitario-nube";
function guardarCopia(avisar) {
  let prev = {};
  try { prev = JSON.parse(localStorage.getItem(CLAVE_NUBE)) || {}; } catch (e) {}
  const c = leerMonedas();
  let g = Math.max(0, Math.floor(Number(prev.g)) || 0), s = Math.max(0, Math.floor(Number(prev.s)) || 0);
  if (g - s < c) g = c + s; else if (g - s > c) s = g - c; // lo que subió cuenta como ganado y lo que bajó como gastado
  const copia = JSON.stringify({ n: leerProgreso(), t: leerTiempos(), g, s });
  try {
    if (localStorage.getItem(CLAVE_NUBE) === copia) return;
    localStorage.setItem(CLAVE_NUBE, copia);
  } catch (e) { return; }
  if (avisar && nube) nube.guardado();
}
function unirSolitario(a, b) {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const mayor = (x, y) => { const r = { ...(y || {}) }; for (const k in x || {}) r[k] = Math.max(Number(x[k]) || 0, Number(r[k]) || 0); return r; };
  const menor = (x, y) => { const r = { ...(y || {}) }; for (const k in x || {}) r[k] = k in r ? Math.min(Number(x[k]), Number(r[k])) : Number(x[k]); return r; };
  return { n: mayor(a.n, b.n), t: menor(a.t, b.t), g: Math.max(Number(a.g) || 0, Number(b.g) || 0), s: Math.max(Number(a.s) || 0, Number(b.s) || 0) };
}
function aplicarNube(v) { // la nube trajo algo nuevo: se copia a las claves de siempre y se repinta
  if (!v) return;
  try {
    if (v.n) localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(v.n));
    if (v.t) localStorage.setItem(CLAVE_TIEMPOS, JSON.stringify(v.t));
    if ("g" in v) localStorage.setItem(CLAVE_MONEDAS, String(Math.max(0, (Number(v.g) || 0) - (Number(v.s) || 0))));
  } catch (e) {}
  pintarMonedas(); pintarRecord();
  if (!$("vista-niveles").hidden) pintarNiveles();
}

// ---- Vistas ----
const VISTAS = ["menu", "dificultad", "niveles", "juego"];
function mostrar(v) {
  VISTAS.forEach((n) => { $("vista-" + n).hidden = n !== v; });
  document.body.classList.toggle("jugando", v === "juego"); // los marcadores y botones de la partida solo se ven jugando
  if (v === "niveles") pintarNiveles();
}
document.querySelectorAll("[data-volver]").forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.volver)));
$("ir-rapida").addEventListener("click", () => mostrar("dificultad"));
$("ir-niveles").addEventListener("click", () => mostrar("niveles"));
document.querySelectorAll("[data-dif]").forEach((b) =>
  b.addEventListener("click", () => nueva({ dificultad: b.dataset.dif })));
$("menu").addEventListener("click", async () => {
  llenadoId++; llenando = false;
  await abandonar();
  clearInterval(reloj);
  mostrar("menu");
});

// ---- Lista de niveles ----
function pintarNiveles() {
  const prog = leerProgreso();
  const tiempos = leerTiempos();
  const rejilla = $("rejilla-niveles");
  rejilla.innerHTML = "";
  const desde = pagina * POR_PAGINA + 1, hasta = Math.min(desde + POR_PAGINA - 1, TOTAL_NIVELES);
  for (let n = desde; n <= hasta; n++) {
    const dif = PLAN[n - 1];
    const creado = !!nivel(n);
    const hecho = prog[n] !== undefined;
    const abierto = creado && (n === 1 || prog[n - 1] !== undefined);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nivel " + dif + (hecho ? " hecho" : "") + (creado ? (abierto ? "" : " cerrado") : " pronto");
    b.textContent = hecho ? n + " ✓" : abierto ? String(n) : creado ? n + " 🔒" : String(n);
    b.title = "Nivel " + n + " · " + DIFICULTADES[dif].nombre + (creado ? "" : " (próximamente)") +
      (hecho && tiempos[n] !== undefined ? " · Récord " + fmt(tiempos[n]) : "");
    if (hecho && tiempos[n] !== undefined) {
      const s = document.createElement("small");
      s.textContent = "⏱ " + fmt(tiempos[n]);
      b.appendChild(s);
    }
    b.disabled = !abierto;
    if (abierto) b.addEventListener("click", () => nueva({ nivel: n }));
    rejilla.appendChild(b);
  }
  $("pag-texto").textContent = "Niveles " + desde + "–" + hasta;
  $("pag-ant").disabled = pagina === 0;
  $("pag-sig").disabled = hasta >= TOTAL_NIVELES;
  const cuenta = (d) => PLAN.filter((x) => x === d).length;
  $("resumen-niveles").textContent =
    "Creados: " + Object.keys(SEMILLAS).length + " de " + TOTAL_NIVELES +
    " · Plan: " + cuenta("facil") + " fáciles, " + cuenta("media") + " normales, " + cuenta("dificil") + " difíciles.";
}
$("pag-ant").addEventListener("click", () => { pagina = Math.max(0, pagina - 1); pintarNiveles(); });
$("pag-sig").addEventListener("click", () => { pagina = Math.min(Math.ceil(TOTAL_NIVELES / POR_PAGINA) - 1, pagina + 1); pintarNiveles(); });

// ---- Partida ----
// Generador con semilla: la misma semilla reparte siempre las mismas cartas (para los niveles)
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
async function abandonar() {
  if (!terminado && !guardado && puntos > 0) await guardar(); // al abandonar, se guardan los puntos ganados
}
// opc: { dificultad } para partida rápida, o { nivel: n } para un nivel
async function nueva(opc) {
  llenadoId++; llenando = false;
  await abandonar();
  actual = opc = opc || actual || { dificultad: "facil" };
  let semilla, dif;
  if (opc.nivel) {
    const datos = nivel(opc.nivel);
    if (!datos) return;
    dif = datos.dificultad; semilla = datos.semilla;
    $("titulo-partida").textContent = "Nivel " + opc.nivel + " · " + DIFICULTADES[dif].emoji + " " + DIFICULTADES[dif].nombre;
    rotular("nueva", "Reiniciar nivel");
  } else {
    dif = opc.dificultad;
    $("titulo-partida").textContent = "Partida rápida · " + DIFICULTADES[dif].emoji + " " + DIFICULTADES[dif].nombre;
    rotular("nueva", "Nueva partida");
  }
  cfg = { robar: DIFICULTADES[dif].robar, reciclajes: DIFICULTADES[dif].reciclajes };
  const rnd = semilla !== undefined ? mulberry32(semilla) : Math.random;
  const b = [];
  for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) b.push({ v, s, up: false });
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  tab = [];
  for (let i = 0; i < 7; i++) { const p = b.splice(0, i + 1); p[i].up = true; tab.push(p); }
  mazo = b; descarte = []; base = [[], [], [], []];
  puntos = 0; movs = 0; reciclados = 0; sel = null; historial = []; terminado = false; guardado = false;
  $("siguiente").hidden = true;
  boost = false; deshechoSeguido = false;
  $("boost").hidden = !opc.nivel; // el boost solo existe en los niveles
  pintarRecord();
  inicioT = Date.now();
  clearInterval(reloj);
  reloj = setInterval(pintarTiempo, 1000);
  estado.textContent = AYUDA;
  mostrar("juego");
  dibujar();
}
async function guardar() {
  guardado = true;
  if (!(puntos > 0)) return;
  encolarPuntos(ID, puntos); // se anota siempre; se envía al haber internet y sesión
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  estado.textContent += pendientes === 0 ? " Guardados ✓" : " Se enviarán a tu perfil cuando haya internet y sesión.";
}
function pintarTiempo() {
  if (terminado) return;
  const s = Math.floor((Date.now() - inicioT) / 1000);
  $("tiempo").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// ---- Reglas ----
const pila = (t, i) => (t === "tab" ? tab[i] : t === "base" ? base[i] : descarte);
function puede(t, i, cartas) {
  const p = pila(t, i), c = cartas[0], top = p[p.length - 1];
  if (t === "base") return cartas.length === 1 && (top ? top.s === c.s && c.v === top.v + 1 : c.v === 1);
  if (t === "tab") return top ? top.up && top.v === c.v + 1 && rojo(top) !== rojo(c) : c.v === 13;
  return false;
}
function historia() { historial.push(JSON.stringify({ mazo, descarte, base, tab, puntos, movs, reciclados })); }
function deshacer() {
  if (!historial.length || terminado) return;
  const enNivel = !!(actual && actual.nivel);
  // En niveles solo se puede deshacer 1 vez seguida (salvo con el boost)
  if (enNivel && !boost && deshechoSeguido) {
    estado.textContent = "En los niveles solo puedes deshacer una vez seguida: haz otro movimiento o usa el boost.";
    return;
  }
  ({ mazo, descarte, base, tab, puntos, movs, reciclados } = JSON.parse(historial.pop()));
  deshechoSeguido = true;
  sel = null;
  dibujar();
}
function comprarBoost() {
  if (!(actual && actual.nivel) || boost || terminado) return;
  if (leerMonedas() < COSTO_BOOST) { estado.textContent = "Te faltan monedas: el boost cuesta " + COSTO_BOOST + " 🪙."; return; }
  ponerMonedas(leerMonedas() - COSTO_BOOST);
  boost = true;
  estado.textContent = "Boost activo: puedes deshacer todas las veces que quieras en este nivel.";
  dibujar();
}
function mover(o, d) {
  historia();
  deshechoSeguido = false; // movimiento nuevo: se puede volver a deshacer una vez
  const cartas = pila(o.t, o.i).splice(o.k);
  pila(d.t, d.i).push(...cartas);
  let g = 0;
  if (d.t === "base") g += PTS.aBase;
  else if (o.t === "descarte") g += PTS.descarteATablero;
  else if (o.t === "base") g += PTS.baseATablero;
  if (o.t === "tab") {
    const og = tab[o.i];
    if (og.length && !og[og.length - 1].up) { og[og.length - 1].up = true; g += PTS.voltear; }
  }
  puntos = Math.max(0, puntos + g);
  movs++; sel = null;
  dibujar();
  if (base.every((p) => p.length === 13)) ganar();
}
function haciaBase(o) { // intenta subir la carta de arriba de esa pila a la base
  const p = pila(o.t, o.i), c = p[p.length - 1];
  if (!c || o.k !== p.length - 1) return false;
  const i = base.findIndex((_, n) => puede("base", n, [c]));
  if (i < 0) return false;
  mover(o, { t: "base", i });
  return true;
}
function robar() {
  historia(); sel = null;
  if (mazo.length) { for (let n = 0; n < cfg.robar && mazo.length; n++) { const c = mazo.pop(); c.up = true; descarte.push(c); } }
  else if (descarte.length) {
    if (reciclados >= cfg.reciclajes) { historial.pop(); estado.textContent = "Ya no quedan reciclajes del mazo en este nivel."; return; }
    reciclados++;
    mazo = descarte.reverse().map((c) => ({ ...c, up: false })); descarte = []; puntos = Math.max(0, puntos + PTS.reciclar);
  }
  else { historial.pop(); return; }
  deshechoSeguido = false; // robar también es un movimiento nuevo
  movs++;
  dibujar();
}
function ganar() {
  terminado = true;
  clearInterval(reloj);
  const seg = Math.floor((Date.now() - inicioT) / 1000);
  puntos += bonoVictoria(seg);
  const premio = actual && actual.nivel ? PREMIO_NIVEL : PREMIO_RAPIDA;
  ponerMonedas(leerMonedas() + premio);
  dibujar();
  estado.textContent = "🎉 ¡Ganaste! Terminaste con " + puntos + " puntos en " + $("tiempo").textContent + ". +" + premio + " 🪙";
  if (actual && actual.nivel) {
    guardarProgreso(actual.nivel, puntos);
    const previo = leerTiempos()[actual.nivel];
    if (guardarTiempo(actual.nivel, seg)) {
      estado.textContent += previo === undefined ? " ⏱ Tiempo guardado: " + fmt(seg) + "." : " 🏆 ¡Nuevo récord! " + fmt(seg) + " (antes " + fmt(previo) + ").";
    } else {
      estado.textContent += " Tu récord sigue en " + fmt(previo) + ".";
    }
    pintarRecord();
    $("siguiente").hidden = !nivel(actual.nivel + 1);
  }
  guardar();
  // Animación de victoria: las cartas salen de las bases, caen y rebotan (se salta tocando la pantalla)
  animarVictoria({ base, VALS, PALOS, pintarBase, alTerminar: dibujar });
}
// Redibuja una base con la carta indicada (o vacía); lo usa la animación mientras las cartas salen
function pintarBase(i, c) {
  const el = tablero.querySelector('.pila[data-t="base"][data-i="' + i + '"]');
  if (!el) return;
  el.innerHTML = "";
  if (c) el.appendChild(carta(c, 0, 0, 0, false));
}
$("siguiente").addEventListener("click", () => nueva({ nivel: actual.nivel + 1 }));

// ---- Toques ----
tablero.addEventListener("click", (e) => {
  if (terminado || llenando || performance.now() < bloqueaClicHasta) return;
  const pe = e.target.closest(".pila");
  if (!pe) return;
  const t = pe.dataset.t, i = +pe.dataset.i;
  if (t === "mazo") return robar();
  const ce = e.target.closest(".carta");
  const p = pila(t, i);
  const k = ce ? +ce.dataset.k : -1;
  if (sel) {
    const mismaPila = sel.t === t && sel.i === i;
    if (mismaPila && k === sel.k) { if (!haciaBase(sel)) { sel = null; dibujar(); } return; } // tocar la misma carta: subir o soltar
    if (!mismaPila && t !== "descarte" && !(sel.t === "base" && t === "base") && puede(t, i, pila(sel.t, sel.i).slice(sel.k))) return mover(sel, { t, i });
  }
  // Seleccionar: en el tablero cualquier carta visible; en descarte y base solo la de arriba
  const valida = k >= 0 && p[k].up && (t === "tab" || k === p.length - 1);
  sel = valida ? { t, i, k } : null;
  dibujar();
});
$("nueva").addEventListener("click", () => nueva(actual));
$("deshacer").addEventListener("click", deshacer);
$("boost").addEventListener("click", comprarBoost);

// ---- Rellenar todo ----
// Cuando no queda ninguna carta boca abajo, las cartas suben solas a las bases, una por una y en orden (A, 2, 3…).
// planRelleno() simula la partida SIN tocarla y devuelve la lista de pasos, o null si todavía no se puede terminar sola
// (hay cartas boca abajo, o el mazo no alcanza con los reciclajes que quedan). Con eso se decide si se muestra el botón.
function planRelleno() {
  if (terminado || llenando || !tab || tab.some((p) => p.some((c) => !c.up))) return null;
  const copia = (c) => ({ v: c.v, s: c.s });
  const cols = tab.map((p) => p.map(copia));
  let mz = mazo.map(copia), ds = descarte.map(copia), rec = reciclados;
  const h = [0, 0, 0, 0]; // cartas ya en la base de cada palo
  base.forEach((p) => { if (p.length) h[p[p.length - 1].s] = p.length; });
  const pasos = [];
  let sinAvance = 0;
  while (h[0] + h[1] + h[2] + h[3] < 52) {
    // De las cartas a la vista que ya caben en una base, sube la de menor valor (así sale todo en orden)
    let mejor = null;
    cols.forEach((p, i) => {
      const c = p[p.length - 1];
      if (c && h[c.s] === c.v - 1 && (!mejor || c.v < mejor.c.v)) mejor = { c, paso: { t: "tab", i } };
    });
    const w = ds[ds.length - 1];
    if (w && h[w.s] === w.v - 1 && (!mejor || w.v < mejor.c.v)) mejor = { c: w, paso: { t: "descarte", i: 0 } };
    if (mejor) {
      if (mejor.paso.t === "tab") cols[mejor.paso.i].pop(); else ds.pop();
      h[mejor.c.s]++; pasos.push(mejor.paso); sinAvance = 0;
      continue;
    }
    // Si no hay ninguna, se roba del mazo (con las mismas reglas de la dificultad)
    if (mz.length) { for (let n = 0; n < cfg.robar && mz.length; n++) ds.push(mz.pop()); }
    else if (ds.length && rec < cfg.reciclajes) { rec++; mz = ds.reverse(); ds = []; }
    else return null;
    pasos.push({ t: "robar" });
    if (++sinAvance > 60) return null; // dio la vuelta al mazo sin poder subir nada
  }
  return pasos;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// Una copia de la carta vuela desde su lugar hasta la base (si el sistema pide «reducir movimiento», no vuela)
async function volar(o, d) {
  const pe = tablero.querySelector('.pila[data-t="' + o.t + '"][data-i="' + o.i + '"]');
  const dest = tablero.querySelector('.pila[data-t="base"][data-i="' + d + '"]');
  const ce = pe && pe.querySelector('.carta[data-k="' + o.k + '"]');
  if (!ce || !dest || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rt = tablero.getBoundingClientRect(), rc = ce.getBoundingClientRect(), rd = dest.getBoundingClientRect();
  const v = ce.cloneNode(true);
  v.classList.remove("sel");
  v.style.top = rc.top - rt.top - tablero.clientTop + "px";
  v.style.left = rc.left - rt.left - tablero.clientLeft + "px";
  v.style.zIndex = "50"; v.style.pointerEvents = "none";
  ce.style.visibility = "hidden";
  tablero.appendChild(v);
  const anim = v.animate(
    [{ transform: "translate(0, 0)" }, { transform: "translate(" + (rd.left - rc.left) + "px, " + (rd.top - rc.top) + "px)" }],
    { duration: DURACION_VUELO, easing: "ease-in-out" });
  await anim.finished.catch(() => {});
  v.remove();
}
async function rellenar() {
  const pasos = planRelleno();
  if (!pasos) return;
  const id = ++llenadoId;
  llenando = true; sel = null;
  estado.textContent = "Rellenando…";
  dibujar();
  for (const p of pasos) {
    if (id !== llenadoId || terminado) break;
    if (p.t === "robar") { robar(); await esperar(PAUSA_ROBAR); continue; }
    const o = p.t === "tab" ? { t: "tab", i: p.i, k: tab[p.i].length - 1 } : { t: "descarte", i: 0, k: descarte.length - 1 };
    const c = pila(o.t, o.i)[o.k];
    const d = c ? base.findIndex((_, n) => puede("base", n, [c])) : -1;
    if (d < 0) break;
    await volar(o, d);
    if (id !== llenadoId) break;
    mover(o, { t: "base", i: d }); // si es la última carta, mover() llama a ganar() y sale la cascada
    await esperar(PAUSA_CARTA);
  }
  if (id === llenadoId) {
    llenando = false;
    if (!terminado) { estado.textContent = AYUDA; dibujar(); }
  }
}
$("rellenar").addEventListener("click", rellenar);

// ---- Arrastrar cartas ----
// Se puede arrastrar cualquier carta boca arriba del tablero (con las que van encima), la de arriba del descarte y la de arriba de una base.
// Mover menos de UMBRAL_ARRASTRE píxeles sigue siendo un toque normal (el «click» de arriba).
let arr = null; // arrastre en curso: { o: {t, i, k}, pe, x0, y0, pid, activo, fantasma }
tablero.addEventListener("pointerdown", (e) => {
  if (terminado || llenando || arr || (e.pointerType === "mouse" && e.button !== 0)) return;
  const ce = e.target.closest(".carta"), pe = e.target.closest(".pila");
  if (!ce || !pe) return;
  const t = pe.dataset.t, i = +pe.dataset.i;
  if (t === "mazo") return;
  const p = pila(t, i), k = +ce.dataset.k;
  if (!p[k] || !p[k].up || !(t === "tab" || k === p.length - 1)) return;
  arr = { o: { t, i, k }, pe, x0: e.clientX, y0: e.clientY, pid: e.pointerId, activo: false, fantasma: null };
});
function empezarArrastre() {
  const originales = [...arr.pe.querySelectorAll(".carta")].filter((c) => +c.dataset.k >= arr.o.k);
  const rt = tablero.getBoundingClientRect(), r0 = originales[0].getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "fantasma";
  f.style.left = r0.left - rt.left - tablero.clientLeft + "px";
  f.style.top = r0.top - rt.top - tablero.clientTop + "px";
  originales.forEach((c) => {
    const r = c.getBoundingClientRect(), n = c.cloneNode(true);
    n.classList.remove("sel");
    n.style.top = r.top - r0.top + "px";
    n.style.left = r.left - r0.left + "px";
    f.appendChild(n);
    c.classList.add("arrastrando"); // la original se esconde mientras se arrastra su copia
  });
  tablero.appendChild(f);
  arr.fantasma = f; arr.activo = true; sel = null;
}
// A qué pila se puede soltar: primero la que más se solape con la carta arrastrada; si no hay, la que está bajo el dedo
function destinoDe(a, e) {
  const cartas = pila(a.o.t, a.o.i).slice(a.o.k);
  const legal = (el) => {
    if (!el) return null;
    const t = el.dataset.t, i = +el.dataset.i;
    if (t === "mazo" || t === "descarte" || (t === a.o.t && i === a.o.i) || (a.o.t === "base" && t === "base")) return null;
    return puede(t, i, cartas) ? { t, i } : null;
  };
  const rf = a.fantasma.firstElementChild.getBoundingClientRect();
  let mejor = null, mejorArea = 0;
  tablero.querySelectorAll(".pila").forEach((el) => {
    const d = legal(el);
    if (!d) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, rf.right) - Math.max(r.left, rf.left), h = Math.min(r.bottom, rf.bottom) - Math.max(r.top, rf.top);
    if (w > 0 && h > 0 && w * h > mejorArea) { mejorArea = w * h; mejor = d; }
  });
  if (mejor) return mejor;
  const bajo = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest(".pila")).find((n) => n && tablero.contains(n));
  return legal(bajo);
}
addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.pid) return;
  const dx = e.clientX - arr.x0, dy = e.clientY - arr.y0;
  if (!arr.activo) {
    if (Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;
    empezarArrastre();
  }
  arr.fantasma.style.transform = "translate(" + dx + "px, " + dy + "px)";
});
function soltar(e, cancelado) {
  if (!arr || e.pointerId !== arr.pid) return;
  const a = arr;
  arr = null;
  if (!a.activo) return; // fue un toque: lo atiende el «click» de siempre
  bloqueaClicHasta = performance.now() + CLIC_FANTASMA_MS;
  const destino = cancelado ? null : destinoDe(a, e);
  a.fantasma.remove();
  if (destino) mover(a.o, destino); else dibujar(); // si no cabe en ningún lado, la carta vuelve a su lugar
  bloqueaClicHasta = performance.now() + CLIC_FANTASMA_MS; // el «click» sale justo al soltar; pasado ese instante, los toques vuelven a contar
}
addEventListener("pointerup", (e) => soltar(e, false));
addEventListener("pointercancel", (e) => soltar(e, true));

// ---- Dibujo ----
function carta(c, k, top, left, marcada) {
  const d = document.createElement("div");
  d.className = "carta" + (c.up ? (rojo(c) ? " roja" : "") : " abajo") + (marcada ? " sel" : "");
  d.dataset.k = String(k);
  d.style.top = "calc(var(--w) * " + top + ")";
  if (left) d.style.left = "calc(var(--w) * " + left + ")";
  if (c.up) {
    const m = document.createElement("span");
    m.className = "c"; m.textContent = PALOS[c.s];
    d.append(indice("e", c), m, indice("f", c)); // esquina arriba-izquierda, símbolo central y esquina invertida
  }
  return d;
}
function indice(clase, c) { // número arriba y palo debajo
  const s = document.createElement("span"), r = document.createElement("b"), p = document.createElement("i");
  s.className = clase; r.textContent = VALS[c.v]; p.textContent = PALOS[c.s];
  s.append(r, p);
  return s;
}
function nuevaPila(t, i, fila, col) {
  const el = document.createElement("div");
  el.className = "pila";
  el.dataset.t = t; el.dataset.i = String(i);
  el.style.gridRow = String(fila); el.style.gridColumn = String(col);
  tablero.appendChild(el);
  return el;
}
const esSel = (t, i, k) => !!sel && sel.t === t && sel.i === i && k >= sel.k;
function dibujar() {
  tablero.innerHTML = "";
  // Mazo
  const m = nuevaPila("mazo", 0, 1, 1);
  if (mazo.length) m.appendChild(carta({ up: false }, 0, 0));
  else if (descarte.length) {
    const r = document.createElement("div");
    r.className = "reciclar";
    r.textContent = reciclados >= cfg.reciclajes ? "✕" : "↻"; // ✕ = ya no quedan reciclajes
    m.appendChild(r);
  }
  // Descarte (con robar = 3 se ven abiertas las últimas 3)
  const d = nuevaPila("descarte", 0, 1, 2);
  const vis = descarte.slice(-Math.min(cfg.robar, 3));
  vis.forEach((c, n) => { const k = descarte.length - vis.length + n; d.appendChild(carta(c, k, 0, n * 0.28, esSel("descarte", 0, k))); });
  // Bases
  base.forEach((p, i) => {
    const b = nuevaPila("base", i, 1, 4 + i);
    if (p.length) b.appendChild(carta(p[p.length - 1], p.length - 1, 0, 0, esSel("base", i, p.length - 1)));
  });
  // Tablero: 7 columnas
  tab.forEach((p, i) => {
    const el = nuevaPila("tab", i, 2, 1 + i);
    let f = 0, ult = 0;
    p.forEach((c, k) => { el.appendChild(carta(c, k, f, 0, esSel("tab", i, k))); ult = f; f += c.up ? 0.5 : 0.24; });
    el.style.height = "calc(var(--w) * " + (1.4 + ult) + ")";
  });
  $("marcador").textContent = String(puntos);
  $("movs").textContent = String(movs);
  $("recic").textContent = cfg.reciclajes === Infinity ? "∞" : reciclados + "/" + cfg.reciclajes;
  pintarTiempo();
  // Botones de deshacer y boost
  const enNivel = !!(actual && actual.nivel);
  $("deshacer").disabled = !historial.length || terminado || llenando || (enNivel && !boost && deshechoSeguido);
  $("boost").classList.toggle("on", boost);
  rotular("boost", boost ? "Boost activo: deshacer sin límite" : "Boost: deshacer sin límite (" + COSTO_BOOST + " monedas)");
  $("boost").disabled = boost || terminado || llenando;
  $("rellenar").hidden = !planRelleno(); // aparece cuando ya no queda ninguna carta bloqueada y la partida se puede terminar sola
  pintarMonedas();
}

pintarMonedas();
mostrar("menu");
if (Object.keys(leerProgreso()).length || Object.keys(leerTiempos()).length || leerMonedas() > 0) guardarCopia(false); // primera vez: crea la copia solo si ya había algo
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE_NUBE, fusionar: unirSolitario, alCambiar: aplicarNube });
}).catch(() => {});

// El mensaje de abajo reaparece con cada texto nuevo y se desvanece solo (ver #estado.flota en la página)
new MutationObserver(() => { estado.classList.remove("flota"); void estado.offsetWidth; estado.classList.add("flota"); })
  .observe(estado, { childList: true, characterData: true, subtree: true });
