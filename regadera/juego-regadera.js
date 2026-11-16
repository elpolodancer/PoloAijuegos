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
const COSTO_PLANTA = [50, 120, 250, 450, 750, 1200, 1900, 3000, 4700, 7500];   // precio de cada nivel de planta (subir de nivel cuesta la diferencia)
const COSTO_ESPACIO = 100;                  // desbloquear un espacio (la mayor mejora del juego: de 2 a 24 espacios)
const VIDA_CENTRO = 500;                    // vida de la madera del centro
const MAX_SOLDADOS = 40;
const SEG_OLA = 25;                         // cada cuántos segundos empieza una ola nueva
const DIFICULTADES = [
  { nombre: "Muy fácil", ico: "🌱", clase: "b-verde",  vida: 0.7,  ritmo: 1.4 },
  { nombre: "Fácil",     ico: "🌿", clase: "b-azul",   vida: 0.85, ritmo: 1.2 },
  { nombre: "Normal",    ico: "🌻", clase: "b-morado", vida: 1,    ritmo: 1 },
  { nombre: "Difícil",   ico: "🔥", clase: "b-oro",    vida: 1.25, ritmo: 0.8 },
  { nombre: "Experto",   ico: "💀", clase: "b-rojo",   vida: 1.6,  ritmo: 0.65 },
];
// 10 niveles de planta: el soldado que sale de cada una pega con este daño por golpe (cada 0.5 s)
const PLANTAS = [
  { n: "Girasol",        c: "#ffcf2e", dano: 9 },
  { n: "Margarita",      c: "#fff6d8", dano: 15 },
  { n: "Tulipán",        c: "#ff6b6b", dano: 24 },
  { n: "Orquídea",       c: "#e056fd", dano: 36 },
  { n: "Flor de hielo",  c: "#6fd8ff", dano: 52 },
  { n: "Flor de fuego",  c: "#ff8c1a", dano: 75 },
  { n: "Loto",           c: "#7bed9f", dano: 105 },
  { n: "Flor de rayo",   c: "#fffa4d", dano: 145 },
  { n: "Flor de oro",    c: "#ffd700", dano: 200 },
  { n: "Flor arcoíris",  c: "#ff5fd2", dano: 280 },
];
// 10 niveles de monstruo: vida, daño al centro por golpe, velocidad (px/s a tamaño base) y monedas que sueltan.
// Los de nivel 1 hacen 10 de daño y sueltan 20; suben con las olas (cada 3 olas aparece un nivel más alto).
const MONSTRUOS = [
  { vida: 22,   dano: 10,  vel: 28, premio: 20,  c: ["#8a3b20", "#b9552b"] },
  { vida: 45,   dano: 14,  vel: 30, premio: 26,  c: ["#2f7a3a", "#4fae5a"] },
  { vida: 80,   dano: 20,  vel: 32, premio: 34,  c: ["#2a5fb0", "#4b86e0"] },
  { vida: 140,  dano: 28,  vel: 34, premio: 45,  c: ["#7a2fb0", "#a65be0"] },
  { vida: 240,  dano: 38,  vel: 36, premio: 60,  c: ["#b02f6a", "#e0568f"] },
  { vida: 400,  dano: 52,  vel: 38, premio: 80,  c: ["#1f8f8a", "#3fcfc8"] },
  { vida: 650,  dano: 70,  vel: 40, premio: 105, c: ["#a8901a", "#e0c83f"] },
  { vida: 1050, dano: 95,  vel: 42, premio: 140, c: ["#4a4f57", "#7d848f"] },
  { vida: 1700, dano: 130, vel: 44, premio: 185, c: ["#b01c1c", "#e04545"] },
  { vida: 2800, dano: 180, vel: 46, premio: 250, c: ["#15151a", "#3a3a48"] },
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
    sel: 1,                                            // nivel de planta elegido para plantar
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
const nivelMons = () => Math.min(10, 1 + Math.floor((G.ola - 1) / 3));
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
  if (i == null) return;
  const q = G.plots[i];
  if (q) {                                   // tocar una planta la mejora al siguiente nivel (se paga la diferencia)
    if (q.nivel >= PLANTAS.length) { aviso("Esa planta ya está al nivel máximo"); return; }
    const costo = COSTO_PLANTA[q.nivel] - COSTO_PLANTA[q.nivel - 1];
    if (G.monedas < costo) { aviso("Mejorar a nivel " + (q.nivel + 1) + " cuesta " + costo + " monedas"); return; }
    G.monedas -= costo; q.nivel++; q.pulso = 1;
    return;
  }
  if (!G.abiertas[i]) {                      // espacio bloqueado: se desbloquea por 100 monedas (queda café)
    if (G.monedas < COSTO_ESPACIO) { aviso("🔒 Desbloquear cuesta " + COSTO_ESPACIO + " monedas"); return; }
    G.monedas -= COSTO_ESPACIO; G.abiertas[i] = true;
    return;
  }
  const costo = COSTO_PLANTA[G.sel - 1];     // solo se planta en espacios desbloqueados (café)
  if (G.monedas < costo) { aviso("Te faltan monedas (" + costo + ")"); return; }
  G.monedas -= costo;
  G.plots[i] = { zona: Math.floor(i / ANILLOS), anillo: i % ANILLOS, nivel: G.sel, riegos: 0, pulso: 0 };
});
$("b-ant").addEventListener("click", () => { if (!G.fin && !G.pausa) G.sel = G.sel <= 1 ? PLANTAS.length : G.sel - 1; });
$("b-sig").addEventListener("click", () => { if (!G.fin && !G.pausa) G.sel = G.sel >= PLANTAS.length ? 1 : G.sel + 1; });

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
    G.soldados.push({ x: p.x, y: p.y, hx: p.x, hy: p.y, cd: 0, nivel: anterior.nivel, dano: PLANTAS[anterior.nivel - 1].dano });
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
    else if (e.cd <= 0) { e.cd = 0.8; G.vida -= e.dano; }
  }
  for (const so of G.soldados) {
    so.cd -= dt;
    let obj = null, mejor = Infinity;
    for (const e of G.enemigos) { const d = Math.hypot(e.x - so.x, e.y - so.y); if (d < mejor) { mejor = d; obj = e; } }
    if (obj) {
      const dx = obj.x - so.x, dy = obj.y - so.y, d = Math.hypot(dx, dy) || 1;
      if (d > 18 * s) { const v = 80 * s * dt; so.x += dx / d * v; so.y += dy / d * v; }
      else if (so.cd <= 0) { so.cd = 0.5; obj.vida -= so.dano; }
    } else {
      const dx = so.hx - so.x, dy = so.hy - so.y, d = Math.hypot(dx, dy);
      if (d > 4) { const v = 50 * s * dt; so.x += dx / d * v; so.y += dy / d * v; }
    }
  }
  for (const e of G.enemigos) if (e.vida <= 0) G.monedas += e.premio;
  G.enemigos = G.enemigos.filter((e) => e.vida > 0);

  if (G.vida <= 0) terminar();
}
function nuevoEnemigo() {
  const m = nivelMons(), x = Math.random();
  const nivel = Math.max(1, m - (x < 0.5 ? 0 : x < 0.8 ? 1 : 2));   // casi todos del nivel actual, algunos de los anteriores
  const d = MONSTRUOS[nivel - 1], vida = d.vida * G.dif.vida;
  G.enemigos.push({ x: cx + (Math.random() - .5) * R * 0.3, y: -14, vida, max: vida, nivel, dano: d.dano, premio: d.premio, vel: d.vel * s, cd: 0 });
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
function flor(x, y, k, marchita, pulso, pies, nivel) {
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
  const col = PLANTAS[nivel - 1].c;
  ctx.fillStyle = marchita && !pies ? "#c9b45e" : col;
  if (nivel >= 8 && !marchita) { ctx.shadowColor = col; ctx.shadowBlur = 10 * kk; }
  for (let i = 0; i < 8; i++) { const a = i * PI2 / 8; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 7.5 * kk, hy + Math.sin(a) * 7.5 * kk, 4.4 * kk, 0, PI2); ctx.fill(); }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#6b3d12"; ctx.beginPath(); ctx.arc(hx, hy, 6 * kk, 0, PI2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx - 2.2 * kk, hy - 1.2 * kk, 1.3 * kk, 0, PI2); ctx.arc(hx + 2.2 * kk, hy - 1.2 * kk, 1.3 * kk, 0, PI2); ctx.fill();
  if (nivel >= 2) {
    ctx.font = "bold " + Math.round(9 * kk + 3) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.fillStyle = "#fff";
    ctx.strokeText(nivel, hx, hy - 13 * kk); ctx.fillText(nivel, hx, hy - 13 * kk);
  }
  ctx.restore();
}
function barra(x, y, ancho, frac) {
  if (frac >= 1) return;
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x - ancho / 2, y, ancho, 4 * s + 1);
  ctx.fillStyle = frac > 0.4 ? "#5fd45a" : "#f0483a"; ctx.fillRect(x - ancho / 2, y, ancho * Math.max(0, frac), 4 * s + 1);
}
function arana(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  const k = s * 1.1 * (1 + 0.05 * (e.nivel - 1)), col = MONSTRUOS[e.nivel - 1].c;
  ctx.strokeStyle = "#e2872c"; ctx.lineWidth = 3 * k; ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) for (const lado of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(lado * 8 * k, i * 6 * k); ctx.lineTo(lado * 17 * k, i * 9 * k + 3 * k); ctx.stroke();
  }
  ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(0, 0, 13 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(0, -4 * k, 9 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-4.5 * k, -2 * k, 3.6 * k, 0, PI2); ctx.arc(4.5 * k, -2 * k, 3.6 * k, 0, PI2); ctx.fill();
  ctx.fillStyle = "#1b2a6b";
  ctx.beginPath(); ctx.arc(-4.5 * k, -1.5 * k, 2 * k, 0, PI2); ctx.arc(4.5 * k, -1.5 * k, 2 * k, 0, PI2); ctx.fill();
  if (e.nivel >= 2) {
    ctx.font = "bold " + Math.round(8 * k + 3) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.fillStyle = "#fff";
    ctx.strokeText(e.nivel, 0, 7 * k); ctx.fillText(e.nivel, 0, 7 * k);
  }
  ctx.restore();
  barra(e.x, e.y - 20 * k, 26 * s, e.vida / e.max);
}
function dibujar() {
  ctx.clearRect(0, 0, W, H);
  // camino por donde llegan los enemigos
  ctx.fillStyle = "#e7c98f"; ctx.fillRect(cx - R * 0.17, 0, R * 0.34, cy - R * 0.8);
  // jardín
  ctx.beginPath(); ctx.arc(cx, cy, R + 8 * s, 0, PI2); ctx.fillStyle = "#6d9a3a"; ctx.fill();
  const puedePlantar = G.monedas >= COSTO_PLANTA[G.sel - 1], puedeAbrir = G.monedas >= COSTO_ESPACIO;
  for (let z = 0; z < COLUMNAS; z++) for (let a = 0; a < ANILLOS; a++) {
    const p = G.plots[z * ANILLOS + a];
    sector(z, a);
    const abierto = G.abiertas[z * ANILLOS + a];
    ctx.fillStyle = p ? "#8a5a32" : abierto ? "#a06c3c" : ((z + a) % 2 ? "#a9d46c" : "#9fcc60"); ctx.fill();
    ctx.lineWidth = 3 * s; ctx.strokeStyle = p || abierto ? "#5c3a1c" : "#6d9a3a"; ctx.stroke();
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
  for (const p of G.plots) if (p) { const q = posParcela(p.zona, p.anillo); flor(q.x, q.y, s * (1.05 + 0.04 * p.nivel), p.riegos === 0, p.pulso, false, p.nivel); }

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
  for (const so of G.soldados) { flor(so.x, so.y, s * (0.85 + 0.04 * so.nivel), false, 0, true, so.nivel); }
  for (const e of G.enemigos) arana(e);
  hud();
}
let cache = "";
function hud() {
  const t = [G.monedas, plantas(), abiertos(), Math.max(0, G.vida), G.ola, G.sel].join("|");
  if (t === cache) return;
  cache = t;
  $("v-monedas").textContent = G.monedas;
  $("v-plantas").textContent = plantas() + "/" + abiertos();
  $("v-vida").textContent = Math.max(0, G.vida);
  $("v-ola").textContent = G.ola;
  $("v-nm").textContent = nivelMons();
  const pl = PLANTAS[G.sel - 1];
  $("t-planta").textContent = "Nv " + G.sel + " · " + pl.n + "\n💰 " + COSTO_PLANTA[G.sel - 1] + " · ⚔️ " + pl.dano;
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
