// Ruta: zuma/juego-zuma.js
// Zuma: dispara bolas de colores desde la rana y junta 3 o más del mismo color antes de que la cadena llegue al hoyo.
import { crearPartida, avanzar, insertar, buscarImpacto, colorDisparo, coloresDisponibles, crearTrayecto, azarSemilla, congelar, destruirEn, R } from "./logica-zuma.js";
import { NIVELES, PALETA, ANCHO, ALTO, CENTRO, COSTE_BOOST } from "./niveles-zuma.js";

// ----- Ajustes -----
const ID = "zuma";
const PUNTOS_NIVEL = 10;          // puntos al perfil, solo la primera vez que se pasa un nivel (1.ª estrella)
const CLAVE = "zuma_progreso_v2"; // { monedas, boosts:{tiempo,metal}, niveles:{id:{estrellas,mejor}} }
const VEL_METAL = 900;            // px/s de las bolas metálicas
const VEL_DISPARO = 720;          // px/s de la bola disparada
const RECARGA = 0.28;             // segundos entre disparos

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), g = cv.getContext("2d");

// ----- Progreso -----
let datos = { monedas: 0, boosts: { tiempo: 0, metal: 0 }, niveles: {} };
try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d) datos = { ...datos, ...d, boosts: { ...datos.boosts, ...(d.boosts || {}) } }; } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) {} };

// ----- Sonido: todo sintetizado (sin archivos). Golpes secos y ruido filtrado = piedra contra piedra -----
let ac = null, mudo = false, rumor = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === "suspended") ac.resume();
  return ac;
}
function bufferRuido(seg, marron) {
  const n = (ac.sampleRate * seg) | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let u = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (marron) { u = (u + 0.02 * w) / 1.02; d[i] = u * 3.5; } else d[i] = w;
  }
  return b;
}
function golpe({ f = 120, dur = 0.12, vol = 0.4, filtro = 1500, ruido = 0.3, retraso = 0 }) {
  if (mudo || !audio()) return;
  const t = ac.currentTime + retraso;
  const o = ac.createOscillator(), go = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
  go.gain.setValueAtTime(vol, t);
  go.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(go).connect(ac.destination);
  o.start(t); o.stop(t + dur);
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = bufferRuido(0.08, false);
  fl.type = "bandpass"; fl.frequency.value = filtro; fl.Q.value = 1.2;
  gn.gain.setValueAtTime(ruido, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  s.connect(fl).connect(gn).connect(ac.destination);
  s.start(t);
}
const sonidoDisparo = () => golpe({ f: 150, dur: 0.14, vol: 0.35, filtro: 900, ruido: 0.25 });
const sonidoPone = () => golpe({ f: 230, dur: 0.08, vol: 0.3, filtro: 2300, ruido: 0.4 });
function sonidoQuita(n, combo) {
  const sube = 1 + Math.min(combo, 6) * 0.12;
  golpe({ f: 95 * sube, dur: 0.22, vol: 0.5, filtro: 650 * sube, ruido: 0.5 });
  golpe({ f: 200 * sube, dur: 0.1, vol: 0.3, filtro: 2600, ruido: 0.45, retraso: 0.045 });
  if (n > 3) golpe({ f: 140 * sube, dur: 0.12, vol: 0.3, filtro: 1800, ruido: 0.4, retraso: 0.1 });
}
function rumorOn() { // retumbo grave de la cadena rodando
  if (mudo || !audio() || rumor) return;
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = bufferRuido(2, true); s.loop = true;
  fl.type = "lowpass"; fl.frequency.value = 180;
  gn.gain.value = 0.05;
  s.connect(fl).connect(gn).connect(ac.destination);
  s.start();
  rumor = s;
}
function rumorOff() { if (rumor) { try { rumor.stop(); } catch (e) {} rumor = null; } }
$("sonido").addEventListener("click", () => {
  mudo = !mudo;
  $("sonido").firstElementChild.textContent = mudo ? "🔇" : "🔊";
  if (mudo) rumorOff(); else if (p && p.estado === "jugando") rumorOn();
});

// ----- Dibujo -----
function dibujarBola(x, y, c, r = R) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, "#fff");
  gr.addColorStop(0.25, PALETA[c]);
  gr.addColorStop(1, "#0006");
  g.fillStyle = PALETA[c];
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = gr; g.globalAlpha = 0.85;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = "#0008"; g.lineWidth = 1.5; g.stroke();
  // marca distinta por color (ayuda a distinguirlos sin depender del color)
  g.strokeStyle = "#0007"; g.fillStyle = "#0005"; g.lineWidth = 2;
  const m = r * 0.38;
  g.beginPath();
  if (c === 0) g.arc(x, y, m, 0, 7);
  else if (c === 1) { g.moveTo(x, y - m); g.lineTo(x + m, y); g.lineTo(x, y + m); g.lineTo(x - m, y); g.closePath(); }
  else if (c === 2) { g.moveTo(x, y - m); g.lineTo(x + m, y + m * 0.8); g.lineTo(x - m, y + m * 0.8); g.closePath(); }
  else if (c === 3) g.rect(x - m * 0.8, y - m * 0.8, m * 1.6, m * 1.6);
  else if (c === 4) { g.moveTo(x - m, y); g.lineTo(x + m, y); g.moveTo(x, y - m); g.lineTo(x, y + m); }
  else { g.arc(x, y, m, 0, 7); g.moveTo(x + m * 0.4, y); g.arc(x, y, m * 0.4, 0, 7); }
  g.stroke();
}

function dibujarMetal(x, y, t) {
  if (t) { // estela
    g.strokeStyle = "rgba(210,220,240,.45)"; g.lineWidth = R * 1.2; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - t.vx * 0.035, y - t.vy * 0.035); g.stroke();
  }
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, "#aab3bf"); gr.addColorStop(1, "#1d2229");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  g.strokeStyle = "#000a"; g.lineWidth = 1.5; g.stroke();
}

let fondo = null, trFondo = null;
function crearFondo(tr) {
  const c = document.createElement("canvas");
  c.width = ANCHO; c.height = ALTO;
  const f = c.getContext("2d");
  const gr = f.createRadialGradient(ANCHO / 2, ALTO / 2, 40, ANCHO / 2, ALTO / 2, 420);
  gr.addColorStop(0, "#7a828b"); gr.addColorStop(1, "#3a4047");
  f.fillStyle = gr; f.fillRect(0, 0, ANCHO, ALTO);
  const r = azarSemilla(7); // vetas y granos de la piedra
  for (let i = 0; i < 260; i++) {
    f.fillStyle = r() < 0.5 ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.07)";
    f.fillRect(r() * ANCHO, r() * ALTO, 2 + r() * 8, 1 + r() * 3);
  }
  f.lineCap = "round"; f.lineJoin = "round";
  const trazo = () => { f.beginPath(); for (let s = 0; s <= tr.largo; s += 4) { const q = tr.pos(s); s ? f.lineTo(q.x, q.y) : f.moveTo(q.x, q.y); } f.stroke(); };
  f.strokeStyle = "#2a3036"; f.lineWidth = 56; trazo();   // borde del surco
  f.strokeStyle = "#13161a"; f.lineWidth = 46; trazo();   // fondo del surco
  f.fillStyle = "#555d66"; f.strokeStyle = "#2a3036"; f.lineWidth = 4; // plataforma de la rana
  f.beginPath(); f.arc(CENTRO.x, CENTRO.y, 58, 0, 7); f.fill(); f.stroke();
  const h = tr.pos(tr.largo); // hoyo
  f.fillStyle = "#050607"; f.strokeStyle = "#c9a227"; f.lineWidth = 5;
  f.beginPath(); f.arc(h.x, h.y, 27, 0, 7); f.fill(); f.stroke();
  return c;
}

function dibujarRana(ang) {
  g.save();
  g.translate(CENTRO.x, CENTRO.y);
  g.rotate(ang);
  g.fillStyle = "#4f6a59"; g.strokeStyle = "#1e2b23"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(0, 0, 38, 33, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#6f8f7a";
  g.beginPath(); g.ellipse(8, 0, 26, 22, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#0b0f0c";
  g.beginPath(); g.arc(30, 0, 13, 0, 7); g.fill();
  g.fillStyle = "#d33";
  for (const sy of [-1, 1]) { g.beginPath(); g.arc(12, sy * 20, 5, 0, 7); g.fill(); }
  g.restore();
}

// ----- Partida: cada nivel tiene 3 rondas (más difíciles); ronda 1 = ★, ronda 2 = ★★, ronda 3 = ★★★ -----
let p = null, tiros = [], chispas = [], textos = [], ang = -Math.PI / 2, carga = 0, sig = 0, recarga = 0, ultimo = 0, enMarcha = false, metal = 0;
let nivelIdx = 0, rondaIdx = 0;
const nivelActual = () => NIVELES[nivelIdx];
const estrellasDe = (i) => (datos.niveles[NIVELES[i].id] || {}).estrellas || 0;
const desbloqueado = (i) => i === 0 || estrellasDe(i - 1) >= 1; // con 1 estrella se abre el siguiente nivel
const estrellasTxt = (n) => "★".repeat(n) + "☆".repeat(3 - n);

function refrescarBarra() {
  $("monedas").textContent = "🪙 " + datos.monedas;
  const jugando = !!p && p.estado === "jugando";
  for (const [k, id, ico, nom] of [["tiempo", "bTiempo", "⏱", "Detener tiempo"], ["metal", "bMetal", "⚙️", "4 metálicas"]]) {
    const n = datos.boosts[k], b = $(id);
    b.querySelector(".b-info").textContent = n ? "×" + n : COSTE_BOOST + "🪙";
    b.classList.toggle("sin", !n);
    b.title = nom + (n ? " (tienes " + n + ")" : " (cuesta " + COSTE_BOOST + " monedas)");
    b.disabled = !jugando || (!n && datos.monedas < COSTE_BOOST);
  }
}

// Boosts: si no tienes, se compra uno por 30 monedas y se usa. Los niveles se pueden pasar sin ellos.
function usarBoost(k) {
  if (!p || p.estado !== "jugando") return;
  if (k === "tiempo" && p.congelado > 0) return;
  if (k === "metal" && metal > 0) return;
  if (!datos.boosts[k]) {
    if (datos.monedas < COSTE_BOOST) return;
    datos.monedas -= COSTE_BOOST;
    datos.boosts[k] = 1;
  }
  datos.boosts[k]--;
  guardar();
  audio();
  if (k === "tiempo") { congelar(p, 6); golpe({ f: 70, dur: 0.4, vol: 0.5, filtro: 400, ruido: 0.4 }); }
  else { metal = 4; golpe({ f: 320, dur: 0.15, vol: 0.4, filtro: 3000, ruido: 0.5 }); }
  refrescarBarra();
}
$("bTiempo").addEventListener("click", () => usarBoost("tiempo"));
$("bMetal").addEventListener("click", () => usarBoost("metal"));

function empezar() {
  const n = nivelActual(), r = n.rondas[rondaIdx];
  p = crearPartida(r);
  const clave = n.id + "#" + rondaIdx;
  if (trFondo !== clave) { fondo = crearFondo(p.tr); trFondo = clave; }
  tiros = []; chispas = []; textos = []; recarga = 0; metal = 0;
  carga = colorDisparo(p); sig = colorDisparo(p);
  $("velo").hidden = true;
  rumorOn();
  refrescarBarra();
  ultimo = performance.now();
  if (!enMarcha) { enMarcha = true; requestAnimationFrame(marco); }
}
function iniciarNivel(i) { nivelIdx = i; rondaIdx = 0; empezar(); }

function velo(titulo, texto, b1, f1, b2, f2, niveles) {
  $("veloTitulo").textContent = titulo;
  $("veloTexto").textContent = texto;
  $("veloBtn").textContent = b1;
  $("veloBtn").onclick = f1;
  $("veloBtn2").hidden = !b2;
  if (b2) { $("veloBtn2").textContent = b2; $("veloBtn2").onclick = f2; }
  const c = $("veloNiveles");
  c.hidden = !niveles;
  c.innerHTML = "";
  if (niveles) NIVELES.forEach((n, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nv" + (desbloqueado(i) ? "" : " bloq");
    b.disabled = !desbloqueado(i);
    b.textContent = (i + 1) + " " + (desbloqueado(i) ? estrellasTxt(estrellasDe(i)) : "🔒");
    b.addEventListener("click", () => { audio(); iniciarNivel(i); });
    c.appendChild(b);
  });
  $("velo").hidden = false;
}
function inicio() {
  p = null;
  refrescarBarra();
  let i = NIVELES.findIndex((_, k) => desbloqueado(k) && estrellasDe(k) < 3);
  if (i < 0) i = 0;
  velo("🐸 Zuma", "Pasa rondas para ganar estrellas y monedas", "Jugar · " + NIVELES[i].nombre, () => { audio(); iniciarNivel(i); }, null, null, true);
}

async function gano() {
  rumorOff();
  const n = nivelActual(), est = rondaIdx + 1, previas = estrellasDe(nivelIdx);
  let ganadas = 0;
  if (est > previas) { // se paga solo la diferencia entre lo que ya cobraste y lo de la nueva estrella
    ganadas = n.monedas[est - 1] - (previas ? n.monedas[previas - 1] : 0);
    datos.monedas += ganadas;
  }
  const rec = datos.niveles[n.id] || { estrellas: 0, mejor: 0 };
  rec.estrellas = Math.max(rec.estrellas, est);
  rec.mejor = Math.max(rec.mejor, p.puntos);
  datos.niveles[n.id] = rec;
  guardar();
  refrescarBarra();
  const txt = estrellasTxt(rec.estrellas) + " · " + p.puntos + " pts" + (ganadas ? " · +" + ganadas + " 🪙" : "");
  if (rondaIdx < 2) {
    velo("⭐ ¡Ronda " + est + " superada!", txt + (est === 1 ? " · ¡Siguiente nivel desbloqueado!" : ""),
      "Ronda " + (est + 1) + " ▶ (más difícil)", () => { rondaIdx++; empezar(); }, "Menú", inicio);
  } else {
    const hay = nivelIdx < NIVELES.length - 1;
    velo("🌟 ¡Nivel perfecto!", txt, hay ? "Siguiente nivel ▶" : "Jugar otra vez", () => (hay ? iniciarNivel(nivelIdx + 1) : iniciarNivel(nivelIdx)), "Menú", inicio);
  }
  if (previas === 0) {
    try {
      const { sumarPuntos } = await import("../compartido/jugador.js");
      await sumarPuntos(ID, PUNTOS_NIVEL); // solo guarda si hay sesión iniciada
    } catch (e) {}
  }
}
function perdio() {
  rumorOff();
  golpe({ f: 60, dur: 0.5, vol: 0.6, filtro: 300, ruido: 0.6 });
  refrescarBarra();
  velo("💀 La cadena llegó al hoyo", "Ronda " + (rondaIdx + 1) + " de 3 · " + estrellasTxt(estrellasDe(nivelIdx)) + (rondaIdx ? " (conservas tus estrellas)" : ""),
    "Reintentar ronda " + (rondaIdx + 1), empezar, "Menú", inicio);
}

function manejar(e) {
  if (e.t === "quita") {
    if (e.metal) golpe({ f: 300, dur: 0.12, vol: 0.4, filtro: 3200, ruido: 0.5 }); else sonidoQuita(e.n, e.combo);
    for (const b of e.bolas) for (let k = 0; k < 5; k++) chispas.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240 - 40, v: 0.5 + Math.random() * 0.3, c: b.c });
    const m = e.bolas[(e.bolas.length / 2) | 0];
    textos.push({ x: m.x, y: m.y, txt: "+" + e.pts, v: 1 });
    if (e.combo > 0) textos.push({ x: m.x, y: m.y - 22, txt: "¡Combo ×" + (e.combo + 1) + "!", v: 1.2 });
  } else if (e.t === "pone") sonidoPone();
  else if (e.t === "gano") gano();
  else if (e.t === "perdio") perdio();
}

function disparar() {
  if (!p || p.estado !== "jugando" || recarga > 0) return;
  const x = CENTRO.x + Math.cos(ang) * 40, y = CENTRO.y + Math.sin(ang) * 40;
  if (metal > 0) { // bola metálica: va recta y destruye lo que toque
    metal--;
    tiros.push({ x, y, vx: Math.cos(ang) * VEL_METAL, vy: Math.sin(ang) * VEL_METAL, metal: true });
    golpe({ f: 260, dur: 0.12, vol: 0.4, filtro: 2800, ruido: 0.5 });
  } else {
    tiros.push({ x, y, vx: Math.cos(ang) * VEL_DISPARO, vy: Math.sin(ang) * VEL_DISPARO, c: carga });
    carga = sig; sig = colorDisparo(p);
    sonidoDisparo();
  }
  recarga = RECARGA;
}
function cambiar() { if (p && p.estado === "jugando") [carga, sig] = [sig, carga]; }

function moverTiros(dt) {
  tiros = tiros.filter((t) => {
    const v = t.metal ? VEL_METAL : VEL_DISPARO, pasos = Math.max(1, Math.ceil((v * dt) / 6));
    for (let k = 0; k < pasos; k++) {
      t.x += (t.vx * dt) / pasos; t.y += (t.vy * dt) / pasos;
      if (t.metal) { avanzarEv(destruirEn(p, t.x, t.y, 28)); if (p.estado !== "jugando") return false; continue; }
      const imp = buscarImpacto(p, t.x, t.y);
      if (imp) { avanzarEv(insertar(p, imp.i, imp.delante, t.c, { x: t.x, y: t.y })); return false; }
    }
    return t.x > -40 && t.x < ANCHO + 40 && t.y > -40 && t.y < ALTO + 40;
  });
}
const avanzarEv = (ev) => ev.forEach(manejar);

function marco(ms) {
  const dt = Math.min(0.05, (ms - ultimo) / 1000);
  ultimo = ms;
  if (p && p.estado === "jugando") {
    avanzarEv(avanzar(p, dt, [carga, sig]));
    if (p.estado === "jugando") {
      moverTiros(dt);
      recarga -= dt;
      const hay = coloresDisponibles(p); // que la bola cargada siempre exista en la cadena
      if (!hay.has(carga)) carga = colorDisparo(p);
      if (!hay.has(sig)) sig = colorDisparo(p);
    }
  }
  for (const c of chispas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 500 * dt; c.v -= dt; }
  chispas = chispas.filter((c) => c.v > 0);
  for (const t of textos) { t.y -= 24 * dt; t.v -= dt; }
  textos = textos.filter((t) => t.v > 0);
  dibujar();
  requestAnimationFrame(marco);
}

function dibujar() {
  g.clearRect(0, 0, ANCHO, ALTO);
  if (!fondo) { fondo = crearFondo(crearTrayecto(NIVELES[0].rondas[0].trayecto)); trFondo = ""; }
  g.drawImage(fondo, 0, 0);
  if (!p) { dibujarRana(ang); return; }
  const cab = p.cad.length ? p.cad[p.cad.length - 1].s : 0;
  if (cab > p.tr.largo * 0.82) { // peligro: el hoyo brilla en rojo
    const h = p.tr.pos(p.tr.largo);
    g.strokeStyle = "rgba(255,60,60," + (0.5 + 0.5 * Math.sin(p.t * 8)) + ")"; g.lineWidth = 6;
    g.beginPath(); g.arc(h.x, h.y, 32, 0, 7); g.stroke();
  }
  for (const b of p.cad) { const q = p.tr.pos(b.s + b.d); dibujarBola(q.x + b.ox, q.y + b.oy, b.c); }
  for (const t of tiros) { if (t.metal) dibujarMetal(t.x, t.y, t); else dibujarBola(t.x, t.y, t.c); }
  dibujarRana(ang); // la bola cargada va en la boca y la siguiente atrás
  if (metal > 0) {
    dibujarMetal(CENTRO.x + Math.cos(ang) * 30, CENTRO.y + Math.sin(ang) * 30);
    g.font = "bold 14px system-ui, sans-serif"; g.textAlign = "center"; g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3;
    g.strokeText("×" + metal, CENTRO.x - Math.cos(ang) * 22, CENTRO.y - Math.sin(ang) * 22 + 5);
    g.fillText("×" + metal, CENTRO.x - Math.cos(ang) * 22, CENTRO.y - Math.sin(ang) * 22 + 5);
  } else {
    dibujarBola(CENTRO.x + Math.cos(ang) * 30, CENTRO.y + Math.sin(ang) * 30, carga, R * 0.95);
    dibujarBola(CENTRO.x - Math.cos(ang) * 22, CENTRO.y - Math.sin(ang) * 22, sig, R * 0.55);
  }
  for (const c of chispas) { g.globalAlpha = Math.min(1, c.v * 2); g.fillStyle = PALETA[c.c]; g.fillRect(c.x - 2, c.y - 2, 4, 4); }
  g.globalAlpha = 1;
  g.font = "bold 16px system-ui, sans-serif"; g.textAlign = "center";
  for (const t of textos) { g.globalAlpha = Math.min(1, t.v * 2); g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3; g.strokeText(t.txt, t.x, t.y); g.fillText(t.txt, t.x, t.y); }
  g.globalAlpha = 1;
  // marcador
  g.textAlign = "left"; g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3;
  g.strokeText(p.puntos + " pts", 12, 24); g.fillText(p.puntos + " pts", 12, 24);
  const falta = p.cola.length + p.cad.length;
  g.fillStyle = "#0008"; g.fillRect(ANCHO - 152, 12, 140, 10);
  g.fillStyle = "#c9a227"; g.fillRect(ANCHO - 152, 12, 140 * (1 - falta / p.total), 10);
  g.textAlign = "center"; g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3;
  const rt = "Ronda " + (rondaIdx + 1) + "/3";
  g.strokeText(rt, ANCHO / 2, 24); g.fillText(rt, ANCHO / 2, 24);
  if (p.congelado > 0) { // boost de tiempo activo
    g.fillStyle = "rgba(90,160,255,.16)"; g.fillRect(0, 0, ANCHO, ALTO);
    const tt = "⏱ " + p.congelado.toFixed(1);
    g.font = "bold 22px system-ui, sans-serif"; g.fillStyle = "#cfe4ff";
    g.strokeText(tt, ANCHO / 2, 54); g.fillText(tt, ANCHO / 2, 54);
  }
}

// ----- Controles (ratón y táctil) -----
function apuntar(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) * ANCHO) / r.width, y = ((e.clientY - r.top) * ALTO) / r.height;
  ang = Math.atan2(y - CENTRO.y, x - CENTRO.x);
  return { x, y };
}
cv.addEventListener("pointermove", apuntar);
cv.addEventListener("pointerdown", (e) => {
  audio();
  const q = apuntar(e);
  if (Math.hypot(q.x - CENTRO.x, q.y - CENTRO.y) < 30) cambiar(); else disparar();
});
cv.addEventListener("contextmenu", (e) => { e.preventDefault(); cambiar(); });
addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); cambiar(); } });
document.addEventListener("visibilitychange", () => { if (document.hidden) rumorOff(); else if (p && p.estado === "jugando") rumorOn(); });

inicio();
requestAnimationFrame(() => { enMarcha = true; ultimo = performance.now(); requestAnimationFrame(marco); });
