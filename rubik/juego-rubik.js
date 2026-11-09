// Ruta: rubik/juego-rubik.js
// Interfaz del cubo n×n (2×2 hasta 10×10): dibujo en 3D con CSS, arrastre, botones, cronómetro, pausa estándar y progreso.
import { crearCubo, girar, resuelto, mover, mezcla, cruz, aplicar, CARAS, GIROS } from "./logica-rubik.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";

const $ = (id) => document.getElementById(id);
const JUEGO = "rubik", CLAVE = "rubik_progreso_v1";
const cuboEl = $("cubo"), escena = $("escena");
let S = 60, N = 3, ancho = 1, cubies = [], anim = null, cola = [], historial = [], movs = 0;
// Por tamaño: giros de mezcla, puntos base y tiempo «par» en segundos (el bono es lo que sobre de ese tiempo)
const MAXN = 10;
const TABLA = {
  2: { cant: 15, base: 50, par: 60 }, 3: { cant: 20, base: 100, par: 300 }, 4: { cant: 40, base: 250, par: 600 },
  5: { cant: 60, base: 500, par: 900 }, 6: { cant: 80, base: 800, par: 1200 }, 7: { cant: 100, base: 1100, par: 1800 },
  8: { cant: 120, base: 1500, par: 2400 }, 9: { cant: 140, base: 2000, par: 3000 }, 10: { cant: 160, base: 2600, par: 3600 },
};
const TAMANOS = Array.from({ length: MAXN - 1 }, (_, i) => i + 2);
let fase = "libre";                 // libre | mezclando | mezclado | resuelto
let vx = -28, vy = -38;             // giro de la vista (grados)
let jugando = false, enPausa = false, prima = false, dedo = null, nube = null, vaciar = null;
const nuevoCrono = () => ({ t0: 0, acum: 0, activo: false, espera: false, ini: false });
let crono = nuevoCrono();

const ms = () => crono.acum + (crono.activo ? performance.now() - crono.t0 : 0);
const fmt = (t) => { const s = Math.floor(t / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const pausarCrono = () => { if (crono.activo) { crono.acum = ms(); crono.activo = false; crono.espera = true; } };
const seguirCrono = () => { if (crono.espera) { crono.t0 = performance.now(); crono.activo = true; crono.espera = false; } };

// ----- Progreso local (se sincroniza con la cuenta vía compartido/progreso.js) -----
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {} };
// Mejores tiempos por tamaño: m = { "2": ms, "3": ms, "4": ms } (el «mejor» suelto de la versión 3×3 se toma como el de 3×3)
const normal = (p) => { const m = { ...(p.m || {}) }; if (p.mejor > 0 && !(m[3] > 0)) m[3] = p.mejor; return m; };
const fusionar = (a, b) => {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const x = normal(a), y = normal(b), m = {};
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) { const v = [x[k], y[k]].filter((t) => t > 0); if (v.length) m[k] = Math.min(...v); }
  return { m, resueltos: Math.max(a.resueltos || 0, b.resueltos || 0), t: Math.max(a.t || 0, b.t || 0) };
};
function refrescarMejor() {
  const m = normal(leer()), txt = TAMANOS.filter((n) => m[n] > 0).map((n) => n + "×" + n + " " + fmt(m[n])).join(" · ");
  $("mejor").textContent = txt ? "🏆 Tus mejores tiempos: " + txt : "";
}

// ----- Dibujo -----
function construir() {
  cuboEl.replaceChildren();
  cubies = crearCubo(N);
  for (const c of cubies) {
    const el = document.createElement("div");
    el.className = "cubie";
    if (N >= 5 && !c.d.length) continue; // piezas interiores: no se dibujan (en 10×10 serían 512 piezas ocultas)
    CARAS.forEach((f, i) => {
      const cara = document.createElement("div");
      const d = c.d.find((x) => x.i === i);
      cara.className = "f";
      cara.style.transform = f.css;
      if (d) cara.style.backgroundColor = d.c;
      cara.dataset.c = c.id; cara.dataset.i = i;
      el.appendChild(cara);
    });
    c.el = el; cuboEl.appendChild(el);
  }
  pintar();
}
function pintarVista() { cuboEl.style.transform = "rotateX(" + vx + "deg) rotateY(" + vy + "deg)"; }
function pintar(lista = cubies) {
  for (const c of lista) {
    if (!c.el) continue;
    const m = c.M, p = c.p;
    let t = "";
    if (anim && [].concat(anim.layer).includes(p[anim.ax])) { const e = [0, 0, 0]; e[anim.ax] = 1; t = "rotate3d(" + e + "," + anim.ang + "deg) "; }
    c.el.style.transform = t + "matrix3d(" + [m[0], m[3], m[6], 0, m[1], m[4], m[7], 0, m[2], m[5], m[8], 0, p[0] * S, p[1] * S, p[2] * S, 1] + ")";
  }
  pintarVista();
}
function medir() {
  S = Math.max(20, Math.min(innerWidth * 0.2, innerHeight * (innerHeight < 420 ? 0.1 : 0.14), 92) * 3 / N); // el cubo entero mide lo mismo en cualquier tamaño
  document.documentElement.style.setProperty("--S", S + "px");
  pintar();
}
function hud() {
  $("chip-tiempo").innerHTML = "<small>⏱</small>" + fmt(ms());
  $("chip-mov").innerHTML = "<small>Mov</small>" + movs;
}
setInterval(hud, 200);

// ----- Movimientos (cola con animación) -----
function procesar() {
  if (anim || !cola.length) return;
  const m = cola.shift(), dur = m.rapido ? Math.max(35, Math.min(90, 90 - (N - 4) * 12)) : 230, t0 = performance.now();
  anim = { ax: m.ax, layer: m.layer, ang: 0 };
  const capaM = [].concat(m.layer), afectados = cubies.filter((c) => c.el && capaM.includes(c.p[m.ax])); // solo se repinta la capa que gira
  const paso = (ahora) => {
    const f = Math.min(1, (ahora - t0) / dur);
    anim.ang = m.k * 90 * (f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f));
    if (f < 1) { pintar(afectados); requestAnimationFrame(paso); return; }
    anim = null;
    girar(cubies, m.ax, m.layer, m.k);
    pintar(afectados);
    alTerminar(m);
    procesar();
  };
  requestAnimationFrame(paso);
}
function alTerminar(m) {
  if (m.origen === "usuario") {
    historial.push(m); movs++;
    if (fase === "mezclado" && resuelto(cubies)) ganar();
  } else if (m.origen === "deshacer") movs = Math.max(0, movs - 1);
  else if (m.origen === "mezcla" && !cola.some((x) => x.origen === "mezcla")) { fase = "mezclado"; historial = []; movs = 0; crono = nuevoCrono(); }
  hud();
}
function jugar(m) {
  if (!jugando || enPausa || fase === "mezclando" || fase === "resuelto") return;
  if (fase === "mezclado" && !crono.ini) crono = { t0: performance.now(), acum: 0, activo: true, espera: false, ini: true };
  m.origen = "usuario"; cola.push(m); procesar();
}
function mezclar() {
  if (anim) { setTimeout(mezclar, 120); return; }
  cola = []; historial = []; movs = 0; crono = nuevoCrono(); fase = "mezclando";
  for (const m of mezcla(N, TABLA[N].cant)) { m.origen = "mezcla"; m.rapido = true; cola.push(m); }
  procesar(); hud();
}
function reiniciar() {
  if (anim) { setTimeout(reiniciar, 120); return; }
  cola = []; historial = []; movs = 0; crono = nuevoCrono(); fase = "libre";
  construir(); hud();
}
function deshacer() {
  if (!jugando || enPausa || fase === "mezclando" || fase === "resuelto" || anim || cola.length || !historial.length) return;
  const h = historial.pop();
  cola.push({ ax: h.ax, layer: h.layer, k: -h.k, origen: "deshacer" });
  procesar();
}
function ganar() {
  fase = "resuelto";
  const t = ms(); crono.activo = false; crono.acum = t;
  const pts = TABLA[N].base + Math.max(0, TABLA[N].par - Math.round(t / 1000));
  const p = leer(), m = normal(p), nuevo = !(m[N] > 0) || t < m[N];
  if (nuevo) m[N] = Math.round(t);
  guardar({ m, resueltos: (p.resueltos || 0) + 1, t: Date.now() });
  encolarPuntos(JUEGO, pts);
  if (vaciar) vaciar();
  if (nube) nube.guardado();
  $("fin-txt").textContent = N + "×" + N + " · " + fmt(t) + " · " + movs + " movimientos · +" + pts + " puntos" + (nuevo ? " · 🏆 ¡Nuevo récord!" : "");
  setTimeout(() => { $("fin").hidden = false; $("b-otra").focus(); }, 500);
}

// ----- Pantallas -----
function irMenu() {
  jugando = false; enPausa = false;
  $("menu").hidden = false; $("juego").hidden = true; $("btn-menu").hidden = true;
  refrescarMejor();
}
function iniciar(n) {
  N = n; ancho = 1; jugando = true;
  $("menu").hidden = true; $("juego").hidden = false; $("btn-menu").hidden = false;
  $("chip-modelo").textContent = N + "×" + N;
  bw.hidden = N < 4; etiquetas(); medir(); reiniciar();
}
const COLOR_N = (n) => (n === 2 ? "b-verde" : n === 3 ? "b-azul" : n === 4 ? "b-morado" : n <= 7 ? "b-oro" : "b-rojo"); // más color = más difícil
for (const n of TAMANOS) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt grande " + COLOR_N(n); b.textContent = "▶ " + n + "×" + n;
  b.addEventListener("click", () => iniciar(n));
  $("modelos").appendChild(b);
}
$("b-mezclar").addEventListener("click", () => { if (jugando && !enPausa && fase !== "resuelto") mezclar(); });
$("b-deshacer").addEventListener("click", deshacer);
$("b-otra").addEventListener("click", () => { $("fin").hidden = true; fase = "libre"; mezclar(); });
$("b-fin-menu").addEventListener("click", () => { $("fin").hidden = true; fase = "libre"; irMenu(); });

// ----- Menú de pausa estándar -----
crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => jugando && fase !== "resuelto",
  alAbrir: () => { enPausa = true; pausarCrono(); },
  alContinuar: () => { enPausa = false; seguirCrono(); },
  extras: () => [
    { icono: "🔀", texto: "Mezclar de nuevo", clase: "b-oro", alElegir: () => { enPausa = false; mezclar(); } },
    { icono: "🧊", texto: "Cubo resuelto (modo libre)", clase: "b-azul", alElegir: () => { enPausa = false; reiniciar(); } },
  ],
  ayudaSalir: "Se pierde la partida en curso",
  alSalir: () => { enPausa = false; irMenu(); },
});

// ----- Botones de caras (notación oficial) y teclado -----
const LETRAS = [..."URFDLB"];
const botones = LETRAS.map((L) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d chico b-azul";
  b.addEventListener("click", () => jugar(mover(L, prima, N, ancho)));
  $("caras").appendChild(b);
  return b;
});
const bp = document.createElement("button");
bp.type = "button"; bp.className = "b3d chico b-morado"; bp.title = "Girar al revés (′)"; bp.setAttribute("aria-label", "Girar al revés");
bp.innerHTML = '<span class="b-ico">′</span>';
$("caras").appendChild(bp);
const bw = document.createElement("button"); // «Ancho»: solo desde 4×4, gira las dos capas exteriores juntas
bw.type = "button"; bw.className = "b3d chico txt b-oro"; bw.hidden = true; bw.title = "Girar varias capas exteriores a la vez (Uw, Rw…); cada toque suma una capa";
bw.innerHTML = '<span class="b-ico">⧉</span> Ancho';
$("fila2").prepend(bw);
function etiquetas() {
  botones.forEach((b, i) => {
    b.innerHTML = '<span class="b-ico">' + LETRAS[i] + (ancho > 1 ? "w" : "") + (prima ? "′" : "") + "</span>";
    b.title = b.ariaLabel = "Girar " + (ancho > 1 ? ancho + " capas desde la cara " : "la cara ") + LETRAS[i] + (prima ? " al revés" : "");
  });
  bp.classList.toggle("on", prima); bp.setAttribute("aria-pressed", String(prima));
  bw.innerHTML = '<span class="b-ico">⧉</span> Ancho' + (ancho > 1 ? " " + ancho : "");
  bw.classList.toggle("on", ancho > 1); bw.setAttribute("aria-pressed", String(ancho > 1));
}
bp.addEventListener("click", () => { prima = !prima; etiquetas(); });
bw.addEventListener("click", () => { ancho = ancho >= Math.max(1, N >> 1) ? 1 : ancho + 1; etiquetas(); }); // 1 → 2 → … → mitad del cubo → 1
etiquetas();
addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  const L = e.key.toUpperCase();
  if (GIROS[L]) jugar(mover(L, e.shiftKey, N, ancho));
});

// ----- Arrastre: sobre una pegatina gira su capa; sobre el fondo gira la vista -----
function proyectar(v) { // dónde cae un vector del mundo en la pantalla con la vista actual
  const a = vy * Math.PI / 180, b = vx * Math.PI / 180;
  const x1 = v[0] * Math.cos(a) + v[2] * Math.sin(a), z1 = -v[0] * Math.sin(a) + v[2] * Math.cos(a);
  return [x1, v[1] * Math.cos(b) - z1 * Math.sin(b)];
}
function capa(c, d, dx, dy) {
  const n = aplicar(c.M, d.n);
  let mejor = null, mx = 0;
  for (let i = 0; i < 3; i++) if (n[i] === 0) for (const s of [1, -1]) {
    const t = [0, 0, 0]; t[i] = s;
    const q = proyectar(t), v = q[0] * dx + q[1] * dy;
    if (!mejor || v > mx) { mejor = t; mx = v; }
  }
  const a = cruz(n, mejor), i = a.findIndex((v) => v !== 0);
  jugar({ ax: i, layer: c.p[i], k: a[i] });
}
escena.addEventListener("pointerdown", (e) => {
  if (!jugando || enPausa) return;
  const f = e.target.closest && e.target.closest(".f");
  dedo = { id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, f: f ? [Number(f.dataset.c), Number(f.dataset.i)] : null, modo: null };
  try { escena.setPointerCapture(e.pointerId); } catch (x) {}
});
escena.addEventListener("pointermove", (e) => {
  if (!dedo || e.pointerId !== dedo.id) return;
  if (!dedo.modo) {
    const dx = e.clientX - dedo.x, dy = e.clientY - dedo.y;
    if (Math.hypot(dx, dy) < 12) return;
    const c = dedo.f && cubies[dedo.f[0]], d = c && c.d.find((x) => x.i === dedo.f[1]);
    if (d && !anim && !cola.length) { dedo.modo = "capa"; capa(c, d, dx, dy); } else dedo.modo = "vista";
  } else if (dedo.modo === "vista") {
    vy += (e.clientX - dedo.px) * 0.5;
    vx = Math.max(-89, Math.min(89, vx - (e.clientY - dedo.py) * 0.5));
    pintarVista();
  }
  dedo.px = e.clientX; dedo.py = e.clientY;
});
const soltar = () => { dedo = null; };
escena.addEventListener("pointerup", soltar);
escena.addEventListener("pointercancel", soltar);

// ----- Inicio -----
addEventListener("resize", medir);
medir(); construir(); irMenu(); hud();
// Con try/catch: el juego funciona aunque el SDK de Firebase no esté disponible (sin internet)
import("../compartido/progreso.js")
  .then((m) => { vaciar = m.vaciarPuntos; nube = m.conectar(JUEGO, { clave: CLAVE, fusionar, alCambiar: refrescarMejor }); })
  .catch(() => {});
