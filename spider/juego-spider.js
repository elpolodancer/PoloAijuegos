// Ruta: spider/juego-spider.js
// Solitario Spider: menú principal (♾️ Modo libre · 🎯 Niveles · 🗺️ Mapa), partida y mapa estándar de México/mundo.
// Niveles: por ahora 5 (niveles-spider.js, dificultad Fácil); el mapa está montado con 10 por etapa y los que faltan salen bloqueados.
import { DIFICULTADES, nuevaPartida, clonar, largoTramo, puedeMover, mover, puedeRepartir, repartir, ganada, palo, rango, SERIES } from "./logica-spider.js";
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
    cartas.forEach((carta, i) => {
      const d = document.createElement("div"), oculta = i < o;
      d.className = "carta" + (oculta ? " dorso" : ROJO[palo(carta)] ? " roja" : "") + (sel && sel.c === c && i >= sel.i ? " sel" : "");
      d.dataset.i = i; d.style.top = y + "px"; d.style.width = w + "px"; d.style.height = h + "px"; d.style.fontSize = letra + "px";
      if (!oculta) d.innerHTML = NOMBRE_RANGO[rango(carta)] + SIMB[palo(carta)] + '<span class="pl" style="font-size:' + w * 0.5 + 'px">' + SIMB[palo(carta)] + "</span>";
      col.appendChild(d);
      y += (oculta ? 0.13 : 0.3) * h * f;
    });
    m.appendChild(col);
  }
  $("c-movs").textContent = e.movs; $("c-series").textContent = e.hechos + "/" + SERIES;
  $("n-rep").textContent = 5 - e.rep; $("b-repartir").disabled = e.rep >= 5;
  $("b-deshacer").hidden = !DIFICULTADES[e.dif - 1].deshacer; $("b-deshacer").disabled = !historial.length;
  $("c-estado").textContent = nivel ? "Nivel " + nivel : verificada ? "✔ Con solución" : "🎲 Al azar";
  $("c-tiempo").textContent = formato(segundos());
}
function tocar(c, i) {
  if (fin || pausado) return;
  if (sel) {
    if (sel.c !== c) {
      const k = e.cols[sel.c].length - sel.i;
      if (puedeMover(e, sel.c, k, c)) { const de = sel.c; jugar(() => mover(e, de, k, c)); return; }
    } else if (i < 0 || i === sel.i) { sel = null; pintar(); return; }
    sel = null;
  }
  if (i >= 0 && tramoValido(c, i)) sel = { c, i };
  else if (i >= 0 && i >= e.ocultas[c]) { const d = $("mesa").children[c].querySelector('[data-i="' + i + '"]'); if (d) d.classList.add("mal"); }
  pintar();
}
$("b-repartir").addEventListener("click", () => {
  if (fin || pausado) return;
  if (e.rep >= 5) return;
  if (!puedeRepartir(e)) { aviso("Llena las columnas vacías antes de repartir"); return; }
  jugar(() => repartir(e));
});
$("b-deshacer").addEventListener("click", () => { if (fin || pausado || !historial.length) return; e = historial.pop(); sel = null; pintar(); });
addEventListener("resize", () => { if (pantalla === "juego") pintar(); });
setInterval(() => { if (pantalla === "juego" && e && !fin && !pausado) $("c-tiempo").textContent = formato(segundos()); }, 500);

// ---------- Botón ☰ ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => pantalla === "juego" && !fin,
  alAbrir: () => { acum = segundos(); t0 = 0; pausado = true; },
  alContinuar: () => { pausado = false; if (acum > 0 || e.movs) t0 = Date.now(); },
  extras: () => [{ icono: "🔄", texto: nivel ? "Reiniciar nivel" : "Nueva partida", clase: "b-azul", alElegir: () => { pausado = false; empezar(nivel); } }],
  alSalir: () => { pausado = false; pintarMenu(); mostrar("menu"); },
  ayudaSalir: "Se pierde la partida en curso",
});
btnMenu.addEventListener("click", () => { if (pantalla === "mapa") { pintarMenu(); mostrar("menu"); } }); // en el mapa, ☰ = «Menú principal»

pintarMenu();
mostrar("menu");
