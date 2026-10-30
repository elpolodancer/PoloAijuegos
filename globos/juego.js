// Ruta: globos/juego.js
// Juego «Lluvia de globos»: revienta los globos antes de que toquen el suelo. Los ajustes están aquí arriba.

const ID = "globos";

// ---------- AJUSTES ----------
const ANCHO = 460, ALTO = 760;     // tamaño lógico del lienzo
const SUELO = ALTO - 36;           // y donde se cuenta un globo como perdido
const VIDAS_INICIO = 3;
const VIDAS_MAX = 5;
const VEL_INICIO = 1.0;            // velocidad de caída al empezar (píxeles por cuadro)
const VEL_FINAL = 3.3;             // velocidad máxima (se llega poco a poco)
const INTERVALO_INICIO = 62;       // cuadros entre globos al empezar (60 cuadros = 1 s)
const INTERVALO_FINAL = 22;        // ...y al final
const RAMPA = 60 * 150;            // en cuántos cuadros se llega a la dificultad máxima (2 min 30 s)
const CADA_LLUVIA = 60 * 25;       // cada cuántos cuadros llega una «lluvia» (ráfaga de globos)
const GLOBOS_LLUVIA = 8;
const SEGUNDOS_HIELO = 3;
const COMBO_PARA_SUBIR = 5;        // cada 5 seguidos sube el multiplicador
const MULT_MAX = 5;
const PUNTOS_POR_PERFIL = 25;      // 1 punto al perfil por cada 25 del juego

// Probabilidades de cada tipo (el resto son globos normales). Algunos aparecen más tarde.
const PROB = { bomba: 0.09, dorado: 0.06, hielo: 0.035, corazon: 0.03 };
const DESDE = { bomba: 0.06, dorado: 0.02, hielo: 0.1, corazon: 0.1 };   // fracción de RAMPA a partir de la cual salen

const TIPOS = {
  normal: { puntos: 10, penaliza: true },
  dorado: { puntos: 50, penaliza: false, emoji: "⭐", c: ["#fff3a8", "#ffc800", "#b88400"] },
  corazon: { puntos: 5, penaliza: false, emoji: "❤️", c: ["#ffc2d4", "#ff5d8a", "#b01848"] },
  hielo: { puntos: 5, penaliza: false, emoji: "❄️", c: ["#e2f6ff", "#7fd0ff", "#2f86c0"] },
  bomba: { puntos: 0, penaliza: false, emoji: "💣", c: ["#8a8a8a", "#2d2d2d", "#050505"] },
};
const COLORES = [                  // globos normales [luz, base, sombra]
  ["#ff9fb8", "#ff4f7b", "#b8184a"],
  ["#ffe98a", "#ffc20e", "#b88400"],
  ["#a5f0a0", "#3fcf5a", "#16883a"],
  ["#9fd8ff", "#2f9bff", "#1658b8"],
  ["#d9b0ff", "#a455ff", "#6420b8"],
  ["#ffc79a", "#ff8a2b", "#b8500a"],
];

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

// ---------- Sonidos (WebAudio, sin archivos) ----------
let audio = null, silencio = false;
try { silencio = localStorage.getItem("globos_silencio") === "1"; } catch (e) {}
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
const ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568];
function sonido(tipo, n = 0) {
  switch (tipo) {
    case "pop":   // sube de tono mientras más seguidos
      ruido(0.07, 0.22, 4000);
      tono(ESCALA[Math.min(n, ESCALA.length - 1)], 0.1, { tipo: "triangle", hasta: ESCALA[Math.min(n, ESCALA.length - 1)] * 1.5, vol: 0.12 }); break;
    case "dorado": [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.15, { tipo: "square", vol: 0.07, retraso: i * 0.06 })); break;
    case "vida": [523, 659, 784].forEach((f, i) => tono(f, 0.2, { tipo: "sine", vol: 0.15, retraso: i * 0.09 })); break;
    case "hielo": tono(1500, 0.5, { tipo: "sine", hasta: 400, vol: 0.12 }); tono(2200, 0.4, { tipo: "triangle", hasta: 800, vol: 0.06, retraso: 0.05 }); break;
    case "bomba": ruido(0.5, 0.45, 700); tono(110, 0.4, { tipo: "sawtooth", hasta: 40, vol: 0.18 }); break;
    case "perdido": tono(300, 0.25, { tipo: "sawtooth", hasta: 110, vol: 0.12 }); break;
    case "fallo": tono(200, 0.06, { tipo: "sine", hasta: 150, vol: 0.05 }); break;
    case "lluvia": [392, 523, 659].forEach((f, i) => tono(f, 0.15, { tipo: "triangle", vol: 0.1, retraso: i * 0.07 })); break;
    case "fin": [440, 392, 349, 262].forEach((f, i) => tono(f, 0.35, { tipo: "triangle", vol: 0.15, retraso: i * 0.2 })); break;
    case "cambiar": tono(660, 0.06, { tipo: "square", vol: 0.06 }); break;
  }
}

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
lienzo.width = ANCHO * 2; lienzo.height = ALTO * 2;   // el doble para que se vea nítido
ctx.scale(2, 2);

const $ = (id) => document.getElementById(id);
const elVidas = $("vidas"), elPuntos = $("puntos"), elRecord = $("record"), elSonido = $("sonido");
function pintarBotonSonido() { elSonido.textContent = silencio ? "🔇" : "🔊"; elSonido.setAttribute("aria-label", silencio ? "Activar sonido" : "Silenciar"); }
pintarBotonSonido();
elSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("globos_silencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido(); sonido("cambiar");
});

// ---------- Estado ----------
let estado = "inicio";   // "inicio" | "jugando" | "fin"
let globos = [], chispas = [], anillos = [], textos = [], nubes = [];
let puntos = 0, record = 0, vidas = VIDAS_INICIO, combo = 0, mejorCombo = 0, reventados = 0;
let t = 0, proxGlobo = 0, pendientesLluvia = 0, siguienteLluvia = CADA_LLUVIA, hielo = 0, temblor = 0, destello = 0, aviso = 0, avisoTexto = "";
try { record = Number(localStorage.getItem("globos_record")) || 0; } catch (e) {}
elRecord.textContent = record;

const dificultad = () => Math.min(1, t / RAMPA);
const lerp = (a, b, k) => a + (b - a) * k;
const multiplicador = () => Math.min(MULT_MAX, 1 + Math.floor(combo / COMBO_PARA_SUBIR));

function pintarVidas() { elVidas.textContent = vidas > 0 ? "❤️".repeat(vidas) : "💔"; }

function iniciar() {
  ac();
  globos = []; chispas = []; anillos = []; textos = [];
  puntos = 0; vidas = VIDAS_INICIO; combo = 0; mejorCombo = 0; reventados = 0; enviadosPerfil = 0;
  t = 0; proxGlobo = 30; pendientesLluvia = 0; siguienteLluvia = CADA_LLUVIA; hielo = 0; temblor = 0; destello = 0; aviso = 0;
  elPuntos.textContent = 0; pintarVidas();
  estado = "jugando";
  $("inicio").classList.remove("activo");
  $("fin").classList.remove("activo");
}

// ---------- Globos ----------
function elegirTipo() {
  const d = dificultad();
  let x = Math.random(), acum = 0;
  for (const k of Object.keys(PROB)) {
    if (d < DESDE[k]) continue;
    if (k === "corazon" && vidas >= VIDAS_MAX) continue;
    acum += PROB[k];
    if (x < acum) return k;
  }
  return "normal";
}

function nuevoGlobo() {
  const d = dificultad();
  const rx = 26 + Math.random() * 10;
  const margen = rx + 16;
  const tipo = elegirTipo();
  const x0 = margen + Math.random() * (ANCHO - 2 * margen);
  globos.push({
    x0, x: x0, rx, ry: rx * 1.22, y: -rx * 1.6,
    vy: lerp(VEL_INICIO, VEL_FINAL, d) * (0.8 + Math.random() * 0.5) * (tipo === "dorado" ? 1.35 : 1),
    fase: Math.random() * 6.28, amp: 6 + Math.random() * 16, freq: 0.02 + Math.random() * 0.02,
    tipo, color: Math.floor(Math.random() * COLORES.length),
  });
}

function reventarGlobo(g) {
  globos.splice(globos.indexOf(g), 1);
  const info = TIPOS[g.tipo];
  const pal = info.c || COLORES[g.color];
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
    chispas.push({ x: g.x, y: g.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, col: pal[1] });
  }
  anillos.push({ x: g.x, y: g.y, r: g.rx * 0.6, vida: 1, col: pal[0] });

  if (g.tipo === "bomba") {
    vidas--; combo = 0; temblor = 22; destello = 14;
    pintarVidas(); sonido("bomba");
    textos.push({ x: g.x, y: g.y, txt: "💥 -1", vida: 1 });
    try { navigator.vibrate && navigator.vibrate(120); } catch (e) {}
    if (vidas <= 0) perder();
    return;
  }

  reventados++; combo++;
  mejorCombo = Math.max(mejorCombo, combo);
  const ganado = info.puntos * multiplicador();
  puntos += ganado;
  textos.push({ x: g.x, y: g.y, txt: "+" + ganado, vida: 1 });
  if (g.tipo === "normal") sonido("pop", Math.min(combo - 1, 8));
  if (g.tipo === "dorado") sonido("dorado");
  if (g.tipo === "corazon") {
    vidas = Math.min(VIDAS_MAX, vidas + 1); pintarVidas(); sonido("vida");
    textos.push({ x: g.x, y: g.y - 26, txt: "❤️ +1", vida: 1 });
  }
  if (g.tipo === "hielo") {
    hielo = SEGUNDOS_HIELO * 60; sonido("hielo");
    avisoTexto = "¡Congelados!"; aviso = 70;
  }
  if (combo > 0 && combo % COMBO_PARA_SUBIR === 0 && multiplicador() > 1) {
    avisoTexto = "¡Combo x" + multiplicador() + "!"; aviso = 70;
  }
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}
  actualizarMarcador();
}

function globoPerdido(g) {
  globos.splice(globos.indexOf(g), 1);
  if (!TIPOS[g.tipo].penaliza) return;
  vidas--; combo = 0; destello = 10;
  pintarVidas(); sonido("perdido");
  if (vidas <= 0) perder();
}

function actualizarMarcador() {
  elPuntos.textContent = puntos;
  if (puntos > record) {
    record = puntos; elRecord.textContent = record;
    try { localStorage.setItem("globos_record", String(record)); } catch (e) {}
  }
}

function perder() {
  if (estado === "fin") return;
  estado = "fin";
  actualizarMarcador();
  sonido("fin");
  enviarPerfil();
  $("finTexto").textContent = "Reventaste " + reventados + " globos con " + puntos + " puntos. Mejor racha: " + mejorCombo + (puntos >= record && puntos > 0 ? ". ¡Nuevo récord!" : ".");
  $("fin").classList.add("activo");
}

// ---------- Entrada ----------
function posicion(e) {
  const rect = lienzo.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (ANCHO / rect.width), y: (e.clientY - rect.top) * (ALTO / rect.height) };
}
lienzo.addEventListener("pointerdown", (e) => {
  ac();
  if (estado !== "jugando") return;
  const p = posicion(e);
  // el globo de más arriba en pantalla (el último dibujado) tiene prioridad; se da un margen para dedos gruesos
  for (let i = globos.length - 1; i >= 0; i--) {
    const g = globos[i];
    const dx = (p.x - g.x) / (g.rx + 10), dy = (p.y - g.y) / (g.ry + 10);
    if (dx * dx + dy * dy <= 1) { reventarGlobo(g); return; }
  }
  if (combo > 0) { combo = 0; sonido("fallo"); }   // tocar en vacío rompe la racha
});
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfil(); });
$("jugar").addEventListener("click", iniciar);
$("otra").addEventListener("click", iniciar);

// ---------- Actualizar (un paso = 1/60 s) ----------
for (let i = 0; i < 5; i++) nubes.push({ x: Math.random() * ANCHO, y: 40 + Math.random() * 300, s: 0.6 + Math.random() * 0.9, v: 0.12 + Math.random() * 0.2 });

function paso() {
  for (const n of nubes) { n.x += n.v; if (n.x > ANCHO + 80) n.x = -80; }
  for (const s of chispas) { s.x += s.vx; s.y += s.vy; s.vy += 0.18; s.vida -= 0.04; }
  chispas = chispas.filter((s) => s.vida > 0);
  for (const a of anillos) { a.r += 3; a.vida -= 0.08; }
  anillos = anillos.filter((a) => a.vida > 0);
  for (const x of textos) { x.y -= 1.1; x.vida -= 0.022; }
  textos = textos.filter((x) => x.vida > 0);
  if (temblor > 0) temblor--;
  if (destello > 0) destello--;
  if (aviso > 0) aviso--;
  tic++;

  if (estado !== "jugando") return;
  t++;
  const congelado = hielo > 0;
  if (congelado) hielo--;

  // aparición
  if (!congelado) {
    if (pendientesLluvia > 0) {
      if (t % 9 === 0) { nuevoGlobo(); pendientesLluvia--; }
    } else if (--proxGlobo <= 0) {
      nuevoGlobo();
      proxGlobo = lerp(INTERVALO_INICIO, INTERVALO_FINAL, dificultad()) * (0.7 + Math.random() * 0.6);
    }
    if (t >= siguienteLluvia) {
      pendientesLluvia = GLOBOS_LLUVIA; siguienteLluvia += CADA_LLUVIA;
      avisoTexto = "¡Lluvia de globos!"; aviso = 80; sonido("lluvia");
    }
  }

  const freno = congelado ? 0.08 : 1;
  for (const g of [...globos]) {
    g.y += g.vy * freno;
    g.x = Math.max(g.rx + 4, Math.min(ANCHO - g.rx - 4, g.x0 + Math.sin(tic * g.freq + g.fase) * g.amp));
    if (g.y - g.ry > SUELO) globoPerdido(g);
    if (estado !== "jugando") return;
  }
}
let tic = 0;

// ---------- Dibujo ----------
function dibujarGlobo(g) {
  const info = TIPOS[g.tipo];
  const [luz, base, sombra] = info.c || COLORES[g.color];
  // cuerda
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(g.x, g.y + g.ry + 5);
  ctx.quadraticCurveTo(g.x + Math.sin(tic * 0.08 + g.fase) * 9, g.y + g.ry + 26, g.x, g.y + g.ry + 48);
  ctx.stroke();
  // nudo
  ctx.fillStyle = sombra;
  ctx.beginPath(); ctx.moveTo(g.x, g.y + g.ry - 2); ctx.lineTo(g.x - 6, g.y + g.ry + 8); ctx.lineTo(g.x + 6, g.y + g.ry + 8); ctx.closePath(); ctx.fill();
  // cuerpo
  const gr = ctx.createRadialGradient(g.x - g.rx * 0.35, g.y - g.ry * 0.4, g.rx * 0.1, g.x, g.y, g.ry * 1.05);
  gr.addColorStop(0, luz); gr.addColorStop(0.55, base); gr.addColorStop(1, sombra);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.fill();
  if (info.emoji) {
    ctx.font = Math.round(g.rx * 1.05) + "px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(info.emoji, g.x, g.y + 1);
    if (g.tipo === "bomba") {   // aviso extra: aro rojo intermitente
      ctx.strokeStyle = Math.floor(tic / 8) % 2 ? "#ff3b3b" : "#fff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.ellipse(g.x - g.rx * 0.38, g.y - g.ry * 0.45, g.rx * 0.2, g.ry * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function dibujar() {
  ctx.save();
  if (temblor > 0) ctx.translate((Math.random() - 0.5) * temblor * 0.6, (Math.random() - 0.5) * temblor * 0.6);

  // cielo: de día a atardecer según la dificultad
  const d = dificultad();
  const cielo = ctx.createLinearGradient(0, 0, 0, ALTO);
  cielo.addColorStop(0, `hsl(${Math.round(210 - d * 50)},75%,${Math.round(58 - d * 22)}%)`);
  cielo.addColorStop(1, `hsl(${Math.round(195 - d * 160)},80%,${Math.round(82 - d * 12)}%)`);
  ctx.fillStyle = cielo; ctx.fillRect(-20, -20, ANCHO + 40, ALTO + 40);

  // nubes
  ctx.fillStyle = "rgba(255,255,255,.55)";
  for (const n of nubes) {
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, 44 * n.s, 16 * n.s, 0, 0, Math.PI * 2);
    ctx.ellipse(n.x - 24 * n.s, n.y + 5 * n.s, 28 * n.s, 12 * n.s, 0, 0, Math.PI * 2);
    ctx.ellipse(n.x + 26 * n.s, n.y + 4 * n.s, 30 * n.s, 12 * n.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // suelo
  ctx.fillStyle = "#3f9a4a"; ctx.fillRect(-20, SUELO, ANCHO + 40, ALTO - SUELO + 20);
  ctx.fillStyle = "#2e7a39"; ctx.fillRect(-20, SUELO, ANCHO + 40, 6);

  for (const g of globos) dibujarGlobo(g);

  for (const a of anillos) {
    ctx.globalAlpha = Math.max(0, a.vida); ctx.strokeStyle = a.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
  }
  for (const s of chispas) {
    ctx.globalAlpha = Math.max(0, s.vida); ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.font = "800 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(20,40,80,.75)"; ctx.fillStyle = "#fff";
  for (const x of textos) {
    ctx.globalAlpha = Math.max(0, x.vida);
    ctx.strokeText(x.txt, x.x, x.y); ctx.fillText(x.txt, x.x, x.y);
  }
  ctx.globalAlpha = 1;

  // congelado: velo azul claro
  if (hielo > 0) { ctx.fillStyle = "rgba(160,220,255," + Math.min(0.28, hielo / 60) + ")"; ctx.fillRect(0, 0, ANCHO, ALTO); }

  // multiplicador
  if (estado === "jugando" && multiplicador() > 1) {
    ctx.font = "800 20px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.strokeText("x" + multiplicador() + " · racha " + combo, ANCHO - 12, 28);
    ctx.fillText("x" + multiplicador() + " · racha " + combo, ANCHO - 12, 28);
  }

  if (aviso > 0) {
    ctx.globalAlpha = Math.min(1, aviso / 25);
    ctx.font = "800 32px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 7;
    ctx.strokeText(avisoTexto, ANCHO / 2, ALTO / 2 - 80); ctx.fillText(avisoTexto, ANCHO / 2, ALTO / 2 - 80);
    ctx.globalAlpha = 1;
  }

  // destello rojo al perder una vida
  if (destello > 0) { ctx.fillStyle = "rgba(255,40,40," + destello * 0.02 + ")"; ctx.fillRect(0, 0, ANCHO, ALTO); }
  ctx.restore();
}

// ---------- Ciclo (paso fijo de 1/60 s, igual en pantallas de 60, 90 o 120 Hz) ----------
let ultimo = 0, acum = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  acum = Math.min(acum + (ahora - ultimo), 100);
  ultimo = ahora;
  while (acum >= 1000 / 60) { acum -= 1000 / 60; paso(); }
  dibujar();
}
requestAnimationFrame(cuadro);
