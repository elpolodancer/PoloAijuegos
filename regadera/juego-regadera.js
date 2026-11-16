// Ruta: regadera/juego-regadera.js
// «Regadera»: un círculo de parcelas con una regadera (manecilla) que gira en sentido de las manecillas del reloj.
// Cada pasada riega las plantas de esa zona y, con el riego, las plantas anteriores salen como soldados.
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID = "regadera";
const CLAVE = "regadera_progreso_v1";      // { mejor: ola más alta, t: fecha } (termina en _v1: entra en la copia de seguridad)

// ----- Reglas (todas en un solo lugar para poder ajustarlas) -----
const VUELTA_S = 10;                        // segundos que tarda la regadera en dar una vuelta
const COLUMNAS = 8, ANILLOS = 3;            // 8 zonas × 3 anillos = 24 espacios
const ESPACIOS_MAX = COLUMNAS * ANILLOS;
const ESPACIOS_INICIO = [[0, 1], [1, 1]];   // [zona, anillo] de los 2 espacios abiertos al empezar; los otros 22 están bloqueados
const MONEDAS_INICIO = 100;
const COSTO_PLANTA = 50;                    // poner una planta en un pasto
const COSTO_ESPACIO = 100;                  // desbloquear un espacio (la mayor mejora del juego: de 2 a 24 espacios)
const PREMIO_ENEMIGO = 20;                  // monedas por cada enemigo vencido
const VIDA_CENTRO = 500;                    // vida de la madera del centro
const DANO_ENEMIGO = 10;                    // daño de cada golpe de un monstruo al centro
const MAX_SOLDADOS = 40;
const SEG_OLA = 25;                         // cada cuántos segundos empieza una ola nueva
const DIFICULTADES = [
  { nombre: "Muy fácil", ico: "🌱", clase: "b-verde",  vida: 0.7,  ritmo: 1.4 },
  { nombre: "Fácil",     ico: "🌿", clase: "b-azul",   vida: 0.85, ritmo: 1.2 },
  { nombre: "Normal",    ico: "🌻", clase: "b-morado", vida: 1,    ritmo: 1 },
  { nombre: "Difícil",   ico: "🔥", clase: "b-oro",    vida: 1.25, ritmo: 0.8 },
  { nombre: "Experto",   ico: "💀", clase: "b-rojo",   vida: 1.6,  ritmo: 0.65 },
];
const RADIOS = [0.17, 0.46, 0.74, 1];       // límites de los anillos (fracción del radio del jardín)
const PI2 = Math.PI * 2, SECTOR = PI2 / COLUMNAS;

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
const btnMenu = $("btn-menu");

// ----- Progreso (local primero; se sincroniza con la cuenta si hay sesión e internet) -----
let nube = null;
const leerProg = () => { try { const o = JSON.parse(localStorage.getItem(CLAVE)); return o && typeof o === "object" ? o : { mejor: 0, t: 0 }; } catch (e) { return { mejor: 0, t: 0 }; } };
function guardarMejor(ola) {
  if (ola <= (leerProg().mejor || 0)) return;
  try { localStorage.setItem(CLAVE, JSON.stringify({ mejor: ola, t: Date.now() })); } catch (e) {}
  if (nube) nube.guardado();
  mostrarMejor();
}
function mostrarMejor() { const m = leerProg().mejor || 0; $("t-mejor").textContent = m ? "Tu mejor marca: ola " + m : "Defiende el centro del jardín."; }
import("../compartido/progreso.js")
  .then((m) => { nube = m.conectar(ID, { clave: CLAVE, fusionar: (a, b) => m.unirMaximos(a, b), alCambiar: mostrarMejor }); })
  .catch(() => {});

// ----- Pantallas -----
let pantalla = "menu";                      // "menu" | "dif" | "juego"
function ponerBoton(ico, texto) {
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = ico;
  btnMenu.replaceChildren(i, document.createTextNode(" " + texto));
}
function mostrar(p) {
  pantalla = p;
  $("p-menu").hidden = p !== "menu";
  $("p-dif").hidden = p !== "dif";
  lienzo.hidden = $("hud").hidden = $("barra").hidden = p !== "juego";
  $("p-fin").hidden = true;
  btnMenu.hidden = p === "menu";            // en el menú principal el ☰ no se ve
  if (p === "dif") ponerBoton("☰", "Menú principal");
  if (p === "juego") { ponerBoton("☰", "Pausa"); ajustar(); }
  if (p === "menu") mostrarMejor();
}
let avisoT = 0;
function aviso(txt) {
  const a = $("aviso"); a.textContent = txt; a.hidden = false;
  clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 2200);
}

$("b-libre").addEventListener("click", () => mostrar("dif"));
$("b-niveles").addEventListener("click", () => aviso("🚧 Los niveles todavía no están creados"));
$("b-mapa").addEventListener("click", () => aviso("🚧 Los niveles todavía no están creados"));
btnMenu.addEventListener("click", () => { if (pantalla === "dif") mostrar("menu"); }); // en partida lo maneja el menú de pausa

const lista = $("lista-dif");
let difActual = DIFICULTADES[2];
for (const d of DIFICULTADES) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt grande " + d.clase;
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = d.ico;
  b.append(i, document.createTextNode(" " + d.nombre));
  b.addEventListener("click", () => { difActual = d; nueva(); mostrar("juego"); });
  lista.appendChild(b);
}

const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => pantalla === "juego" && !G.fin,
  alAbrir: () => { G.pausa = true; },
  alContinuar: () => { G.pausa = false; },
  alSalir: () => { G.pausa = false; mostrar("menu"); },
  ayudaSalir: "Se pierde esta partida.",
});

$("b-repetir").addEventListener("click", () => { nueva(); mostrar("juego"); });
$("b-fin-menu").addEventListener("click", () => mostrar("menu"));

// ----- Estado de la partida -----
let G = { fin: true, pausa: false };
function nueva() {
  G = {
    dif: difActual, t: 0, total: 0, ola: 1, fin: false, pausa: false,
    monedas: MONEDAS_INICIO, vida: VIDA_CENTRO,
    abiertas: new Array(ESPACIOS_MAX).fill(false),     // false = espacio bloqueado
    plots: new Array(COLUMNAS * ANILLOS).fill(null),   // índice = zona * ANILLOS + anillo
    pasos: new Array(COLUMNAS).fill(0),                // cuántas pasadas lleva cada zona
    prev: new Array(COLUMNAS).fill(null),              // última planta regada de cada zona
    soldados: [], enemigos: [], gotas: [], pop: [],
    sig: 2,                                            // segundos para el próximo enemigo
  };
  for (const [z, a] of ESPACIOS_INICIO) G.abiertas[z * ANILLOS + a] = true;
}
const abiertos = () => G.abiertas.filter(Boolean).length;
const plantas = () => G.plots.filter(Boolean).length;

// ----- Medidas -----
let W = 0, H = 0, cx = 0, cy = 0, R = 0, s = 1;
function ajustar() {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  lienzo.width = Math.round(W * d); lienzo.height = Math.round(H * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  cx = W / 2; cy = H / 2 + 6;
  R = Math.max(80, Math.min(W * 0.46, H * 0.36));
  s = R / 300;
}
addEventListener("resize", ajustar);

// ----- Toques: plantar en un pasto -----
function parcelaEn(x, y) {
  const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / R;
  if (r < RADIOS[0] || r > 1) return null;
  let th = Math.atan2(dx, -dy); if (th < 0) th += PI2;
  const z = Math.floor(th / SECTOR) % COLUMNAS;
  const a = r < RADIOS[1] ? 0 : r < RADIOS[2] ? 1 : 2;
  return z * ANILLOS + a;
}
lienzo.addEventListener("pointerdown", (e) => {
  if (G.fin || G.pausa) return;
  const r = lienzo.getBoundingClientRect();
  const i = parcelaEn(e.clientX - r.left, e.clientY - r.top);
  if (i == null || G.plots[i]) return;
  if (!G.abiertas[i]) {                      // espacio bloqueado: se desbloquea por 100 monedas
    if (G.monedas < COSTO_ESPACIO) { aviso("🔒 Desbloquear cuesta " + COSTO_ESPACIO + " monedas"); return; }
    G.monedas -= COSTO_ESPACIO; G.abiertas[i] = true;
    return;
  }
  if (G.monedas < COSTO_PLANTA) { aviso("Te faltan monedas (" + COSTO_PLANTA + ")"); return; }
  G.monedas -= COSTO_PLANTA;
  G.plots[i] = { zona: Math.floor(i / ANILLOS), anillo: i % ANILLOS, riegos: 0, pulso: 0 };
});

// ----- Riego -----
// En cada zona las plantas se riegan por turnos (de adentro hacia afuera). Cada pasada riega UNA planta y la que se regó
// en la pasada anterior sale como soldado: 1ª pasada solo riega; 2ª pasada riega a la segunda y sale la primera; 3ª, sale la segunda…
function posParcela(zona, anillo) {
  const th = (zona + 0.5) * SECTOR, r = (RADIOS[anillo] + RADIOS[anillo + 1]) / 2 * R;
  return { x: cx + Math.sin(th) * r, y: cy - Math.cos(th) * r };
}
function regarZona(z) {
  const hay = [];
  for (let a = 0; a < ANILLOS; a++) if (G.plots[z * ANILLOS + a]) hay.push(G.plots[z * ANILLOS + a]);
  if (!hay.length) { G.prev[z] = null; return; }
  const objetivo = hay[G.pasos[z] % hay.length];
  objetivo.riegos++; objetivo.pulso = 1;
  const anterior = G.prev[z];
  if (anterior && G.plots[anterior.zona * ANILLOS + anterior.anillo] === anterior && G.soldados.length < MAX_SOLDADOS) {
    const p = posParcela(anterior.zona, anterior.anillo);
    G.soldados.push({ x: p.x, y: p.y, hx: p.x, hy: p.y, cd: 0 });
    G.pop.push({ x: p.x, y: p.y, v: 0.4 });
    anterior.pulso = 1;
  }
  G.prev[z] = objetivo;
  G.pasos[z]++;
}

// ----- Actualización -----
function actualizar(dt) {
  G.t += dt;
  const previo = G.total;
  G.total += dt * PI2 / VUELTA_S;
  for (let z = 0; z < COLUMNAS; z++) {
    const c = (z + 0.5) * SECTOR;
    if (Math.floor((G.total - c) / PI2) > Math.floor((previo - c) / PI2)) regarZona(z);
  }
  // gotas del agua
  for (let k = 0; k < 3; k++) {
    const r = Math.random() * R * 0.95, a = G.total - Math.random() * 0.14;
    G.gotas.push({ x: cx + Math.sin(a) * r, y: cy - Math.cos(a) * r, vx: (Math.random() - .5) * 20, vy: Math.random() * 20, v: 0.55 });
  }
  for (const g of G.gotas) { g.x += g.vx * dt; g.y += g.vy * dt; g.v -= dt; }
  G.gotas = G.gotas.filter((g) => g.v > 0).slice(-160);
  for (const p of G.pop) p.v -= dt;
  G.pop = G.pop.filter((p) => p.v > 0);
  for (const p of G.plots) if (p && p.pulso > 0) p.pulso = Math.max(0, p.pulso - dt * 2.5);

  // olas y enemigos
  const ola = Math.floor(G.t / SEG_OLA) + 1;
  if (ola > G.ola) { G.ola = ola; for (let i = 0; i < Math.min(ola, 8); i++) nuevoEnemigo(); }
  G.sig -= dt;
  if (G.sig <= 0) { nuevoEnemigo(); G.sig = Math.max(0.7, (3 - G.t * 0.012) * G.dif.ritmo); }

  const hubR = RADIOS[0] * R;
  for (const e of G.enemigos) {              // los monstruos van directo a destruir el centro de madera
    e.cd -= dt;
    const dx = cx - e.x, dy = cy - e.y, d = Math.hypot(dx, dy) || 1;
    if (d > hubR + 10 * s) { const v = e.vel * dt; e.x += dx / d * v; e.y += dy / d * v; }
    else if (e.cd <= 0) { e.cd = 0.8; G.vida -= DANO_ENEMIGO; }
  }
  for (const so of G.soldados) {
    so.cd -= dt;
    let obj = null, mejor = Infinity;
    for (const e of G.enemigos) { const d = Math.hypot(e.x - so.x, e.y - so.y); if (d < mejor) { mejor = d; obj = e; } }
    if (obj) {
      const dx = obj.x - so.x, dy = obj.y - so.y, d = Math.hypot(dx, dy) || 1;
      if (d > 18 * s) { const v = 80 * s * dt; so.x += dx / d * v; so.y += dy / d * v; }
      else if (so.cd <= 0) { so.cd = 0.5; obj.vida -= 9; }
    } else {
      const dx = so.hx - so.x, dy = so.hy - so.y, d = Math.hypot(dx, dy);
      if (d > 4) { const v = 50 * s * dt; so.x += dx / d * v; so.y += dy / d * v; }
    }
  }
  for (const e of G.enemigos) if (e.vida <= 0) G.monedas += PREMIO_ENEMIGO;
  G.enemigos = G.enemigos.filter((e) => e.vida > 0);

  if (G.vida <= 0) terminar();
}
function nuevoEnemigo() {
  const vida = (22 + 7 * (G.ola - 1)) * G.dif.vida;
  G.enemigos.push({ x: cx + (Math.random() - .5) * R * 0.3, y: -14, vida, max: vida, vel: (28 + Math.min(G.ola, 12) * 1.5) * s, cd: 0 });
}
function terminar() {
  G.vida = 0; G.fin = true;
  const olas = G.ola;
  guardarMejor(olas);
  $("t-fin").textContent = "Llegaste hasta la ola " + olas + ". Tu mejor marca: ola " + Math.max(olas, leerProg().mejor || 0) + ".";
  $("p-fin").hidden = false;
  try { $("b-repetir").focus({ preventScroll: true }); } catch (e) {}
}

// ----- Dibujo -----
function sector(z, a) {
  const a0 = z * SECTOR - Math.PI / 2, a1 = (z + 1) * SECTOR - Math.PI / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, RADIOS[a + 1] * R, a0, a1);
  ctx.arc(cx, cy, RADIOS[a] * R, a1, a0, true);
  ctx.closePath();
}
function flor(x, y, k, marchita, pulso, pies) {
  const kk = k * (1 + 0.2 * pulso);
  ctx.save(); ctx.translate(x, y);
  if (!pies) {
    ctx.strokeStyle = marchita ? "#7d8a4a" : "#3f9a2f"; ctx.lineWidth = 3 * kk; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 11 * kk); ctx.lineTo(marchita ? 4 * kk : 0, marchita ? -1 * kk : -3 * kk); ctx.stroke();
  } else {
    ctx.fillStyle = "#3f7a2a";
    ctx.beginPath(); ctx.arc(-4 * kk, 9 * kk, 3.2 * kk, 0, PI2); ctx.arc(4 * kk, 9 * kk, 3.2 * kk, 0, PI2); ctx.fill();
  }
  const hy = pies ? 0 : (marchita ? 1 * kk : -5 * kk), hx = marchita && !pies ? 5 * kk : 0;
  ctx.fillStyle = marchita && !pies ? "#c9b45e" : "#ffcf2e";
  for (let i = 0; i < 8; i++) { const a = i * PI2 / 8; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 7.5 * kk, hy + Math.sin(a) * 7.5 * kk, 4.4 * kk, 0, PI2); ctx.fill(); }
  ctx.fillStyle = "#6b3d12"; ctx.beginPath(); ctx.arc(hx, hy, 6 * kk, 0, PI2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx - 2.2 * kk, hy - 1.2 * kk, 1.3 * kk, 0, PI2); ctx.arc(hx + 2.2 * kk, hy - 1.2 * kk, 1.3 * kk, 0, PI2); ctx.fill();
  ctx.restore();
}
function barra(x, y, ancho, frac) {
  if (frac >= 1) return;
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x - ancho / 2, y, ancho, 4 * s + 1);
  ctx.fillStyle = frac > 0.4 ? "#5fd45a" : "#f0483a"; ctx.fillRect(x - ancho / 2, y, ancho * Math.max(0, frac), 4 * s + 1);
}
function arana(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  const k = s * 1.1;
  ctx.strokeStyle = "#e2872c"; ctx.lineWidth = 3 * k; ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) for (const lado of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(lado * 8 * k, i * 6 * k); ctx.lineTo(lado * 17 * k, i * 9 * k + 3 * k); ctx.stroke();
  }
  ctx.fillStyle = "#8a3b20"; ctx.beginPath(); ctx.arc(0, 0, 13 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = "#b9552b"; ctx.beginPath(); ctx.arc(0, -4 * k, 9 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-4.5 * k, -2 * k, 3.6 * k, 0, PI2); ctx.arc(4.5 * k, -2 * k, 3.6 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = "#1b2a6b";
  ctx.beginPath(); ctx.arc(-4.5 * k, -1.5 * k, 2 * k, 0, PI2); ctx.arc(4.5 * k, -1.5 * k, 2 * k, 0, PI2); ctx.fill();
  ctx.restore();
  barra(e.x, e.y - 20 * s, 26 * s, e.vida / e.max);
}
function dibujar() {
  ctx.clearRect(0, 0, W, H);
  // camino por donde llegan los enemigos
  ctx.fillStyle = "#e7c98f"; ctx.fillRect(cx - R * 0.17, 0, R * 0.34, cy - R * 0.8);
  // jardín
  ctx.beginPath(); ctx.arc(cx, cy, R + 8 * s, 0, PI2); ctx.fillStyle = "#6d9a3a"; ctx.fill();
  const puedePlantar = G.monedas >= COSTO_PLANTA, puedeAbrir = G.monedas >= COSTO_ESPACIO;
  for (let z = 0; z < COLUMNAS; z++) for (let a = 0; a < ANILLOS; a++) {
    const p = G.plots[z * ANILLOS + a];
    sector(z, a);
    const abierto = G.abiertas[z * ANILLOS + a];
    ctx.fillStyle = p ? "#8a5a32" : !abierto ? "#7e8a72" : ((z + a) % 2 ? "#a9d46c" : "#9fcc60"); ctx.fill();
    ctx.lineWidth = 3 * s; ctx.strokeStyle = p ? "#5c3a1c" : "#6d9a3a"; ctx.stroke();
    if (!p && !abierto) {
      const q = posParcela(z, a);
      ctx.globalAlpha = puedeAbrir ? 0.95 : 0.5; ctx.font = Math.round(14 * s + 6) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔒", q.x, q.y); ctx.globalAlpha = 1;
    } else if (!p && puedePlantar) {
      const q = posParcela(z, a);
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = "bold " + Math.round(18 * s + 6) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("+", q.x, q.y);
    }
  }
  for (const p of G.plots) if (p) { const q = posParcela(p.zona, p.anillo); flor(q.x, q.y, s * 1.15, p.riegos === 0, p.pulso, false); }

  // gotas, regadera y centro
  ctx.fillStyle = "#8fe6ff";
  for (const g of G.gotas) { ctx.globalAlpha = Math.min(1, g.v * 2); ctx.beginPath(); ctx.arc(g.x, g.y, 3 * s + 1, 0, PI2); ctx.fill(); }
  ctx.globalAlpha = 1;
  const ang = G.total - Math.PI / 2, ex = cx + Math.cos(ang) * R * 0.97, ey = cy + Math.sin(ang) * R * 0.97;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#7a4a1a"; ctx.lineWidth = 17 * s; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = "#e0a050"; ctx.lineWidth = 11 * s; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, RADIOS[0] * R, 0, PI2); ctx.fillStyle = "#c98a43"; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = "#7a4a1a"; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, RADIOS[0] * R * 0.55, 0, PI2); ctx.fillStyle = "#3bb7e8"; ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = "#f6e3b0"; ctx.stroke();
  barra(cx, cy + RADIOS[0] * R + 6 * s, 54 * s, G.vida / VIDA_CENTRO);

  for (const p of G.pop) { ctx.globalAlpha = p.v / 0.4; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(p.x, p.y, (0.4 - p.v) * 90 * s + 8 * s, 0, PI2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const so of G.soldados) { flor(so.x, so.y, s * 0.95, false, 0, true); }
  for (const e of G.enemigos) arana(e);
  hud();
}
let cache = "";
function hud() {
  const t = [G.monedas, plantas(), abiertos(), Math.max(0, G.vida), G.ola].join("|");
  if (t === cache) return;
  cache = t;
  $("v-monedas").textContent = G.monedas;
  $("v-plantas").textContent = plantas() + "/" + abiertos();
  $("v-vida").textContent = Math.max(0, G.vida);
  $("v-ola").textContent = G.ola;
}

// ----- Bucle -----
let ultimo = 0;
function bucle(ts) {
  requestAnimationFrame(bucle);
  if (pantalla !== "juego") { ultimo = 0; return; }
  const dt = ultimo ? Math.min(0.05, (ts - ultimo) / 1000) : 0;
  ultimo = ts;
  if (!G.pausa && !G.fin) actualizar(dt);
  dibujar();
}
document.addEventListener("visibilitychange", () => { if (document.hidden && pantalla === "juego" && !G.fin && !pausa.abierto()) pausa.abrir(); });

ajustar();
mostrar("menu");
requestAnimationFrame(bucle);
