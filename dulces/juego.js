// Ruta: dulces/juego.js (pantalla del juego «dulces», estilo Candy Crush). Las reglas están en logica.js y los niveles en niveles.js
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";
import { crearEstado, jugada, todasJugadas, instantanea, estrellas } from "./logica.js";
import { nivel, TOTAL } from "./niveles.js";

const ID = "dulces"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---- Ajustes ----
const PUNTOS_POR_PERFIL = 50; // al perfil se envía 1 punto por cada 50 del juego (aquí los puntajes son miles; en los otros juegos, decenas)
const SEG_PISTA = 6; // segundos sin jugar antes de mostrar una pista
const MS = { cambio: 200, pop: 280, efecto: 320 }; // velocidad de las animaciones (milisegundos)
const CLAVE_PROGRESO = "dulces-progreso"; // dónde se guardan las estrellas en este navegador

const COLORES = ["#ff4d5e", "#ff9f2e", "#ffe14a", "#3ddc6b", "#3aa0ff", "#b05cff"];
const ELOGIOS = ["", "", "¡Dulce!", "¡Sabroso!", "¡Delicioso!", "¡Divino!"];
const ESCALA = [523, 587, 659, 784, 880, 1047, 1175, 1319];

const $ = (id) => document.getElementById(id);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
function h(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}
const pos = (r, c) => "translate(calc(var(--t) * " + c + "), calc(var(--t) * " + r + "))";
const centro = (v) => "calc(var(--t) * " + (v + 0.5) + ")";

const mapa = $("mapa"), juego = $("juego"), tablero = $("tablero"), fondo = $("fondo"), capa = $("dulces"), efectos = $("efectos");
const marco = $("marco"), aviso = $("aviso"), estado = $("estado"), modalEl = $("modal"), panel = $("panel");

let E = null, def = null, T = 40, bloqueado = true, sel = null, arrastre = null, usuario = null, guardado = true, pistaT = null, avisoT = null;
const el = new Map(); // id del dulce → su elemento
const gelEl = new Map(); // «r,c» → elemento de gelatina
let refs = null; // piezas del panel de objetivo

// ---- Sonido (se crea al primer toque) ----
let ac = null, mudo = false;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === "suspended") ac.resume();
  return ac;
}
function tono(freq, dur = 0.12, tipo = "sine", vol = 0.12, retraso = 0) {
  if (mudo) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + retraso, o = a.createOscillator(), g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
$("sonido").addEventListener("click", () => { mudo = !mudo; $("sonido").textContent = mudo ? "🔇" : "🔊"; });

// ---- Sesión ----
alCambiarSesion((u) => {
  usuario = u;
  $("entrar").hidden = !!u;
  $("entrarMapa").hidden = !!u;
  if (!E) estado.textContent = u ? "" : "Sin sesión: tus puntos no se guardan.";
});
for (const id of ["entrar", "entrarMapa"]) $(id).addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));
async function guardarPuntos() {
  if (guardado || !E) return;
  guardado = true;
  const n = Math.round(E.puntos / PUNTOS_POR_PERFIL);
  if (!usuario || !(n > 0)) return;
  try { await sumarPuntos(ID, n); estado.textContent = "Se guardaron " + n + " puntos en tu perfil ✓"; }
  catch (e) { estado.textContent = "No se pudieron guardar los puntos (" + e.message + ")"; }
}

// ---- Progreso (estrellas por nivel, en este navegador) ----
function leerProgreso() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {}; } catch (e) { return {}; }
}
function guardarProgreso(n, e) {
  try {
    const p = leerProgreso();
    if ((p[n] || 0) < e) p[n] = e;
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(p));
  } catch (err) { /* sin almacenamiento: el juego sigue, solo no recuerda las estrellas */ }
}

// ---- Mapa de niveles ----
async function mostrarMapa() {
  await guardarPuntos();
  clearTimeout(pistaT);
  modalEl.hidden = true;
  juego.hidden = true; mapa.hidden = false;
  const p = leerProgreso();
  let ultimo = 0, total = 0;
  for (let n = 1; n <= TOTAL; n++) if (p[n]) { ultimo = Math.max(ultimo, n); total += p[n]; }
  $("resumen").textContent = "Estrellas: " + total + " / " + TOTAL * 3;
  const lista = $("niveles");
  lista.innerHTML = "";
  for (let n = 1; n <= TOTAL; n++) {
    const b = h("button", "nivel" + (p[n] ? " hecho" : ""));
    b.type = "button";
    b.disabled = n > ultimo + 1;
    b.append(h("span", "", String(n)), h("small", "", p[n] ? "★".repeat(p[n]) + "☆".repeat(3 - p[n]) : b.disabled ? "🔒" : ""));
    b.addEventListener("click", () => iniciarNivel(n));
    lista.appendChild(b);
  }
}

// ---- Panel superior ----
function icono(t) { const f = h("div", "forma c" + t); return f; }
function construirHUD() {
  $("nnivel").textContent = String(def.n);
  const caja = $("objetivo");
  caja.innerHTML = "";
  caja.appendChild(h("small", "", "Objetivo"));
  const metas = h("div", "metas");
  const o = def.objetivo;
  refs = { tipo: o.tipo };
  if (o.tipo === "puntos") {
    refs.meta = h("span", "", o.meta.toLocaleString("es") + " pts");
    metas.appendChild(refs.meta);
  } else if (o.tipo === "gelatina") {
    refs.gel = h("span", "", "0");
    const m = h("div", "meta");
    m.append(h("div", "gelito"), refs.gel);
    metas.appendChild(m);
  } else {
    refs.items = o.items.map((it) => {
      const m = h("div", "meta"), n = h("span", "", String(it.cant));
      m.append(icono(it.t), n);
      metas.appendChild(m);
      return { t: it.t, cant: it.cant, n, m };
    });
  }
  caja.appendChild(metas);
  // Barra de puntos con 3 estrellas
  const barra = $("barra");
  barra.querySelectorAll(".marca").forEach((m) => m.remove());
  const [e1, e2, e3] = def.estrellas;
  refs.marcas = [e1, e2, e3].map((v) => {
    const m = h("div", "marca", "★");
    m.style.left = Math.min(100, (v / e3) * 100) + "%";
    barra.appendChild(m);
    return { v, m };
  });
}
function actualizarHUD(s) {
  $("movs").textContent = String(s.movs);
  $("movs").classList.toggle("poco", s.movs > 0 && s.movs <= 5);
  $("puntos").textContent = s.puntos.toLocaleString("es");
  $("relleno").style.width = Math.min(100, (s.puntos / def.estrellas[2]) * 100) + "%";
  refs.marcas.forEach((x) => x.m.classList.toggle("on", s.puntos >= x.v));
  if (refs.tipo === "gelatina") refs.gel.textContent = String(s.gel);
  if (refs.tipo === "recoger") {
    refs.items.forEach((it) => {
      const falta = Math.max(0, it.cant - (s.recogido[it.t] || 0));
      it.n.textContent = falta ? String(falta) : "✓";
      it.m.classList.toggle("listo", falta === 0);
    });
  }
}

// ---- Tablero ----
function ajustarTamano() {
  if (!E || juego.hidden) return;
  const ancho = Math.min(marco.clientWidth || 360, 520);
  const alto = Math.max(240, window.innerHeight - 300);
  T = Math.max(28, Math.floor(Math.min(ancho / E.c, alto / E.f)));
  tablero.style.setProperty("--t", T + "px");
  tablero.style.width = T * E.c + "px";
  tablero.style.height = T * E.f + "px";
  // Los dulces solo se ven dentro de las casillas (los que caen desde arriba no cruzan los huecos del molde)
  const m = Math.round(T * 0.1), L = T + 2 * m;
  let d = "";
  for (let r = 0; r < E.f; r++) for (let c = 0; c < E.c; c++) if (E.act[r][c]) d += "M" + (c * T - m) + " " + (r * T - m) + "h" + L + "v" + L + "h" + -L + "z";
  capa.style.clipPath = 'path(nonzero, "' + d + '")';
}
window.addEventListener("resize", ajustarTamano);

function aplicarForma(f, t, e) { f.className = "forma" + (e === "b" ? " e-b" : " c" + t + (e ? " e-" + e : "")); }
function crearDulce(x, r, c) {
  const d = h("div", "dulce");
  d.dataset.t = String(x.t);
  d.style.transform = pos(r, c);
  const f = h("div", "forma");
  aplicarForma(f, x.t, x.e);
  d.appendChild(f);
  capa.appendChild(d);
  el.set(x.id, d);
  return d;
}
function dibujarTodo() {
  fondo.innerHTML = ""; capa.innerHTML = ""; efectos.innerHTML = "";
  el.clear(); gelEl.clear();
  ajustarTamano();
  for (let r = 0; r < E.f; r++) {
    for (let c = 0; c < E.c; c++) {
      if (!E.act[r][c]) continue;
      const celda = h("div", "celda" + ((r + c) % 2 ? " p" : ""));
      celda.style.transform = pos(r, c);
      if (E.gel[r][c] > 0) {
        const g = h("div", "gel g" + E.gel[r][c]);
        celda.appendChild(g);
        gelEl.set(r + "," + c, g);
      }
      fondo.appendChild(celda);
      if (E.tab[r][c]) crearDulce(E.tab[r][c], r, c);
    }
  }
}
function actualizarGel(r, c, n) {
  const g = gelEl.get(r + "," + c);
  if (!g) return;
  if (n <= 0) { g.classList.add("rompe"); gelEl.delete(r + "," + c); setTimeout(() => g.remove(), 420); }
  else g.className = "gel g" + n;
}

// ---- Ventanas ----
function modal(titulo, nodos, botones) {
  return new Promise((res) => {
    panel.innerHTML = "";
    panel.appendChild(h("h2", "", titulo));
    nodos.forEach((n) => panel.appendChild(n));
    const caja = h("div", "botones");
    botones.forEach((b) => {
      const bt = h("button", "btn grande" + (b.sec ? " sec" : ""), b.texto);
      bt.type = "button";
      bt.addEventListener("click", () => { modalEl.hidden = true; res(b.id); });
      caja.appendChild(bt);
    });
    panel.appendChild(caja);
    modalEl.hidden = false;
  });
}
function textoObjetivo() {
  const o = def.objetivo, nodos = [];
  if (o.tipo === "puntos") nodos.push(h("p", "", "Consigue " + o.meta.toLocaleString("es") + " puntos"));
  else if (o.tipo === "gelatina") {
    nodos.push(h("p", "", "Quita toda la gelatina"));
    const m = h("div", "metas"); m.appendChild(h("div", "gelito")); nodos.push(m);
  } else {
    nodos.push(h("p", "", "Junta estos dulces"));
    const m = h("div", "metas");
    o.items.forEach((it) => { const x = h("div", "meta"); x.append(icono(it.t), h("span", "", String(it.cant))); m.appendChild(x); });
    nodos.push(m);
  }
  nodos.push(h("p", "", "en " + def.movs + " movimientos"));
  return nodos;
}

// ---- Empezar un nivel ----
async function iniciarNivel(n) {
  await guardarPuntos();
  bloqueado = true;
  clearTimeout(pistaT);
  def = nivel(n);
  E = crearEstado(def);
  guardado = false; sel = null; arrastre = null;
  mapa.hidden = true; juego.hidden = false;
  estado.textContent = usuario ? "" : "Sin sesión: tus puntos no se guardan.";
  construirHUD();
  dibujarTodo();
  actualizarHUD(instantanea(E));
  await modal("Nivel " + n, textoObjetivo(), [{ id: "ok", texto: "¡Jugar!" }]);
  bloqueado = false;
  armarPista();
}
$("reiniciar").addEventListener("click", () => { if (def) iniciarNivel(def.n); });
$("atras").addEventListener("click", mostrarMapa);

// ---- Pistas ----
function limpiarPista() { clearTimeout(pistaT); capa.querySelectorAll(".pista").forEach((d) => d.classList.remove("pista")); }
function armarPista() {
  clearTimeout(pistaT);
  pistaT = setTimeout(() => {
    if (bloqueado || !E || E.fin) return;
    const js = todasJugadas(E);
    if (!js.length) return;
    js[Math.floor(Math.random() * js.length)].forEach((p) => { const x = E.tab[p.r][p.c]; if (x && el.get(x.id)) el.get(x.id).classList.add("pista"); });
  }, SEG_PISTA * 1000);
}

// ---- Entrada: deslizar un dulce o tocar dos juntos ----
function celdaDe(ev) {
  const rc = tablero.getBoundingClientRect();
  const c = Math.floor((ev.clientX - rc.left) / T), r = Math.floor((ev.clientY - rc.top) / T);
  return r >= 0 && c >= 0 && r < E.f && c < E.c && E.act[r][c] ? { r, c } : null;
}
function ponerSel(p) {
  quitarSel();
  sel = p;
  const x = E.tab[p.r][p.c];
  if (x && el.get(x.id)) el.get(x.id).classList.add("sel");
}
function quitarSel() { capa.querySelectorAll(".sel").forEach((d) => d.classList.remove("sel")); sel = null; }
const juntos = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

tablero.addEventListener("pointerdown", (ev) => {
  if (bloqueado || !E || E.fin) return;
  const p = celdaDe(ev);
  if (!p || !E.tab[p.r][p.c]) return;
  audio();
  limpiarPista();
  if (sel && sel.r === p.r && sel.c === p.c) { quitarSel(); return; }
  if (sel && juntos(sel, p)) { const a = sel; quitarSel(); intentar(a, p); return; }
  ponerSel(p);
  arrastre = { x: ev.clientX, y: ev.clientY, p };
  try { tablero.setPointerCapture(ev.pointerId); } catch (e) { /* no pasa nada */ }
});
tablero.addEventListener("pointermove", (ev) => {
  if (!arrastre || bloqueado) return;
  const dx = ev.clientX - arrastre.x, dy = ev.clientY - arrastre.y;
  if (Math.hypot(dx, dy) < T * 0.35) return;
  const a = arrastre.p;
  const b = Math.abs(dx) > Math.abs(dy) ? { r: a.r, c: a.c + Math.sign(dx) } : { r: a.r + Math.sign(dy), c: a.c };
  arrastre = null;
  quitarSel();
  if (b.r >= 0 && b.c >= 0 && b.r < E.f && b.c < E.c && E.act[b.r][b.c] && E.tab[b.r][b.c]) intentar(a, b);
});
for (const t of ["pointerup", "pointercancel"]) tablero.addEventListener(t, () => { arrastre = null; });

// ---- Una jugada: la lógica la calcula toda y aquí se reproduce paso a paso ----
async function intentar(a, b) {
  if (bloqueado) return;
  bloqueado = true;
  limpiarPista();
  const idA = E.tab[a.r][a.c].id, idB = E.tab[b.r][b.c].id;
  const res = jugada(E, a, b);
  if (!res.valida) {
    tono(170, 0.14, "square", 0.05);
    el.get(idA).style.transitionDuration = ""; el.get(idB).style.transitionDuration = "";
    el.get(idA).style.transform = pos(b.r, b.c);
    el.get(idB).style.transform = pos(a.r, a.c);
    await dormir(MS.cambio);
    el.get(idA).style.transform = pos(a.r, a.c);
    el.get(idB).style.transform = pos(b.r, b.c);
    el.get(idA).classList.add("sacude"); el.get(idB).classList.add("sacude");
    await dormir(MS.cambio + 60);
    el.get(idA).classList.remove("sacude"); el.get(idB).classList.remove("sacude");
    bloqueado = false;
    armarPista();
    return;
  }
  await reproducir(res.pasos);
  actualizarHUD(instantanea(E));
  if (res.fin) { await terminar(res.fin); return; }
  bloqueado = false;
  armarPista();
}
async function reproducir(pasos) {
  for (const p of pasos) {
    if (p.tipo === "swap") await pasoCambio(p);
    else if (p.tipo === "ronda") await pasoRonda(p);
    else if (p.tipo === "conversion") await pasoConversion(p);
    else if (p.tipo === "barajar") await pasoBarajar(p);
  }
}
async function pasoCambio(p) {
  tono(330, 0.06, "triangle", 0.08);
  el.get(p.idA).style.transitionDuration = ""; el.get(p.idB).style.transitionDuration = "";
  el.get(p.idA).style.transform = pos(p.b.r, p.b.c);
  el.get(p.idB).style.transform = pos(p.a.r, p.a.c);
  $("movs").textContent = String(p.movs);
  await dormir(MS.cambio);
}
async function pasoRonda(p) {
  // 1. Efectos de los dulces especiales (rayos, explosiones...)
  const idEn = new Map(p.borrados.map((b) => [b.r * 100 + b.c, b.id]));
  p.efectos.forEach((ef) => efectoUI(ef, idEn));
  if (p.efectos.length) { tono(220, 0.35, "sawtooth", 0.07); await dormir(MS.efecto); }
  if (p.cascada >= 2) mostrarAviso(ELOGIOS[Math.min(p.cascada, 5)]);
  // 2. Se borran las parejas
  tono(ESCALA[Math.min(p.cascada, ESCALA.length - 1)], 0.16, "triangle", 0.13);
  p.borrados.forEach((b) => explotar(b, p.borrados.length > 24 ? 2 : 4));
  p.gelCambios.forEach((g) => actualizarGel(g.r, g.c, g.n));
  if (p.ganado > 0) etiqueta(p.etiqueta.r, p.etiqueta.c, "+" + p.ganado);
  actualizarHUD(p);
  await dormir(MS.pop);
  p.borrados.forEach((b) => { const d = el.get(b.id); if (d) { d.remove(); el.delete(b.id); } });
  // 3. Nacen los especiales y todo cae
  p.creados.forEach((x) => {
    const d = crearDulce(x, x.r, x.c);
    d.firstChild.classList.add("aparece");
  });
  if (p.creados.length) [0, 4, 7].forEach((i, k) => tono(ESCALA[i] * 1.5, 0.12, "sine", 0.1, k * 0.07));
  let mayor = 0;
  p.caidas.forEach((m) => {
    const d = el.get(m.id);
    const dur = 0.16 + 0.055 * (m.a - m.de);
    mayor = Math.max(mayor, dur);
    d.style.transitionDuration = dur + "s";
    d.style.transform = pos(m.a, m.c);
  });
  const entran = p.nuevos.map((n) => {
    const d = crearDulce(n, n.de, n.c);
    d.style.transition = "none";
    return { n, d };
  });
  if (entran.length) void capa.offsetWidth; // fija la posición de salida antes de animar
  entran.forEach(({ n, d }) => {
    const dur = 0.16 + 0.055 * (n.a - n.de);
    mayor = Math.max(mayor, dur);
    d.style.transition = "";
    d.style.transitionDuration = dur + "s";
    d.style.transform = pos(n.a, n.c);
  });
  await dormir(mayor * 1000 + 60);
  capa.querySelectorAll(".flash").forEach((d) => d.classList.remove("flash"));
}
async function pasoConversion(p) {
  mostrarAviso("¡Bono de movimientos!");
  p.items.forEach((it, i) => {
    const d = el.get(it.id);
    if (!d) return;
    aplicarForma(d.firstChild, Number(d.dataset.t || 0), it.e);
    d.firstChild.classList.add("aparece");
    tono(ESCALA[i % 8] * 2, 0.1, "sine", 0.08, i * 0.05);
  });
  await dormir(650);
}
async function pasoBarajar(p) {
  mostrarAviso("¡Sin jugadas! Mezclando…");
  tono(260, 0.4, "sawtooth", 0.06);
  await dormir(500);
  p.pos.forEach((x) => { const d = el.get(x.id); if (d) { d.style.transitionDuration = "0.55s"; d.style.transform = pos(x.r, x.c); } });
  await dormir(700);
  capa.querySelectorAll(".dulce").forEach((d) => { d.style.transitionDuration = ""; });
}

// ---- Efectos visuales ----
function limpiarLuego(n, ms) { setTimeout(() => n.remove(), ms); }
function explotar(b, cuantas) {
  const d = el.get(b.id);
  if (!d) return;
  d.firstChild.classList.add("pop");
  const col = b.t >= 0 ? COLORES[b.t] : "#fff";
  for (let i = 0; i < cuantas; i++) {
    const s = h("div", "chispa"), a = Math.random() * 6.283, r = 0.5 + Math.random() * 0.7;
    s.style.left = centro(b.c); s.style.top = centro(b.r);
    s.style.setProperty("--col", col);
    s.style.setProperty("--dx", "calc(var(--t) * " + (Math.cos(a) * r).toFixed(2) + ")");
    s.style.setProperty("--dy", "calc(var(--t) * " + (Math.sin(a) * r).toFixed(2) + ")");
    efectos.appendChild(s);
    limpiarLuego(s, 520);
  }
}
function etiqueta(r, c, texto) {
  const e = h("div", "etq", texto);
  e.style.left = centro(c); e.style.top = centro(r);
  efectos.appendChild(e);
  limpiarLuego(e, 950);
}
function mostrarAviso(texto) {
  if (!texto) return;
  clearTimeout(avisoT);
  aviso.textContent = texto;
  aviso.classList.remove("ver");
  void aviso.offsetWidth;
  aviso.classList.add("ver");
  avisoT = setTimeout(() => aviso.classList.remove("ver"), 1100);
}
function efectoUI(ef, idEn) {
  let n;
  if (ef.tipo === "fila") { n = h("div", "rayo f"); n.style.top = "calc(var(--t) * " + (ef.r + 0.275) + ")"; }
  else if (ef.tipo === "columna") { n = h("div", "rayo c"); n.style.left = "calc(var(--t) * " + (ef.c + 0.275) + ")"; }
  else if (ef.tipo === "explosion") {
    n = h("div", "anillo");
    n.style.left = centro(ef.c); n.style.top = centro(ef.r);
    n.style.width = n.style.height = "calc(var(--t) * " + (2 * ef.radio + 1) + ")";
  } else if (ef.tipo === "color") {
    ef.destinos.forEach((d) => {
      const z = h("div", "zap"), dx = d.c - ef.c, dy = d.r - ef.r;
      z.style.left = centro(ef.c); z.style.top = centro(ef.r);
      z.style.width = "calc(var(--t) * " + Math.hypot(dx, dy).toFixed(2) + ")";
      z.style.setProperty("--ang", Math.atan2(dy, dx) + "rad");
      efectos.appendChild(z);
      limpiarLuego(z, 600);
      const id = idEn.get(d.r * 100 + d.c);
      if (id && el.get(id)) el.get(id).classList.add("flash");
    });
    return;
  }
  efectos.appendChild(n);
  limpiarLuego(n, 600);
}

// ---- Fin del nivel ----
async function terminar(fin) {
  clearTimeout(pistaT);
  const gano = fin === "gano", e = gano ? estrellas(E) : 0;
  if (gano) { guardarProgreso(def.n, e); [0, 2, 4, 7].forEach((i, k) => tono(ESCALA[i], 0.25, "triangle", 0.12, k * 0.12)); }
  else [392, 330, 262].forEach((f, k) => tono(f, 0.3, "sine", 0.1, k * 0.18));
  guardarPuntos();
  await dormir(700);
  const nodos = [];
  if (gano) {
    const est = h("div", "estrellas");
    for (let i = 1; i <= 3; i++) est.appendChild(h("span", i <= e ? "on" : "", "★"));
    nodos.push(est);
  } else {
    nodos.push(h("p", "", def.objetivo.tipo === "puntos" ? "Te faltaron " + Math.max(0, def.objetivo.meta - E.puntos).toLocaleString("es") + " puntos." : "No lo lograste a tiempo."));
  }
  nodos.push(h("p", "", "Puntos: " + E.puntos.toLocaleString("es")));
  const botones = [];
  if (gano && def.n < TOTAL) botones.push({ id: "sig", texto: "Siguiente nivel" });
  botones.push({ id: "otra", texto: gano ? "Repetir nivel" : "Reintentar", sec: gano && def.n < TOTAL });
  botones.push({ id: "mapa", texto: "Niveles", sec: true });
  const r = await modal(gano ? "¡Nivel superado!" : "¡Sin movimientos!", nodos, botones);
  if (r === "sig") iniciarNivel(def.n + 1);
  else if (r === "otra") iniciarNivel(def.n);
  else mostrarMapa();
}

mostrarMapa();
