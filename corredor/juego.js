// Ruta: corredor/juego.js (lógica del juego «corredor»: correr por las vías esquivando trenes y barreras, estilo Subway Surfers)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "corredor"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");

// ---- Ajustes (aquí se afina el juego) ----
const LANE = 95;                          // separación entre carriles (unidades del mundo)
const F = 300, ZMAX = 1500, ZMIN = -80;   // perspectiva: escala s = F / (F + z); z = distancia hacia el fondo
const YH = H * 0.30, YB = H - 80;         // horizonte y suelo bajo el jugador (en píxeles)
const V0 = 460, VMAX = 950, ACEL = 6;     // velocidad en unidades/s, y cuánto acelera por segundo
const METRO = 60;                         // 60 unidades = 1 metro
const G = 1800, SALTO_V = 560;            // el salto sube ~87 unidades
const ALTO = 70, ALTO_DESLIZ = 28;        // altura del cuerpo de pie y deslizando
const PUNTOS_MONEDA = 3;
const EDIFICIOS = [{ f: "#3a3358", s: "#2d2748", t: "#4a4270" }, { f: "#2f3d5e", s: "#25304c", t: "#3f5280" }, { f: "#4a3350", s: "#3a2840", t: "#5e4366" }];

let usuario = null, p, obs, mon, dist, v, proxZ, proxIman, camX, tiempo, nMonedas, tropiezo, inmune, iman, temblor;
let vivo = false, ultimo = 0;

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

const rand = (a, b) => a + Math.random() * (b - a);
const metros = () => Math.floor(dist / METRO);
const puntos = () => metros() + nMonedas * PUNTOS_MONEDA;
const alto = () => (p.desliza > 0 ? ALTO_DESLIZ : ALTO);

// ---------- Generación de obstáculos ----------
// Cada patrón deja siempre un carril libre, y entre patrones hay espacio para cambiar de carril.
function patron() {
  const zw = proxZ, d = Math.min(1, dist / (METRO * 1500)); // dificultad: sube hasta los 1500 m
  const libre = [-1, 0, 1][Math.floor(Math.random() * 3)];
  const otros = [-1, 0, 1].filter((c) => c !== libre);
  const elegir = (dos) => (dos ? otros : [otros[Math.random() < 0.5 ? 0 : 1]]);
  const monedas = (c, n, y = 35, z0 = zw) => { for (let i = 0; i < n; i++) mon.push({ tipo: "moneda", x: c * LANE, y, zw: z0 + i * 60, fase: i }); };
  const objeto = (tipo, c, z0, dd, hw, y0, y1) => obs.push({ tipo, x: c * LANE, zw: z0, d: dd, hw, y0, y1 });
  const r = Math.random();
  let largo = 60;
  if (proxZ >= proxIman) { // imán
    mon.push({ tipo: "iman", x: libre * LANE, y: 35, zw: zw + 120, fase: 0 });
    monedas(libre, 6); largo = 360;
    proxIman = proxZ + rand(6000, 12000);
  } else if (r < 0.20) { // hilera de monedas
    const n = 6 + Math.floor(rand(0, 4));
    monedas([-1, 0, 1][Math.floor(Math.random() * 3)], n); largo = n * 60;
  } else if (r < 0.45) { // barreras: se saltan (con un arco de monedas encima)
    const bl = elegir(Math.random() < 0.4 + 0.3 * d);
    bl.forEach((c) => objeto("barrera", c, zw + 120, 30, 38, 0, 40));
    [40, 80, 100, 80, 40].forEach((yy, i) => mon.push({ tipo: "moneda", x: bl[0] * LANE, y: yy, zw: zw + i * 60, fase: i }));
    monedas(libre, 5); largo = 240;
  } else if (r < 0.62) { // barras altas: se pasan agachado
    const bl = elegir(Math.random() < 0.4 + 0.3 * d);
    bl.forEach((c) => objeto("alta", c, zw + 120, 30, 40, 48, 90));
    monedas(libre, 5, 20); largo = 240;
  } else if (r < 0.74) { // mixto: una barrera y una barra alta a la vez
    objeto("barrera", otros[0], zw + 100, 30, 38, 0, 40);
    objeto("alta", otros[1], zw + 100, 30, 40, 48, 90);
    monedas(libre, 4); largo = 200;
  } else { // trenes: no se pueden saltar, hay que cambiar de carril
    const dd = Math.floor(rand(300, 600));
    elegir(Math.random() < 0.15 + 0.5 * d).forEach((c) => objeto("tren", c, zw, dd, 42, 0, 130));
    monedas(libre, Math.floor(dd / 60)); largo = dd;
  }
  proxZ = zw + largo + rand(420, 650) - 150 * d;
}
function preparar() {
  p = { carril: 0, x: 0, y: 0, vy: 0, desliza: 0 };
  obs = []; mon = []; dist = 0; v = V0; proxZ = 900; proxIman = 4000; camX = 0; tiempo = 0;
  nMonedas = 0; tropiezo = 0; inmune = 0; iman = 0; temblor = 0;
  while (proxZ - dist < ZMAX) patron();
}
function empezar() {
  preparar();
  vivo = true; ultimo = performance.now();
  jugar.hidden = true;
  estado.textContent = "";
  requestAnimationFrame(ciclo);
}

// ---------- Controles ----------
function cambiar(d) { if (vivo) p.carril = Math.max(-1, Math.min(1, p.carril + d)); }
function saltar() { if (vivo && p.y <= 0.01) { p.vy = SALTO_V; p.desliza = 0; } }
function agachar() { if (!vivo) return; if (p.y > 0.01) p.vy = -1000; p.desliza = 0.6; } // en el aire: caes rápido y te deslizas

// ---------- Lógica ----------
function chocar(o) {
  if (tropiezo > 0) { fin(); return; } // segundo golpe seguido: te atrapan
  tropiezo = 2.5; inmune = 1.0; temblor = 0.3;
  o.golpeado = true;
  v = Math.max(380, v * 0.75);
}
function mover(dt) {
  tiempo += dt;
  v = Math.min(VMAX, v + ACEL * dt);
  dist += v * dt;
  const dx = p.carril * LANE - p.x, paso = 900 * dt;
  p.x += Math.abs(dx) <= paso ? dx : Math.sign(dx) * paso;
  camX += (p.x * 0.4 - camX) * Math.min(1, 6 * dt);
  p.vy -= G * dt; p.y += p.vy * dt;
  if (p.y <= 0) { p.y = 0; p.vy = 0; }
  if (p.desliza > 0 && p.y === 0) p.desliza -= dt; // el deslizamiento empieza a contar al tocar el suelo
  tropiezo = Math.max(0, tropiezo - dt); inmune = Math.max(0, inmune - dt); iman = Math.max(0, iman - dt); temblor = Math.max(0, temblor - dt);

  while (proxZ - dist < ZMAX) patron();

  for (const o of obs) {
    const z = o.zw - dist;
    if (o.golpeado || inmune > 0) continue;
    if (z < 20 && z + o.d > -20 && Math.abs(p.x - o.x) < o.hw + 16 && p.y < o.y1 && p.y + alto() > o.y0) { chocar(o); if (!vivo) return; }
  }
  for (const m of mon) {
    let z = m.zw - dist;
    if (iman > 0 && m.tipo === "moneda" && z < 320 && z > -30) { // el imán las atrae
      const k = Math.min(1, 9 * dt);
      m.x += (p.x - m.x) * k; m.y += (p.y + 35 - m.y) * k; m.zw -= z * k * 0.5;
      z = m.zw - dist;
    }
    if (!m.tomada && Math.abs(z) < 30 && Math.abs(m.x - p.x) < 46 && m.y > p.y - 12 && m.y < p.y + alto() + 12) {
      m.tomada = true;
      if (m.tipo === "iman") iman = 8; else nMonedas++;
    }
  }
  obs = obs.filter((o) => o.zw + o.d - dist > -150);
  mon = mon.filter((m) => !m.tomada && m.zw - dist > -120);
}

// ---------- Dibujo ----------
const pr = (x, y, z) => { const s = F / (F + z); return [W / 2 + (x - camX) * s, YH + (YB - YH - y) * s, s]; };
const fade = (z) => Math.max(0, Math.min(1, (ZMAX - z) / 400));
function poli(pts, color) {
  cx.fillStyle = color; cx.beginPath();
  pts.forEach((q, i) => (i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1])));
  cx.closePath(); cx.fill();
}
// Caja en perspectiva: x = centro, hw = medio ancho, de y0 a y1 de alto, desde z hasta z+d de fondo
function caja(x, hw, y0, y1, z, d, c) {
  const z2 = z + d;
  if (z2 < ZMIN || z > ZMAX) return;
  const zf = Math.max(z, ZMIN);
  const lado = x - hw > camX ? x - hw : x + hw < camX ? x + hw : null;
  if (lado !== null) poli([pr(lado, y0, zf), pr(lado, y1, zf), pr(lado, y1, z2), pr(lado, y0, z2)], c.s);
  if (y1 < YB - YH - 5) poli([pr(x - hw, y1, zf), pr(x + hw, y1, zf), pr(x + hw, y1, z2), pr(x - hw, y1, z2)], c.t);
  if (z >= ZMIN) {
    const a = pr(x - hw, y1, z), b = pr(x + hw, y0, z);
    cx.fillStyle = c.f; cx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }
}
function fondo() {
  const g = cx.createLinearGradient(0, 0, 0, YH);
  g.addColorStop(0, "#1b1f4b"); g.addColorStop(1, "#ff9a5a");
  cx.fillStyle = g; cx.fillRect(0, 0, W, YH + 1);
  for (let i = 0; i < 14; i++) { // siluetas lejanas
    const bw = 34 + (i * 37) % 26, bh = 30 + (i * 53) % 70;
    cx.fillStyle = i % 2 ? "#2a2250" : "#241c46";
    cx.fillRect(i * (W / 12) - 20 - camX * 0.1, YH - bh, bw, bh + 1);
  }
  cx.fillStyle = "#2b2f3a"; cx.fillRect(0, YH, W, H - YH);
  const base = Math.floor(dist / 100), off = dist - base * 100;
  for (let k = -2; k < ZMAX / 100 + 1; k++) { // vía: franjas que se mueven para dar velocidad
    const z0 = Math.max(k * 100 - off, ZMIN), z1 = k * 100 - off + 100, n = base + k;
    if (z1 <= ZMIN) continue;
    cx.globalAlpha = fade(z0);
    poli([pr(-150, 0, z0), pr(150, 0, z0), pr(150, 0, z1), pr(-150, 0, z1)], n % 2 ? "#3b3f4c" : "#353844");
    poli([pr(-153, 0, z0), pr(-147, 0, z0), pr(-147, 0, z1), pr(-153, 0, z1)], "#e5b84b");
    poli([pr(147, 0, z0), pr(153, 0, z0), pr(153, 0, z1), pr(147, 0, z1)], "#e5b84b");
    if (n % 2) for (const x of [-47.5, 47.5]) poli([pr(x - 1.5, 0, z0), pr(x + 1.5, 0, z0), pr(x + 1.5, 0, z1), pr(x - 1.5, 0, z1)], "#cfd3e0");
  }
  const b2 = Math.floor(dist / 200); // edificios y postes a los lados
  for (let k = Math.ceil(ZMAX / 200); k >= -1; k--) {
    const n = b2 + k, z = n * 200 - dist;
    for (const lado of [-1, 1]) {
      const h = Math.abs((n * 7 + (lado > 0 ? 3 : 0)) % 5);
      cx.globalAlpha = fade(z);
      caja(lado * 330, 80, 0, 110 + h * 38, z, 150, EDIFICIOS[h % 3]);
      caja(lado * 190, 4, 0, 130, z + 90, 8, { f: "#aab", s: "#889", t: "#ccd" });
    }
  }
  cx.globalAlpha = 1;
}
function dibObstaculo(o) {
  const z = o.zw - dist;
  if (z > ZMAX || z + o.d < ZMIN) return;
  cx.globalAlpha = fade(z);
  const hw = o.hw, vis = z >= ZMIN;
  const a = vis ? pr(o.x - hw, o.y1, z) : null, b = vis ? pr(o.x + hw, o.y0, z) : null;
  if (o.tipo === "tren") {
    caja(o.x, hw, 0, 130, z, o.d, { f: "#2f5d8a", s: "#244a70", t: "#4a86bd" });
    if (vis) {
      const w = b[0] - a[0], h = b[1] - a[1];
      cx.fillStyle = "#bfe3ff"; cx.fillRect(a[0] + w * 0.12, a[1] + h * 0.12, w * 0.76, h * 0.34);
      cx.fillStyle = "#ffe27a";
      cx.beginPath(); cx.arc(a[0] + w * 0.2, a[1] + h * 0.75, w * 0.07, 0, 7); cx.arc(a[0] + w * 0.8, a[1] + h * 0.75, w * 0.07, 0, 7); cx.fill();
    }
  } else if (o.tipo === "barrera") {
    caja(o.x, hw, 0, 40, z, o.d, { f: "#ff7a1a", s: "#c85a10", t: "#ffb066" });
    if (vis) { const h = b[1] - a[1]; cx.fillStyle = "#fff"; cx.fillRect(a[0], a[1] + h * 0.35, b[0] - a[0], h * 0.25); }
  } else { // alta: dos postes y una barra a media altura
    const poste = { f: "#8a8f9c", s: "#6f7480", t: "#aab0bd" };
    caja(o.x - hw + 4, 4, 0, 90, z, o.d, poste); caja(o.x + hw - 4, 4, 0, 90, z, o.d, poste);
    caja(o.x, hw, 48, 90, z, o.d, { f: "#f1c40f", s: "#b7950b", t: "#f7dc6f" });
    if (vis) {
      const w = b[0] - a[0], h = b[1] - a[1];
      cx.fillStyle = "#222";
      for (let i = 0; i < 4; i++) cx.fillRect(a[0] + w * (0.1 + i * 0.24), a[1], w * 0.1, h);
    }
  }
  cx.globalAlpha = 1;
}
function dibMoneda(m) {
  const z = m.zw - dist;
  if (z > ZMAX || z < ZMIN) return;
  const [sx, sy, s] = pr(m.x, m.y, z);
  cx.globalAlpha = fade(z);
  if (m.tipo === "iman") { // imán en U con las puntas blancas
    cx.strokeStyle = "#e53935"; cx.lineWidth = 7 * s; cx.lineCap = "butt";
    cx.beginPath(); cx.arc(sx, sy, 12 * s, Math.PI, 0); cx.moveTo(sx - 12 * s, sy); cx.lineTo(sx - 12 * s, sy + 9 * s); cx.moveTo(sx + 12 * s, sy); cx.lineTo(sx + 12 * s, sy + 9 * s); cx.stroke();
    cx.fillStyle = "#fff"; cx.fillRect(sx - 15.5 * s, sy + 9 * s, 7 * s, 5 * s); cx.fillRect(sx + 8.5 * s, sy + 9 * s, 7 * s, 5 * s);
  } else {
    cx.fillStyle = "#f5b301"; cx.strokeStyle = "#b07d00"; cx.lineWidth = Math.max(1, 2 * s);
    cx.beginPath(); cx.ellipse(sx, sy, Math.max(2 * s, 10 * s * Math.abs(Math.cos(tiempo * 5 + m.fase))), 10 * s, 0, 0, Math.PI * 2); cx.fill(); cx.stroke();
  }
  cx.globalAlpha = 1;
}
function dibJugador() { // se ve de espaldas: gorra roja, mochila y chamarra naranja
  const sx = W / 2 + p.x - camX, desl = p.desliza > 0, aire = p.y > 2;
  cx.fillStyle = "rgba(0,0,0,.3)"; cx.beginPath(); cx.ellipse(sx, YB + 2, Math.max(8, 20 - p.y * 0.1), 6, 0, 0, Math.PI * 2); cx.fill();
  cx.save();
  cx.translate(sx, YB - p.y);
  if (inmune > 0 && Math.floor(tiempo * 20) % 2) cx.globalAlpha = 0.4;
  if (desl) cx.scale(0.95, 0.42); else cx.scale(0.85, 0.85);
  const paso = Math.sin(tiempo * 16) * (aire ? 3 : 9), izq = Math.max(0, paso), der = Math.max(0, -paso);
  cx.fillStyle = "#34495e"; cx.fillRect(-12, -28 - izq, 9, 28); cx.fillRect(3, -28 - der, 9, 28);
  cx.fillStyle = "#111"; cx.fillRect(-13, -6 - izq, 11, 6); cx.fillRect(2, -6 - der, 11, 6);
  cx.fillStyle = "#ff7043"; cx.beginPath(); cx.roundRect(-15, -62, 30, 36, 8); cx.fill();
  cx.fillRect(-22, -60 + paso * 0.6, 7, 24); cx.fillRect(15, -60 - paso * 0.6, 7, 24);
  cx.fillStyle = "#2980b9"; cx.beginPath(); cx.roundRect(-10, -58, 20, 24, 5); cx.fill();
  cx.fillStyle = "#3b2a1a"; cx.beginPath(); cx.arc(0, -72, 11, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "#e53935"; cx.beginPath(); cx.arc(0, -74, 12, Math.PI, 0); cx.closePath(); cx.fill();
  cx.fillRect(-12, -75, 24, 4);
  cx.restore();
  if (iman > 0) { // aura del imán
    cx.strokeStyle = "rgba(229,57,53,.55)"; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(sx, YB - p.y - 35, 40 + Math.sin(tiempo * 10) * 4, 0, Math.PI * 2); cx.stroke();
  }
}
function texto(s, x, y, alinear, tam = 22) {
  cx.font = `bold ${tam}px system-ui`; cx.textAlign = alinear;
  cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.5)"; cx.strokeText(s, x, y);
  cx.fillStyle = "#fff"; cx.fillText(s, x, y);
}
function dibujar() {
  cx.save();
  if (temblor > 0) cx.translate(rand(-4, 4), rand(-4, 4));
  fondo();
  const cosas = [...obs.map((o) => ({ z: o.zw - dist, f: () => dibObstaculo(o) })), ...mon.map((m) => ({ z: m.zw - dist, f: () => dibMoneda(m) }))];
  cosas.sort((a, b) => b.z - a.z).forEach((c) => c.f()); // de lejos a cerca
  dibJugador();
  cx.restore();
  if (tropiezo > 0) { // borde rojo mientras estás en peligro
    const g = cx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, "rgba(255,0,0,0)"); g.addColorStop(1, `rgba(255,0,0,${0.25 + 0.15 * Math.sin(tiempo * 12)})`);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  texto(metros() + " m", 12, 30, "left");
  texto(String(nMonedas), W - 36, 30, "right");
  cx.fillStyle = "#f5b301"; cx.beginPath(); cx.arc(W - 20, 22, 9, 0, Math.PI * 2); cx.fill();
  if (iman > 0) {
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(12, 42, 100, 8);
    cx.fillStyle = "#e53935"; cx.fillRect(12, 42, 100 * iman / 8, 8);
    texto("Imán", 12, 68, "left", 13);
  }
}
function ciclo(ahora) {
  if (!vivo) return;
  mover(Math.min((ahora - ultimo) / 1000, 0.033));
  ultimo = ahora;
  if (vivo) { dibujar(); requestAnimationFrame(ciclo); }
}
async function fin() {
  vivo = false;
  dibujar();
  jugar.hidden = false;
  jugar.textContent = "Jugar otra vez";
  const n = puntos();
  estado.textContent = "¡Te atraparon! Corriste " + metros() + " m y juntaste " + nMonedas + " monedas: " + n + " puntos.";
  if (!usuario || !n) return;
  try { await sumarPuntos(ID, n); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
}

// Teclado: flechas o WASD. En el celular (o con el mouse): desliza el dedo en la dirección que quieras
const acciones = { ArrowLeft: () => cambiar(-1), a: () => cambiar(-1), A: () => cambiar(-1), ArrowRight: () => cambiar(1), d: () => cambiar(1), D: () => cambiar(1),
  ArrowUp: saltar, w: saltar, W: saltar, " ": saltar, ArrowDown: agachar, s: agachar, S: agachar };
addEventListener("keydown", (e) => { if (vivo && e.key in acciones) { e.preventDefault(); if (!e.repeat) acciones[e.key](); } });
let ini = null;
cv.addEventListener("pointerdown", (e) => { ini = { x: e.clientX, y: e.clientY }; });
cv.addEventListener("pointermove", (e) => {
  if (!ini || !vivo) return;
  const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  if (Math.abs(dx) > Math.abs(dy)) cambiar(dx > 0 ? 1 : -1); else if (dy < 0) saltar(); else agachar();
  ini = { x: e.clientX, y: e.clientY };
});
addEventListener("pointerup", () => { ini = null; });
jugar.addEventListener("click", empezar);

// Pantalla inicial
preparar(); dibujar();
