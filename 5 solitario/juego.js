// Ruta: solitario/juego.js (lógica del juego «solitario»: Klondike clásico)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "solitario"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---- Ajustes ----
const ROBAR = 1; // cartas que se roban del mazo cada vez (1 = fácil, 3 = clásico difícil)
const PTS = { descarteATablero: 5, aBase: 10, voltear: 5, baseATablero: -15, reciclar: -100 };
const bonoVictoria = (seg) => 100 + Math.max(0, Math.round((600 - seg) / 6)); // más rápido = más bono

const PALOS = ["♠", "♥", "♦", "♣"];
const VALS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const $ = (id) => document.getElementById(id);
const tablero = $("tablero"), estado = $("estado"), btnEntrar = $("entrar");
const rojo = (c) => c.s === 1 || c.s === 2;

let mazo, descarte, base, tab, puntos, movs, sel, historial, inicioT, reloj, terminado, guardado, usuario = null;

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

// ---- Partida ----
async function nueva() {
  if (!terminado && !guardado && puntos > 0) await guardar(); // al abandonar, se guardan los puntos ganados
  const b = [];
  for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) b.push({ v, s, up: false });
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  tab = [];
  for (let i = 0; i < 7; i++) { const p = b.splice(0, i + 1); p[i].up = true; tab.push(p); }
  mazo = b; descarte = []; base = [[], [], [], []];
  puntos = 0; movs = 0; sel = null; historial = []; terminado = false; guardado = false;
  inicioT = Date.now();
  clearInterval(reloj);
  reloj = setInterval(pintarTiempo, 1000);
  estado.textContent = "Toca una carta y luego el lugar donde quieres ponerla. Toca una carta seleccionada otra vez para subirla a la base.";
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
function historia() { historial.push(JSON.stringify({ mazo, descarte, base, tab, puntos, movs })); }
function deshacer() {
  if (!historial.length || terminado) return;
  ({ mazo, descarte, base, tab, puntos, movs } = JSON.parse(historial.pop()));
  sel = null;
  dibujar();
}
function mover(o, d) {
  historia();
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
  if (mazo.length) { for (let n = 0; n < ROBAR && mazo.length; n++) { const c = mazo.pop(); c.up = true; descarte.push(c); } }
  else if (descarte.length) { mazo = descarte.reverse().map((c) => ({ ...c, up: false })); descarte = []; puntos = Math.max(0, puntos + PTS.reciclar); }
  else { historial.pop(); return; }
  movs++;
  dibujar();
}
function ganar() {
  terminado = true;
  clearInterval(reloj);
  const seg = Math.floor((Date.now() - inicioT) / 1000);
  puntos += bonoVictoria(seg);
  dibujar();
  estado.textContent = "🎉 ¡Ganaste! Terminaste con " + puntos + " puntos en " + $("tiempo").textContent + ".";
  guardar();
}

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
$("nueva").addEventListener("click", nueva);
$("deshacer").addEventListener("click", deshacer);

// ---- Dibujo ----
function carta(c, k, top, left, marcada) {
  const d = document.createElement("div");
  d.className = "carta" + (c.up ? (rojo(c) ? " roja" : "") : " abajo") + (marcada ? " sel" : "");
  d.dataset.k = String(k);
  d.style.top = "calc(var(--w) * " + top + ")";
  if (left) d.style.left = "calc(var(--w) * " + left + ")";
  if (c.up) {
    const e = document.createElement("span"), g = document.createElement("span");
    e.className = "e"; e.textContent = VALS[c.v] + PALOS[c.s];
    g.className = "g"; g.textContent = PALOS[c.s];
    d.append(e, g);
  }
  return d;
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
  else if (descarte.length) { const r = document.createElement("div"); r.className = "reciclar"; r.textContent = "↻"; m.appendChild(r); }
  // Descarte (con ROBAR = 3 se ven abiertas las últimas 3)
  const d = nuevaPila("descarte", 0, 1, 2);
  const vis = descarte.slice(-Math.min(ROBAR, 3));
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
    p.forEach((c, k) => { el.appendChild(carta(c, k, f, 0, esSel("tab", i, k))); ult = f; f += c.up ? 0.42 : 0.2; });
    el.style.height = "calc(var(--w) * " + (1.4 + ult) + ")";
  });
  $("marcador").textContent = String(puntos);
  $("movs").textContent = String(movs);
  pintarTiempo();
}

nueva();
