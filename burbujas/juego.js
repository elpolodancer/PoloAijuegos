// Ruta: burbujas/juego.js
// Juego «Burbujas» (estilo Bubble Shooter). Los ajustes están aquí arriba.

const ID = "burbujas";

// ---------- AJUSTES ----------
const R = 22;                    // radio de cada burbuja
const COLS = 10;                 // burbujas por fila (las formas de FORMAS deben medir esto)
const ALTO = 760;                // alto lógico del lienzo
const LIMITE_FILA = 13;          // si una burbuja llega a esta fila, pierdes
const TIROS_POR_FILA_INICIO = 6; // tiros sin reventar para que baje el techo (nivel 1)
const TIROS_POR_FILA_MIN = 4;    // ...y lo mínimo al que llega en niveles altos
const VELOCIDAD = 17;            // píxeles por cuadro del disparo
const MIN_GRADOS = 12;           // ángulo mínimo respecto a la horizontal
const PUNTOS_BASE = 10;          // por burbuja reventada
const PUNTOS_CAIDA = 30;         // por burbuja que cae
const PUNTOS_POR_PERFIL = 25;    // 1 punto al perfil por cada 25 del juego

// Especiales: cómo se ganan
const REVENTAR_PARA_BOMBA = 6;   // reventar 6 o más de un tiro → bomba
const CAIDAS_PARA_ARCOIRIS = 4;  // hacer caer 4 o más de un tiro → arcoíris
const RACHA_PARA_RAYO = 3;       // 3 tiros seguidos que revientan → rayo
const RADIO_BOMBA = 2;           // alcance de la bomba (en burbujas)

const COLORES = [                // [luz, base, sombra]
  ["#ff9fb8", "#ff4f7b", "#b8184a"],
  ["#ffe98a", "#ffc20e", "#b88400"],
  ["#a5f0a0", "#3fcf5a", "#16883a"],
  ["#9fd8ff", "#2f9bff", "#1658b8"],
  ["#d9b0ff", "#a455ff", "#6420b8"],
  ["#ffc79a", "#ff8a2b", "#b8500a"],
];

// Formas de los niveles: «#» burbuja, «.» vacío. Cada fila mide COLS (10) y debe quedar pegada al techo.
// Al pasar la última, se repiten con más colores y menos tiros por fila. Para agregar una, copia un bloque.
const FORMAS = [
  { nombre: "Triángulo", filas: ["##########", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Corazón", filas: [".###..###.", "##########", "##########", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Rombo", filas: ["....##....", "...####...", "..######..", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Cortinas", filas: ["##.##.##.#", "##.##.##.#", "##.##.##.#", "##.##.##.#", "##########"] },
  { nombre: "Cara sonriente", filas: ["##########", "##########", "##..##..##", "##########", "##########", "##.####.##", "###....###"] },
  { nombre: "Ondas", filas: ["##########", "##########", "#.#.#.#.#.", "##########", "#.#.#.#.#.", "#.#.#.#.#."] },
  { nombre: "Castillo", filas: ["#.##..##.#", "##########", "##########", "##########", ".###..###."] },
  { nombre: "Reloj de arena", filas: ["##########", ".########.", "..######..", "...####...", "....##....", "...####...", "..######..", ".########.", "##########"] },
];
const FONDOS = [                 // [arriba, abajo] por nivel, en ciclo
  ["#5b2a9e", "#d0589a"], ["#1b4fa0", "#4cc3d9"], ["#0f6b4a", "#9be37a"],
  ["#a0391b", "#ffb24c"], ["#2a2a7a", "#c35cff"], ["#7a1b4f", "#ff7a8a"],
];
const ESPECIALES = {
  bomba: { emoji: "💣", c: ["#8a8a8a", "#2d2d2d", "#050505"], texto: "¡Bomba!" },
  arcoiris: { emoji: "🌈", c: null, texto: "¡Arcoíris!" },
  rayo: { emoji: "⚡", c: ["#fff6a0", "#ffd400", "#b88a00"], texto: "¡Rayo!" },
};

// ---------- Perfil (puntos totales del portal) ----------
// Se carga aparte para que el juego funcione aunque falle Firebase.
// Si tu sumarPuntos recibe otros argumentos, ajústalo SOLO aquí (copia la llamada de gominolas/juego.js).
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => { sumarPuntos = m.sumarPuntos; }).catch(() => {});
let enviadosPerfil = 0;
function enviarPerfil() {
  const debe = Math.floor(puntos / PUNTOS_POR_PERFIL) - enviadosPerfil;
  if (!sumarPuntos || debe <= 0) return;
  enviadosPerfil += debe;
  try { Promise.resolve(sumarPuntos(ID, debe)).catch(() => {}); } catch (e) {}
}

// ---------- Sonidos (se generan con WebAudio, no hay archivos) ----------
let audio = null, silencio = false;
try { silencio = localStorage.getItem("burbujas_silencio") === "1"; } catch (e) {}
function ac() {
  if (silencio) return null;
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}
function tono(f, dur, o = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (o.retraso || 0);
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.tipo || "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
  g.gain.setValueAtTime(o.vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function ruido(dur, vol = 0.2, corte = 900, retraso = 0) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = corte;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + retraso);
}
const ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
function sonido(tipo, n = 1) {
  switch (tipo) {
    case "disparo": tono(380, 0.09, { tipo: "triangle", hasta: 760, vol: 0.12 }); break;
    case "posar": tono(180, 0.08, { tipo: "sine", hasta: 120, vol: 0.14 }); break;
    case "reventar":
      for (let i = 0; i < Math.min(n, 7); i++) tono(ESCALA[i], 0.16, { tipo: "triangle", hasta: ESCALA[i] * 1.4, vol: 0.13, retraso: i * 0.05 });
      ruido(0.08, 0.08, 3000); break;
    case "caer":
      for (let i = 0; i < Math.min(n, 5); i++) tono(900 - i * 80, 0.28, { tipo: "sine", hasta: 200, vol: 0.09, retraso: 0.1 + i * 0.06 });
      break;
    case "premio":
      [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.18, { tipo: "square", vol: 0.07, retraso: i * 0.07 })); break;
    case "bomba": ruido(0.5, 0.45, 700); tono(110, 0.4, { tipo: "sawtooth", hasta: 40, vol: 0.18 }); break;
    case "arcoiris":
      ESCALA.forEach((f, i) => tono(f, 0.2, { tipo: "sine", vol: 0.1, retraso: i * 0.045 })); break;
    case "rayo": tono(1800, 0.25, { tipo: "sawtooth", hasta: 90, vol: 0.14 }); ruido(0.18, 0.2, 5000); break;
    case "nivel":
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.2, { tipo: "triangle", vol: 0.14, retraso: i * 0.1 })); break;
    case "perder":
      [440, 392, 349, 262].forEach((f, i) => tono(f, 0.35, { tipo: "triangle", vol: 0.15, retraso: i * 0.2 })); break;
    case "cambiar": tono(660, 0.06, { tipo: "square", vol: 0.06 }); break;
  }
}

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const ANCHO = 2 * R * (COLS + 0.5);
const RH = R * Math.sqrt(3);     // alto entre filas
const TIRADOR = { x: ANCHO / 2, y: ALTO - 70 };
const POS_SIGUIENTE = { x: 52, y: ALTO - 48 };
lienzo.width = ANCHO * 2; lienzo.height = ALTO * 2;   // el doble para que se vea nítido
ctx.scale(2, 2);

const $ = (id) => document.getElementById(id);
const elNivel = $("nivel"), elPuntos = $("puntos"), elRecord = $("record"), elSonido = $("sonido");
function pintarBotonSonido() { elSonido.textContent = silencio ? "🔇" : "🔊"; elSonido.setAttribute("aria-label", silencio ? "Activar sonido" : "Silenciar"); }
pintarBotonSonido();
elSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("burbujas_silencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido(); sonido("cambiar");
});

// ---------- Estado ----------
// Los colores son números (0..5). Los especiales son texto: "bomba", "arcoiris", "rayo" (nunca quedan en la rejilla).
let grid, par, puntos, nivel, record, tiros, tirosPorFila, ncol, racha, estado; // estado: "inicio" | "jugando" | "fin"
let actual, siguiente, disparo, apuntando, angulo;
let caen = [], chispas = [], deslizar = 0, aviso = 0, avisoTexto = "", tic = 0;

try { record = Number(localStorage.getItem("burbujas_record")) || 0; } catch (e) { record = 0; }
elRecord.textContent = record;

// ---------- Rejilla hexagonal ----------
const px = (r, c) => R + c * 2 * R + (((r + par) & 1) ? R : 0);
const py = (r) => R + r * RH;

function vecinos(r, c) {
  const desp = (r + par) & 1;
  const dc = desp ? [0, 1] : [-1, 0];
  const lista = [[r, c - 1], [r, c + 1]];
  for (const dr of [-1, 1]) for (const d of dc) lista.push([r + dr, c + d]);
  return lista.filter(([rr, cc]) => rr >= 0 && rr < grid.length && cc >= 0 && cc < COLS);
}

function coloresPresentes() {
  const s = new Set();
  for (const fila of grid) for (const v of fila) if (v !== null) s.add(v);
  return [...s];
}
const colorAlAzar = () => { const p = coloresPresentes(); return p.length ? p[Math.floor(Math.random() * p.length)] : 0; };

function filaNueva() {
  return Array.from({ length: COLS }, () => Math.floor(Math.random() * ncol));
}

function nuevoNivel() {
  par = 0;
  const forma = FORMAS[(nivel - 1) % FORMAS.length];
  ncol = Math.min(3 + Math.floor((nivel - 1) / 2), COLORES.length);
  tirosPorFila = Math.max(TIROS_POR_FILA_MIN, TIROS_POR_FILA_INICIO - Math.floor((nivel - 1) / 4));
  grid = forma.filas.map((s) => [...s].map((ch) => (ch === "#" ? Math.floor(Math.random() * ncol) : null)));
  soltarFlotantes(true);   // por si alguna forma quedó sin tocar el techo
  tiros = 0; racha = 0; disparo = null; caen = []; chispas = [];
  actual = colorAlAzar(); siguiente = colorAlAzar();
  elNivel.textContent = nivel;
  avisoTexto = "Nivel " + nivel + " · " + forma.nombre; aviso = 110;
}

function iniciar() {
  ac();
  puntos = 0; nivel = 1; enviadosPerfil = 0; estado = "jugando";
  elPuntos.textContent = 0;
  nuevoNivel();
  $("inicio").classList.remove("activo");
  $("fin").classList.remove("activo");
}

// ---------- Disparo ----------
function disparar() {
  if (disparo || estado !== "jugando") return;
  disparo = { x: TIRADOR.x, y: TIRADOR.y, vx: Math.cos(angulo) * VELOCIDAD, vy: -Math.sin(angulo) * VELOCIDAD, color: actual };
  actual = siguiente;
  siguiente = colorAlAzar();
  sonido("disparo");
}

function chocaConTablero(x, y) {
  if (y <= R + deslizar) return true;
  for (let r = 0; r < grid.length; r++) {
    const yy = py(r) - deslizar;
    if (Math.abs(yy - y) > 2 * R) continue;
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === null) continue;
      const dx = px(r, c) - x, dy = yy - y;
      if (dx * dx + dy * dy < (2 * R * 0.9) ** 2) return true;
    }
  }
  return false;
}

function avanzar(b) {
  // dos subpasos para que no atraviese burbujas
  for (let i = 0; i < 2; i++) {
    b.x += b.vx / 2; b.y += b.vy / 2;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > ANCHO - R) { b.x = ANCHO - R; b.vx = -Math.abs(b.vx); }
    if (chocaConTablero(b.x, b.y)) return true;
  }
  return false;
}

// Busca la celda vacía más cercana; solo la ocupa si es una burbuja de color
function acomodar(b, ocupar) {
  const r0 = Math.round((b.y - R) / RH);
  let mejor = null, mejorD = Infinity;
  for (let rr = Math.max(0, r0 - 1); rr <= r0 + 1; rr++) {
    while (grid.length <= rr) grid.push(Array(COLS).fill(null));
    for (let c = 0; c < COLS; c++) {
      if (grid[rr][c] !== null) continue;
      const d = (px(rr, c) - b.x) ** 2 + (py(rr) - b.y) ** 2;
      if (d < mejorD) { mejorD = d; mejor = [rr, c]; }
    }
  }
  const [r, c] = mejor;
  if (ocupar) grid[r][c] = b.color;
  return [r, c];
}

function recortarFilasVacias() {
  while (grid.length > 1 && grid[grid.length - 1].every((v) => v === null)) grid.pop();
}

// Quita una lista de celdas; devuelve cuántas había
function quitar(celdas, color) {
  let n = 0;
  for (const [r, c] of celdas) {
    if (grid[r][c] === null) continue;
    soltarChispas(px(r, c), py(r) - deslizar, grid[r][c]);
    grid[r][c] = null; n++;
  }
  return n;
}

function reventar(r, c) {
  const color = grid[r][c];
  const vistos = new Set([r + "," + c]);
  const pila = [[r, c]];
  while (pila.length) {
    const [rr, cc] = pila.pop();
    for (const [vr, vc] of vecinos(rr, cc)) {
      const k = vr + "," + vc;
      if (!vistos.has(k) && grid[vr][vc] === color) { vistos.add(k); pila.push([vr, vc]); }
    }
  }
  if (vistos.size < 3) return 0;
  const n = quitar([...vistos].map((k) => k.split(",").map(Number)));
  puntos += n * PUNTOS_BASE + Math.max(0, n - 3) * PUNTOS_BASE;
  return n;
}

// ---------- Especiales ----------
function areaBomba(r, c) {
  const marcadas = new Set([r + "," + c]);
  let borde = [[r, c]];
  for (let i = 0; i < RADIO_BOMBA; i++) {
    const nuevo = [];
    for (const [rr, cc] of borde) for (const [vr, vc] of vecinos(rr, cc)) {
      const k = vr + "," + vc;
      if (!marcadas.has(k)) { marcadas.add(k); nuevo.push([vr, vc]); }
    }
    borde = nuevo;
  }
  return [...marcadas].map((k) => k.split(",").map(Number));
}

function usarEspecial(tipo, r, c) {
  let celdas = [];
  if (tipo === "bomba") {
    celdas = areaBomba(r, c);
    sonido("bomba");
  } else if (tipo === "rayo") {
    for (let cc = 0; cc < COLS; cc++) celdas.push([r, cc]);
    sonido("rayo");
  } else {   // arcoíris: borra todas las burbujas del color que toca (o uno al azar si no toca ninguna)
    const cuenta = {};
    for (const [vr, vc] of vecinos(r, c)) {
      const v = grid[vr][vc];
      if (v !== null) cuenta[v] = (cuenta[v] || 0) + 1;
    }
    const claves = Object.keys(cuenta);
    const objetivo = claves.length ? Number(claves.sort((a, b) => cuenta[b] - cuenta[a])[0]) : colorAlAzar();
    for (let rr = 0; rr < grid.length; rr++) for (let cc = 0; cc < COLS; cc++) if (grid[rr][cc] === objetivo) celdas.push([rr, cc]);
    sonido("arcoiris");
  }
  const n = quitar(celdas);
  puntos += n * PUNTOS_BASE * 2;
  return n;
}

function darEspecial(tipo) {
  if (typeof actual === "string") siguiente = tipo;          // ya llevas uno: este queda de «siguiente»
  else { siguiente = actual; actual = tipo; }
  avisoTexto = ESPECIALES[tipo].texto; aviso = 60;
  sonido("premio");
}

function soltarFlotantes(silencioso = false) {
  const vistos = new Set();
  const pila = [];
  for (let c = 0; c < COLS; c++) if (grid[0][c] !== null) { vistos.add("0," + c); pila.push([0, c]); }
  while (pila.length) {
    const [r, c] = pila.pop();
    for (const [vr, vc] of vecinos(r, c)) {
      const k = vr + "," + vc;
      if (!vistos.has(k) && grid[vr][vc] !== null) { vistos.add(k); pila.push([vr, vc]); }
    }
  }
  let n = 0;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] !== null && !vistos.has(r + "," + c)) {
      if (!silencioso) caen.push({ x: px(r, c), y: py(r) - deslizar, vy: -2 - Math.random() * 3, vx: (Math.random() - 0.5) * 3, color: grid[r][c] });
      grid[r][c] = null; n++;
    }
  }
  if (!silencioso) puntos += n * PUNTOS_CAIDA;
  return n;
}

function soltarChispas(x, y, color) {
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
    chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, color });
  }
}

function bajarTecho() {
  grid.unshift(filaNueva());
  par ^= 1;
  deslizar = RH;
}

function terminarTiro(b) {
  const esEspecial = typeof b.color === "string";
  const [r, c] = acomodar(b, !esEspecial);
  disparo = null;

  let n = 0, cayeron = 0;
  if (esEspecial) n = usarEspecial(b.color, r, c);
  else { sonido("posar"); n = reventar(r, c); }

  if (n) {
    cayeron = soltarFlotantes();
    tiros = 0; racha++;
    if (!esEspecial) sonido("reventar", n);
    if (cayeron) sonido("caer", cayeron);
  } else { tiros++; racha = 0; }
  recortarFilasVacias();

  if (grid.every((f) => f.every((v) => v === null))) {   // nivel limpio
    puntos += 200 + nivel * 50;
    actualizarMarcador();
    sonido("nivel");
    nivel++;
    nuevoNivel();
    return;
  }

  // premios por jugar bien
  if (!esEspecial) {
    if (cayeron >= CAIDAS_PARA_ARCOIRIS) darEspecial("arcoiris");
    else if (n >= REVENTAR_PARA_BOMBA) darEspecial("bomba");
    else if (racha >= RACHA_PARA_RAYO) { darEspecial("rayo"); racha = 0; }
  }

  if (tiros >= tirosPorFila) { bajarTecho(); tiros = 0; }

  // los colores que siguen deben existir todavía en el tablero
  const p = coloresPresentes();
  if (typeof actual === "number" && !p.includes(actual)) actual = colorAlAzar();
  if (typeof siguiente === "number" && !p.includes(siguiente)) siguiente = colorAlAzar();

  actualizarMarcador();
  for (let rr = LIMITE_FILA; rr < grid.length; rr++) {
    if (grid[rr].some((v) => v !== null)) { perder(); return; }
  }
}

function actualizarMarcador() {
  elPuntos.textContent = puntos;
  if (puntos > record) {
    record = puntos; elRecord.textContent = record;
    try { localStorage.setItem("burbujas_record", String(record)); } catch (e) {}
  }
}

function perder() {
  estado = "fin";
  sonido("perder");
  enviarPerfil();
  $("finTitulo").textContent = "Se acabó";
  $("finTexto").textContent = "Llegaste al nivel " + nivel + " con " + puntos + " puntos" + (puntos >= record && puntos > 0 ? ". ¡Nuevo récord!" : ".");
  $("fin").classList.add("activo");
}

// ---------- Entrada ----------
function posicion(e) {
  const rect = lienzo.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (ANCHO / rect.width), y: (e.clientY - rect.top) * (ALTO / rect.height) };
}
function apuntarA(p) {
  let a = Math.atan2(TIRADOR.y - p.y, p.x - TIRADOR.x);
  const m = (MIN_GRADOS * Math.PI) / 180;
  a = Math.max(m, Math.min(Math.PI - m, a));
  angulo = a;
}
function cambiar() {
  if (disparo) return;
  [actual, siguiente] = [siguiente, actual];
  sonido("cambiar");
}
lienzo.addEventListener("pointerdown", (e) => {
  ac();
  if (estado !== "jugando") return;
  const p = posicion(e);
  if (Math.hypot(p.x - POS_SIGUIENTE.x, p.y - POS_SIGUIENTE.y) < 34) { cambiar(); return; }
  lienzo.setPointerCapture(e.pointerId);
  apuntando = true; apuntarA(p);
});
lienzo.addEventListener("pointermove", (e) => { if (apuntando) apuntarA(posicion(e)); });
lienzo.addEventListener("pointerup", () => { if (apuntando) { apuntando = false; disparar(); } });
lienzo.addEventListener("pointercancel", () => { apuntando = false; });
window.addEventListener("keydown", (e) => {
  if (estado !== "jugando") return;
  if (e.key === "ArrowLeft") angulo = Math.min(Math.PI - (MIN_GRADOS * Math.PI) / 180, angulo + 0.05);
  if (e.key === "ArrowRight") angulo = Math.max((MIN_GRADOS * Math.PI) / 180, angulo - 0.05);
  if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); disparar(); }
  if (e.key === "x") cambiar();
});
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfil(); });
$("jugar").addEventListener("click", iniciar);
$("otra").addEventListener("click", iniciar);

// ---------- Dibujo ----------
function burbuja(x, y, color, escala = 1) {
  const esp = typeof color === "string";
  let r = R * 0.96 * escala;
  if (esp) r *= 1 + 0.05 * Math.sin(tic / 8);   // los especiales «laten»
  let g;
  if (esp && !ESPECIALES[color].c) {                // arcoíris
    g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    ["#ff4f7b", "#ffc20e", "#3fcf5a", "#2f9bff", "#a455ff"].forEach((col, i) => g.addColorStop(i / 4, col));
  } else {
    const [luz, base, sombra] = esp ? ESPECIALES[color].c : COLORES[color];
    g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, luz); g.addColorStop(0.55, base); g.addColorStop(1, sombra);
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (esp) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = Math.round(r * 1.15) + "px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ESPECIALES[color].emoji, x, y + 1);
    return;
  }
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
}

function guia() {
  // trayectoria punteada con un rebote en pared
  const b = { x: TIRADOR.x, y: TIRADOR.y, vx: Math.cos(angulo) * 8, vy: -Math.sin(angulo) * 8 };
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 160; i++) {
    b.x += b.vx; b.y += b.vy;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > ANCHO - R) { b.x = ANCHO - R; b.vx = -Math.abs(b.vx); }
    if (chocaConTablero(b.x, b.y)) break;
    if (i % 3 === 0 && i > 3) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  }
}

function dibujar() {
  const [arriba, abajo] = FONDOS[((nivel || 1) - 1) % FONDOS.length];
  const fondo = ctx.createLinearGradient(0, 0, 0, ALTO);
  fondo.addColorStop(0, arriba); fondo.addColorStop(1, abajo);
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.fillStyle = "rgba(20,5,50,.7)"; ctx.fillRect(0, 0, ANCHO, 4);   // techo

  // línea de peligro
  const yl = py(LIMITE_FILA) - R;
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(ANCHO, yl); ctx.stroke(); ctx.setLineDash([]);

  if (!grid) return;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] !== null) burbuja(px(r, c), py(r) - deslizar, grid[r][c]);
  }
  for (const b of caen) burbuja(b.x, b.y, b.color);
  for (const s of chispas) {
    ctx.globalAlpha = Math.max(0, s.vida);
    ctx.fillStyle = COLORES[s.color][0];
    ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (estado === "jugando") {
    if (!disparo) guia();
    // cuántos tiros faltan para que baje el techo
    for (let i = 0; i < tirosPorFila; i++) {
      ctx.fillStyle = i < tiros ? "#ffe27a" : "rgba(255,255,255,.25)";
      ctx.beginPath(); ctx.arc(ANCHO - 20 - i * 14, ALTO - 20, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // tirador
    ctx.save(); ctx.translate(TIRADOR.x, TIRADOR.y); ctx.rotate(Math.PI / 2 - angulo);
    ctx.fillStyle = "#ffffff55"; ctx.beginPath(); ctx.roundRect(-9, -R - 22, 18, 40, 8); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#2a0d55"; ctx.beginPath(); ctx.arc(TIRADOR.x, TIRADOR.y, R + 8, 0, Math.PI * 2); ctx.fill();
    if (!disparo) burbuja(TIRADOR.x, TIRADOR.y, actual);
    if (disparo) burbuja(disparo.x, disparo.y, disparo.color);
    // siguiente (se puede tocar para cambiar)
    ctx.fillStyle = "#2a0d55"; ctx.beginPath(); ctx.arc(POS_SIGUIENTE.x, POS_SIGUIENTE.y, R + 6, 0, Math.PI * 2); ctx.fill();
    burbuja(POS_SIGUIENTE.x, POS_SIGUIENTE.y, siguiente, 0.85);
  }

  if (aviso > 0) {
    ctx.globalAlpha = Math.min(1, aviso / 30);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(40,10,80,.8)"; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.font = "800 30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.strokeText(avisoTexto, ANCHO / 2, ALTO / 2 - 40);
    ctx.fillText(avisoTexto, ANCHO / 2, ALTO / 2 - 40);
    ctx.globalAlpha = 1;
  }
}

// ---------- Ciclo (paso fijo de 1/60 s, igual en pantallas de 60, 90 o 120 Hz) ----------
function paso() {
  tic++;
  if (estado === "jugando" && disparo && avanzar(disparo)) terminarTiro(disparo);
  if (deslizar > 0) deslizar = Math.max(0, deslizar - 3);
  if (aviso > 0) aviso--;
  for (const b of caen) { b.vy += 0.6; b.y += b.vy; b.x += b.vx; }
  caen = caen.filter((b) => b.y < ALTO + 40);
  for (const s of chispas) { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.vida -= 0.035; }
  chispas = chispas.filter((s) => s.vida > 0);
}

let ultimo = 0, acum = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  acum = Math.min(acum + (ahora - ultimo), 100);
  ultimo = ahora;
  while (acum >= 1000 / 60) { acum -= 1000 / 60; paso(); }
  dibujar();
}

angulo = Math.PI / 2;
estado = "inicio";
requestAnimationFrame(cuadro);
