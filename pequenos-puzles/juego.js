// Ruta: pequenos-puzles/juego.js
import { NIVELES, TOTAL_NIVELES } from "./niveles.js";
import { celdas } from "./logica.js";
import { sumarPuntos } from "../compartido/jugador.js";

// ---- Ajustes ----
const ID = "puzles";             // mismo id que en juegos.js
const PUNTOS_NIVEL = 50;         // puntos del juego por pasar un nivel POR PRIMERA VEZ
const PUNTOS_POR_PERFIL = 25;    // 1 punto de perfil por cada 25 del juego
const CELDA_MAX = 64;            // tamaño máximo de una celda (px)
const MARGEN = 12;
const SEPARACION = 14;           // espacio entre piezas de la bandeja
const CLAVE = "pequenos-puzles:progreso";
const COLORES = {
  cian: "#3ff0ff", cielo: "#1ea7f5", azul: "#2563eb", morado: "#7a3fa8", magenta: "#e53be8",
  naranja: "#ffa414", amarillo: "#ffd84a", verde: "#2fd33d", gris: "#b4b4ba",
};

// ---- Progreso (guardado en el navegador) ----
function leerProgreso() {
  try { const p = JSON.parse(localStorage.getItem(CLAVE)); if (p && Array.isArray(p.hechos)) return p; } catch (e) {}
  return { hechos: [], mejores: {} };
}
function guardarProgreso() { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} }
let progreso = leerProgreso();

// ---- Elementos ----
const $ = (id) => document.getElementById(id);
const menu = $("menu"), juego = $("juego"), lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
const velo = $("velo");

// ---- Estado de la partida ----
let numero = 0, nivel = null, piezas = [];   // piezas: {color, celdas, w, h, x, y (pos. en bandeja), colocada:{x,y}|null}
let c = 40, gridX = 0, gridY = 0, ancho = 0;
let arrastre = null;                          // {i, ox, oy, px, py}
let t0 = null, restante = 0, jugando = false, raf = 0;

// ---- Menú de niveles ----
function abrirMenu() {
  jugando = false; cancelAnimationFrame(raf); velo.classList.remove("ver");
  juego.hidden = true; menu.hidden = false;
  const hechos = new Set(progreso.hechos);
  $("menu-texto").textContent = "Niveles pasados: " + hechos.size + " de " + TOTAL_NIVELES;
  const cont = $("niveles"); cont.innerHTML = "";
  for (let n = 1; n <= TOTAL_NIVELES; n++) {
    const b = document.createElement("button");
    const existe = !!NIVELES[n - 1];
    const abierto = existe && (n === 1 || hechos.has(n - 1) || hechos.has(n));
    b.textContent = abierto ? n : existe ? "🔒" : "·";
    b.disabled = !abierto;
    if (!existe) b.title = "Próximamente";
    if (hechos.has(n)) b.classList.add("hecho");
    b.addEventListener("click", () => jugar(n));
    cont.appendChild(b);
  }
}

// ---- Empezar un nivel ----
function jugar(n) {
  numero = n; nivel = NIVELES[n - 1];
  piezas = nivel.piezas.map((p) => {
    const cs = celdas(p.forma);
    return { color: COLORES[p.color] || "#999", celdas: cs,
      w: Math.max(...cs.map((q) => q[0])) + 1, h: Math.max(...cs.map((q) => q[1])) + 1, x: 0, y: 0, colocada: null };
  });
  arrastre = null; t0 = null; restante = nivel.limite || 0;
  velo.classList.remove("ver");
  menu.hidden = true; juego.hidden = false;
  $("titulo-nivel").textContent = "Nivel " + n;
  $("tiempo").textContent = nivel.limite ? nivel.limite + " s" : "";
  const barra = $("barra"); barra.style.display = nivel.limite ? "block" : "none"; barra.classList.remove("urge");
  $("barra-i").style.transform = "scaleX(1)";
  disponer(); dibujar();
  jugando = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(bucle);
}

// ---- Medidas y bandeja ----
function disponer() {
  if (!nivel) return;
  ancho = Math.min(juego.clientWidth || 360, 520);
  c = Math.floor(Math.min((ancho - MARGEN * 2) / nivel.columnas, CELDA_MAX));
  gridX = Math.round((ancho - nivel.columnas * c) / 2); gridY = MARGEN;
  let x = MARGEN, y = gridY + nivel.filas * c + 28, altoFila = 0;
  piezas.forEach((p) => {
    const w = p.w * c, h = p.h * c;
    if (x > MARGEN && x + w > ancho - MARGEN) { x = MARGEN; y += altoFila + SEPARACION; altoFila = 0; }
    p.x = x; p.y = y; x += w + SEPARACION; altoFila = Math.max(altoFila, h);
  });
  const alto = y + altoFila + MARGEN;
  const dpr = window.devicePixelRatio || 1;
  lienzo.style.width = ancho + "px"; lienzo.style.height = alto + "px";
  lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function posicion(i) {
  const p = piezas[i];
  if (arrastre && arrastre.i === i) return [arrastre.px, arrastre.py];
  if (p.colocada) return [gridX + p.colocada.x * c, gridY + p.colocada.y * c];
  return [p.x, p.y];
}

// ---- Reglas de colocación ----
function cabe(i, gx, gy) {
  const p = piezas[i];
  const ocupadas = new Set();
  piezas.forEach((q, j) => { if (j !== i && q.colocada) q.celdas.forEach(([cx, cy]) => ocupadas.add((q.colocada.x + cx) + "," + (q.colocada.y + cy))); });
  return p.celdas.every(([cx, cy]) => {
    const x = gx + cx, y = gy + cy;
    return x >= 0 && y >= 0 && x < nivel.columnas && y < nivel.filas && !ocupadas.has(x + "," + y);
  });
}

// ---- Dibujo ----
function celda(x, y, s, color, alfa) {
  ctx.globalAlpha = alfa == null ? 1 : alfa;
  ctx.fillStyle = color; ctx.fillRect(x, y, s, s);
  const b = Math.max(3, s * 0.12);
  ctx.fillStyle = "rgba(255,255,255,.38)"; ctx.fillRect(x, y, s, b); ctx.fillRect(x, y, b, s);
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(x, y + s - b, s, b); ctx.fillRect(x + s - b, y, b, s);
  ctx.globalAlpha = 1;
}
function dibujar() {
  if (!nivel) return;
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  // tablero
  ctx.fillStyle = "rgba(110,88,62,.55)"; ctx.fillRect(gridX - 4, gridY - 4, nivel.columnas * c + 8, nivel.filas * c + 8);
  ctx.fillStyle = "#c2ae78"; ctx.fillRect(gridX, gridY, nivel.columnas * c, nivel.filas * c);
  ctx.strokeStyle = "#7d6048"; ctx.lineWidth = 2;
  for (let x = 0; x <= nivel.columnas; x++) { ctx.beginPath(); ctx.moveTo(gridX + x * c, gridY); ctx.lineTo(gridX + x * c, gridY + nivel.filas * c); ctx.stroke(); }
  for (let y = 0; y <= nivel.filas; y++) { ctx.beginPath(); ctx.moveTo(gridX, gridY + y * c); ctx.lineTo(gridX + nivel.columnas * c, gridY + y * c); ctx.stroke(); }
  // piezas (la que se arrastra va encima)
  const orden = piezas.map((_, i) => i).sort((a, b) => (arrastre && arrastre.i === a) - (arrastre && arrastre.i === b));
  // vista previa del encaje
  if (arrastre) {
    const gx = Math.round((arrastre.px - gridX) / c), gy = Math.round((arrastre.py - gridY) / c);
    if (cabe(arrastre.i, gx, gy)) piezas[arrastre.i].celdas.forEach(([cx, cy]) => celda(gridX + (gx + cx) * c, gridY + (gy + cy) * c, c, "#ffffff", 0.35));
  }
  orden.forEach((i) => {
    const p = piezas[i], [px, py] = posicion(i);
    const sombra = arrastre && arrastre.i === i;
    if (sombra) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6; }
    p.celdas.forEach(([cx, cy]) => celda(px + cx * c, py + cy * c, c, p.color));
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });
}

// ---- Tiempo ----
function bucle() {
  if (!jugando) return;
  if (t0 !== null) {
    const t = (performance.now() - t0) / 1000;
    if (nivel.limite) {
      restante = Math.max(0, nivel.limite - t);
      $("barra-i").style.transform = "scaleX(" + restante / nivel.limite + ")";
      $("barra").classList.toggle("urge", restante <= 3);
      $("tiempo").textContent = Math.ceil(restante) + " s";
      if (restante <= 0) { perder(); return; }
    } else {
      $("tiempo").textContent = Math.floor(t) + " s";
    }
  }
  raf = requestAnimationFrame(bucle);
}

// ---- Arrastrar ----
function punto(e) { const r = lienzo.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function bajo(x, y) {
  for (let i = piezas.length - 1; i >= 0; i--) {
    const [px, py] = posicion(i);
    if (piezas[i].celdas.some(([cx, cy]) => x >= px + cx * c && x < px + (cx + 1) * c && y >= py + cy * c && y < py + (cy + 1) * c)) return i;
  }
  return -1;
}
lienzo.addEventListener("pointerdown", (e) => {
  if (!jugando) return;
  const [x, y] = punto(e), i = bajo(x, y);
  if (i < 0) return;
  e.preventDefault();
  lienzo.setPointerCapture(e.pointerId);
  const [px, py] = posicion(i);
  if (t0 === null) t0 = performance.now();
  piezas[i].colocada = null;
  arrastre = { i, ox: x - px, oy: y - py, px, py };
  dibujar();
});
lienzo.addEventListener("pointermove", (e) => {
  if (!arrastre) return;
  const [x, y] = punto(e);
  arrastre.px = x - arrastre.ox; arrastre.py = y - arrastre.oy;
  dibujar();
});
function soltar() {
  if (!arrastre) return;
  const { i, px, py } = arrastre;
  const gx = Math.round((px - gridX) / c), gy = Math.round((py - gridY) / c);
  arrastre = null;
  piezas[i].colocada = cabe(i, gx, gy) ? { x: gx, y: gy } : null;
  dibujar();
  if (piezas.every((p) => p.colocada)) ganar();
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);

// ---- Fin del nivel ----
function mostrar(titulo, texto, botones) {
  $("velo-titulo").textContent = titulo; $("velo-texto").textContent = texto;
  const cont = $("velo-botones"); cont.innerHTML = "";
  botones.forEach(([txt, fn]) => { const b = document.createElement("button"); b.className = "btn"; b.textContent = txt; b.addEventListener("click", fn); cont.appendChild(b); });
  velo.classList.add("ver");
}
function ganar() {
  jugando = false; cancelAnimationFrame(raf);
  const seg = t0 === null ? 0 : (performance.now() - t0) / 1000;
  const primera = !progreso.hechos.includes(numero);
  if (primera) progreso.hechos.push(numero);
  const previo = progreso.mejores[numero];
  if (previo == null || seg < previo) progreso.mejores[numero] = Math.round(seg * 10) / 10;
  guardarProgreso();
  let texto = "Tiempo: " + seg.toFixed(1) + " s";
  if (primera) {
    texto += " · +" + PUNTOS_NIVEL + " puntos";
    try { const r = sumarPuntos(ID, Math.floor(PUNTOS_NIVEL / PUNTOS_POR_PERFIL)); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  }
  const botones = [["Repetir", () => jugar(numero)]];
  if (NIVELES[numero]) botones.unshift(["Siguiente nivel", () => jugar(numero + 1)]);
  botones.push(["Niveles", abrirMenu]);
  setTimeout(() => mostrar("¡Nivel " + numero + " resuelto!", texto, botones), 350);
}
function perder() {
  jugando = false; cancelAnimationFrame(raf); arrastre = null; dibujar();
  mostrar("Se acabó el tiempo", "Tenías " + nivel.limite + " segundos. Prueba otra vez.", [["Reintentar", () => jugar(numero)], ["Niveles", abrirMenu]]);
}

$("b-reiniciar").addEventListener("click", () => jugar(numero));
$("b-menu").addEventListener("click", abrirMenu);
window.addEventListener("resize", () => { if (nivel && !juego.hidden) { disponer(); dibujar(); } });

abrirMenu();
