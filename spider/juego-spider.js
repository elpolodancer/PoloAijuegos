// Ruta: spider/juego-spider.js
// Solitario Spider: menú principal (♾️ Modo libre · 🎯 Niveles · 🗺️ Mapa), partida y mapa estándar de México/mundo.
// Niveles: por ahora 5 (niveles-spider.js, dificultad Fácil); el mapa está montado con 10 por etapa y los que faltan salen bloqueados.
import { DIFICULTADES, nuevaPartida, clonar, largoTramo, puedeMover, mover, puedeRepartir, repartir, ganada, jugadas, palo, rango, SERIES } from "./logica-spider.js";
import { generarVerificada } from "./ia-spider.js";
import { NIVELES } from "./niveles-spider.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "spider_progreso_v1"; // { niv:{max,hecho}, mejor:{"1":segundos…}, ganadas, t }
const SIMB = ["♠", "♥", "♣", "♦"], ROJO = [false, true, false, true];
const NOMBRE_RANGO = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// ---------- Progreso (local primero; se sincroniza con la cuenta si hay internet) ----------
let prog = { niv: { max: 1, hecho: 0 }, mejor: {}, ganadas: 0, t: 0 };
try { const g = JSON.parse(localStorage.getItem(CLAVE)); if (g) prog = { ...prog, ...g }; } catch (e) {}
let nube = null;
function guardar() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
function fusionar(a, b) { // gana el mayor avance y el menor tiempo de cada dificultad
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const mejor = { ...(b.mejor || {}) };
  for (const k in a.mejor || {}) mejor[k] = mejor[k] ? Math.min(mejor[k], a.mejor[k]) : a.mejor[k];
  const na = a.niv || {}, nb = b.niv || {};
  return { niv: { max: Math.max(na.max || 1, nb.max || 1), hecho: Math.max(na.hecho || 0, nb.hecho || 0) }, mejor, ganadas: Math.max(a.ganadas || 0, b.ganadas || 0), t: Math.max(a.t || 0, b.t || 0) };
}
import("../compartido/progreso.js").then((m) => { nube = m.conectar("spider", { clave: CLAVE, fusionar, alCambiar: (u) => { prog = { ...prog, ...u }; pintarMenu(); } }); }).catch(() => {});

// ---------- Pantallas ----------
let pantalla = "menu", dif = 1, e = null, historial = [], sel = null, fin = false, pausado = false;
let t0 = 0, acum = 0, verificada = false, nivel = 0; // nivel 0 = modo libre
// Avisos visuales: alertaMal = recuadro rojo (tramo bloqueado); pista = movimiento sugerido {tipo:"mover",de,desde,a} o {tipo:"repartir"}
const PISTA_MS = 15000; // segundos sin tocar nada antes de dar una pista
let ultimaAccion = Date.now(), alertaMal = null, pista = null;
const btnMenu = $("btn-menu");

function mostrar(p) {
  pantalla = p;
  $("menu").hidden = p !== "menu";
  $("juego").hidden = p !== "juego";
  btnMenu.hidden = p === "menu";
  btnMenu.lastChild.textContent = p === "mapa" ? " Menú principal" : " Pausa";
  if (p !== "mapa") mapa.cerrar();
  if (p === "juego") pintar();
}
function aviso(txt) {
  const t = $("toast"); t.textContent = txt; t.hidden = false;
  clearTimeout(aviso.id); aviso.id = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------- Menú ----------
function pintarMenu() {
  const caja = $("dificultades"); caja.replaceChildren();
  for (const d of DIFICULTADES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "b3d txt b-gris" + (d.id === dif ? " on" : "");
    b.innerHTML = '<span class="b-ico">' + d.ico + "</span> " + d.nombre;
    b.addEventListener("click", () => { dif = d.id; pintarMenu(); });
    caja.appendChild(b);
  }
  const d = DIFICULTADES[dif - 1];
  $("desc-dif").textContent = d.palos + (d.palos === 1 ? " palo" : " palos") + (d.deshacer ? " · con deshacer" : " · SIN deshacer");
  const m = prog.mejor[dif];
  $("mejores").textContent = m ? "Mejor tiempo: " + formato(m) : "";
}
$("b-libre").addEventListener("click", () => empezar());
$("b-niveles").addEventListener("click", () => { mostrar("mapa"); mapa.abrir(Math.min(prog.niv.max, NIVELES.length)); });
$("b-mapa").addEventListener("click", () => { mostrar("mapa"); mapa.abrir(); });

// ---------- Mapa estándar (México y mundo): todavía sin niveles ----------
const mapa = montarMapa({
  prefijo: "spider",
  etapas: crearEtapas({ porEtapa: 10 }),
  progreso: () => prog.niv,
  jugarNivel: (n) => (n <= NIVELES.length ? empezar(n) : aviso("🚧 Ese nivel llegará pronto")),
  nivelContinuar: () => Math.min(prog.niv.max, NIVELES.length),
  infoNivel: (n) => (NIVELES[n - 1] ? { sub: "🟢 Fácil", clase: "b-verde" } : { sub: "🚧", clase: "b-gris" }),
  avisoPrincipal: () => NIVELES.length + " niveles listos · más en camino 🕷️",
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => empezar() }],
});

// ---------- Partida ----------
const formato = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const segundos = () => acum + (t0 && !pausado && !fin ? (Date.now() - t0) / 1000 : 0);

function empezar(n = 0) {
  nivel = n;
  if (n) { // nivel fijo: mismo reparto para todos, ya comprobado con el bot
    const N = NIVELES[n - 1];
    verificada = true; e = nuevaPartida(N.dif, N.semilla);
  } else {
    const base = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    // El bot intenta hallar un reparto con solución comprobada (poco tiempo; si no, queda «al azar»)
    const v = generarVerificada(dif, base, { intentos: dif <= 2 ? 4 : 3, maxMs: dif <= 2 ? 350 : 250, maxNodos: 60000 });
    verificada = !!v;
    e = v ? v.estado : nuevaPartida(dif, base);
  }
  historial = []; sel = null; fin = false; pausado = false; t0 = 0; acum = 0;
  alertaMal = null; pista = null; ultimaAccion = Date.now();
  mostrar("juego");
}
function jugar(fn) {
  if (DIFICULTADES[e.dif - 1].deshacer) { historial.push(clonar(e)); if (historial.length > 300) historial.shift(); }
  if (!t0) t0 = Date.now();
  fn(); sel = null; pintar();
  if (ganada(e)) terminar();
}
function terminar() {
  fin = true; acum = segundos(); t0 = 0;
  const s = Math.round(acum);
  if (nivel) { // desbloquea el siguiente (hasta donde haya niveles)
    prog.niv.hecho = Math.max(prog.niv.hecho, nivel);
    prog.niv.max = Math.min(NIVELES.length, Math.max(prog.niv.max, nivel + 1));
  } else {
    prog.ganadas++;
    if (!prog.mejor[e.dif] || s < prog.mejor[e.dif]) prog.mejor[e.dif] = s;
  }
  guardar();
  const f = document.createElement("div");
  f.className = "pausa-fondo";
  f.innerHTML = '<div class="pausa-panel"><h2>🎉 ¡Ganaste' + (nivel ? " el nivel " + nivel : "") + '!</h2><p>' + formato(s) + " · " + e.movs + ' movimientos</p><div class="pausa-opciones"></div></div>';
  const ops = f.querySelector(".pausa-opciones");
  const sig = nivel && nivel < NIVELES.length ? [["▶", "Siguiente nivel", "b-verde", () => empezar(nivel + 1)]] : [];
  const otra = nivel ? [["🔄", "Repetir nivel", "b-azul", () => empezar(nivel)], ["🗺️", "Mapa", "b-morado", () => { mostrar("mapa"); mapa.abrir(nivel); }]] : [["🔄", "Otra partida", "b-verde", () => empezar()]];
  for (const [ico, txt, cl, fn] of [...sig, ...otra, ["🏠", "Menú principal", "b-gris", () => { pintarMenu(); mostrar("menu"); }]]) {
    const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + cl;
    b.innerHTML = '<span class="b-ico">' + ico + "</span><span>" + txt + "</span>";
    b.addEventListener("click", () => { f.remove(); fn(); });
    ops.appendChild(b);
  }
  document.body.appendChild(f);
}

// ---------- Dibujo ----------
function tramoValido(c, i) { return i >= e.ocultas[c] && e.cols[c].length - i <= largoTramo(e, c); }
function pintar() {
  if (!e) return;
  const m = $("mesa"); m.replaceChildren();
  const W = m.clientWidth, H = m.clientHeight, gap = Math.max(2, W * 0.008);
  const w = Math.max(24, Math.min(84, (W - gap * 9) / 10)), h = w * 1.4, x0 = Math.max(0, (W - (w * 10 + gap * 9)) / 2);
  const letra = Math.max(10, w * 0.3);
  // Zonas con recuadro: el tramo bloqueado (rojo) o la pista (origen verde + destino verde punteado)
  const zonas = [];
  if (alertaMal) zonas.push(alertaMal);
  if (pista && pista.tipo === "mover") {
    const nd = e.cols[pista.a].length;
    zonas.push({ c: pista.de, desde: pista.desde, hasta: e.cols[pista.de].length - 1, clase: "zona-pista" },
               { c: pista.a, desde: nd - 1, hasta: nd - 1, clase: "zona-pista zona-dest" }); // nd = 0 → columna vacía (-1)
  }
  for (let c = 0; c < 10; c++) {
    const col = document.createElement("div");
    col.className = "col"; col.style.left = x0 + c * (w + gap) + "px"; col.style.width = w + "px";
    col.addEventListener("click", (ev) => { const k = ev.target.closest(".carta"); tocar(c, k ? +k.dataset.i : -1); });
    const hueco = document.createElement("div"); hueco.className = "hueco"; hueco.style.width = w + "px"; hueco.style.height = h + "px";
    col.appendChild(hueco);
    const cartas = e.cols[c], o = e.ocultas[c];
    const total = h + o * 0.13 * h + Math.max(0, cartas.length - o - 1) * 0.3 * h;
    const f = total > H ? Math.max(0.35, (H - h) / (total - h)) : 1;
    let y = 0;
    const ys = []; // y de cada carta (para colocar los recuadros)
    for (const z of zonas) if (z.c === c && z.hasta < 0) col.appendChild(marco(z, ys, h, w, true)); // columna vacía
    cartas.forEach((carta, i) => {
      ys.push(y);
      const d = document.createElement("div"), oculta = i < o;
      d.className = "carta" + (oculta ? " dorso" : ROJO[palo(carta)] ? " roja" : "") + (sel && sel.c === c && i >= sel.i ? " sel" : "");
      d.dataset.i = i; d.style.top = y + "px"; d.style.width = w + "px"; d.style.height = h + "px"; d.style.fontSize = letra + "px";
      if (!oculta) d.innerHTML = NOMBRE_RANGO[rango(carta)] + SIMB[palo(carta)] + '<span class="pl" style="font-size:' + w * 0.5 + 'px">' + SIMB[palo(carta)] + "</span>";
      col.appendChild(d);
      y += (oculta ? 0.13 : 0.3) * h * f;
      // El recuadro llega hasta donde empieza la carta siguiente: lo que estorba (las cartas de abajo) queda SIN recuadro
      const alFinal = i === cartas.length - 1;
      for (const z of zonas) if (z.c === c && z.hasta === i) col.appendChild(marco(z, ys, alFinal ? ys[i] + h : y, w, alFinal));
    });
    m.appendChild(col);
  }
  $("c-movs").textContent = e.movs; $("c-series").textContent = e.hechos + "/" + SERIES;
  $("n-rep").textContent = 5 - e.rep; $("b-repartir").disabled = e.rep >= 5;
  $("b-repartir").classList.toggle("alerta-rep", !!(pista && pista.tipo === "repartir")); // sin movimientos: parpadea el reparto
  $("b-deshacer").hidden = !DIFICULTADES[e.dif - 1].deshacer; $("b-deshacer").disabled = !historial.length;
  $("c-estado").textContent = nivel ? "Nivel " + nivel : verificada ? "✔ Con solución" : "🎲 Al azar";
  $("c-tiempo").textContent = formato(segundos());
}
// Recuadro (div .zona) que rodea las cartas desde la posición «desde» hasta «hasta» de una columna. y2 = donde termina; alFinal = incluye la última carta
function marco(z, ys, y2, w, alFinal) {
  const d = document.createElement("div");
  d.className = "zona " + z.clase;
  const y1 = z.desde < 0 ? 0 : ys[z.desde];
  d.style.left = "-2px"; d.style.width = w + 4 + "px";
  d.style.top = y1 - 2 + "px"; d.style.height = y2 - y1 + 2 + (alFinal ? 2 : 0) + "px";
  if (z.t) d.style.animationDelay = "-" + (Date.now() - z.t) / 1000 + "s"; // si se vuelve a pintar, el parpadeo sigue donde iba
  return d;
}
// Cualquier toque del jugador: reinicia la cuenta de inactividad y quita la pista que estuviera puesta
function actividad() { ultimaAccion = Date.now(); pista = null; }

// Quiso tomar la carta «i» de la columna «c», pero hay cartas debajo que no encajan en la escalera: se rodea de rojo (triple parpadeo)
// SOLO el tramo que quiso mover, hasta la carta donde se rompe la escalera. Las cartas que estorban no se resaltan.
function marcarBloqueo(c, i) {
  const col = e.cols[c];
  let j = i + 1;
  while (j < col.length && palo(col[j - 1]) === palo(col[j]) && rango(col[j - 1]) === rango(col[j]) + 1) j++;
  alertaMal = { c, desde: i, hasta: j - 1, clase: "zona-mal", t: Date.now() };
  clearTimeout(marcarBloqueo.id);
  marcarBloqueo.id = setTimeout(() => { alertaMal = null; if (pantalla === "juego") pintar(); }, 1300);
}

// Pista tras 15 s sin tocar nada. Orden: 1) un movimiento que sirve (quita serie, destapa, junta mismo palo),
// 2) si no hay, parpadea «Repartir» en amarillo oscuro, 3) si tampoco se puede repartir, un movimiento menor (p. ej. a columna vacía).
function calcularPista() {
  ultimaAccion = Date.now(); // si no hay nada que sugerir, vuelve a intentarlo en 15 s
  let mejor = null, pm = 0, otra = null, po = 0;
  for (const j of jugadas(e)) {
    const n = clonar(e); mover(n, j.de, j.k, j.a);
    const util = n.hechos > e.hechos || j.rev || j.mismo;
    const p = (n.hechos > e.hechos ? 1000 : 0) + (j.rev ? 200 : 0) + (j.mismo ? 40 + j.k : 0) + (j.vacia ? 5 : 1);
    if (util) { if (p > pm) { pm = p; mejor = j; } }
    else if (p > po) { po = p; otra = j; }
  }
  const j = mejor || (puedeRepartir(e) ? null : otra);
  if (j) { pista = { tipo: "mover", de: j.de, desde: e.cols[j.de].length - j.k, a: j.a }; aviso("💡 Pista: mira el recuadro verde"); }
  else if (puedeRepartir(e)) { pista = { tipo: "repartir" }; aviso("🃏 Ya no hay movimientos útiles: toca Repartir"); }
  else { aviso(e.rep < 5 ? "Llena las columnas vacías para poder repartir" : "Ya no hay movimientos posibles"); return; }
  pintar();
}

function tocar(c, i) {
  if (fin || pausado) return;
  actividad();
  if (sel) {
    if (sel.c !== c) {
      const k = e.cols[sel.c].length - sel.i;
      if (puedeMover(e, sel.c, k, c)) { const de = sel.c; jugar(() => mover(e, de, k, c)); return; }
    } else if (i < 0 || i === sel.i) { sel = null; pintar(); return; }
    sel = null;
  }
  if (i >= 0 && tramoValido(c, i)) sel = { c, i };
  else if (i >= 0 && i >= e.ocultas[c]) marcarBloqueo(c, i); // carta visible pero bloqueada por las de abajo
  pintar();
}
$("b-repartir").addEventListener("click", () => {
  if (fin || pausado) return;
  actividad();
  if (e.rep >= 5) return;
  if (!puedeRepartir(e)) { aviso("Llena las columnas vacías antes de repartir"); pintar(); return; }
  jugar(() => repartir(e));
});
$("b-deshacer").addEventListener("click", () => { if (fin || pausado || !historial.length) return; actividad(); e = historial.pop(); sel = null; pintar(); });
addEventListener("resize", () => { if (pantalla === "juego") pintar(); });
setInterval(() => {
  if (pantalla !== "juego" || !e || fin || pausado) return;
  $("c-tiempo").textContent = formato(segundos());
  if (!pista && Date.now() - ultimaAccion >= PISTA_MS) calcularPista(); // 15 s sin tocar nada
}, 500);

// ---------- Botón ☰ ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => pantalla === "juego" && !fin,
  alAbrir: () => { acum = segundos(); t0 = 0; pausado = true; },
  alContinuar: () => { pausado = false; ultimaAccion = Date.now(); if (acum > 0 || e.movs) t0 = Date.now(); },
  extras: () => [{ icono: "🔄", texto: nivel ? "Reiniciar nivel" : "Nueva partida", clase: "b-azul", alElegir: () => { pausado = false; empezar(nivel); } }],
  alSalir: () => { pausado = false; pintarMenu(); mostrar("menu"); },
  ayudaSalir: "Se pierde la partida en curso",
});
btnMenu.addEventListener("click", () => { if (pantalla === "mapa") { pintarMenu(); mostrar("menu"); } }); // en el mapa, ☰ = «Menú principal»

pintarMenu();
mostrar("menu");
