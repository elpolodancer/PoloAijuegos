// Ruta: buscaminas/juego.js
import { sumarPuntos } from "../compartido/jugador.js";

// ===== AJUSTES =====
const ID = "buscaminas";
const NIVELES = {
  facil:   { nombre: "Fácil",   cols: 8,  filas: 10, minas: 10, puntos: 10 },
  medio:   { nombre: "Medio",   cols: 10, filas: 14, minas: 28, puntos: 25 },
  dificil: { nombre: "Difícil", cols: 12, filas: 18, minas: 52, puntos: 50 },
};
const TAM_MAX = 40;        // tamaño máximo de casilla (px)
const PAUSA_LARGA = 400;   // ms para poner bandera con pulsación larga
// ===================

const $ = (id) => document.getElementById(id);
const tab = $("tablero"), msg = $("msg");
let nivel = localStorage.getItem(ID + ":nivel") || "facil";
if (!NIVELES[nivel]) nivel = "facil";
let N, celdas, botones, estado, abiertas, banderas, t0, reloj, modoBandera = false;

function mejores() { try { return JSON.parse(localStorage.getItem(ID + ":mejores")) || {}; } catch (e) { return {}; } }

function botonesNivel() {
  const z = $("niveles");
  z.innerHTML = "";
  for (const k in NIVELES) {
    const b = document.createElement("button");
    b.className = "btn" + (k === nivel ? " on" : "");
    b.textContent = NIVELES[k].nombre;
    b.addEventListener("click", () => { nivel = k; localStorage.setItem(ID + ":nivel", k); botonesNivel(); nueva(); });
    z.appendChild(b);
  }
}

function vecinos(i) {
  const f = Math.floor(i / N.cols), c = i % N.cols, r = [];
  for (let df = -1; df <= 1; df++) for (let dc = -1; dc <= 1; dc++) {
    if (!df && !dc) continue;
    const ff = f + df, cc = c + dc;
    if (ff >= 0 && ff < N.filas && cc >= 0 && cc < N.cols) r.push(ff * N.cols + cc);
  }
  return r;
}

function nueva() {
  N = NIVELES[nivel];
  clearInterval(reloj);
  estado = "listo"; abiertas = 0; banderas = 0; t0 = 0;
  celdas = Array.from({ length: N.cols * N.filas }, () => ({ mina: false, abierta: false, bandera: false, n: 0 }));
  tab.innerHTML = "";
  tab.style.gridTemplateColumns = `repeat(${N.cols}, var(--t))`;
  botones = celdas.map((_, i) => {
    const b = document.createElement("button");
    b.className = "c"; b.dataset.i = i; b.setAttribute("role", "gridcell");
    b.setAttribute("aria-label", "Casilla cerrada");
    tab.appendChild(b);
    return b;
  });
  ajustarTam();
  $("cara").textContent = "🙂";
  $("tiempo").textContent = "⏱ 0";
  actualizarMinas();
  const m = mejores()[nivel];
  msg.innerHTML = m ? `Mejor tiempo en ${N.nombre}: <b>${m} s</b>` : "Toca una casilla para empezar. Mantén pulsado para poner bandera.";
}

function ajustarTam() {
  if (!N) return;
  const ancho = Math.min(document.querySelector("main").clientWidth - 24, 520) - 12 - (N.cols - 1) * 2;
  const alto = (window.innerHeight - 260 - 12 - (N.filas - 1) * 2) / N.filas;
  const t = Math.max(18, Math.floor(Math.min(ancho / N.cols, TAM_MAX, Math.max(alto, 26))));
  tab.style.setProperty("--t", t + "px");
}
window.addEventListener("resize", ajustarTam);

function actualizarMinas() { $("minas").textContent = "💣 " + (N.minas - banderas); }

function colocarMinas(seguro) {
  const prohibidas = new Set([seguro, ...vecinos(seguro)]);
  const libres = [];
  celdas.forEach((_, i) => { if (!prohibidas.has(i)) libres.push(i); });
  for (let k = libres.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [libres[k], libres[j]] = [libres[j], libres[k]]; }
  libres.slice(0, N.minas).forEach((i) => (celdas[i].mina = true));
  celdas.forEach((c, i) => { c.n = vecinos(i).filter((v) => celdas[v].mina).length; });
}

function pintar(i) {
  const c = celdas[i], b = botones[i];
  b.className = "c";
  b.textContent = "";
  b.removeAttribute("data-n");
  if (c.abierta) {
    b.classList.add("ab");
    b.dataset.n = c.n;
    b.textContent = c.mina ? "💣" : c.n || "";
    b.setAttribute("aria-label", c.n ? c.n + " minas cerca" : "Vacía");
  } else if (c.bandera) {
    b.textContent = "🚩";
    b.setAttribute("aria-label", "Bandera");
  } else b.setAttribute("aria-label", "Casilla cerrada");
}

function abrir(inicio) {
  const pila = [inicio];
  while (pila.length) {
    const i = pila.pop(), c = celdas[i];
    if (c.abierta || c.bandera) continue;
    c.abierta = true; abiertas++; pintar(i);
    if (c.n === 0 && !c.mina) vecinos(i).forEach((v) => { if (!celdas[v].abierta) pila.push(v); });
  }
}

function tocar(i) {
  if (estado === "perdio" || estado === "gano") return;
  const c = celdas[i];
  if (modoBandera) return bandera(i);
  if (c.abierta) return acorde(i);
  if (c.bandera) return;
  if (estado === "listo") {
    colocarMinas(i);
    estado = "jugando"; t0 = Date.now();
    reloj = setInterval(() => ($("tiempo").textContent = "⏱ " + Math.floor((Date.now() - t0) / 1000)), 250);
    msg.textContent = "";
  }
  if (c.mina) return perder(i);
  abrir(i);
  revisarVictoria();
}

// Tocar un número que ya tiene todas sus banderas abre las casillas que le faltan
function acorde(i) {
  const c = celdas[i];
  if (!c.n) return;
  const v = vecinos(i);
  if (v.filter((x) => celdas[x].bandera).length !== c.n) return;
  for (const x of v) {
    if (celdas[x].bandera || celdas[x].abierta) continue;
    if (celdas[x].mina) return perder(x);
    abrir(x);
  }
  revisarVictoria();
}

function bandera(i) {
  if (estado === "perdio" || estado === "gano") return;
  const c = celdas[i];
  if (c.abierta) return;
  if (!c.bandera && banderas >= N.minas) return;
  c.bandera = !c.bandera;
  banderas += c.bandera ? 1 : -1;
  pintar(i); actualizarMinas();
  if (navigator.vibrate) navigator.vibrate(15);
}

function perder(causa) {
  estado = "perdio"; clearInterval(reloj);
  celdas.forEach((c, i) => {
    const b = botones[i];
    if (c.mina && !c.bandera) { b.className = "c mina"; b.textContent = "💣"; }
    else if (!c.mina && c.bandera) { b.className = "c mal"; b.textContent = "❌"; }
  });
  botones[causa].className = "c boom"; botones[causa].textContent = "💥";
  $("cara").textContent = "😵";
  msg.textContent = "¡Boom! Toca la carita para intentarlo de nuevo.";
}

async function revisarVictoria() {
  if (abiertas !== celdas.length - N.minas) return;
  estado = "gano"; clearInterval(reloj);
  const seg = Math.max(1, Math.round((Date.now() - t0) / 1000));
  celdas.forEach((c, i) => { if (c.mina && !c.bandera) { c.bandera = true; pintar(i); } });
  banderas = N.minas; actualizarMinas();
  $("tiempo").textContent = "⏱ " + seg;
  $("cara").textContent = "😎";
  const m = mejores();
  let rec = "";
  if (!m[nivel] || seg < m[nivel]) { m[nivel] = seg; rec = " ¡Nuevo récord!"; localStorage.setItem(ID + ":mejores", JSON.stringify(m)); }
  msg.innerHTML = `¡Ganaste en <b>${seg} s</b>! +${N.puntos} pts.${rec}`;
  try { await sumarPuntos(ID, N.puntos); } catch (e) {}
}

// ===== Entrada: toque = abrir, pulsación larga o clic derecho = bandera =====
let pulso = null, fueLarga = false;
tab.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".c");
  if (!b || e.button === 2) return;
  fueLarga = false;
  clearTimeout(pulso);
  pulso = setTimeout(() => { fueLarga = true; bandera(+b.dataset.i); }, PAUSA_LARGA);
});
const cancelar = () => clearTimeout(pulso);
tab.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") return; });
tab.addEventListener("pointerleave", cancelar);
tab.addEventListener("pointercancel", cancelar);
tab.addEventListener("pointerup", (e) => {
  cancelar();
  const b = e.target.closest(".c");
  if (!b || fueLarga || e.button === 2) return;
  tocar(+b.dataset.i);
});
tab.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const b = e.target.closest(".c");
  if (b && e.pointerType === "mouse" || (b && !fueLarga && e.button === 2)) bandera(+b.dataset.i);
});
// Teclado: Enter/Espacio abre, "f" pone bandera
tab.addEventListener("keydown", (e) => {
  const b = e.target.closest(".c");
  if (!b) return;
  if (e.key === "f" || e.key === "F") { e.preventDefault(); bandera(+b.dataset.i); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(+b.dataset.i); }
});

$("cara").addEventListener("click", nueva);
$("modo").addEventListener("click", () => {
  modoBandera = !modoBandera;
  $("modo").setAttribute("aria-pressed", modoBandera);
  $("modo").textContent = "🚩 Modo bandera: " + (modoBandera ? "sí" : "no");
});

botonesNivel();
nueva();
