// Ruta: solitario/juego-solitario.js (lógica del juego «solitario»: Klondike clásico)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";
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
const AYUDA = "Toca una carta y luego el lugar donde quieres ponerla. Toca una carta seleccionada otra vez para subirla a la base.";

const PALOS = ["♠", "♥", "♦", "♣"];
const VALS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const $ = (id) => document.getElementById(id);
const tablero = $("tablero"), estado = $("estado"), btnEntrar = $("entrar");
const rojo = (c) => c.s === 1 || c.s === 2;

let mazo, descarte, base, tab, puntos, movs, sel, historial, inicioT, reloj, terminado, guardado, usuario = null;
let cfg = { robar: 1, reciclajes: Infinity }, reciclados = 0, actual = null, pagina = 0;
let boost = false;          // boost «deshacer» activo en el nivel actual
let deshechoSeguido = false; // true si ya se deshizo y aún no hay un movimiento nuevo

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

// ---- Progreso de niveles (en este dispositivo) ----
function leerProgreso() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {}; } catch (e) { return {}; }
}
function guardarProgreso(n, pts) {
  const p = leerProgreso();
  p[n] = Math.max(p[n] || 0, pts);
  try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(p)); } catch (e) {}
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
  pintarMonedas();
}
function pintarMonedas() { $("monedas-barra").textContent = "🪙 " + leerMonedas(); }

// ---- Vistas ----
const VISTAS = ["menu", "dificultad", "niveles", "juego"];
function mostrar(v) {
  VISTAS.forEach((n) => { $("vista-" + n).hidden = n !== v; });
  if (v === "niveles") pintarNiveles();
}
document.querySelectorAll("[data-volver]").forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.volver)));
$("ir-rapida").addEventListener("click", () => mostrar("dificultad"));
$("ir-niveles").addEventListener("click", () => mostrar("niveles"));
document.querySelectorAll("[data-dif]").forEach((b) =>
  b.addEventListener("click", () => nueva({ dificultad: b.dataset.dif })));
$("menu").addEventListener("click", async () => {
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
  await abandonar();
  actual = opc = opc || actual || { dificultad: "facil" };
  let semilla, dif;
  if (opc.nivel) {
    const datos = nivel(opc.nivel);
    if (!datos) return;
    dif = datos.dificultad; semilla = datos.semilla;
    $("titulo-partida").textContent = "Nivel " + opc.nivel + " · " + DIFICULTADES[dif].emoji + " " + DIFICULTADES[dif].nombre;
    $("nueva").textContent = "Reiniciar nivel";
  } else {
    dif = opc.dificultad;
    $("titulo-partida").textContent = "Partida rápida · " + DIFICULTADES[dif].emoji + " " + DIFICULTADES[dif].nombre;
    $("nueva").textContent = "Nueva partida";
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
  if (!usuario || !(puntos > 0)) return;
  try { await sumarPuntos(ID, puntos); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
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
  if (terminado) return;
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
  $("deshacer").disabled = !historial.length || terminado || (enNivel && !boost && deshechoSeguido);
  $("boost").textContent = boost ? "Boost activo ✓" : "Boost: deshacer (" + COSTO_BOOST + " 🪙)";
  $("boost").disabled = boost || terminado;
  pintarMonedas();
}

pintarMonedas();
mostrar("menu");
