// Ruta: gominolas/juego.js
// «Conecta gominolas»: arrastra por gominolas iguales y juntas (3 o más) para juntarlas.
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "gominolas"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
const COLUMNAS = 7;
const FILAS = 8;
const COLORES = 5;          // de 3 a 6
const MIN_CADENA = 3;       // mínimo de gominolas para juntar
const SEGUNDOS = 60;        // duración de la partida
const TIEMPO_MAX = 90;      // el tiempo extra nunca pasa de esto
const CADENA_EXTRA = 6;     // cadenas de este largo o más dan tiempo extra
const SEGUNDOS_EXTRA = 2;
const PUNTOS_BASE = 10;     // por gominola; las cadenas largas dan bono
const GRAVEDAD = 70;        // filas/s² con que caen
const PUNTOS_POR_PERFIL = 25; // al perfil se envía 1 punto por cada 25 del juego (así pesa parecido a los demás juegos)
const CLAVE_MEJOR = "gominolas_mejor";

const PALETA = [
  { c: "#ff5d73", o: "#b8213d" }, // fresa
  { c: "#ffa534", o: "#c26a00" }, // naranja
  { c: "#ffe14d", o: "#b79a00" }, // limón
  { c: "#4fd16b", o: "#1f8a39" }, // manzana
  { c: "#4aa8ff", o: "#1b62b8" }, // arándano
  { c: "#c07cff", o: "#7a32c4" }, // uva
];
const NOTAS = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const elPts = document.getElementById("pts");
const elSeg = document.getElementById("seg");
const elMejor = document.getElementById("mejor");
const elBarra = document.getElementById("barra");
const ovl = document.getElementById("ovl");
const ovlTitulo = document.getElementById("ovlTitulo");
const ovlTexto = document.getElementById("ovlTexto");
const ovlBtn = document.getElementById("ovlBtn");
const btnEntrar = document.getElementById("entrar");

// ---------- Estado ----------
let grid = [];          // grid[fila][col] = { k: color, y: fila visual, v: velocidad }
let estado = "inicio";  // inicio | jugando | fin
let puntos = 0;
let tiempo = SEGUNDOS;
let mejor = 0;
let cadena = null;      // [{f,c}, ...] mientras el dedo está abajo
let revisar = false;
let particulas = [];
let textos = [];
let tam = 50;           // tamaño de celda en px CSS
let ultimo = 0;
let usuario = null;     // sesión de Google (null si no ha entrado)

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}
elMejor.textContent = mejor;

// ---------- Sonido ----------
let ac = null;
function tono(f, d = 0.12) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.14, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

// ---------- Tablero ----------
const azar = () => Math.floor(Math.random() * COLORES);
const nueva = (y) => ({ k: azar(), y, v: 0 });

function llenar() {
  grid = [];
  for (let f = 0; f < FILAS; f++) {
    grid.push([]);
    for (let c = 0; c < COLUMNAS; c++) grid[f].push(nueva(f - FILAS - 1 - Math.random() * 2));
  }
  let intentos = 0;
  while (!hayJugada() && intentos++ < 50) barajar();
}

function vecinos(f, c) {
  const r = [];
  for (let df = -1; df <= 1; df++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!df && !dc) continue;
      const nf = f + df, nc = c + dc;
      if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) r.push([nf, nc]);
    }
  return r;
}

// ¿Existe algún grupo de MIN_CADENA o más gominolas iguales y juntas?
function hayJugada() {
  const visto = new Set();
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      if (visto.has(f * 100 + c)) continue;
      const k = grid[f][c].k;
      let n = 0;
      const pila = [[f, c]];
      visto.add(f * 100 + c);
      while (pila.length) {
        const [a, b] = pila.pop();
        n++;
        for (const [na, nb] of vecinos(a, b)) {
          if (!visto.has(na * 100 + nb) && grid[na][nb].k === k) {
            visto.add(na * 100 + nb);
            pila.push([na, nb]);
          }
        }
      }
      if (n >= MIN_CADENA) return true;
    }
  return false;
}

// Revuelve los colores que ya hay hasta que haya jugada
function barajar() {
  const ks = [];
  grid.forEach((fila) => fila.forEach((g) => ks.push(g.k)));
  let intentos = 0;
  do {
    for (let i = ks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ks[i], ks[j]] = [ks[j], ks[i]];
    }
    let i = 0;
    grid.forEach((fila) => fila.forEach((g) => (g.k = ks[i++])));
    intentos++;
  } while (!hayJugada() && intentos < 40);
  if (!hayJugada()) grid.forEach((fila) => fila.forEach((g) => (g.k = azar())));
}

function caer() {
  for (let c = 0; c < COLUMNAS; c++) {
    let w = FILAS - 1;
    for (let f = FILAS - 1; f >= 0; f--) {
      if (grid[f][c]) {
        if (f !== w) { grid[w][c] = grid[f][c]; grid[f][c] = null; }
        w--;
      }
    }
    for (let f = w; f >= 0; f--) grid[f][c] = nueva(-(w - f + 1));
  }
  revisar = true;
}

function cayendo() {
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) if (grid[f][c].y < f - 0.001) return true;
  return false;
}

// ---------- Jugada ----------
function juntar(cad) {
  const n = cad.length;
  const ganancia = Math.round(n * PUNTOS_BASE + (n - MIN_CADENA) * (n - MIN_CADENA) * (PUNTOS_BASE / 2));
  puntos += ganancia;
  cad.forEach(({ f, c }) => {
    const g = grid[f][c];
    const x = (c + 0.5) * tam, y = (g.y + 0.5) * tam;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      particulas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, vida: 0.5 + Math.random() * 0.3, k: g.k });
    }
    grid[f][c] = null;
  });
  const ult = cad[cad.length - 1];
  textos.push({ x: (ult.c + 0.5) * tam, y: (ult.f + 0.5) * tam, vida: 0.9, txt: "+" + ganancia });
  if (n >= CADENA_EXTRA) {
    tiempo = Math.min(TIEMPO_MAX, tiempo + SEGUNDOS_EXTRA);
    textos.push({ x: tam * COLUMNAS / 2, y: tam * 0.8, vida: 1.1, txt: "+" + SEGUNDOS_EXTRA + " s" });
  }
  for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => tono(NOTAS[Math.min(i + 3, NOTAS.length - 1)], 0.15), i * 55);
  caer();
  elPts.textContent = puntos;
}

// ---------- Entrada ----------
function celdaEn(ev) {
  const r = lienzo.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const t = r.width / COLUMNAS;
  const c = Math.floor(x / t), f = Math.floor(y / t);
  if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) return null;
  const cerca = Math.hypot(x - (c + 0.5) * t, y - (f + 0.5) * t) < t * 0.42;
  return { f, c, cerca };
}

lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando" || cayendo()) return;
  const p = celdaEn(ev);
  if (!p) return;
  lienzo.setPointerCapture(ev.pointerId);
  cadena = [{ f: p.f, c: p.c }];
  tono(NOTAS[0], 0.08);
});

lienzo.addEventListener("pointermove", (ev) => {
  if (!cadena) return;
  const p = celdaEn(ev);
  if (!p || !p.cerca) return;
  const ult = cadena[cadena.length - 1];
  if (p.f === ult.f && p.c === ult.c) return;
  // volver atrás quita la última
  if (cadena.length > 1) {
    const ant = cadena[cadena.length - 2];
    if (ant.f === p.f && ant.c === p.c) { cadena.pop(); return; }
  }
  if (Math.max(Math.abs(p.f - ult.f), Math.abs(p.c - ult.c)) !== 1) return;
  if (cadena.some((q) => q.f === p.f && q.c === p.c)) return;
  if (grid[p.f][p.c].k !== grid[ult.f][ult.c].k) return;
  cadena.push({ f: p.f, c: p.c });
  tono(NOTAS[Math.min(cadena.length - 1, NOTAS.length - 1)], 0.08);
});

function soltar() {
  if (cadena && cadena.length >= MIN_CADENA && estado === "jugando") juntar(cadena);
  cadena = null;
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", () => (cadena = null));

// ---------- Partida ----------
function empezar() {
  puntos = 0;
  tiempo = SEGUNDOS;
  cadena = null;
  particulas = [];
  textos = [];
  revisar = false;
  llenar();
  estado = "jugando";
  ovl.classList.add("oculto");
  elPts.textContent = 0;
  tono(NOTAS[4], 0.15);
}

function terminar() {
  estado = "fin";
  cadena = null;
  let nuevoRecord = false;
  if (puntos > mejor) {
    mejor = puntos;
    nuevoRecord = true;
    try { localStorage.setItem(CLAVE_MEJOR, String(mejor)); } catch (e) {}
    elMejor.textContent = mejor;
  }
  ovlTitulo.textContent = "¡Se acabó el tiempo!";
  ovlTexto.textContent = puntos + " puntos" + (nuevoRecord ? " · ¡nuevo récord!" : "");
  ovlBtn.textContent = "Jugar otra vez";
  ovl.classList.remove("oculto");
  enviarPuntos(puntos);
}

// ---------- Sesión y perfil ----------
alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { ovlTexto.textContent = e.message; }));

// Guarda en el perfil los puntos de la partida (convertidos con PUNTOS_POR_PERFIL); solo si hay sesión
async function enviarPuntos(pts) {
  const sumar = Math.floor(pts / PUNTOS_POR_PERFIL);
  if (!usuario || !sumar) return;
  try { await sumarPuntos(ID, sumar); ovlTexto.textContent += " · +" + sumar + " al perfil ✓"; }
  catch (e) { ovlTexto.textContent += " · no se pudieron guardar (" + e.message + ")"; }
}

ovlBtn.addEventListener("click", empezar);

// ---------- Dibujo ----------
function ajustar() {
  const dpr = window.devicePixelRatio || 1;
  const w = lienzo.clientWidth;
  tam = w / COLUMNAS;
  lienzo.style.height = tam * FILAS + "px";
  lienzo.width = Math.round(w * dpr);
  lienzo.height = Math.round(tam * FILAS * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", ajustar);

function oso(x, y, r, col, esc) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(esc, esc);
  // sombra
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // orejas
  for (const s of [-1, 1]) {
    ctx.fillStyle = col.c; ctx.strokeStyle = col.o; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(s * r * 0.62, -r * 0.7, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // cabeza
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, "rgba(255,255,255,.75)");
  gr.addColorStop(0.35, col.c);
  gr.addColorStop(1, col.o);
  ctx.fillStyle = gr; ctx.strokeStyle = col.o; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hocico
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.4, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // ojos y nariz
  ctx.fillStyle = "#2b1a3a";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.08, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.09, r * 0.065, 0, 0, Math.PI * 2); ctx.fill();
  // brillo
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function dibujar() {
  ctx.clearRect(0, 0, tam * COLUMNAS, tam * FILAS);
  // cuadrícula suave
  ctx.fillStyle = "rgba(255,255,255,.05)";
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++)
      if ((f + c) % 2) ctx.fillRect(c * tam, f * tam, tam, tam);

  const enCadena = new Set((cadena || []).map((q) => q.f * 100 + q.c));
  // línea que une la cadena
  if (cadena && cadena.length > 1) {
    const col = PALETA[grid[cadena[0].f][cadena[0].c].k];
    ctx.strokeStyle = col.c; ctx.globalAlpha = 0.75;
    ctx.lineWidth = tam * 0.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    cadena.forEach((q, i) => {
      const x = (q.c + 0.5) * tam, y = (q.f + 0.5) * tam;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      const g = grid[f] && grid[f][c];
      if (!g) continue;
      const sel = enCadena.has(f * 100 + c);
      oso((c + 0.5) * tam, (g.y + 0.5) * tam, tam * 0.38, PALETA[g.k], sel ? 1.14 : 1);
      if (sel) {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc((c + 0.5) * tam, (g.y + 0.5) * tam, tam * 0.45, 0, Math.PI * 2); ctx.stroke();
      }
    }
  // contador de la cadena sobre la última gominola
  if (cadena && cadena.length > 0) {
    const u = cadena[cadena.length - 1];
    const x = (u.c + 0.5) * tam, y = (u.f + 0.5) * tam - tam * 0.5;
    const ok = cadena.length >= MIN_CADENA;
    ctx.fillStyle = ok ? "#fff" : "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(x, y, tam * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b2a73"; ctx.font = "bold " + tam * 0.26 + "px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(cadena.length, x, y + 1);
  }
  // partículas
  for (const p of particulas) {
    ctx.globalAlpha = Math.max(0, p.vida * 1.8);
    ctx.fillStyle = PALETA[p.k].c;
    ctx.beginPath(); ctx.arc(p.x, p.y, tam * 0.07, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // textos flotantes
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold " + tam * 0.36 + "px system-ui, sans-serif";
  for (const t of textos) {
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#3b2a73"; ctx.lineWidth = 4;
    ctx.strokeText(t.txt, t.x, t.y); ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- Bucle ----------
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;

  // caída
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      const g = grid[f] && grid[f][c];
      if (g && g.y < f) {
        g.v += GRAVEDAD * dt;
        g.y += g.v * dt;
        if (g.y >= f) { g.y = f; g.v = 0; }
      }
    }
  if (revisar && !cayendo()) {
    revisar = false;
    if (!hayJugada()) {
      barajar();
      textos.push({ x: tam * COLUMNAS / 2, y: tam * FILAS / 2, vida: 1.2, txt: "¡Revuelto!" });
    }
  }
  // partículas y textos
  particulas.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vida -= dt; });
  particulas = particulas.filter((p) => p.vida > 0);
  textos.forEach((t) => { t.y -= 30 * dt; t.vida -= dt; });
  textos = textos.filter((t) => t.vida > 0);

  // tiempo
  if (estado === "jugando") {
    tiempo -= dt;
    if (tiempo <= 0) { tiempo = 0; terminar(); }
    elSeg.textContent = Math.ceil(tiempo);
    elBarra.style.width = (tiempo / SEGUNDOS) * 100 + "%";
    elBarra.classList.toggle("poco", tiempo <= 10);
  }
  dibujar();
  requestAnimationFrame(bucle);
}

// Arranque: tablero de fondo y pantalla de inicio
ajustar();
llenar();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });
