// Ruta: estacionamiento/juego-estacionamiento.js
// Saca todos los autos de un estacionamiento cuadrado (vista 2D desde arriba). El tamaño cambia con cada nivel (de 10×10 a 50×50).
// - Cada auto avanza solo hacia donde apunta su flecha; si algo le estorba, no se mueve.
// - Alrededor del estacionamiento hay una vía de un solo sentido (horario) con la salida en las 4 esquinas.
// - Hay 22 600 niveles (3200 de México y 100 por cada país). Todos salen de niveles-estacionamiento.js: tamaño, autos y premio dependen solo del número
//   de nivel, y siempre tienen solución (cada auto se coloca con su camino libre respecto a los ya colocados).

import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
import { TOTAL_NIVELES, configNivel, generarNivel } from "./niveles-estacionamiento.js";
import { montarMapa } from "./mapa-estacionamiento.js";   // menú principal: México con agua, mundo y listas de niveles
import { crearMenuPausa } from "../compartido/menu-pausa.js";

let N = 25;                         // casillas por lado (cambia con cada nivel)
const CELL = 32;                    // lado de una casilla en píxeles con zoom 1 (vista 2D desde arriba)
// Nivel de detalle según el tamaño de la casilla en pantalla (CELL × zoom): ≥14 px = auto completo (parabrisas, luces, flecha);
// ≥6 px = cuerpo, techo y flecha; menos (tableros enormes de lejos) = solo un rectángulo de color, que no se nota y cuesta mucho menos.
const PX_DETALLE = 14, PX_MEDIO = 6;
const VEL = 16;                     // casillas por segundo al salir
const ALTO_PARED = 0.26, SUBE_TECHO = 0.05; // pared inferior visible de cada auto y cuánto sube el techo respecto a su casilla (en casillas)
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const ID_JUEGO = "estacionamiento";
const CLAVE = "estacionamiento-progreso";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ----- Progreso: se guarda SIEMPRE en el dispositivo y se sincroniza con la cuenta cuando hay internet y sesión -----
let nube = null; // se llena al cargar compartido/progreso.js (si no carga, el juego sigue igual)
let prog = { max: 1, hecho: 0 };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };

// ----- Monedas y usos de «quitar un auto»: guardado local + sincronización con la cuenta -----
// Se gastan, así que NO se guardan como un número (al unir dos dispositivos habría que adivinar cuál es el «verdadero»). En su lugar:
//   · Monedas GANADAS: no se guardan; salen de los niveles terminados (prog.hecho, que ya se une con el mayor). Un nivel solo paga una vez
//     aunque se termine en dos dispositivos antes de sincronizar.
//   · Lo GASTADO / COMPRADO / USADO: cada dispositivo anota solo lo suyo (contadores que solo suben) y al unir se queda con el mayor de CADA
//     dispositivo. Los gastos hechos sin internet en dos dispositivos se SUMAN al sincronizar, no se pisan.
//   monedas = ganadas − Σ gastado      usos de quitar = Σ compradas − Σ usadas      (nunca menos de 0)
// Si dos dispositivos gastan sin conexión más de lo que tenían, al unirse el saldo queda en 0 (no hay deudas).
const CLAVE_CARTERA = "estacionamiento-cartera";      // localStorage (y, tal cual, lo que se sube a la nube)
const ID_CARTERA = "estacionamiento-cartera";         // documento en la nube (progreso/{uid}/juegos/estacionamiento-cartera)
const CLAVE_DISPOSITIVO = "estacionamiento-dispositivo";
const CLAVE_MONEDAS_VIEJA = "estacionamiento-monedas"; // versión anterior (un solo número): se migra una vez

let miId = "";
try {
  miId = localStorage.getItem(CLAVE_DISPOSITIVO) || "";
  if (!miId) { miId = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); localStorage.setItem(CLAVE_DISPOSITIVO, miId); }
} catch (e) { miId = miId || Math.random().toString(36).slice(2, 10); }

let nubeCartera = null; // se llena al cargar compartido/progreso.js
const numeros = (o) => { const r = {}; for (const k in o || {}) { const v = Math.floor(Number(o[k])); if (v > 0) r[k] = v; } return r; };
const normalizar = (c) => ({ gastado: numeros(c && c.gastado), compradas: numeros(c && c.compradas), usadas: numeros(c && c.usadas) });
let cartera = normalizar(null);
let existiaCartera = false;
try { const c = JSON.parse(localStorage.getItem(CLAVE_CARTERA) || "null"); if (c) { cartera = normalizar(c); existiaCartera = true; } } catch (e) {}

// monedas que dan los niveles 1..h (acumulado, se calcula una sola vez y crece solo si hace falta)
const acumPremios = [0];
function premiosHasta(h) {
  h = clamp(Math.floor(Number(h)) || 0, 0, TOTAL_NIVELES);
  for (let n = acumPremios.length; n <= h; n++) acumPremios[n] = acumPremios[n - 1] + configNivel(n).premio;
  return acumPremios[h];
}
const suma = (o) => Object.values(o).reduce((t, v) => t + v, 0);
const monedas = () => Math.max(0, premiosHasta(prog.hecho) - suma(cartera.gastado));
const usosQuitar = () => Math.max(0, suma(cartera.compradas) - suma(cartera.usadas));
const anotar = (campo, n) => { cartera[campo][miId] = (cartera[campo][miId] || 0) + n; guardarCartera(); };
const guardarCartera = () => { try { localStorage.setItem(CLAVE_CARTERA, JSON.stringify(cartera)); } catch (e) {} if (nubeCartera) nubeCartera.guardado(); };

// Migración única: si había monedas guardadas como número, se anota como «ya gastado» lo que falta para que el saldo quede igual
if (!existiaCartera) {
  try {
    const vieja = JSON.parse(localStorage.getItem(CLAVE_MONEDAS_VIEJA) || "null");
    if (vieja) {
      const ganadas = premiosHasta(prog.hecho), tengo = Math.max(0, Math.floor(Number(vieja.monedas)) || 0);
      if (ganadas > tengo) cartera.gastado[miId] = ganadas - tengo;
      const q = Math.max(0, Math.floor(Number(vieja.quitar)) || 0);
      if (q) cartera.compradas[miId] = q;
      guardarCartera();
      localStorage.removeItem(CLAVE_MONEDAS_VIEJA);
    }
  } catch (e) {}
}

// Unir dos carteras (para progreso.js → «fusionar»): por dispositivo, el contador mayor
function unirMapas(a, b) { const r = { ...(b || {}) }; for (const k in a || {}) r[k] = Math.max(Number(a[k]) || 0, Number(r[k]) || 0); return r; }
function unirCartera(a, b) {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  return { gastado: unirMapas(a.gastado, b.gastado), compradas: unirMapas(a.compradas, b.compradas), usadas: unirMapas(a.usadas, b.usadas) };
}
// El emoji 🪙 (Unicode 13) no se ve en Windows/Android viejos: la moneda es un dibujo CSS (.moneda en index-estacionamiento.html), igual en todos.
const MONEDA = '<span class="moneda" aria-hidden="true"></span>';
const chipMonedas = document.createElement("span");
chipMonedas.className = "chip chip-info chip-monedas"; // dorado; va en #fila-info, debajo del botón ☰ Pausa (ver el HTML)
chipMonedas.title = "Monedas";
const pintarMonedas = () => { chipMonedas.innerHTML = MONEDA + monedas().toLocaleString("es-MX"); chipMonedas.setAttribute("aria-label", monedas() + " monedas"); };
pintarMonedas();
($("fila-info") || document.querySelector(".nav-juego") || document.body).prepend(chipMonedas); // primero de la fila: monedas · tamaño del tablero · movimientos

// ----- Boosts (paso 2a): «Quitar un auto» (30 🪙, o gratis si ya tienes usos) y «Paquete ×3» (50 🪙 = 3 usos). La bomba va aparte (2b). -----
// «Quitar un auto» se paga AL USARLO: tocas el botón, tocas el auto y entonces se gasta un uso (o 30 monedas). Si te arrepientes, tocas el botón otra vez.
const PRECIO_QUITAR = 30, PRECIO_PAQUETE = 50, USOS_PAQUETE = 3;
const PRECIO_BOMBA = 100, LADO_BOMBA = 5; // la bomba se paga al soltarla (no se guarda en inventario) y borra una zona de 5×5 casillas
let modoQuitar = false;
let modoBomba = false, zonaBomba = null, efectoBomba = null; // zonaBomba = { x, y } esquina de la zona de 5×5 elegida; efectoBomba = destello tras explotar

function botonBoost(clase, icono, titulo) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d " + clase; b.title = titulo; b.setAttribute("aria-label", titulo);
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = icono;
  const info = document.createElement("span"); info.className = "b-info";
  b.append(i, info);
  return { b, info };
}
const bQuitar = botonBoost("b-azul", "🚗", "Quitar un auto");
const bPaquete = botonBoost("b-oro sin", "📦", "Paquete ×3: tres usos de «Quitar un auto»");
bPaquete.info.innerHTML = PRECIO_PAQUETE + MONEDA;
const bBomba = botonBoost("b-rojo sin", "💣", "Bomba: borra los autos de una zona de 5×5");
bBomba.info.innerHTML = PRECIO_BOMBA + MONEDA;
const zBoosts = document.createElement("div");
zBoosts.style.cssText = "display:flex;gap:10px";
zBoosts.setAttribute("role", "group"); zBoosts.setAttribute("aria-label", "Boosts");
zBoosts.append(bQuitar.b, bPaquete.b, bBomba.b);
($("boosts") || document.querySelector(".hud-abajo") || document.body).appendChild(zBoosts); // los boosts van abajo al centro (el rótulo del nivel ahora va arriba)

function pintarBoosts() {
  const tiene = usosQuitar() > 0;
  bQuitar.info.innerHTML = tiene ? "×" + usosQuitar() : PRECIO_QUITAR + MONEDA;
  bQuitar.b.classList.toggle("sin", !tiene);
  bQuitar.b.classList.toggle("on", modoQuitar);
  bQuitar.b.setAttribute("aria-pressed", String(modoQuitar));
  bBomba.b.classList.toggle("on", modoBomba);
  bBomba.b.setAttribute("aria-pressed", String(modoBomba));
}
function salirModoQuitar() {
  modoQuitar = false;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
function salirModoBomba() {
  modoBomba = false; zonaBomba = null;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
bQuitar.b.addEventListener("click", () => {
  if (modoQuitar) { salirModoQuitar(); return; }
  if (ganado) return;
  if (usosQuitar() <= 0 && monedas() < PRECIO_QUITAR) { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); return; }
  salirModoBomba();
  modoQuitar = true;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca el auto que quieres quitar");
});
bBomba.b.addEventListener("click", () => {
  if (modoBomba) { salirModoBomba(); return; }
  if (ganado) return;
  if (monedas() < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); return; }
  salirModoQuitar();
  modoBomba = true; zonaBomba = null;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca donde quieres la bomba; toca otra vez dentro del cuadro para soltarla");
});
bPaquete.b.addEventListener("click", () => {
  if (monedas() < PRECIO_PAQUETE) { aviso("Necesitas " + PRECIO_PAQUETE + " monedas"); return; }
  anotar("gastado", PRECIO_PAQUETE); anotar("compradas", USOS_PAQUETE);
  pintarMonedas(); pintarBoosts();
  aviso("Paquete comprado: +" + USOS_PAQUETE + " usos de quitar un auto");
});
pintarBoosts();

// ----- Niveles: el generador vive en niveles-estacionamiento.js -----
const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

// ----- Estado -----
let nivel = 1, cfg = null, autos = [], occ = [], restantes = 0, movs = 0, T = 0, ganado = false;
let escenaVer = 0, firmaPrev = "", animPrev = false; // para dibujar solo cuando algo cambió (ver bucle)
let cam = { s: 1, ox: 0, oy: 0 }, camMin = 0.3, camMax = 6;
let camTocada = false; // true cuando el jugador movió o acercó la vista (así un cambio de tamaño de ventana no se la deshace)
let ultAutos = "", ultMovs = -1; // últimos textos puestos en pantalla (para no reescribirlos 60 veces por segundo)

function cargarNivel(n) {
  n = clamp(Math.floor(Number(n)) || 1, 1, TOTAL_NIVELES);
  nivel = n;
  cfg = configNivel(n);
  N = cfg.tam;
  autos = generarNivel(cfg);
  occ = new Array(N * N).fill(-1);
  for (const c of autos) {
    c.estado = 0; c.bump = 0; c.flash = 0;
    celdasDe(c).forEach(([x, y]) => (occ[y * N + x] = c.id));
  }
  restantes = autos.length;
  movs = 0; ganado = false;
  escenaVer++;
  salirModoQuitar();
  salirModoBomba();
  efectoBomba = null;
  $("victoria").hidden = true;
  hudNiveles();
  ajustarCamara();
}
function celdasDe(c) {
  const r = [];
  for (let i = 0; i < c.len; i++) r.push(c.h ? [c.x + i, c.y] : [c.x, c.y + i]);
  return r;
}

// ----- Salida: camino libre, vía ocupada, animación -----
function caminoLibre(c) {
  const [hx, hy] = cabeza(c);
  let x = hx + DX[c.dir], y = hy + DY[c.dir];
  while (x >= 0 && y >= 0 && x < N && y < N) {
    if (occ[y * N + x] !== -1) return false;
    x += DX[c.dir]; y += DY[c.dir];
  }
  return true;
}

// Datos de la ruta de un auto: de su casilla a la vía y por la vía (horario) hasta la esquina de salida
function planear(c) {
  const [hx, hy] = cabeza(c);
  const d = c.dir;
  const n = d === 0 ? hy + 1 : d === 1 ? N - hx : d === 2 ? N - hy : hx + 1; // casillas hasta la vía
  const entrada = [hx + DX[d] * n, hy + DY[d] * n];
  let s0, esquinaS, sd, esquina;
  const V = N + 1; // largo de cada lado de la vía
  if (d === 0) { s0 = hx + 1; esquinaS = V; sd = [1, 0]; esquina = [N + 0.5, -0.5]; }
  else if (d === 1) { s0 = V + (hy + 1); esquinaS = 2 * V; sd = [0, 1]; esquina = [N + 0.5, N + 0.5]; }
  else if (d === 2) { s0 = 2 * V + (N - hx); esquinaS = 3 * V; sd = [-1, 0]; esquina = [-0.5, N + 0.5]; }
  else { s0 = 3 * V + (N - hy); esquinaS = 4 * V; sd = [0, -1]; esquina = [-0.5, -0.5]; }
  const P0 = [hx + 0.5, hy + 0.5];
  const P1 = [entrada[0] + 0.5, entrada[1] + 0.5];
  const ext = c.len + 6;
  const P3 = [esquina[0] + sd[0] * ext, esquina[1] + sd[1] * ext];
  const pts = [P0, P1, esquina, P3];
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const enEsquina = n + (esquinaS - s0);
  return { n, s0, corner: esquinaS, pts, acum, nLib: n + c.len, enEsquina, tFin: enEsquina + c.len + 4 };
}

// Tramo de la vía que ocupa un auto en el instante tAbs (null si no está en la vía)
function cobertura(c, tAbs) {
  const t = (tAbs - c.t0) * VEL;
  if (t < c.n) return null;
  const head = c.s0 + (t - c.n);
  if (head - c.len + 0.5 >= c.corner + 0.5) return null;
  const lo = Math.max(c.s0 - 0.5, head - c.len + 0.5);
  const hi = Math.min(head, c.corner) + 0.5;
  return [lo, hi];
}
function viaOcupada(nuevo) {
  const ini = nuevo.t0 + nuevo.n / VEL;
  const fin = nuevo.t0 + (nuevo.n + (nuevo.corner - nuevo.s0) + nuevo.len) / VEL;
  for (let t = ini; t <= fin; t += 0.04) {
    const a = cobertura(nuevo, t);
    if (!a) continue;
    for (const o of autos) {
      if (o.estado !== 1) continue;
      const b = cobertura(o, t);
      if (b && a[0] < b[1] - 0.05 && b[0] < a[1] - 0.05) return true;
    }
  }
  return false;
}

// Boost «Quitar un auto»: gasta un uso (o 30 monedas) y el auto desaparece; sus casillas quedan libres
function quitarAuto(c) {
  if (usosQuitar() > 0) anotar("usadas", 1);
  else if (monedas() >= PRECIO_QUITAR) anotar("gastado", PRECIO_QUITAR);
  else { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); salirModoQuitar(); return; }
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
  pintarMonedas();
  salirModoQuitar();
}

// Saca un auto del tablero sin animación (lo usa la bomba)
function retirarAuto(c) {
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
}
// Bomba: el primer toque coloca el cuadro de 5×5 (centrado en la casilla tocada, sin salirse del tablero); un toque dentro del cuadro la suelta
function tocarBomba(p) {
  if (ganado) return;
  const [gx, gy] = suelo(p.x, p.y);
  const x = Math.floor(gx), y = Math.floor(gy);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const z = zonaBomba;
  if (z && x >= z.x && x < z.x + LADO_BOMBA && y >= z.y && y < z.y + LADO_BOMBA) { soltarBomba(); return; }
  zonaBomba = { x: clamp(x - 2, 0, N - LADO_BOMBA), y: clamp(y - 2, 0, N - LADO_BOMBA) };
}
function soltarBomba() {
  const z = zonaBomba;
  const dentro = (c) => celdasDe(c).some(([x, y]) => x >= z.x && x < z.x + LADO_BOMBA && y >= z.y && y < z.y + LADO_BOMBA);
  const blancos = autos.filter((c) => c.estado === 0 && dentro(c)); // los autos que ya van saliendo no cuentan
  if (!blancos.length) { aviso("No hay autos en esa zona: mueve el cuadro"); return; } // no se cobra
  if (monedas() < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); salirModoBomba(); return; }
  anotar("gastado", PRECIO_BOMBA);
  for (const c of blancos) retirarAuto(c);
  efectoBomba = { x: z.x, y: z.y, t: 0.5 };
  pintarMonedas();
  aviso("💥 " + blancos.length + (blancos.length === 1 ? " auto eliminado" : " autos eliminados"));
  salirModoBomba();
}

function tocarAuto(c) {
  if (c.estado !== 0 || ganado) return;
  if (modoQuitar) { quitarAuto(c); return; }
  if (!caminoLibre(c)) {
    c.bump = 0.35; c.flash = 0.4;
    aviso("Algo le estorba");
    return;
  }
  const plan = planear(c);
  const cand = Object.assign({ len: c.len, t0: T }, plan);
  if (viaOcupada(cand)) {
    c.bump = 0.35; c.flash = 0.4;
    aviso("La vía de salida está ocupada, espera un momento");
    return;
  }
  // Su hitbox desaparece AL INSTANTE: las casillas quedan libres en cuanto se toca, aunque el auto siga animándose hacia la salida.
  // Así se puede tocar de inmediato a los autos que estorbaba (la vía de salida sigue protegida por viaOcupada).
  Object.assign(c, plan, { estado: 1, t0: T, liberado: true });
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  movs++;
}

// ----- Posición de un auto: cabeza y cola siguen la ruta, así gira en las curvas -----
function puntoEn(c, d) {
  const pts = c.pts, ac = c.acum;
  if (d <= 0) {
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], L = Math.hypot(dx, dy) || 1;
    return [pts[0][0] + (dx / L) * d, pts[0][1] + (dy / L) * d];
  }
  for (let i = 1; i < pts.length; i++) {
    if (d <= ac[i] || i === pts.length - 1) {
      const L = ac[i] - ac[i - 1] || 1, f = (d - ac[i - 1]) / L;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
  }
  return pts[pts.length - 1];
}
function poseDe(c) {
  let cab, col, alfa = 1;
  if (c.estado === 1) {
    const t = (T - c.t0) * VEL;
    cab = puntoEn(c, t);
    col = puntoEn(c, t - (c.len - 1));
    alfa = 1 - clamp((t - c.enEsquina - 1) / (c.len + 2), 0, 1);
  } else {
    const [hx, hy] = cabeza(c);
    cab = [hx + 0.5, hy + 0.5];
    col = [cab[0] - DX[c.dir] * (c.len - 1), cab[1] - DY[c.dir] * (c.len - 1)];
    if (c.bump > 0) {
      const off = Math.sin((1 - c.bump / 0.35) * Math.PI) * 0.22;
      cab = [cab[0] + DX[c.dir] * off, cab[1] + DY[c.dir] * off];
      col = [col[0] + DX[c.dir] * off, col[1] + DY[c.dir] * off];
    }
  }
  let dx = cab[0] - col[0], dy = cab[1] - col[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-3) { dx = DX[c.dir]; dy = DY[c.dir]; } else { dx /= L; dy /= L; }
  return { cx: (cab[0] + col[0]) / 2, cy: (cab[1] + col[1]) / 2, dx, dy, alfa };
}

// ----- Cámara -----
const cv = $("lienzo"), ctx = cv.getContext("2d");
let cw = 300, ch = 300, dpr = 1;
function redim() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cw = r.width; ch = r.height;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
const escalaAjustada = () => Math.max(0.05, Math.min((cw - 16) / ((N + 2) * CELL), (ch - 130) / ((N + 2) * CELL))); // cabe la vía completa; deja aire para los botones
function ajustarCamara() {
  const s = escalaAjustada();
  camMin = s * 0.8; camMax = s * 7;
  cam.s = s;
  cam.ox = cw / 2 - (N * CELL * s) / 2;
  cam.oy = ch / 2 - (N * CELL * s) / 2 + 12; // un poco más abajo: arriba están los botones
  camTocada = false;
}
function zoom(f, mx, my) {
  camTocada = true;
  const s2 = clamp(cam.s * f, camMin, camMax), k = s2 / cam.s;
  cam.ox = mx - (mx - cam.ox) * k;
  cam.oy = my - (my - cam.oy) * k;
  cam.s = s2;
}
// Casilla (gx, gy) → píxeles de pantalla, y al revés (vista desde arriba: sin proyección)
const P = (gx, gy) => [cam.ox + gx * CELL * cam.s, cam.oy + gy * CELL * cam.s];
function suelo(sx, sy) {
  const u = CELL * cam.s;
  return [(sx - cam.ox) / u, (sy - cam.oy) / u];
}

// ----- Dibujo (vista 2D desde arriba) -----
// Rectángulo redondeado (arcTo funciona en todos los navegadores; ctx.roundRect no)
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarSuelo() {
  const u = CELL * cam.s;
  // Vía: asfalto que rodea el tablero, con sombra suave sobre la madera
  const [vx0, vy0] = P(-1, -1), [vx1, vy1] = P(N + 1, N + 1);
  ctx.save();
  if (u >= PX_MEDIO) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; }
  rr(vx0, vy0, vx1 - vx0, vy1 - vy0, 0.9 * u);
  ctx.fillStyle = "#5d6171";
  ctx.fill();
  ctx.restore();

  // Tablero: panel lavanda claro (como el piso de la referencia)
  const [tx0, ty0] = P(0, 0), [tx1, ty1] = P(N, N);
  rr(tx0, ty0, tx1 - tx0, ty1 - ty0, 0.25 * u);
  const gr = ctx.createLinearGradient(0, ty0, 0, ty1);
  gr.addColorStop(0, "#d6daec"); gr.addColorStop(1, "#bcc1da");
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.07 * u);
  ctx.strokeStyle = "#eef0fa";
  ctx.stroke();

  // Cuadrícula muy tenue (solo las líneas que se ven en pantalla, y solo si las casillas son grandes)
  if (u >= 9) {
    const g0 = clamp(Math.floor(-cam.ox / u), 1, N - 1), g1 = clamp(Math.ceil((cw - cam.ox) / u), 1, N - 1);
    const h0 = clamp(Math.floor(-cam.oy / u), 1, N - 1), h1 = clamp(Math.ceil((ch - cam.oy) / u), 1, N - 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100,108,160,.16)";
    ctx.beginPath();
    for (let i = g0; i <= g1; i++) { const a = P(i, 0), b = P(i, N); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    for (let i = h0; i <= h1; i++) { const a = P(0, i), b = P(N, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
  }

  // Flechas de la vía (sentido horario): chevrones amarillos
  if (u >= PX_MEDIO) {
    ctx.strokeStyle = "rgba(255,214,70,.8)";
    ctx.lineWidth = Math.max(1.5, 0.09 * u);
    ctx.lineCap = "round";
    const mf = 2 * u;
    const chevron = (gx, gy, dx, dy) => {
      const o = P(gx, gy);
      if (o[0] < -mf || o[0] > cw + mf || o[1] < -mf || o[1] > ch + mf) return;
      ctx.save();
      ctx.translate(o[0], o[1]);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath();
      ctx.moveTo(-0.16 * u, -0.22 * u); ctx.lineTo(0.16 * u, 0); ctx.lineTo(-0.16 * u, 0.22 * u);
      ctx.stroke();
      ctx.restore();
    };
    for (let i = 2; i < N; i += 3) {
      chevron(i + 0.5, -0.5, 1, 0);
      chevron(N + 0.5, i + 0.5, 0, 1);
      chevron(i + 0.5, N + 0.5, -1, 0);
      chevron(-0.5, i + 0.5, 0, -1);
    }
    ctx.lineCap = "butt";
  }

  // Salidas en las 4 esquinas
  const fs = Math.max(4, Math.round(0.2 * u));
  ctx.font = "bold " + fs + "px system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [x, y] of [[-1, -1], [N, -1], [N, N], [-1, N]]) {
    const [a, b] = P(x, y);
    rr(a + 0.08 * u, b + 0.08 * u, 0.84 * u, 0.84 * u, 0.2 * u);
    ctx.fillStyle = "#2ecc71"; ctx.fill();
    ctx.lineWidth = Math.max(1, 0.05 * u); ctx.strokeStyle = "#1e8449"; ctx.stroke();
    if (u >= PX_DETALLE) { ctx.fillStyle = "#fff"; ctx.fillText("SALIDA", a + 0.5 * u, b + 0.5 * u); }
  }
}

// Pared inferior de un auto. La vista es desde arriba, un poco inclinada hacia el jugador: del auto se ve el techo y SOLO la pared que mira hacia
// abajo en la pantalla. Si el auto apunta a la derecha o a la izquierda esa pared es su costado (ventanas y llantas, con el frente hacia donde apunta);
// si apunta hacia abajo es su frente (parabrisas, faros, parrilla) y si apunta hacia arriba es su parte de atrás (luneta, luces, placa).
// c = el auto (largo 2 = coche, 3 = autobús); (sx, sy) = centro del techo en pantalla; (dx, dy) = hacia dónde mira el auto; L × W = largo y ancho del techo en píxeles.
function dibujarPared(c, sx, sy, dx, dy, L, W, u, det, col) {
  const H = ALTO_PARED * u, ang = Math.atan2(dy, dx);
  // 1) Silueta: el contorno del techo repetido hacia abajo, sin huecos y con cualquier ángulo (los autos giran en las curvas de la vía)
  ctx.fillStyle = col(0.74, 72);
  for (let k = 1; k <= 4; k++) {
    ctx.save();
    ctx.translate(sx, sy + (H * k) / 4); ctx.rotate(ang);
    rr(-L / 2, -W / 2, L, W, 0.22 * u);
    ctx.fill();
    ctx.restore();
  }
  if (det < 2) return; // con casillas chicas no hay espacio para detalles
  // 2) Detalles: cada cara del auto que mira hacia abajo en la pantalla (a lo más dos, en las curvas)
  const hl = L / 2, hw = W / 2, nx = -dy, ny = dx; // (nx, ny) = lado derecho del auto
  const caras = [
    { v: dy, cx: sx + dx * hl, cy: sy + dy * hl, tx: -dy, ty: dx, w: W, tipo: "frente" },
    { v: -dy, cx: sx - dx * hl, cy: sy - dy * hl, tx: -dy, ty: dx, w: W, tipo: "atras" },
    { v: ny, cx: sx + nx * hw, cy: sy + ny * hw, tx: dx, ty: dy, w: L, tipo: "lado" },
    { v: -ny, cx: sx - nx * hw, cy: sy - ny * hw, tx: dx, ty: dy, w: L, tipo: "lado" },
  ].filter((f) => f.v > 0.3).sort((a, b) => a.v - b.v);
  const cuadro = (a, b, w, h, r, color) => { rr(a, b, w, h, r); ctx.fillStyle = color; ctx.fill(); };
  for (const f of caras) {
    let { tx, ty } = f;
    if (tx < 0) { tx = -tx; ty = -ty; } // la cara se dibuja de izquierda a derecha en pantalla
    ctx.save();
    // Sistema de la cara: a = a lo largo de su borde, b = hacia abajo desde el borde del techo (0 = techo, H = suelo)
    ctx.transform(tx, ty, 0, 1, f.cx - (tx * f.w) / 2, f.cy - (ty * f.w) / 2);
    const w = f.w;
    const llanta = (a, b, r) => { ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fillStyle = "#1d1f26"; ctx.fill();
      ctx.beginPath(); ctx.arc(a, b, r * 0.45, 0, Math.PI * 2); ctx.fillStyle = "#9aa0ad"; ctx.fill(); };
    if (f.tipo === "lado") {
      if (dx * tx + dy * ty < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); } // el frente queda a la derecha; si no, se voltea
      const nv = c.len >= 3 ? 4 : 2, x0 = 0.28 * u, x1 = w - 0.3 * u, g = 0.05 * u, vw = (x1 - x0 - g * (nv - 1)) / nv;
      for (let i = 0; i < nv; i++) cuadro(x0 + i * (vw + g), 0.06 * H, vw, 0.36 * H, 0.04 * u, "rgba(222,242,255,.96)");
            llanta(0.42 * u, 0.66 * H, 0.08 * u);
      llanta(w - 0.42 * u, 0.66 * H, 0.08 * u);
      if (c.len >= 3) llanta(w / 2, 0.66 * H, 0.08 * u);
      cuadro(w - 0.07 * u, 0.5 * H, 0.07 * u, 0.25 * H, 0.02 * u, "#fff3a0"); // faro
      cuadro(0, 0.5 * H, 0.06 * u, 0.25 * H, 0.02 * u, "#ff4d4d");             // luz trasera
    } else {
      const frente = f.tipo === "frente";
      cuadro(0.1 * u, 0.06 * H, w - 0.2 * u, 0.38 * H, 0.05 * u, frente ? "rgba(222,242,255,.97)" : "rgba(40,60,95,.8)"); // parabrisas / luneta
      const luz = frente ? "#fff3a0" : "#ff4d4d";
      cuadro(0.12 * u, 0.52 * H, 0.16 * u, 0.28 * H, 0.04 * u, luz);
      cuadro(w - 0.12 * u - 0.16 * u, 0.52 * H, 0.16 * u, 0.28 * H, 0.04 * u, luz);
      if (frente) cuadro(0.34 * u, 0.56 * H, w - 0.68 * u, 0.24 * H, 0.03 * u, "#262a33"); // parrilla
      else cuadro(w / 2 - 0.1 * u, 0.56 * H, 0.2 * u, 0.24 * H, 0.02 * u, "#f4f4f4");      // placa
      cuadro(0.01 * u, 0.5 * H, 0.08 * u, 0.48 * H, 0.02 * u, "#1d1f26");                  // llantas
      cuadro(w - 0.09 * u, 0.5 * H, 0.08 * u, 0.48 * H, 0.02 * u, "#1d1f26");
    }
    ctx.restore();
  }
}

// Vehículo visto desde arriba: pared inferior (ver arriba), cuerpo de color, techo claro, parabrisas al frente y flecha blanca en el techo.
// (cx, cy) = centro en casillas; (dx, dy) = hacia dónde mira (unitario); los autos largos (3) se ven como autobuses.
function dibujarAuto(c, pose) {
  const { cx, cy, dx, dy, alfa } = pose || poseDe(c);
  const u = CELL * cam.s;
  const sx = cam.ox + cx * u, sy = cam.oy + cy * u;
  const L = (c.len - 0.14) * u, W = 0.8 * u;
  const det = u >= PX_DETALLE ? 2 : u >= PX_MEDIO ? 1 : 0;
  const ang = Math.atan2(dy, dx);
  const col = (f, sat) => "hsl(" + c.tono + "," + (sat || 76) + "%," + Math.min(93, c.luz * f).toFixed(1) + "%)";
  ctx.globalAlpha = alfa;

  const ty = sy - SUBE_TECHO * u; // el techo sube un poco; debajo de él queda la pared

  if (det === 0) { // de lejos: un rectángulo de color con su pared (más oscura) debajo
    ctx.save();
    ctx.translate(sx, ty + ALTO_PARED * u * 0.7); ctx.rotate(ang);
    ctx.fillStyle = col(0.6, 70);
    ctx.fillRect(-L / 2, -W / 2, L, W);
    ctx.restore();
    ctx.save();
    ctx.translate(sx, ty); ctx.rotate(ang);
    ctx.fillStyle = col(1);
    ctx.fillRect(-L / 2, -W / 2, L, W);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  // Pared inferior (la que mira hacia la pantalla): según hacia dónde mire el auto es su costado, su frente o su parte de atrás
  dibujarPared(c, sx, ty, dx, dy, L, W, u, det, col);

  ctx.save();
  ctx.translate(sx, ty); ctx.rotate(ang);
  // Cuerpo
  rr(-L / 2, -W / 2, L, W, 0.22 * u);
  ctx.fillStyle = col(1);
  ctx.fill();
  // Techo (más claro)
  rr(-L / 2 + 0.1 * u, -W / 2 + 0.1 * u, L - 0.2 * u, W - 0.2 * u, 0.15 * u);
  ctx.fillStyle = col(1.2, 72);
  ctx.fill();

  if (det === 2) {
    // Parabrisas (al frente) y luneta (atrás)
    rr(L / 2 - 0.44 * u, -W / 2 + 0.14 * u, 0.3 * u, W - 0.28 * u, 0.08 * u);
    ctx.fillStyle = "rgba(232,246,255,.95)";
    ctx.fill();
    rr(-L / 2 + 0.14 * u, -W / 2 + 0.16 * u, 0.13 * u, W - 0.32 * u, 0.05 * u);
    ctx.fillStyle = "rgba(40,60,95,.55)";
    ctx.fill();
    // Faros delanteros y luces traseras
    ctx.fillStyle = "#fff3a0";
    ctx.fillRect(L / 2 - 0.05 * u, -W / 2 + 0.05 * u, 0.05 * u, 0.15 * u);
    ctx.fillRect(L / 2 - 0.05 * u, W / 2 - 0.2 * u, 0.05 * u, 0.15 * u);
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(-L / 2, -W / 2 + 0.05 * u, 0.05 * u, 0.15 * u);
    ctx.fillRect(-L / 2, W / 2 - 0.2 * u, 0.05 * u, 0.15 * u);
  }

  // Flecha blanca en el techo (apunta hacia donde sale el auto)
  const A = (c.len >= 3 ? 0.95 : 0.7) * u, x0 = -0.04 * u, sw = 0.075 * u, hw = 0.22 * u, hb = x0 + A / 2 - 0.34 * u;
  ctx.beginPath();
  ctx.moveTo(x0 - A / 2, -sw); ctx.lineTo(hb, -sw); ctx.lineTo(hb, -hw); ctx.lineTo(x0 + A / 2, 0);
  ctx.lineTo(hb, hw); ctx.lineTo(hb, sw); ctx.lineTo(x0 - A / 2, sw);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.03 * u);
  ctx.strokeStyle = "rgba(0,0,0,.28)";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Destello rojo cuando algo le estorba
  if (c.flash > 0) {
    rr(-L / 2, -W / 2, L, W, 0.22 * u);
    ctx.fillStyle = "rgba(255,50,50," + (0.6 * c.flash / 0.4).toFixed(2) + ")";
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch); // transparente: detrás se ve el fondo de madera (compartido/fondo-madera.js)
  ctx.lineJoin = "round";
  dibujarSuelo();
  const u = CELL * cam.s;
  // Solo se dibujan los autos que caen dentro de la pantalla (con margen por su largo): al acercar un tablero de 50×50 son pocos
  const vis = [];
  for (const c of autos) {
    if (c.estado === 2) continue;
    const p = poseDe(c);
    const sx = cam.ox + p.cx * u, sy = cam.oy + p.cy * u, mg = (c.len + 1.5) * u;
    if (sx < -mg || sx > cw + mg || sy < -mg || sy > ch + mg) continue;
    vis.push({ c, p, k: p.cy + (Math.abs(p.dy) * (c.len - 0.14) + Math.abs(p.dx) * 0.8) / 2 }); // k = borde de abajo del auto
  }
  vis.sort((a, b) => a.k - b.k); // los de más arriba primero: el de abajo tapa la pared del de arriba
  for (const v of vis) dibujarAuto(v.c, v.p);
  if (modoBomba && zonaBomba) { // vista previa de la zona que borrará la bomba
    const [a, b] = P(zonaBomba.x, zonaBomba.y), [e, f] = P(zonaBomba.x + LADO_BOMBA, zonaBomba.y + LADO_BOMBA);
    rr(a, b, e - a, f - b, 0.2 * u);
    ctx.fillStyle = "rgba(255,70,50,.28)"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,110,70,.95)"; ctx.stroke();
  }
  if (efectoBomba) { // destello que crece y se desvanece
    const f = efectoBomba.t / 0.5, g2 = (1 - f) * 1.2, e = efectoBomba;
    const [a, b] = P(e.x - g2, e.y - g2), [a2, b2] = P(e.x + LADO_BOMBA + g2, e.y + LADO_BOMBA + g2);
    ctx.globalAlpha = f;
    rr(a, b, a2 - a, b2 - b, 0.3 * u);
    ctx.fillStyle = "rgba(255,170,40,.8)"; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ----- Bucle -----
const firmaVista = () => [cam.s, cam.ox, cam.oy, cw, ch, dpr, escenaVer, restantes, modoBomba && zonaBomba ? zonaBomba.x + "," + zonaBomba.y : "-"].join("|");
function hayAnimacion() {
  if (efectoBomba) return true;
  for (const c of autos) if (c.estado === 1 || c.bump > 0 || c.flash > 0) return true;
  return false;
}
function actualizar(dt) {
  T += dt;
  if (efectoBomba) { efectoBomba.t -= dt; if (efectoBomba.t <= 0) efectoBomba = null; }
  for (const c of autos) {
    if (c.bump > 0) c.bump = Math.max(0, c.bump - dt);
    if (c.flash > 0) c.flash = Math.max(0, c.flash - dt);
    if (c.estado !== 1) continue;
    const t = (T - c.t0) * VEL;
    if (!c.liberado && t >= c.nLib) {
      c.liberado = true;
      celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
    }
    if (t >= c.tFin) {
      c.estado = 2;
      restantes--;
    }
  }
  if (!ganado && restantes <= 0) victoria();
  if (movs !== ultMovs) { ultMovs = movs; const em = $("movs"); if (em) em.textContent = movs; }
}

// Fin de nivel «sobre el tablero» (estándar en compartido/inmersivo.css, clase .sobre-tablero): la ventana con «Siguiente nivel ▶» se coloca
// encima del cuadro del tablero, recortado a la ventana; si casi no se ve (muy acercado o movido), ocupa toda la ventana. Sigue al tablero si se mueve la vista.
let ultColoc = "";
function colocarVictoria() {
  const v = $("victoria");
  if (v.hidden) { ultColoc = ""; return; }
  const r = cv.getBoundingClientRect(), [x0, y0] = P(0, 0), [x1, y1] = P(N, N);
  let a = Math.max(0, x0), b = Math.max(0, y0), c = Math.min(cw, x1), d = Math.min(ch, y1);
  if (c - a < 200 || d - b < 200) { a = 0; b = 0; c = cw; d = ch; }
  const css = [r.left + a, r.top + b, c - a, d - b].map((n) => Math.round(n) + "px").join(" ");
  if (css === ultColoc) return;
  ultColoc = css;
  const m = css.split(" ");
  v.style.left = m[0]; v.style.top = m[1]; v.style.width = m[2]; v.style.height = m[3];
}

function victoria() {
  ganado = true;
  let txt = "Lo lograste en " + movs + " movimientos.";
  const mio = nivel;
  let pts = 0;
  if (nivel > prog.hecho) {
    // Monedas: igual que los puntos, solo la primera vez que se pasa el nivel (repetirlo no da monedas).
    // No se anotan aparte: salen de prog.hecho (ver monedas()), así que no se pueden duplicar al sincronizar.
    txt += " +" + cfg.premio + " monedas";
    // Los puntos del nivel se dan una sola vez: se anotan en la cola local (nunca se pierden) y se envían al haber sesión y conexión
    pts = 10 * cfg.premio; // 150 a 600 puntos según el tamaño del nivel (antes 100 × nivel, que en el nivel 22 600 sería enorme)
    prog.hecho = mio;
    encolarPuntos(ID_JUEGO, pts);
    import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).then((faltan) => {
      // el ✓ solo sale si de verdad ya se enviaron
      if (faltan === 0 && ganado && nivel === mio && !$("victoria").hidden) $("vtexto").textContent = txt + " +" + pts + " puntos ✓";
    }).catch(() => {});
  }
  prog.max = Math.max(prog.max, Math.min(TOTAL_NIVELES, nivel + 1));
  guardar();
  hudNiveles();
  pintarMonedas(); // ya con prog.hecho al día
  const ultimo = nivel >= TOTAL_NIVELES;
  $("vtitulo").textContent = ultimo ? "¡Terminaste los " + TOTAL_NIVELES.toLocaleString("es-MX") + " niveles! 🎉" : "¡Nivel " + nivel + " completado!";
  $("vtexto").textContent = txt + (pts ? " +" + pts + " puntos" : "");
  $("siguiente").hidden = ultimo;
  $("victoria").hidden = false;
  colocarVictoria();
}

let tMsg = 0;
function aviso(t) {
  const m = $("msg");
  m.textContent = t;
  m.classList.add("ver");
  clearTimeout(tMsg);
  tMsg = setTimeout(() => m.classList.remove("ver"), 1600);
}

// Rótulo del nivel (arriba al centro, botón de madera: solo el número) y tamaño del tablero (botón aparte, a su izquierda).
// No muestra las monedas del nivel. El cambio de nivel se hace desde el mapa.
function hudNiveles() {
  // Si la página es de otra versión y le faltan estos elementos, no se rompe nada (antes eso impedía abrir el mapa)
  const n = $("nivel-num"), t = $("tam-txt");
  if (n) n.textContent = nivel;
  if (t) t.textContent = cfg.tam + "×" + cfg.tam;
}

// ----- Controles: tocar, arrastrar, pellizcar, rueda -----
const dedos = new Map();
let g = null;
const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

cv.addEventListener("pointerdown", (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  dedos.set(e.pointerId, pos(e));
  g = { moved: dedos.size > 1, x0: pos(e).x, y0: pos(e).y };
});
cv.addEventListener("pointermove", (e) => {
  if (!dedos.has(e.pointerId)) return;
  const nuevo = pos(e), viejo = dedos.get(e.pointerId);
  if (dedos.size === 1) {
    if (!g.moved && Math.hypot(nuevo.x - g.x0, nuevo.y - g.y0) > 8) g.moved = true;
    if (g.moved) { cam.ox += nuevo.x - viejo.x; cam.oy += nuevo.y - viejo.y; camTocada = true; }
    dedos.set(e.pointerId, nuevo);
  } else if (dedos.size === 2) {
    const otro = [...dedos.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(viejo.x - otro.x, viejo.y - otro.y) || 1;
    const d1 = Math.hypot(nuevo.x - otro.x, nuevo.y - otro.y) || 1;
    const m0 = { x: (viejo.x + otro.x) / 2, y: (viejo.y + otro.y) / 2 };
    const m1 = { x: (nuevo.x + otro.x) / 2, y: (nuevo.y + otro.y) / 2 };
    cam.ox += m1.x - m0.x; cam.oy += m1.y - m0.y;
    zoom(d1 / d0, m1.x, m1.y);
    g.moved = true;
    dedos.set(e.pointerId, nuevo);
  }
});
function soltar(e) {
  if (!dedos.has(e.pointerId)) return;
  const eraUno = dedos.size === 1;
  dedos.delete(e.pointerId);
  if (eraUno && g && !g.moved && e.type === "pointerup") {
    const p = pos(e);
    if (modoBomba) { tocarBomba(p); return; }
    const [gx, gy] = suelo(p.x, p.y);
    const x = Math.floor(gx), y = Math.floor(gy);
    if (x >= 0 && y >= 0 && x < N && y < N) {
      const id = occ[y * N + x];
      if (id !== -1) tocarAuto(autos[id]);
    }
  }
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = pos(e);
  zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });

$("reiniciar").addEventListener("click", () => cargarNivel(nivel));
$("repetir").addEventListener("click", () => cargarNivel(nivel));
// Al terminar el último nivel de un estado/país se abre el mapa principal para VER SUBIR el agua; si no, la lista de niveles de su etapa
$("al-mapa").addEventListener("click", () => { $("victoria").hidden = true; abrirMapa(nivel % 100 === 0); });
$("siguiente").addEventListener("click", () => cargarNivel(Math.min(TOTAL_NIVELES, nivel + 1)));
addEventListener("resize", () => {
  const w0 = cw, h0 = ch;
  redim();
  if (!camTocada || (w0 > h0) !== (cw > ch)) ajustarCamara(); // vista sin tocar, o el celular giró: se encuadra de nuevo
  else { // el jugador ya movió la vista: se conserva y solo se recentra
    cam.ox += (cw - w0) / 2; cam.oy += (ch - h0) / 2;
    const s = escalaAjustada();
    camMin = s * 0.8; camMax = s * 7;
    cam.s = clamp(cam.s, camMin, camMax);
  }
});

// ----- Mapa (menú principal), botón ☰ y menú de pausa -----
// Botón ☰ (estándar): en el mapa principal NO se muestra; en el resto del mapa dice «Menú principal» y vuelve al mapa principal;
// dentro de una partida dice «Pausa» y abre el menú de pausa.
const btnMenu = $("btn-menu");
function botonMenu() {
  const enMapa = mapa.abierto();
  btnMenu.hidden = enMapa && mapa.esPrincipal();
  btnMenu.innerHTML = '<span class="b-ico">☰</span> ' + (enMapa ? "Menú principal" : "Pausa");
  btnMenu.title = enMapa ? "Volver al mapa principal" : "Pausa";
  chipMonedas.hidden = enMapa; // el saldo solo se ve en partida
}
// ----- Ventana «Info»: cómo se juega (usa los estilos .pausa-* de compartido/inmersivo.css) -----
const TEXTO_INFO = [
  ["🚗 Objetivo", "Saca todos los autos del estacionamiento. Ganas cuando no queda ninguno."],
  ["👆 Cómo sacar un auto", "Toca un auto y avanzará hacia donde apunta su flecha hasta salir por las esquinas, dando la vuelta por la vía que rodea el tablero."],
  ["🚧 Si algo le estorba", "Un auto no puede salir si otro está en su camino: saca primero al que estorba. Si la vía de salida está ocupada, espera un instante y vuelve a tocarlo. En cuanto tocas un auto, ya no estorba: puedes tocar los demás de inmediato."],
  ["🔍 Mover la vista", "Arrastra para mover el tablero y pellizca (o usa la rueda del ratón) para acercar o alejar."],
  ["💰 Monedas", "Ganas monedas la primera vez que terminas un nivel; mientras más grande el tablero, más monedas."],
  ["💥 Boosts", "Quitar un auto (30 monedas): toca el botón y luego el auto que quieres quitar. Paquete ×3 (50 monedas): te da 3 usos de quitar un auto. Bomba (100 monedas): elige una zona de 5×5 casillas y borra todos los autos que haya ahí."],
  ["🗺️ Mapa", "Los niveles se desbloquean en orden. Cada estado tiene 100 niveles; al terminarlo se desbloquea el siguiente y el agua del mapa sube. Con 🔄 reinicias el nivel y con ☰ Pausa puedes salir al mapa."],
];
let infoAbierta = null;
function abrirInfo() {
  if (infoAbierta) return;
  const fondo = document.createElement("div");
  fondo.className = "pausa-fondo";
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Cómo jugar");
  const panel = document.createElement("div");
  panel.className = "pausa-panel";
  panel.style.cssText = "width:min(100%,440px);text-align:left";
  const h2 = document.createElement("h2");
  h2.textContent = "ℹ️ Cómo jugar";
  h2.style.textAlign = "center";
  panel.appendChild(h2);
  for (const [titulo, texto] of TEXTO_INFO) {
    const b = document.createElement("b"); b.textContent = titulo; b.style.cssText = "display:block;margin:10px 0 2px";
    const p = document.createElement("p"); p.textContent = texto; p.style.cssText = "margin:0;font-size:.9rem;line-height:1.35;color:#d8dbe2";
    panel.append(b, p);
  }
  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "b3d txt b-verde"; ok.style.cssText = "display:flex;width:100%;margin:16px 0 4px";
  ok.innerHTML = '<span class="b-ico">👍</span> Entendido';
  panel.appendChild(ok);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  const cerrar = () => { removeEventListener("keydown", tecla, true); fondo.remove(); infoAbierta = null; };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  addEventListener("keydown", tecla, true);
  ok.addEventListener("click", cerrar);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  infoAbierta = fondo;
  try { ok.focus({ preventScroll: true }); } catch (e) {}
}

const mapa = montarMapa({
  progreso: () => prog,
  alInfo: abrirInfo,
  jugarNivel: (n) => { mapa.cerrar(); cargarNivel(n); botonMenu(); },
  alCambiarVista: () => botonMenu(),
});
function abrirMapa(aguaSube) {
  $("victoria").hidden = true;
  mapa.abrir(nivel, !!aguaSube);
  botonMenu();
}
const pausa = crearMenuPausa({
  puedeAbrir: () => !mapa.abierto(), // en el mapa no hay nada que pausar
  extras: () => [{ icono: "🔄", texto: "Reiniciar nivel", clase: "b-oro", alElegir: () => cargarNivel(nivel) }],
  textoSalir: "Salir al mapa",
  alSalir: () => abrirMapa(false),
});
btnMenu.addEventListener("click", () => { if (mapa.abierto()) mapa.principal(); else pausa.abrir(); });

// ----- Inicio -----
redim();
cargarNivel(clamp(prog.max, 1, TOTAL_NIVELES));
mapa.abrir(); // el juego empieza en el mapa (México de cerca)
botonMenu();
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  colocarVictoria(); // si la ventana de fin de nivel está abierta, sigue al tablero
  if (mapa.abierto()) firmaPrev = ""; // con el mapa encima no se dibuja; al cerrarlo se redibuja
  else {
    // El tablero solo se redibuja si cambió la vista (cámara, tamaño, bomba, autos que quedan, nivel nuevo) o si algo se está moviendo.
    // Con el tablero quieto no se gasta CPU ni batería. Un cuadro extra al terminar cada animación deja la imagen final.
    const f = firmaVista(), anima = hayAnimacion();
    if (anima || animPrev || f !== firmaPrev) dibujar();
    firmaPrev = f; animPrev = anima;
  }
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// ----- Sincronizar con la cuenta (al final, tras cargar el progreso local) -----
// prog = { max, hecho }: se queda con el mayor de cada uno (unirMaximos)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID_JUEGO, {
    clave: CLAVE,
    fusionar: m.unirMaximos,
    alCambiar: (v) => {
      prog.max = clamp(Number(v.max) || 1, 1, TOTAL_NIVELES);
      prog.hecho = Math.max(0, Number(v.hecho) || 0);
      hudNiveles(); // repinta el rótulo con lo que trajo la nube
      pintarMonedas(); pintarBoosts(); // las monedas ganadas dependen de prog.hecho
      mapa.refrescar(); // y el mapa, por si está abierto
    },
  });
  // Monedas y usos de «quitar un auto»: documento aparte con su propia regla de fusión (unirCartera)
  nubeCartera = m.conectar(ID_CARTERA, {
    clave: CLAVE_CARTERA,
    fusionar: unirCartera,
    alCambiar: (v) => { cartera = normalizar(v); pintarMonedas(); pintarBoosts(); },
  });
}).catch(() => {});
