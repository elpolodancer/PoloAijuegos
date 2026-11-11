// Ruta: navepixeles/juego-navepixeles.js
// «Nave y píxeles»: una nave dispara sola hacia arriba mientras una pirámide de píxeles baja desde el techo.
//  • Arrastra el dedo (o usa ← → / A D) para mover la nave.
//  • Izquierda: cuadros «+1». Dispárales para ganar un soldado (los soldados siguen a la nave y también disparan).
//  • Derecha: cuadros con el número de golpes que faltan para mejorar ARMA, CADENCIA o DAÑO.
//  • Si un píxel llega a la línea roja, se acaba la partida. Los puntos se anotan en el dispositivo y se envían al perfil.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID = "navepixeles"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d");
const estado = $("estado"), jugar = $("jugar"), capa = $("capa"), btnEntrar = $("entrar"), btnMenu = $("btn-menu");

// ---- Medidas (lienzo lógico 320×520; se dibuja más nítido en pantallas de alta densidad) ----
const W = 320, H = 520;
const DPR = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * DPR; cv.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
const S = 8;                 // lado de cada píxel de la pirámide
const COLS_MAX = 20;         // columnas máximas (20 × 8 = 160 px: el centro entre los dos carriles)
const MASA_X = (W - COLS_MAX * S) / 2;
const NAVE_Y = 456, LINEA = 424;
const VEL_NAVE = 480;
const MAX_BALAS = 220, MAX_PART = 90;
const PX = { x: 12, w: 52, h: 26 };       // cuadros «+1» (carril izquierdo)
const MJ = { x: 244, w: 68, h: 34 };      // cuadros de mejora (carril derecho)
const SLOTS = [[-16, 14], [16, 14], [0, 26], [-32, 26], [32, 26], [-16, 38], [16, 38], [-48, 38], [48, 38], [0, 50]]; // sitio de cada soldado
const MAXS = SLOTS.length;

// Armas: cada disparo es [desplazamiento en x, ángulo en grados]; pen = cuántos píxeles atraviesa; splash = radio del estallido
const ARMAS = [
  { nombre: "Cañón", d: [[0, 0]], color: "#9fe7ff" },
  { nombre: "Doble", d: [[-5, 0], [5, 0]], color: "#9fe7ff" },
  { nombre: "Triple", d: [[-6, -7], [0, 0], [6, 7]], color: "#7dffb2" },
  { nombre: "Cuádruple", d: [[-9, -9], [-3, -3], [3, 3], [9, 9]], color: "#7dffb2" },
  { nombre: "Perforante", d: [[-5, 0], [5, 0]], pen: 4, color: "#ff7ae6" },
  { nombre: "Misiles", d: [[-6, 0], [6, 0]], splash: 16, color: "#ffb347" },
  { nombre: "Tormenta", d: [[-12, -12], [-6, -6], [0, 0], [6, 6], [12, 12]], pen: 2, splash: 10, color: "#ff5c8a" },
];
const COSTE = {
  arma: (n) => Math.round(30 * 2 ** n),
  cadencia: (n) => Math.round(25 * 1.5 ** n),
  dano: (n) => Math.round(50 * 1.7 ** n),
};
// Color de cada píxel según su resistencia
const COLORES = ["#0c1624", "#14406b", "#1d6e8f", "#2b9179", "#8a4fd6", "#d6498a"];

// ---- Estado de la partida ----
let usuario = null, vivo = false, pausado = false, raf = 0, ultimo = 0, partida = 0, ahora = 0;
let nave, soldados, nivArma, nivCad, nivDano, ola, destruidos, orbesRotos;
let masa, balas, orbes, particulas, anillos, puertas, mejoras, aviso;
let tDisp, tSol, tOrbe, objX;
const teclas = { izq: false, der: false };

// ---- Progreso (se guarda en el navegador; mejor ola y mejores puntos) ----
const CLAVE = "navepixeles:progreso";
const cargarLocal = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
let progreso = cargarLocal();
let nube = null;
const guardarLocal = () => { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} if (nube) nube.guardado(); };

// Sesión y nube se cargan aparte: el juego nunca depende de Firebase
let entrarGoogle = null;
import("../compartido/jugador.js").then((m) => {
  entrarGoogle = m.entrar;
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
}).catch((e) => { console.warn("Nave y píxeles: sesión no disponible", e); });
btnEntrar.addEventListener("click", () => { if (entrarGoogle) entrarGoogle().catch((e) => { estado.textContent = e.message; }); });
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: m.unirMaximos, alCambiar: (v) => { progreso = v || {}; if (!vivo) mostrarMenu(); } });
}).catch(() => {});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const puntosActuales = () => Math.floor(destruidos / 4) + 10 * (ola - 1) + 5 * orbesRotos;
const intervalo = () => Math.max(0.12, 0.5 * 0.88 ** nivCad);
const danoBala = () => 1 + nivDano;
const costePuerta = () => 5 + 3 * soldados;

// ---- Pirámide de píxeles ----
// Formas: «v» (punta hacia abajo), «a» (pirámide con punta arriba) y «o» (rombo). Se alternan ola tras ola.
function crearOla(n) {
  const cols = Math.min(COLS_MAX, 10 + 2 * n);
  const forma = ["v", "a", "o"][(n - 1) % 3];
  const rows = forma === "o" ? cols : cols / 2;
  const base = 1 + Math.floor((n - 1) / 3);
  const hp = new Array(rows * cols).fill(0);
  let vivos = 0;
  for (let r = 0; r < rows; r++) {
    let ancho = forma === "v" ? cols - 2 * r : forma === "a" ? 2 * (r + 1) : 2 * Math.min(r + 1, rows - r);
    ancho = Math.min(cols, ancho);
    const c0 = (cols - ancho) / 2;
    for (let c = c0; c < c0 + ancho; c++) {
      hp[r * cols + c] = base + Math.floor((rows - 1 - r) / 5); // más duros lejos de la punta de abajo
      vivos++;
    }
  }
  return { cols, rows, hp, vivos, ox: MASA_X + ((COLS_MAX - cols) * S) / 2, oy: -rows * S - 6, v: Math.min(36, 6 + 2 * n), bajo: rows - 1 };
}
function recalcularBajo() {
  const m = masa;
  m.bajo = -1;
  for (let r = m.rows - 1; r >= 0 && m.bajo < 0; r--) for (let c = 0; c < m.cols; c++) if (m.hp[r * m.cols + c] > 0) { m.bajo = r; break; }
}
function chispas(x, y, color, n) {
  for (let i = 0; i < n && particulas.length < MAX_PART; i++) {
    const a = Math.random() * 6.283, v = 30 + Math.random() * 60;
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.35 + Math.random() * 0.25, c: color });
  }
}
function danarPixel(r, c, d) {
  const m = masa;
  if (r < 0 || c < 0 || r >= m.rows || c >= m.cols) return;
  const i = r * m.cols + c;
  if (m.hp[i] <= 0) return;
  m.hp[i] -= d;
  if (m.hp[i] <= 0) {
    m.hp[i] = 0; m.vivos--; destruidos++;
    chispas(m.ox + c * S + S / 2, m.oy + r * S + S / 2, "#8fd3ff", 2);
    if (r === m.bajo) recalcularBajo();
  }
}
function golpePixel(r, c, d, splash) {
  danarPixel(r, c, d);
  if (splash) {
    const k = Math.ceil(splash / S);
    for (let dr = -k; dr <= k; dr++) for (let dc = -k; dc <= k; dc++) {
      if ((dr || dc) && Math.hypot(dr, dc) * S <= splash) danarPixel(r + dr, c + dc, Math.ceil(d / 2));
    }
  }
}
function explosion(x, y, radio) {
  const m = masa;
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
    if (m.hp[r * m.cols + c] > 0 && Math.hypot(m.ox + c * S + S / 2 - x, m.oy + r * S + S / 2 - y) <= radio) danarPixel(r, c, 99);
  }
  anillos.push({ x, y, r: 6, max: radio, t: 0 });
}

// ---- Cuadros ----
function crearPuertas() {
  puertas = [];
  for (let i = 0; i < 7; i++) puertas.push({ y: 60 + i * 46, resta: costePuerta(), max: costePuerta(), flash: -9 });
}
function crearMejoras() {
  mejoras = ["arma", "cadencia", "dano"].map((tipo, i) => ({ tipo, y: 118 + i * 84, resta: 0, max: 0, flash: -9 }));
  mejoras.forEach(reponer);
}
function nivelDe(m) { return m.tipo === "arma" ? nivArma : m.tipo === "cadencia" ? nivCad : nivDano; }
function reponer(m) {
  m.tope = m.tipo === "arma" && nivArma >= ARMAS.length - 1;
  m.resta = m.max = m.tope ? 0 : COSTE[m.tipo](nivelDe(m));
}
function mostrarAviso(txt) { aviso = { txt, t: 1.6 }; }
function subirMejora(m) {
  if (m.tipo === "arma") { nivArma++; mostrarAviso("¡Arma: " + ARMAS[nivArma].nombre + "!"); }
  else if (m.tipo === "cadencia") { nivCad++; mostrarAviso("¡Disparas más rápido!"); }
  else { nivDano++; mostrarAviso("¡Más daño!"); }
  m.flash = ahora; reponer(m);
}
function ganarSoldado(p) {
  soldados++; p.flash = ahora;
  nave.sol.push({ x: nave.x, y: NAVE_Y + 20 });
  mostrarAviso("¡Un soldado más!");
  const c = costePuerta();
  puertas.forEach((q) => { q.max = q.resta = c; });
}

// ---- Disparos ----
function disparar(x, y, dx, ang, dano, arma, soldado) {
  if (balas.length >= MAX_BALAS) return;
  const a = (ang * Math.PI) / 180;
  balas.push({ x: x + dx, y: y - 12, vx: Math.sin(a) * 420, vy: -Math.cos(a) * 420, d: dano, pen: arma.pen || 0, splash: arma.splash || 0, c: soldado ? "#cfd8e6" : arma.color, ult: null });
}
// Golpea lo primero que encuentra la bala; devuelve true si la bala se acaba
function impacto(b) {
  // Orbes rojos (minas con número)
  for (const o of orbes) {
    if (o !== b.ult && Math.hypot(b.x - o.x, b.y - o.y) <= o.r + 2) {
      o.hp -= b.d; o.flash = ahora; b.ult = o;
      if (o.hp <= 0) { o.muerto = true; orbesRotos++; explosion(o.x, o.y, 42); mostrarAviso("¡Mina destruida!"); }
      if (b.pen-- > 0) continue;
      return true;
    }
  }
  // Cuadros «+1»
  if (soldados < MAXS && b.x >= PX.x && b.x <= PX.x + PX.w) {
    for (const p of puertas) {
      if (p !== b.ult && b.y >= p.y && b.y <= p.y + PX.h) {
        p.resta--; p.flash = ahora; b.ult = p;
        if (p.resta <= 0) ganarSoldado(p);
        if (b.pen-- > 0) continue;
        return true;
      }
    }
  }
  // Cuadros de mejora
  if (b.x >= MJ.x && b.x <= MJ.x + MJ.w) {
    for (const m of mejoras) {
      if (!m.tope && m !== b.ult && b.y >= m.y && b.y <= m.y + MJ.h) {
        m.resta--; m.flash = ahora; b.ult = m;
        if (m.resta <= 0) subirMejora(m);
        if (b.pen-- > 0) continue;
        return true;
      }
    }
  }
  // Pirámide de píxeles
  const c = Math.floor((b.x - masa.ox) / S), r = Math.floor((b.y - masa.oy) / S);
  if (c >= 0 && c < masa.cols && r >= 0 && r < masa.rows && masa.hp[r * masa.cols + c] > 0) {
    const clave = r * 100 + c;
    if (b.ult !== clave) {
      b.ult = clave;
      golpePixel(r, c, b.d, b.splash);
      if (b.pen-- > 0) return false;
      return true;
    }
  }
  return false;
}

// ---- Partida ----
function empezar() {
  partida++;
  nave = { x: W / 2, sol: [] };
  soldados = 0; nivArma = 0; nivCad = 0; nivDano = 0; ola = 1; destruidos = 0; orbesRotos = 0;
  balas = []; orbes = []; particulas = []; anillos = []; aviso = null;
  tDisp = 0.2; tSol = 0.6; tOrbe = 14; objX = W / 2;
  masa = crearOla(1); crearPuertas(); crearMejoras();
  vivo = true; pausado = false; ultimo = performance.now(); ahora = 0;
  capa.style.display = "none"; estado.textContent = "";
  document.body.classList.add("jugando"); btnMenu.hidden = false;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(ciclo);
}
function mostrarMenu() {
  vivo = false; pausado = false; cancelAnimationFrame(raf);
  document.body.classList.remove("jugando"); btnMenu.hidden = true;
  capa.style.display = "";
  jugar.textContent = "▶ Jugar";
  const p = progreso;
  estado.innerHTML = "<b>🚀 Nave y píxeles</b><br>Arrastra el dedo para mover la nave: dispara sola. Rompe los <b>+1</b> de la izquierda para ganar soldados y los cuadros de la derecha para mejorar tu arma. ¡No dejes que la pirámide de píxeles toque la línea roja!"
    + (p.o ? "<br><br>Tu mejor: ola " + p.o + " · " + (p.p || 0) + " puntos" : "");
  preparaVista(); dibujar();
}
function preparaVista() { // pantalla de inicio: una pirámide quieta de adorno
  ola = 1; destruidos = 0; orbesRotos = 0; soldados = 0; nivArma = 0; nivCad = 0; nivDano = 0; ahora = 0;
  nave = { x: W / 2, sol: [] }; balas = []; orbes = []; particulas = []; anillos = []; aviso = null;
  masa = crearOla(3); masa.oy = 60; crearPuertas(); crearMejoras();
}
let guardando = false;
async function fin() {
  vivo = false; cancelAnimationFrame(raf);
  document.body.classList.remove("jugando"); btnMenu.hidden = true;
  const pts = Math.min(1000, puntosActuales()), esta = partida;
  progreso.o = Math.max(progreso.o || 0, ola); progreso.p = Math.max(progreso.p || 0, pts); progreso.n = (progreso.n || 0) + 1;
  guardarLocal();
  capa.style.display = ""; jugar.textContent = "Jugar otra vez";
  estado.innerHTML = "<b>💥 ¡Te alcanzaron!</b><br>Llegaste a la ola <b>" + ola + "</b> y destruiste " + destruidos + " píxeles: <b>" + pts + " puntos</b>.<br>Tu mejor: ola " + progreso.o + " · " + progreso.p + " puntos";
  dibujar();
  if (!pts) return;
  encolarPuntos(ID, pts); // se anotan SIEMPRE en el dispositivo y se envían al perfil cuando haya internet y sesión
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  if (esta !== partida || vivo) return;
  estado.innerHTML += "<br>" + (pendientes === 0 ? "Guardados ✓" : "Puntos anotados: se enviarán a tu perfil cuando haya internet y sesión.");
}

// ---- Actualización ----
function actualizar(dt) {
  ahora += dt;
  // Nave: sigue al dedo (o a las flechas)
  const dir = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
  if (dir) objX = clamp(objX + dir * VEL_NAVE * dt, 14, W - 14);
  nave.x += clamp(objX - nave.x, -VEL_NAVE * dt, VEL_NAVE * dt);
  nave.sol.forEach((s, i) => {
    s.x += (nave.x + SLOTS[i][0] - s.x) * Math.min(1, dt * 10);
    s.y += (NAVE_Y + SLOTS[i][1] - s.y) * Math.min(1, dt * 10);
  });
  // Disparo automático de la nave y de los soldados
  const arma = ARMAS[nivArma], inter = intervalo();
  tDisp -= dt; tSol -= dt;
  if (tDisp <= 0) { tDisp += inter; arma.d.forEach(([dx, a]) => disparar(nave.x, NAVE_Y, dx, a, danoBala(), arma, false)); }
  if (tSol <= 0) { tSol += inter * 1.5; const dm = 1 + Math.floor(nivDano / 2); nave.sol.forEach((s) => disparar(s.x, s.y, 0, 0, dm, ARMAS[0], true)); }
  // Balas (avanzan en pasos cortos para no atravesar píxeles)
  for (const b of balas) {
    const pasos = Math.ceil((420 * dt) / 5);
    for (let k = 0; k < pasos && !b.fin; k++) {
      b.x += (b.vx * dt) / pasos; b.y += (b.vy * dt) / pasos;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) { b.fin = true; break; }
      if (impacto(b)) b.fin = true;
    }
  }
  balas = balas.filter((b) => !b.fin);
  // Pirámide: baja despacio. Cuando no queda ningún píxel llega la ola siguiente
  masa.oy += masa.v * dt;
  if (masa.vivos <= 0) {
    ola++; masa = crearOla(ola);
    mostrarAviso("Ola " + ola);
  } else if (masa.bajo >= 0 && masa.oy + (masa.bajo + 1) * S >= LINEA) { fin(); return; }
  // Minas rojas con número: bajan solas; al romperlas arrasan los píxeles cercanos
  tOrbe -= dt;
  if (tOrbe <= 0) { tOrbe = 14 + Math.random() * 8; const hp = 8 + 4 * ola; orbes.push({ x: 100 + Math.random() * 120, y: -20, hp, max: hp, r: 15, flash: -9 }); }
  orbes.forEach((o) => { o.y += 18 * dt; if (o.y > LINEA) o.muerto = true; });
  orbes = orbes.filter((o) => !o.muerto);
  // Chispas y anillos
  particulas.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
  particulas = particulas.filter((p) => p.t > 0);
  anillos.forEach((a) => { a.t += dt; a.r = 6 + (a.max - 6) * Math.min(1, a.t / 0.3); });
  anillos = anillos.filter((a) => a.t < 0.4);
  if (aviso && (aviso.t -= dt) <= 0) aviso = null;
}

// ---- Dibujo ----
function texto(t, x, y, tam, color, alin = "center") {
  cx.font = "bold " + tam + "px monospace"; cx.textAlign = alin; cx.textBaseline = "middle";
  cx.fillStyle = color; cx.fillText(t, x, y);
}
function caja(x, y, w, h, ancho, color) {
  cx.strokeStyle = "rgba(255,255,255,.22)"; cx.lineWidth = ancho + 4; cx.strokeRect(x, y, w, h);
  cx.strokeStyle = color; cx.lineWidth = ancho; cx.strokeRect(x, y, w, h);
}
function icono(tipo, x, y) { // x,y = centro (16×16 aprox.)
  cx.save(); cx.translate(x, y);
  if (tipo === "arma") { // tantas barritas como disparos del arma actual
    const n = ARMAS[nivArma].d.length;
    cx.fillStyle = ARMAS[nivArma].color;
    for (let i = 0; i < n; i++) cx.fillRect(n === 1 ? -1.5 : -8 + i * (13 / (n - 1)), -8, 3, 10);
    cx.fillStyle = "#eaf6ff"; cx.beginPath(); cx.moveTo(0, 2); cx.lineTo(-7, 9); cx.lineTo(7, 9); cx.closePath(); cx.fill();
  } else if (tipo === "cadencia") { // rayo
    cx.fillStyle = "#ffe066"; cx.beginPath();
    cx.moveTo(2, -9); cx.lineTo(-6, 2); cx.lineTo(-1, 2); cx.lineTo(-3, 9); cx.lineTo(6, -2); cx.lineTo(1, -2); cx.closePath(); cx.fill();
  } else { // estallido de daño
    cx.fillStyle = "#ff7a59"; cx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 4 : 9; cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    cx.closePath(); cx.fill();
  }
  cx.restore();
}
function dibujar() {
  cx.clearRect(0, 0, W, H);
  // Línea de peligro
  cx.setLineDash([6, 6]); cx.strokeStyle = "rgba(255,80,80,.6)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(0, LINEA); cx.lineTo(W, LINEA); cx.stroke(); cx.setLineDash([]);
  // Pirámide de píxeles
  const m = masa;
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      const hp = m.hp[r * m.cols + c];
      if (hp <= 0) continue;
      cx.fillStyle = COLORES[Math.min(COLORES.length - 1, hp - 1)];
      cx.fillRect(m.ox + c * S, m.oy + r * S, S - 1, S - 1);
    }
  }
  // Contorno neón: solo las aristas que dan al vacío
  cx.beginPath();
  const vivo_ = (r, c) => r >= 0 && c >= 0 && r < m.rows && c < m.cols && m.hp[r * m.cols + c] > 0;
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
    if (!vivo_(r, c)) continue;
    const x = m.ox + c * S, y = m.oy + r * S;
    if (!vivo_(r - 1, c)) { cx.moveTo(x, y); cx.lineTo(x + S, y); }
    if (!vivo_(r + 1, c)) { cx.moveTo(x, y + S); cx.lineTo(x + S, y + S); }
    if (!vivo_(r, c - 1)) { cx.moveTo(x, y); cx.lineTo(x, y + S); }
    if (!vivo_(r, c + 1)) { cx.moveTo(x + S, y); cx.lineTo(x + S, y + S); }
  }
  cx.strokeStyle = "rgba(80,170,255,.35)"; cx.lineWidth = 5; cx.stroke();
  cx.strokeStyle = "#7cc4ff"; cx.lineWidth = 1.6; cx.stroke();
  // Cuadros «+1»
  for (const p of puertas) {
    const lleno = soldados >= MAXS, dest = ahora - p.flash < 0.12;
    cx.fillStyle = dest ? "rgba(255,255,255,.45)" : "rgba(8,10,16,.85)"; cx.fillRect(PX.x, p.y, PX.w, PX.h);
    if (!lleno && p.max) { cx.fillStyle = "rgba(124,196,255,.35)"; cx.fillRect(PX.x, p.y, (PX.w * (p.max - p.resta)) / p.max, PX.h); }
    caja(PX.x, p.y, PX.w, PX.h, 2, lleno ? "#6b7280" : "#fff");
    texto(lleno ? "MÁX" : "+1", PX.x + PX.w / 2, p.y + PX.h / 2 + 1, lleno ? 13 : 18, lleno ? "#9aa3b2" : "#fff");
  }
  // Cuadros de mejora (con su nombre pequeño encima)
  for (const q of mejoras) {
    const dest = ahora - q.flash < 0.12;
    const nom = q.tipo === "arma" ? "ARMA · " + (q.tope ? ARMAS[nivArma].nombre : ARMAS[nivArma + 1].nombre) : q.tipo === "cadencia" ? "CADENCIA" : "DAÑO";
    texto(nom, MJ.x + MJ.w / 2, q.y - 6, 9, "#9fb3d1");
    cx.fillStyle = dest ? "rgba(255,255,255,.45)" : "rgba(8,10,16,.85)"; cx.fillRect(MJ.x, q.y, MJ.w, MJ.h);
    if (!q.tope && q.max) { cx.fillStyle = "rgba(124,196,255,.3)"; cx.fillRect(MJ.x, q.y, (MJ.w * (q.max - q.resta)) / q.max, MJ.h); }
    caja(MJ.x, q.y, MJ.w, MJ.h, 2, q.tope ? "#6b7280" : "#fff");
    icono(q.tipo, MJ.x + 16, q.y + MJ.h / 2);
    texto(q.tope ? "MÁX" : String(q.resta), MJ.x + MJ.w - 7, q.y + MJ.h / 2 + 1, 15, q.tope ? "#9aa3b2" : "#fff", "right");
  }
  // Minas rojas con número
  for (const o of orbes) {
    const dest = ahora - o.flash < 0.1;
    cx.strokeStyle = dest ? "#fff" : "#ff3b3b"; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(o.x, o.y, o.r, 0, 6.283); cx.stroke();
    cx.lineWidth = 1.5; cx.beginPath(); cx.arc(o.x, o.y, o.r - 6, 0, 6.283); cx.stroke();
    cx.fillStyle = "#d4162b"; cx.fillRect(o.x - 18, o.y - o.r - 18, 36, 14);
    texto(String(Math.max(0, o.hp)), o.x, o.y - o.r - 10.5, 12, "#fff");
  }
  // Balas
  for (const b of balas) { cx.fillStyle = b.c; cx.fillRect(b.x - 1.5, b.y - 5, 3, 9); }
  // Soldados y nave
  for (const s of nave.sol) {
    cx.fillStyle = "rgba(160,160,160,.55)"; cx.strokeStyle = "#fff"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(s.x, s.y, 7, 0, 6.283); cx.fill(); cx.stroke();
    cx.fillStyle = "#fff"; cx.beginPath(); cx.moveTo(s.x, s.y - 7); cx.lineTo(s.x - 3, s.y - 2); cx.lineTo(s.x + 3, s.y - 2); cx.fill();
  }
  const nx = nave.x;
  cx.fillStyle = "#eaf6ff"; cx.strokeStyle = "#7cc4ff"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(nx, NAVE_Y - 14); cx.lineTo(nx - 10, NAVE_Y + 10); cx.lineTo(nx, NAVE_Y + 5); cx.lineTo(nx + 10, NAVE_Y + 10); cx.closePath(); cx.fill(); cx.stroke();
  // Chispas y anillos de explosión
  for (const p of particulas) { cx.globalAlpha = Math.min(1, p.t * 3); cx.fillStyle = p.c; cx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5); }
  cx.globalAlpha = 1;
  for (const a of anillos) { cx.globalAlpha = 1 - a.t / 0.4; cx.strokeStyle = "#ff8a5c"; cx.lineWidth = 3; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 6.283); cx.stroke(); }
  cx.globalAlpha = 1;
  // Marcador y avisos
  if (vivo) {
    texto("OLA " + ola, W / 2, 14, 13, "#ffe066");
    texto(puntosActuales() + " pts", W / 2, 30, 12, "#cfe6ff");
    if (aviso) { cx.globalAlpha = Math.min(1, aviso.t * 2); texto(aviso.txt, W / 2, 250, 20, "#fff"); cx.globalAlpha = 1; }
  }
}
function ciclo(t) {
  if (!vivo || pausado) return;
  const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
  actualizar(dt);
  if (vivo) { dibujar(); raf = requestAnimationFrame(ciclo); }
}

// ---- Controles ----
const moverA = (e) => { const r = cv.getBoundingClientRect(); objX = clamp(((e.clientX - r.left) / r.width) * W, 14, W - 14); };
cv.addEventListener("pointerdown", (e) => { if (!vivo || pausado) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} moverA(e); });
cv.addEventListener("pointermove", (e) => { if (vivo && !pausado && (e.buttons || e.pointerType === "touch")) moverA(e); });
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { teclas.izq = true; e.preventDefault(); }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { teclas.der = true; e.preventDefault(); }
});
addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") teclas.izq = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") teclas.der = false;
});
jugar.addEventListener("click", empezar);

// Menú de pausa estándar (☰)
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => vivo,
  alAbrir: () => { pausado = true; cancelAnimationFrame(raf); },
  alContinuar: () => { if (!vivo) return; pausado = false; ultimo = performance.now(); raf = requestAnimationFrame(ciclo); },
  extras: () => [{ icono: "🔁", texto: "Empezar de nuevo", clase: "b-azul", alElegir: () => empezar() }],
  alSalir: () => { mostrarMenu(); },
  ayudaSalir: "Pierdes los puntos de esta partida.",
});
document.addEventListener("visibilitychange", () => { if (document.hidden && vivo && !pausado) pausa.abrir(); });
mostrarMenu();
