// Ruta: ranagolosa/juego-ranagolosa.js
// Rana golosa (id de puntos: "ranagolosa"). Desliza el dedo sobre las cuerdas para cortarlas: el dulce debe caer en la boca
// de la rana y, si puedes, pasar por las estrellas (1 a 3 por nivel). La física está en logica-ranagolosa.js.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { W, H, R_DULCE, crearMundo, paso, cortarLinea } from "./logica-ranagolosa.js";
import { NIVELES } from "./niveles-ranagolosa.js";

const ID = "ranagolosa", CLAVE = "ranagolosa_progreso_v1", TOTAL = NIVELES.length;
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
lienzo.width = 1280; lienzo.height = 720;

// ---------- Progreso: est[n] = estrellas + 1 (0/ausente = sin pasar). Local primero; la nube lo une con el máximo de cada nivel ----------
let prog = leer(), nube = null;
function leer() {
  try { const p = JSON.parse(localStorage.getItem(CLAVE)); if (p && p.est && typeof p.est === "object") return { est: p.est }; } catch (e) {}
  return { est: {} };
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => { const e = m.unirMaximos(a && a.est, b && b.est); return e ? { est: e } : null; },
    alCambiar: () => { prog = leer(); if (modo === "menu") armarMenu(); },
  });
}).catch(() => {});
const hecho = (n) => (prog.est[n] | 0) > 0;
const estrellasDe = (n) => Math.max(0, (prog.est[n] | 0) - 1);
const abierto = (n) => n === 1 || hecho(n - 1);
const siguienteSinPasar = () => { for (let n = 1; n <= TOTAL; n++) if (!hecho(n)) return n; return TOTAL; };

// ---------- Estado ----------
let modo = "menu", pausado = false, nivel = 1, m = null, tFin = 0, acum = 0, trail = [], ultimo = null, tiempo = 0;
const ocultar = (e) => { e.hidden = true; }, mostrar = (e) => { e.hidden = false; };

function iniciar(n) {
  nivel = n; m = crearMundo(NIVELES[n - 1]); tFin = 0; acum = 0; trail = []; ultimo = null; pausado = false; modo = "juego";
  ocultar($("menu")); ocultar($("fin")); $("btn-menu").hidden = false; hud();
}
function hud() {
  if (!m) { $("chip-nivel").textContent = ""; $("chip-estrellas").textContent = ""; return; }
  $("chip-nivel").textContent = "Nivel " + nivel;
  $("chip-estrellas").textContent = "⭐ " + m.tomadas + "/" + m.estrellas.length;
}
function armarMenu() {
  modo = "menu"; m = null; hud(); $("btn-menu").hidden = true; ocultar($("fin")); mostrar($("menu"));
  const c = siguienteSinPasar();
  $("btn-continuar").innerHTML = '<span class="b-ico">▶</span> Continuar · nivel ' + c;
  $("btn-continuar").onclick = () => iniciar(c);
  const cont = $("niveles"); cont.replaceChildren();
  for (let n = 1; n <= TOTAL; n++) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = n; b.disabled = !abierto(n);
    const lleno = hecho(n) && estrellasDe(n) >= NIVELES[n - 1].estrellas.length;
    b.className = "b3d chico " + (lleno ? "b-verde" : hecho(n) ? "b-azul" : n === c ? "b-oro" : "b-gris");
    if (hecho(n)) { const i = document.createElement("span"); i.className = "b-info"; i.textContent = "★" + estrellasDe(n); b.appendChild(i); }
    b.onclick = () => iniciar(n);
    cont.appendChild(b);
  }
}
const pausa = crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => modo === "juego",
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "🔁", texto: "Reiniciar nivel", clase: "b-oro", alElegir: () => iniciar(nivel) }],
  alSalir: () => { pausado = false; armarMenu(); },
  ayudaSalir: "Vuelves al menú principal; el progreso de niveles ya está guardado.",
});

function terminar(gano) {
  modo = "fin"; $("btn-menu").hidden = true;
  if (gano) {
    const k = m.tomadas, total = m.estrellas.length, previo = estrellasDe(nivel), nuevo = !hecho(nivel);
    let pts = 0;
    if (nuevo) pts += 60;
    if (k > previo) pts += 40 * (k - previo);
    if (nuevo || k > previo) { prog.est[nivel] = k + 1; guardar(); }
    if (pts > 0) encolarPuntos(ID, pts);
    $("fin-titulo").textContent = "😋 ¡Ñam!";
    $("fin-texto").textContent = "⭐ " + k + " de " + total + (pts > 0 ? " · +" + pts + " puntos" : " · sin puntos nuevos") + (k < total ? ". ¿Puedes juntarlas todas?" : "");
    $("fin-sig").hidden = nivel >= TOTAL;
  } else {
    $("fin-titulo").textContent = "😢 Se cayó el dulce";
    $("fin-texto").textContent = "La rana se quedó con hambre. ¡Inténtalo otra vez!";
    $("fin-sig").hidden = true;
  }
  mostrar($("fin"));
}
$("fin-sig").onclick = () => iniciar(nivel + 1);
$("fin-rep").onclick = () => iniciar(nivel);
$("fin-menu").onclick = () => armarMenu();

// ---------- Entrada: el dedo dibuja una línea y corta lo que cruce ----------
const punto = (e) => { const r = lienzo.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
lienzo.addEventListener("pointerdown", (e) => { if (modo !== "juego" || pausado) return; lienzo.setPointerCapture(e.pointerId); ultimo = punto(e); trail = [{ ...ultimo, t: tiempo }]; e.preventDefault(); });
lienzo.addEventListener("pointermove", (e) => {
  if (!ultimo || modo !== "juego" || pausado || m.estado !== "juega") return;
  const p = punto(e);
  trail.push({ ...p, t: tiempo });
  cortarLinea(m, ultimo.x, ultimo.y, p.x, p.y);
  ultimo = p;
});
const soltar = () => { ultimo = null; };
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);

// ---------- Dibujo ----------
function circulo(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function estrella(x, y, r, c, giro) {
  ctx.fillStyle = c; ctx.strokeStyle = "#a86a00"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = giro + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function dibujarDulce(x, y) {
  ctx.fillStyle = "#ff8fb3"; ctx.strokeStyle = "#a8325a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 26, y - 9); ctx.lineTo(x - 26, y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 26, y - 9); ctx.lineTo(x + 26, y + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  circulo(x, y, R_DULCE, "#ff3d71"); ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8, 0.3, 4.2); ctx.stroke();
  circulo(x - 5, y - 6, 3, "rgba(255,255,255,.7)");
}
function dibujarRana(x, y, boca, comiendo) {
  const bx = x, by = y + 18;
  circulo(bx, by + 6, 44, "#5fbf3f"); ctx.strokeStyle = "#2e7d1e"; ctx.lineWidth = 3; ctx.stroke();
  circulo(bx - 24, by - 30, 15, "#5fbf3f"); ctx.stroke(); circulo(bx + 24, by - 30, 15, "#5fbf3f"); ctx.stroke();
  circulo(bx - 24, by - 31, 9, "#fff"); circulo(bx + 24, by - 31, 9, "#fff"); circulo(bx - 22, by - 30, 4, "#111"); circulo(bx + 22, by - 30, 4, "#111");
  ctx.fillStyle = "#5a1a1a"; ctx.beginPath();
  const a = comiendo ? 4 + Math.abs(Math.sin(tiempo * 14)) * 6 : boca ? 20 : 5;
  ctx.ellipse(x, y + 2, 26, a, 0, 0, 7); ctx.fill(); ctx.stroke();
  if (boca && !comiendo) { ctx.fillStyle = "#ff8aa0"; ctx.beginPath(); ctx.ellipse(x, y + 10, 14, 7, 0, 0, 7); ctx.fill(); }
}
function dibujar() {
  ctx.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H); // transparente: se ve la madera
  if (!m) return;
  const eating = m.estado === "gana";
  const cerca = Math.hypot(m.dulce.x - m.rana.x, m.dulce.y - m.rana.y) < 150;
  for (const s of m.estrellas) if (!s.tomada) estrella(s.x, s.y, 16 + Math.sin(tiempo * 4) * 1.5, "#ffd23c", Math.sin(tiempo * 2) * 0.15);
  dibujarRana(m.rana.x, m.rana.y, cerca, eating);
  // cuerdas
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const c of m.cuerdas) {
    const al = c.suelta ? Math.max(0, 1 - c.edad / 1.2) : 1;
    ctx.globalAlpha = al;
    for (const [ancho, col] of [[6, "#4a2a10"], [3.5, "#b9824a"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = ancho; ctx.beginPath();
      c.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const c of m.n.cuerdas) { circulo(c.x, c.y, 8, "#3a3d45"); circulo(c.x, c.y, 4, "#ffd23c"); }
  // dulce (si lo están comiendo, se desliza hacia la boca)
  let dx = m.dulce.x, dy = m.dulce.y;
  if (eating) { const k = Math.min(1, tFin / 0.35); dx += (m.rana.x - dx) * k; dy += (m.rana.y - dy) * k; if (k < 1) dibujarDulce(dx, dy); }
  else dibujarDulce(dx, dy);
  // estela del dedo
  trail = trail.filter((p) => tiempo - p.t < 0.25);
  if (trail.length > 1) {
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 4;
    ctx.beginPath(); trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.shadowBlur = 0;
  }
  if (nivel === 1 && modo === "juego" && m.estado === "juega" && m.cuerdas.some((c) => !c.suelta)) {
    const col = getComputedStyle(document.documentElement).getPropertyValue("--txt-fondo") || "#4a2a10";
    ctx.fillStyle = col; ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Desliza el dedo sobre la cuerda para cortarla", W / 2, 36);
  }
  ctx.lineCap = "butt";
}

let previo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
  if (!pausado) tiempo += dt;
  if (modo === "juego" && !pausado) {
    if (m.estado === "juega") {
      acum += dt; let n = 0;
      while (acum >= 1 / 60 && n++ < 4) { acum -= 1 / 60; paso(m, 1 / 60); }
      hud();
    } else {
      tFin += dt; hud();
      if (m.estado === "gana" && tFin > 0.9) terminar(true);
      else if (m.estado === "pierde" && tFin > 0.5) terminar(false);
    }
  }
  dibujar();
  requestAnimationFrame(bucle);
}
armarMenu();
requestAnimationFrame(bucle);
