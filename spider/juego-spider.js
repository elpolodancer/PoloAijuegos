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
// Barra superior: colecc = palo de cada serie terminada (en orden); mostradas = cuántas ya llegaron a la barra (las demás van volando)
let vistos = new Set(); // posiciones por las que ya pasó la partida (para no sugerir volver a ellas)
let colecc = [], mostradas = 0, fantasmas = [], animTimers = [], finAnim = 0, tb = tamBarra(34, 48, 0);
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
  colecc = []; cancelarAnim(); vistos = new Set([clave(e)]);
  mostrar("juego");
}
function jugar(fn, op) { // op = qué jugada es ({de,k,a} o {rep:true}); sirve para animar las series que se completen
  if (DIFICULTADES[e.dif - 1].deshacer) { historial.push(clonar(e)); if (historial.length > 300) historial.shift(); }
  if (!t0) t0 = Date.now();
  const antes = clonar(e);
  fn(); sel = null; vistos.add(clave(e)); pintar();
  if (e.hechos > antes.hechos && op) animarSeries(antes, op); // serie terminada: sus 13 cartas viajan a la barra
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
  const espera = finAnim > Date.now() ? finAnim - Date.now() + 250 : 0; // deja terminar el viaje de la última serie
  setTimeout(() => document.body.appendChild(f), espera);
}

// ---------- Dibujo ----------
function tramoValido(c, i) { return i >= e.ocultas[c] && e.cols[c].length - i <= largoTramo(e, c); }
// ---------- Barra superior del tablero: series terminadas (izquierda) y mazo de repartos (derecha) ----------
// Línea de tiempo de una serie terminada (ms). El brillo dura TODO el tiempo:
//  1) SALTO de todas las cartas a la vez · 2) OLA «de piano»: salta una por una de la A (la última) al K (la primera)
//  3) TRASLADO: flotan una por una hasta su lugar de la fila de arriba · 4) SALTO al llegar. Luego se apaga el brillo.
const T_SALTO = 500, T_PASO = 25, T_HOP = 200, T_TRASLADO = 900, T_SALIDA = 70, T_LLEGADA = 500;
const T_OLA = 12 * T_PASO + T_HOP; // 500: lo que tarda la ola de la A al K
const T_TOTAL = T_SALTO + T_OLA + 12 * T_SALIDA + T_TRASLADO + T_LLEGADA; // 3240
const contenido = (carta, w) => NOMBRE_RANGO[rango(carta)] + SIMB[palo(carta)] + '<span class="pl" style="font-size:' + w * 0.5 + 'px">' + SIMB[palo(carta)] + "</span>";
// Cartas de la fila superior: MISMO tamaño que las de la partida y mismos límites que las columnas (izq = borde izquierdo de la 1.ª columna).
// Las series terminadas se encimen un poco (paso < ancho), de izquierda a derecha.
function tamBarra(w, h, x0) {
  return { cw: w, ch: h, paso: Math.round(w * 0.62), izq: x0, top: 0 };
}
// Medidas de la mesa. También ajusta el alto de la barra (según el tamaño de las cartas); la mesa se queda con el alto que sobra
function medidas() {
  const m = $("mesa"), W = m.clientWidth, gap = Math.max(2, W * 0.008);
  const w = Math.max(24, Math.min(84, (W - gap * 9) / 10)), h = w * 1.4, x0 = Math.max(0, (W - (w * 10 + gap * 9)) / 2);
  const barra = $("barra");
  barra.style.height = Math.round(h) + "px"; // la fila superior mide lo que una carta
  tb = tamBarra(w, h, x0);
  barra.style.setProperty("--cw", w + "px"); barra.style.setProperty("--ch", h + "px");
  barra.style.setProperty("--x9", x0 + 9 * (w + gap) + "px"); // el mazo queda justo sobre la última columna
  return { W, H: m.clientHeight, gap, w, h, x0 };
}
// y de cada carta de una columna (misma cuenta que usa pintar)
function posiciones(cartas, o, h, H) {
  const total = h + o * 0.13 * h + Math.max(0, cartas.length - o - 1) * 0.3 * h;
  const f = total > H ? Math.max(0.35, (H - h) / (total - h)) : 1;
  const ys = []; let y = 0;
  cartas.forEach((_, i) => { ys.push(y); y += (i < o ? 0.13 : 0.3) * h * f; });
  return ys;
}
// Series ya terminadas: un montoncito por serie (muestra el K), de izquierda a derecha, cada uno encimado en el anterior
function pintarBarra() {
  const caja = $("series"); caja.replaceChildren();
  for (let i = 0; i < mostradas; i++) {
    const p = colecc[i], d = document.createElement("div");
    d.className = "carta pila" + (ROJO[p] ? " roja" : "");
    d.style.cssText = "left:" + (tb.izq + i * tb.paso) + "px;top:" + tb.top + "px;width:" + tb.cw + "px;height:" + tb.ch + "px;font-size:" + Math.max(10, tb.cw * 0.3) + "px";
    d.innerHTML = contenido(p * 13 + 12, tb.cw);
    caja.appendChild(d);
  }
}
// Reconstruye lo que pasó en la jugada ANTES de que se quitara la serie (la lógica la quita al instante): devuelve, por cada serie
// terminada, { c: columna, cartas: las 13 (K…A), todas: la columna completa, o: cuántas boca abajo }
function seriesQuitadas(antes, op) {
  const cols = antes.cols.map((c) => c.slice()), oc = antes.ocultas, r = [];
  let revisar;
  if (op.rep) { for (let c = 0; c < cols.length; c++) cols[c].push(antes.reparto[antes.rep * cols.length + c]); revisar = cols.map((_, c) => c); }
  else { const t = cols[op.de].splice(cols[op.de].length - op.k, op.k); cols[op.a].push(...t); revisar = [op.a]; }
  for (const c of revisar) {
    const col = cols[c], n = col.length;
    if (n < 13 || n - 13 < oc[c] || rango(col[n - 1]) !== 0) continue;
    let ok = true;
    for (let i = 1; i < 13 && ok; i++) ok = palo(col[n - 1 - i]) === palo(col[n - 1]) && rango(col[n - 1 - i]) === i;
    if (ok) r.push({ c, cartas: col.slice(n - 13), todas: col, o: oc[c] });
  }
  return r;
}
// Detiene y limpia las animaciones en curso (al deshacer o empezar otra partida): las series ya cuentan como llegadas
function cancelarAnim() {
  animTimers.forEach((t) => { clearTimeout(t); clearInterval(t); }); animTimers = [];
  fantasmas.forEach((g) => g.remove()); fantasmas = [];
  $("tablero").querySelectorAll(".chispa").forEach((c) => c.remove());
  finAnim = 0; mostradas = colecc.length; pintarBarra();
}
// Todos los movimientos de UNA carta de la serie en una sola animación (i = 0 es el K … 12 es la A). dx, dy = hasta dónde viaja.
function fotogramas(i, dx, dy, h) {
  const jh = h * 0.35, wh = h * 0.18, arco = h * 0.5, z0 = 20 + i, z1 = 100 - i; // z1: al despegar pasa por encima; el K (último) queda arriba
  const tf = (x, y, r, s) => "translate(" + x + "px," + y + "px) rotate(" + r + "deg) scale(" + s + ")";
  const sube = "cubic-bezier(.2,.7,.4,1)", baja = "cubic-bezier(.6,0,.9,.5)";
  const f = [];
  const k = (t, transform, zIndex, easing = "linear") => f.push({ offset: Math.min(1, t / T_TOTAL), transform, zIndex, easing });
  k(0, tf(0, 0, 0, 1), z0, sube);                                  // 1) salto de todas
  k(T_SALTO * 0.4, tf(0, -jh, 0, 1.06), z0, baja);
  k(T_SALTO, tf(0, 0, 0, 1), z0);
  const w0 = T_SALTO + (12 - i) * T_PASO;                          // 2) ola de piano: la A primero, el K al final
  k(w0, tf(0, 0, 0, 1), z0, sube);
  k(w0 + T_HOP * 0.45, tf(0, -wh, i % 2 ? 4 : -4, 1.08), z0, baja);
  k(w0 + T_HOP, tf(0, 0, 0, 1), z0);
  const td = T_SALTO + T_OLA + (12 - i) * T_SALIDA;                // 3) traslado una por una (la A sale primero)
  const tl = T_SALTO + T_OLA + 12 * T_SALIDA + T_TRASLADO;         //    todas han llegado cuando llega el K
  k(td, tf(0, 0, 0, 1), z0);
  k(td + 1, tf(0, 0, 0, 1), z1);
  for (let q = 1; q <= 8; q++) {                                   // arranca y frena despacio, con un arco hacia arriba a media vuelta
    const u = q / 8, s = u * u * (3 - 2 * u), b = 4 * s * (1 - s);
    k(td + u * T_TRASLADO, tf(dx * s, dy * s - arco * b, 0, 1 + 0.05 * b), z1);
  }
  k(tl, tf(dx, dy, 0, 1), z1, sube);                               // 4) salto al llegar (la fila entera)
  k(tl + T_LLEGADA * 0.4, tf(dx, dy - jh, 0, 1.06), z1, baja);
  k(T_TOTAL, tf(dx, dy, 0, 1), z1);
  return f;
}
// Una chispa de brillo en (x, y) del tablero: sube, gira, se encoge y se desvanece
function chispa(tablero, x, y) {
  const p = document.createElement("div"), t = 5 + Math.random() * 8;
  p.className = "chispa" + (Math.random() < 0.5 ? " estrella" : "");
  p.style.cssText = "left:" + (x - t / 2) + "px;top:" + (y - t / 2) + "px;width:" + t + "px;height:" + t + "px";
  tablero.appendChild(p);
  const dx = (Math.random() - 0.5) * 36, dy = -(8 + Math.random() * 30), giro = (Math.random() - 0.5) * 240;
  const a = p.animate([
    { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
    { transform: "translate(" + dx + "px," + dy + "px) rotate(" + giro + "deg) scale(.2)", opacity: 0 },
  ], { duration: 500 + Math.random() * 450, easing: "ease-out", fill: "forwards" });
  a.onfinish = () => p.remove();
}
// Suelta chispas desde donde están ahora las cartas (quietas o en pleno vuelo): así dejan estela al viajar
function chispear(gs) {
  const tablero = $("tablero"), tr = tablero.getBoundingClientRect();
  for (let q = 0; q < 3; q++) {
    const r = gs[(Math.random() * gs.length) | 0].getBoundingClientRect();
    chispa(tablero, r.left - tr.left + Math.random() * r.width, r.top - tr.top + Math.random() * r.height);
  }
}
// Al terminar una serie sus 13 cartas se iluminan (trazo + chispas durante todo el efecto), saltan, hacen la ola de piano y viajan
// flotando, una por una, a su lugar de la fila de arriba (de izquierda a derecha), donde vuelven a saltar. Con «reducir movimiento»
// (o sin animaciones del navegador) la serie aparece directo.
function animarSeries(antes, op) {
  const lista = seriesQuitadas(antes, op);
  const quieto = !Element.prototype.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { H, gap, w, h, x0 } = medidas(), letra = Math.max(10, w * 0.3);
  const tablero = $("tablero"), m = $("mesa"), bo = $("barra");
  let dur = 0;
  lista.forEach((s, k) => {
    const idx = colecc.length;
    colecc.push(palo(s.cartas[0]));
    if (quieto) return;
    const n = s.todas.length, ys = posiciones(s.todas, s.o, h, H), x = m.offsetLeft + x0 + s.c * (w + gap);
    const gs = s.cartas.map((carta, i) => { // i = 0 es el K
      const g = document.createElement("div"), y = m.offsetTop + ys[n - 13 + i];
      g.className = "carta fantasma brillo" + (ROJO[palo(carta)] ? " roja" : "");
      g.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px;font-size:" + letra + "px;z-index:" + (20 + i);
      g.innerHTML = contenido(carta, w);
      tablero.appendChild(g);
      const dx = bo.offsetLeft + tb.izq + idx * tb.paso - x, dy = bo.offsetTop + tb.top - y;
      g.animate(fotogramas(i, dx, dy, h), { duration: T_TOTAL, delay: k * 450, fill: "both" });
      return g;
    });
    fantasmas.push(...gs);
    const total = k * 450 + T_TOTAL;
    dur = Math.max(dur, total);
    animTimers.push(setTimeout(() => { // chispas durante todo el efecto
      const t = setInterval(() => chispear(gs), 55);
      animTimers.push(t, setTimeout(() => clearInterval(t), T_TOTAL));
    }, k * 450));
    animTimers.push(setTimeout(() => gs.forEach((g) => g.classList.add("apagando")), total - 300)); // el brillo se apaga al final
    animTimers.push(setTimeout(() => { // llegó: se quitan las cartas voladoras y el montoncito queda en la fila
      gs.forEach((g) => g.remove()); fantasmas = fantasmas.filter((g) => !gs.includes(g));
      mostradas = Math.min(colecc.length, mostradas + 1); pintarBarra();
    }, total));
  });
  while (colecc.length < e.hechos) colecc.push(0); // por si la reconstrucción no halló alguna: que la cuenta siempre cuadre
  if (quieto) mostradas = colecc.length;
  else { finAnim = Math.max(finAnim, Date.now() + dur); animTimers.push(setTimeout(() => { mostradas = colecc.length; pintarBarra(); }, dur + 20)); }
  pintarBarra();
}

function pintar() {
  if (!e) return;
  const m = $("mesa"); m.replaceChildren();
  const { H, gap, w, h, x0 } = medidas(); // también deja listo el alto de la barra
  pintarBarra();
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
      if (!oculta) d.innerHTML = contenido(carta, w);
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

// Huella de una posición (no depende del orden de las columnas): sirve para saber si una jugada nos regresa a algo que ya pasó
function clave(x) {
  return x.cols.map((c, i) => x.ocultas[i] + ":" + c.join(",")).sort().join("|") + "#" + x.rep + "," + x.hechos;
}
// ¿Mover el tramo de la columna j.de a la j.a es un BUCLE (no avanza nada)? Pasa cuando el tramo ya está sobre una carta que le sirve
// (p. ej. 10-9-8-7-6 ya sobre una J) y se pasa a otra J igual: solo vale la pena si junta el palo o arma una escalera más larga.
// n = estado después de la jugada. (Las que quitan serie, destapan una carta o vacían la columna siempre avanzan.)
function esBucle(e, j, n) {
  if (n.hechos > e.hechos || j.rev || j.vacia) return false;
  const col = e.cols[j.de], base = col[col.length - j.k], x = col[col.length - j.k - 1];
  if (x === undefined || rango(x) !== rango(base) + 1) return false; // estaba sobre una carta que NO le correspondía: acomodarla sí mejora
  return !(largoTramo(n, j.a) > Math.max(largoTramo(e, j.de), largoTramo(e, j.a)));
}

// Pista tras 15 s sin tocar nada. Se ignoran los bucles (esBucle) y las jugadas que regresan a una posición ya vista. Orden: 1) un movimiento que sirve (quita serie, destapa, junta mismo palo),
// 2) si no hay, parpadea «Repartir» en amarillo oscuro, 3) si tampoco se puede repartir, un movimiento menor (p. ej. a columna vacía).
function calcularPista() {
  ultimaAccion = Date.now(); // si no hay nada que sugerir, vuelve a intentarlo en 15 s
  let mejor = null, pm = 0, otra = null, po = 0;
  for (const j of jugadas(e)) {
    const n = clonar(e); mover(n, j.de, j.k, j.a);
    if (vistos.has(clave(n)) || esBucle(e, j, n)) continue; // bucle: no se sugiere
    const util = n.hechos > e.hechos || j.rev || j.mismo;
    const p = (n.hechos > e.hechos ? 1000 : 0) + (j.rev ? 200 : 0) + (j.mismo ? 40 + j.k : 0) + (j.vacia ? 5 : 1);
    if (util) { if (p > pm) { pm = p; mejor = j; } }
    else if (p > po) { po = p; otra = j; }
  }
  const j = mejor || (puedeRepartir(e) ? null : otra);
  if (j) { pista = { tipo: "mover", de: j.de, desde: e.cols[j.de].length - j.k, a: j.a }; aviso("💡 Pista: mira el recuadro verde"); }
  else if (puedeRepartir(e)) { pista = { tipo: "repartir" }; aviso("🃏 Solo quedan movimientos que dan vueltas: toca Repartir"); }
  else { aviso(e.rep < 5 ? "Llena las columnas vacías para poder repartir" : "Ya no hay movimientos posibles"); return; }
  pintar();
}

function tocar(c, i) {
  if (fin || pausado) return;
  actividad();
  if (sel) {
    if (sel.c !== c) {
      const k = e.cols[sel.c].length - sel.i;
      if (puedeMover(e, sel.c, k, c)) { const de = sel.c; jugar(() => mover(e, de, k, c), { de, k, a: c }); return; }
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
  jugar(() => repartir(e), { rep: true });
});
$("b-deshacer").addEventListener("click", () => { if (fin || pausado || !historial.length) return; actividad(); cancelarAnim(); e = historial.pop(); colecc.length = Math.min(colecc.length, e.hechos); mostradas = colecc.length; sel = null; pintar(); });
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
