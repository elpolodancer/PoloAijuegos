// Ruta: ajedrez/juego.js
import { INICIO, desdeFEN, legales, hacer, deshacer, enJaque, estadoPartida, clave } from "./logica.js";
import { mejorJugada } from "./ia.js";
import { sumarPuntos } from "../compartido/jugador.js";

// ===== AJUSTES =====
const ID = "ajedrez";
// prof = profundidad máxima, tiempo = ms máximos por jugada (se juega con lo que alcance a calcular),
// azar = probabilidad de jugar al azar, ruido = variación de la evaluación, puntos = premio al ganar por primera vez
const NIVELES = [
  { nombre: "Principiante", icono: "🐣", desc: "Se despista mucho: ideal para aprender.",       prof: 1, tiempo: 300,  azar: 0.35, ruido: 80, puntos: 10 },
  { nombre: "Aficionado",   icono: "🙂", desc: "Ve capturas simples, pero comete errores.",      prof: 2, tiempo: 600,  azar: 0.12, ruido: 40, puntos: 20 },
  { nombre: "Intermedio",   icono: "🎓", desc: "Piensa unas jugadas adelante: cuida tus piezas.", prof: 3, tiempo: 1000, azar: 0.03, ruido: 15, puntos: 35 },
  { nombre: "Avanzado",     icono: "🦉", desc: "Juega con táctica y casi no regala nada.",        prof: 4, tiempo: 1800, azar: 0,    ruido: 5,  puntos: 60 },
  { nombre: "Experto",      icono: "👑", desc: "El más fuerte: puede tardar unos segundos.",      prof: 8, tiempo: 3000, azar: 0,    ruido: 0,  puntos: 100 },
];
const TAM_MAX = 64;     // tamaño máximo de casilla (px)
// ===================

const GLIFO = { 1: "♟", 2: "♞", 3: "♝", 4: "♜", 5: "♛", 6: "♚" };
const NOMBRE = { 1: "peón", 2: "caballo", 3: "alfil", 4: "torre", 5: "dama", 6: "rey" };
const FIN = {
  ahogado: "Tablas: rey ahogado.", 50: "Tablas por la regla de las 50 jugadas.",
  material: "Tablas: no hay material para dar mate.", repeticion: "Tablas por repetición de posición.",
};

const $ = (id) => document.getElementById(id);
const tab = $("tablero");
let nivel = Math.min(5, Math.max(1, +localStorage.getItem(ID + ":nivel") || 1));
let jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
let est, pila, claves, legs, sel, ult, fin, msgFin, pensando, partida = 0;

const ganados = () => { try { return JSON.parse(localStorage.getItem(ID + ":ganados")) || {}; } catch (e) { return {}; } };

// ----- Tablero (64 botones, se crean una vez) -----
const celdas = [];
for (let d = 0; d < 64; d++) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "gridcell");
  tab.appendChild(b);
  celdas.push(b);
}
tab.addEventListener("click", (e) => {
  const b = e.target.closest(".cas");
  if (b) tocarCasilla(+b.dataset.sq);
});

function ajustarTam() {
  const ancho = Math.min(document.querySelector("main").clientWidth - 24, 520);
  const alto = window.innerHeight - 300;
  const t = Math.max(34, Math.floor(Math.min(ancho, Math.max(alto, 300), TAM_MAX * 8) / 8));
  tab.style.setProperty("--t", t + "px");
}
window.addEventListener("resize", ajustarTam);

// ----- Dibujo -----
function render() {
  const flip = jugador === -1;
  const reyJaque = enJaque(est, est.turno) ? est.rey[est.turno === 1 ? 0 : 1] : -1;
  const dest = new Set(), caps = new Set();
  if (sel !== null) legs.filter((m) => m.de === sel).forEach((m) => { dest.add(m.a); if (est.b[m.a] || m.ep) caps.add(m.a); });
  for (let d = 0; d < 64; d++) {
    const sq = flip ? 63 - d : d, p = est.b[sq], f = sq >> 3, c = sq & 7, b = celdas[d];
    let cls = "cas " + ((f + c) % 2 ? "osc" : "cla");
    if (ult && (sq === ult.de || sq === ult.a)) cls += " ult";
    if (sq === sel) cls += " sel";
    if (sq === reyJaque) cls += " jaque";
    if (dest.has(sq)) cls += caps.has(sq) ? " dest cap" : " dest";
    b.className = cls;
    b.dataset.sq = sq;
    const nom = "abcdefgh"[c] + (8 - f);
    b.setAttribute("aria-label", nom + (p ? ", " + NOMBRE[Math.abs(p)] + (p > 0 ? " blanco" : " negro") : ""));
    b.innerHTML =
      (d % 8 === 0 ? `<span class="co r">${8 - f}</span>` : "") +
      (d >= 56 ? `<span class="co f">${"abcdefgh"[c]}</span>` : "") +
      (p ? `<span class="p ${p > 0 ? "bl" : "ng"}">${GLIFO[Math.abs(p)]}\uFE0E</span>` : "");
  }
  let txt;
  if (fin) txt = msgFin;
  else if (pensando) txt = "Pensando…";
  else txt = "Tu turno" + (enJaque(est, est.turno) ? ": ¡jaque!" : "");
  $("estado").textContent = txt;
  $("bBlancas").classList.toggle("on", jugador === 1);
  $("bNegras").classList.toggle("on", jugador === -1);
  $("desc").textContent = NIVELES[nivel - 1].nombre + ": " + NIVELES[nivel - 1].desc + " (+" + NIVELES[nivel - 1].puntos + " pts la primera vez que lo vences)";
}

function botonesNivel() {
  const g = ganados(), z = $("niveles");
  z.innerHTML = "";
  NIVELES.forEach((n, i) => {
    const b = document.createElement("button");
    b.className = "btn" + (i + 1 === nivel ? " on" : "");
    b.textContent = n.icono + " " + (i + 1) + (g[i + 1] ? " ⭐" : "");
    b.title = n.nombre;
    b.setAttribute("aria-label", "Nivel " + (i + 1) + ", " + n.nombre + (g[i + 1] ? ", ya vencido" : ""));
    b.addEventListener("click", () => cambiar(() => { nivel = i + 1; localStorage.setItem(ID + ":nivel", nivel); }));
    z.appendChild(b);
  });
}

// Cambiar nivel o color empieza otra partida (pide confirmar si hay una en curso)
function cambiar(fn) {
  if (pila.length && !fin && !confirm("Esto empieza una partida nueva. ¿Seguro?")) return;
  fn();
  nueva();
}

// ----- Partida -----
function nueva() {
  partida++;
  est = desdeFEN(INICIO);
  pila = []; claves = [clave(est)]; sel = null; ult = null; fin = false; msgFin = ""; pensando = false;
  $("promo").hidden = true;
  legs = legales(est);
  botonesNivel();
  ajustarTam();
  render();
  if (est.turno !== jugador) pensar();
}

function jugar(m) {
  pila.push(hacer(est, m));
  claves.push(clave(est));
  ult = m; sel = null;
  $("promo").hidden = true;
  legs = legales(est);
  const r = estadoPartida(est, legs, claves);
  if (r) terminar(r);
  render();
  if (!fin && est.turno !== jugador) pensar();
}

function pensar() {
  pensando = true;
  render();
  const id = partida;
  setTimeout(() => {
    if (id !== partida) return;
    const m = mejorJugada(est, NIVELES[nivel - 1]);
    pensando = false;
    if (m) jugar(m);
  }, 80);
}

function terminar(r) {
  fin = true;
  if (r.fin === "mate") {
    if (r.ganador === jugador) { msgFin = "¡Jaque mate! Ganaste."; premio(); }
    else msgFin = "Jaque mate. Gana la computadora.";
  } else msgFin = FIN[r.fin];
}

async function premio() {
  const g = ganados(), n = NIVELES[nivel - 1], id = partida;
  if (g[nivel]) { msgFin += " (ya habías vencido este nivel)"; return; }
  g[nivel] = true;
  localStorage.setItem(ID + ":ganados", JSON.stringify(g));
  msgFin += " +" + n.puntos + " pts";
  botonesNivel();
  try { await sumarPuntos(ID, n.puntos); } catch (e) {}
}

function tocarCasilla(sq) {
  if (fin || pensando || est.turno !== jugador) return;
  if (sel !== null) {
    const ms = legs.filter((m) => m.de === sel && m.a === sq);
    if (ms.length === 1) return jugar(ms[0]);
    if (ms.length > 1) return pedirCoronacion(ms);
  }
  $("promo").hidden = true;
  sel = est.b[sq] * jugador > 0 && sq !== sel ? sq : null;
  render();
}

function pedirCoronacion(ms) {
  const z = $("promo");
  z.innerHTML = "";
  ms.forEach((m) => {
    const b = document.createElement("button");
    b.className = "btn " + (jugador === 1 ? "bl" : "ng");
    b.textContent = GLIFO[m.prom] + "\uFE0E";
    b.setAttribute("aria-label", "Coronar a " + NOMBRE[m.prom]);
    b.addEventListener("click", () => jugar(m));
    z.appendChild(b);
  });
  z.hidden = false;
}

function deshacerJugada() {
  if (pensando) return;
  const n = est.turno === jugador ? 2 : 1;
  if (pila.length < n) return;
  for (let i = 0; i < n; i++) { deshacer(est, pila.pop()); claves.pop(); }
  fin = false; msgFin = ""; sel = null;
  ult = pila.length ? pila[pila.length - 1].m : null;
  $("promo").hidden = true;
  legs = legales(est);
  render();
}

$("bNueva").addEventListener("click", () => cambiar(() => {}));
$("bDeshacer").addEventListener("click", deshacerJugada);
$("bBlancas").addEventListener("click", () => { if (jugador !== 1) cambiar(() => { jugador = 1; localStorage.setItem(ID + ":color", "1"); }); });
$("bNegras").addEventListener("click", () => { if (jugador !== -1) cambiar(() => { jugador = -1; localStorage.setItem(ID + ":color", "-1"); }); });

nueva();
