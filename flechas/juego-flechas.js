// Ruta: flechas/juego-flechas.js
// Flechas: toca una flecha para sacarla del tablero. Sale en línea recta por donde apunta; si otra flecha le estorba, pierdes un corazón.
// Menú principal con tres partes:
//   ♾️ Modo libre   las cinco dificultades (Fácil, Medio, Difícil, Extra difícil, Ultra difícil), 100 niveles cada una (generador-flechas.js)
//   📋 Niveles      la campaña: 32 estados de México y 194 países, 100 niveles cada uno (cuentas en campana-flechas.js)
//   🗺️ Mapa         México con agua que sube por cada estado terminado y, al terminar México, el mundo
import { generar, DIFICULTADES, ORDEN } from "./generador-flechas.js";
import { crearEstado, bloqueo, quitar, libres, direccion } from "./logica-flechas.js";
import { crearCampana } from "./campana-flechas.js";
import { crearEtapas, nombrePais, banderaPais } from "../compartido/etapas-mapa.js";
import { MEXICO, CONTINENTES, LAGOS } from "../compartido/geografia-mapa.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

// ----- Ajustes -----
const ID = "flechas";
const CLAVE = "flechas_progreso_v1";   // { facil, medio, dificil, extra, ultra: nivel más alto pasado en modo libre;  max, hecho: nivel más alto abierto / terminado de la campaña }
const CLAVE_ULTIMA = "flechas_ultima"; // solo local: última dificultad del modo libre (para «Continuar»)
const NIVELES = 100;                   // niveles por dificultad en modo libre
const POR_ETAPA = 100;                 // niveles por estado o país en la campaña
const VIDAS = 3;
const PUNTOS = { facil: 5, medio: 10, dificil: 20, extra: 30, ultra: 50 }; // puntos al perfil, solo la primera vez que se pasa el nivel
const COLOR_BOTON = { facil: "b-verde", medio: "b-azul", dificil: "b-morado", extra: "b-oro", ultra: "b-rojo" };
const TINTA = "#2f3e4a", ROJO = "#d2431e", VERDE = "#14a36e";

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), cx = lienzo.getContext("2d");

// ----- Campaña: etapas (estados y países) y cuentas de dificultad -----
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA });
const CAMP = crearCampana({ numEstados: ETAPAS.numEstados, numPaises: ETAPAS.numPaises, porEtapa: POR_ETAPA });
const nombreE = (e) => (e < ETAPAS.numEstados ? ETAPAS.estados[e].nombre : nombrePais(ETAPAS.paises[e - ETAPAS.numEstados]));
const banderaE = (e) => (e < ETAPAS.numEstados ? "" : banderaPais(ETAPAS.paises[e - ETAPAS.numEstados]) + " ");
const etiquetaE = (e) => banderaE(e) + nombreE(e);

// ----- Progreso (local primero; se sincroniza con la cuenta si hay sesión) -----
let prog = {};
const leer = () => { try { prog = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { prog = {}; } };
let nube = null;
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };
const hechos = (d) => Math.min(NIVELES, Math.max(0, Math.floor(Number(prog[d])) || 0));
const siguiente = (d) => Math.min(NIVELES, hechos(d) + 1);
const leerUltima = () => { try { const d = localStorage.getItem(CLAVE_ULTIMA); return DIFICULTADES[d] ? d : "facil"; } catch (e) { return "facil"; } };
const guardarUltima = (d) => { try { localStorage.setItem(CLAVE_ULTIMA, d); } catch (e) {} };
const resumen = () => ETAPAS.resumen({ max: prog.max, hecho: prog.hecho }); // { hecho, max, estadosHechos, mexicoCompleto, paisesHechos, ... }
const etapaMax = () => Math.floor((resumen().max - 1) / POR_ETAPA); // número de la última etapa abierta (0 = primer estado)

// ----- Estado de la partida -----
let modo = "libre";            // "libre" | "campana"
let nCamp = 0;                 // nivel de la campaña que se está jugando (1 a ETAPAS.total)
let dif = "facil", nivel = 1, est = null; // dificultad y número que se le pasa al generador
let vidas = VIDAS, quitadas = 0, total = 0;
let jugando = false, pausado = false, terminado = false, ticket = 0;
let volando = [];   // flechas saliendo del tablero
let rebotes = [];   // flechas bloqueadas (rojas, con un empujoncito)
let pista = -1;     // flecha señalada por la bombilla
let cache = null;   // último nivel generado (para reiniciar sin volver a generarlo)
let ocup0 = null;   // casillas que al empezar tenían flecha (los huecos del tablero no llevan puntitos)
let anchoCss = 0, altoCss = 0, cell = 10, raf = 0;

// ----- Pantallas -----
const PANTALLAS = ["inicio", "menu", "lista", "niveles", "mapa"];
function mostrar(cual) { // una de PANTALLAS o "partida"
  for (const p of PANTALLAS) $(p).hidden = p !== cual;
  $("zona").hidden = cual === "partida";
  $("partida").hidden = cual !== "partida";
  $("fin").hidden = true;
  $("hudJuego").hidden = cual !== "partida";
  $("btn-menu").hidden = cual === "inicio"; // en el menú principal no se muestra el ☰
  $("btn-menu").innerHTML = '<span class="b-ico">☰</span> ' + (cual === "partida" ? "Pausa" : "Menú principal");
  pausado = false;
  if (cual !== "partida") { jugando = false; ticket++; }
}

// --- Menú principal ---
function inicio() {
  mostrar("inicio");
  const r = resumen();
  const x = CAMP.nivel(Math.min(ETAPAS.total, r.max));
  $("inicioInfo").textContent = "Niveles pasados: " + r.hecho + " de " + ETAPAS.total;
  $("continuar").textContent = "▶ " + (r.hecho ? "Continuar" : "Empezar") + " · " + etiquetaE(x.etapa) + " · Nivel " + x.k;
}

// --- Modo libre ---
function menu() {
  mostrar("menu");
  const d = leerUltima();
  const hay = ORDEN.some((x) => hechos(x) > 0);
  $("menuInfo").textContent = "Saca todas las flechas sin que se estorben";
  $("continuarLibre").textContent = "▶ " + (hay ? "Continuar" : "Empezar") + " · " + DIFICULTADES[d].nombre + " · Nivel " + siguiente(d);
  const cont = $("dificultades");
  cont.replaceChildren();
  for (const x of ORDEN) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + COLOR_BOTON[x];
    b.textContent = DIFICULTADES[x].nombre + " · " + hechos(x) + "/" + NIVELES;
    b.addEventListener("click", () => lista(x));
    cont.appendChild(b);
  }
}

function lista(d) {
  mostrar("lista");
  $("listaTitulo").textContent = DIFICULTADES[d].nombre + " · " + hechos(d) + " de " + NIVELES;
  const sig = siguiente(d), ok = hechos(d);
  const g = $("rejilla");
  g.replaceChildren();
  for (let n = 1; n <= NIVELES; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(n);
    b.className = "nv" + (n <= ok ? " hecho" : n === sig ? " actual" : " bloq");
    if (n <= sig) b.addEventListener("click", () => jugar(d, n));
    else b.disabled = true;
    g.appendChild(b);
  }
}

// --- Campaña: niveles de un estado o país ---
function niveles(e) {
  const eMax = etapaMax();
  e = Math.max(0, Math.min(eMax, e == null ? eMax : e)); // solo las etapas ya abiertas
  mostrar("niveles");
  const r = resumen();
  const c = CAMP.conteos(e), o = CAMP.orden(e);
  const hechosAqui = Math.max(0, Math.min(POR_ETAPA, r.hecho - e * POR_ETAPA));
  $("nivTitulo").textContent = etiquetaE(e);
  $("nivSub").textContent = (e < ETAPAS.numEstados ? "Estado " + (e + 1) + " de " + ETAPAS.numEstados : "País " + (e - ETAPAS.numEstados + 1) + " de " + ETAPAS.numPaises) +
    " · " + hechosAqui + "/" + POR_ETAPA + " · " + c.facil + " fáciles, " + c.medio + " medios, " + c.dificil + " difíciles";
  const ant = $("nivAnt"), sig = $("nivSig");
  ant.disabled = e <= 0; sig.disabled = e >= eMax;
  ant.onclick = () => niveles(e - 1); sig.onclick = () => niveles(e + 1);
  const g = $("rejillaNiv");
  g.replaceChildren();
  for (let k = 1; k <= POR_ETAPA; k++) {
    const n = e * POR_ETAPA + k;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(k);
    b.className = "nv t-" + o[k - 1] + (n <= r.hecho ? " hecho" : n <= r.max ? " actual" : " bloq");
    b.setAttribute("aria-label", "Nivel " + k + ", " + DIFICULTADES[o[k - 1]].nombre);
    if (n <= r.max) b.addEventListener("click", () => jugarCamp(n));
    else b.disabled = true;
    g.appendChild(b);
  }
}

// --- Mapa ---
let vistaMapa = "mexico";
const MAPA_MEX = { w: 561, h: 368 };
const proyMex = ([lon, lat]) => [((lon + 117.2) * 18.34).toFixed(1), ((32.8 - lat) * 20).toFixed(1)];
const MAPA_MUN = { w: 720, h: 290 };
const proyMun = ([lon, lat]) => [((lon + 180) * 2).toFixed(1), ((85 - lat) * 2).toFixed(1)];
const trazo = (poly, P) => "M" + poly.map((p) => P(p).join(",")).join("L") + "Z";
function ola(y, w) { // franja de agua con borde ondulado (se anima desplazándola 140 px, que es lo que mide una onda)
  let d = "M-140," + y + " q35,-7 70,0";
  for (let x = -70; x < w + 140; x += 70) d += " t70,0";
  return d + " V" + (y + 400) + " H-140 Z";
}
function mapa(vista) {
  const r = resumen();
  mostrar("mapa");
  vistaMapa = vista || (r.max > ETAPAS.nivelesMexico ? "mundo" : "mexico");
  if (vistaMapa === "mundo" && !r.mexicoCompleto) vistaMapa = "mexico";
  $("cabMapa").hidden = !r.mexicoCompleto; // el mundo no se anuncia hasta terminar México
  $("mapaMex").classList.toggle("on", vistaMapa === "mexico");
  $("mapaMun").classList.toggle("on", vistaMapa === "mundo");
  const eMax = etapaMax();
  const mex = vistaMapa === "mexico";
  const [W, H] = mex ? [MAPA_MEX.w, MAPA_MEX.h] : [MAPA_MUN.w, MAPA_MUN.h];
  const hechas = mex ? r.estadosHechos : r.paisesHechos, cuantas = mex ? ETAPAS.numEstados : ETAPAS.numPaises;
  const y = Math.round(H * (1 - hechas / cuantas));
  const siluetas = mex ? [trazo(MEXICO, proyMex)] : CONTINENTES.map((p) => trazo(p, proyMun));
  let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + (mex ? "Mapa de México: " + hechas + " de " + cuantas + " estados terminados" : "Mapa del mundo: " + hechas + " de " + cuantas + " países terminados") + '">';
  svg += '<defs><clipPath id="tierra">' + siluetas.map((d) => '<path d="' + d + '"/>').join("") + "</clipPath></defs>";
  svg += '<g fill="#eef2f1" stroke="#5b6b78" stroke-width="' + (mex ? 1.4 : 0.6) + '" stroke-linejoin="round">' + siluetas.map((d) => '<path d="' + d + '"/>').join("") + "</g>";
  if (hechas > 0) svg += '<g clip-path="url(#tierra)"><g class="ola"><path d="' + ola(y, W) + '" fill="#5cb4ee" fill-opacity=".8"/></g></g>';
  if (!mex) svg += '<g fill="#fff">' + LAGOS.map((p) => '<path d="' + trazo(p, proyMun) + '"/>').join("") + "</g>";
  if (mex) { // un punto por estado (en el mundo no hay coordenadas de países: se elige en la lista de abajo)
    ETAPAS.estados.forEach((s, i) => {
      const [px, py] = proyMex([s.lon, s.lat]);
      const hecho = i < r.estadosHechos, actual = i === eMax;
      const abierto = i <= eMax;
      const fill = hecho ? "#3fcf4a" : actual ? "#ffb020" : abierto ? "#8b93a0" : "#3d4048";
      svg += '<g' + (abierto ? ' class="sel" role="button" tabindex="0" data-e="' + i + '"' : "") + ' aria-label="' + s.nombre + '">' +
        (actual ? '<circle class="pulso" cx="' + px + '" cy="' + py + '" r="6" fill="#ffb020"/>' : "") +
        '<circle cx="' + px + '" cy="' + py + '" r="5" fill="' + fill + '" stroke="#1b1d22" stroke-width="1.2"' + (abierto ? "" : ' opacity=".6"') + "/><title>" + s.nombre + "</title></g>";
    });
  }
  $("mapaLienzo").innerHTML = svg + "</svg>";
  $("mapaInfo").textContent = mex
    ? "Estados terminados: " + r.estadosHechos + " de " + ETAPAS.numEstados + (r.mexicoCompleto ? " · ¡México completo!" : "")
    : "Países terminados: " + r.paisesHechos + " de " + ETAPAS.numPaises;
  // Lista de estados o países en el orden en que se juegan (también sirve para elegir con el dedo)
  const f = $("mapaFichas");
  f.replaceChildren();
  const desde = mex ? 0 : ETAPAS.numEstados, hasta = mex ? ETAPAS.numEstados : (ETAPAS.numEstados + ETAPAS.numPaises);
  for (let e = desde; e < hasta; e++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ficha" + ((e + 1) * POR_ETAPA <= r.hecho ? " hecho" : e <= eMax ? " actual" : "");
    b.textContent = etiquetaE(e);
    if (e <= eMax) b.dataset.e = String(e); else b.disabled = true;
    f.appendChild(b);
  }
}
$("mapaMex").addEventListener("click", () => mapa("mexico"));
$("mapaMun").addEventListener("click", () => mapa("mundo"));
$("mapa").addEventListener("click", (ev) => { const t = ev.target.closest("[data-e]"); if (t) niveles(Number(t.dataset.e)); });
$("mapa").addEventListener("keydown", (ev) => { if (ev.key !== "Enter" && ev.key !== " ") return; const t = ev.target.closest && ev.target.closest("[data-e]"); if (t) { ev.preventDefault(); niveles(Number(t.dataset.e)); } });

// ----- Partida -----
function jugar(d, n) { // modo libre
  modo = "libre"; nCamp = 0;
  guardarUltima(d);
  arrancar(d, n, DIFICULTADES[d].nombre.toUpperCase(), "Nivel " + n, "");
}
function jugarCamp(n) { // campaña: n = número de nivel de toda la campaña (1 a 22 600)
  const x = CAMP.nivel(n);
  modo = "campana"; nCamp = x.n;
  arrancar(x.dif, x.idx, DIFICULTADES[x.dif].nombre.toUpperCase(), "Nivel " + x.k, etiquetaE(x.etapa));
}
function arrancar(d, n, etiqueta, titulo, sub) {
  dif = d; nivel = n;
  mostrar("partida");
  $("partida").classList.toggle("camp", modo === "campana");
  $("tag").textContent = etiqueta;
  $("titulo").textContent = titulo;
  $("sub").textContent = sub;
  est = null; volando = []; rebotes = []; pista = -1; jugando = false;
  vidas = VIDAS; quitadas = 0; total = 0; terminado = false;
  cx.clearRect(0, 0, anchoCss, altoCss);
  pintarHud();
  $("cargando").hidden = false;
  const mio = ++ticket;
  // pequeña espera para que se alcance a mostrar «Generando nivel…» (en tableros grandes generar tarda un momento)
  setTimeout(() => {
    if (mio !== ticket) return;
    const clave = d + ":" + n;
    const g = cache && cache.clave === clave ? cache.g : generar(d, n);
    cache = { clave, g };
    est = crearEstado(g.cols, g.filas, g.flechas);
    ocup0 = est.celda.slice();
    total = g.flechas.length;
    $("cargando").hidden = true;
    jugando = true;
    pintarHud();
    ajustar();
  }, 40);
}
const reintentar = () => (modo === "campana" ? jugarCamp(nCamp) : jugar(dif, nivel));
const irNiveles = () => (modo === "campana" ? niveles(CAMP.nivel(nCamp).etapa) : lista(dif));

function pintarHud() {
  let h = "";
  for (let i = 0; i < VIDAS; i++) h += '<span class="' + (i < vidas ? "" : "perdida") + '">♥</span>';
  $("vidas").innerHTML = h;
  $("barraI").style.width = (total ? (quitadas / total) * 100 : 0) + "%";
}

// ----- Dibujo -----
function ajustar() {
  if (!est || $("partida").hidden) return;
  const area = $("area");
  const W = area.clientWidth - 20 - 16, H = area.clientHeight - 8 - 16; // márgenes del área y del panel del tablero
  if (W <= 0 || H <= 0) return;
  cell = Math.max(3, Math.min(W / est.cols, H / est.filas));
  anchoCss = Math.round(est.cols * cell);
  altoCss = Math.round(est.filas * cell);
  cell = anchoCss / est.cols;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  lienzo.style.width = anchoCss + "px";
  lienzo.style.height = altoCss + "px";
  lienzo.width = Math.round(anchoCss * dpr);
  lienzo.height = Math.round(altoCss * dpr);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pedir();
}
addEventListener("resize", ajustar);
if (window.ResizeObserver) new ResizeObserver(ajustar).observe($("area"));

const pedir = () => { if (!raf) raf = requestAnimationFrame(dibujar); };

// Camino de una flecha prolongado en línea recta hasta salir del tablero (para animar la salida)
function extendida(f) {
  if (f._ext) return f._ext;
  const c = f.celdas, n = c.length, [dx, dy] = direccion(c);
  let [x, y] = c[n - 1];
  let rl = 0; // pasos que le faltan a la cabeza para llegar al borde
  while (x + dx * (rl + 1) >= 0 && y + dy * (rl + 1) >= 0 && x + dx * (rl + 1) < est.cols && y + dy * (rl + 1) < est.filas) rl++;
  const pts = c.map(([a, b]) => [a, b]);
  for (let i = 1; i <= n + rl + 2; i++) pts.push([x + dx * i, y + dy * i]);
  return (f._ext = { pts, largo: n - 1, dir: [dx, dy], dmax: n + rl + 1 });
}
function en(pts, s) {
  const i = Math.max(0, Math.min(Math.floor(s), pts.length - 2)), t = s - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}
const PX = (p) => [(p[0] + 0.5) * cell, (p[1] + 0.5) * cell];

// Dibuja la flecha «f» desplazada «d» casillas a lo largo de su camino (0 = en su sitio)
function flecha(f, d, color, grosor = 1) {
  const e = extendida(f), s1 = d + e.largo;
  cx.strokeStyle = color; cx.fillStyle = color;
  cx.lineWidth = Math.max(1.3, cell * 0.14) * grosor;
  cx.lineCap = "round"; cx.lineJoin = "round";
  cx.beginPath();
  const a = PX(en(e.pts, d));
  cx.moveTo(a[0], a[1]);
  for (let i = Math.floor(d) + 1; i < s1; i++) { const q = PX(e.pts[i]); cx.lineTo(q[0], q[1]); }
  const b = PX(en(e.pts, s1));
  cx.lineTo(b[0], b[1]);
  cx.stroke();
  // punta
  const [dx, dy] = e.dir, k = cell;
  const tx = b[0] + dx * 0.32 * k, ty = b[1] + dy * 0.32 * k;       // vértice
  const bx = tx - dx * 0.58 * k, by = ty - dy * 0.58 * k;           // centro de la base
  const h = 0.3 * k * grosor;
  cx.beginPath();
  cx.moveTo(tx, ty);
  cx.lineTo(bx - dy * h, by + dx * h);
  cx.lineTo(bx + dy * h, by - dx * h);
  cx.closePath();
  cx.fill();
}

function dibujar() {
  raf = 0;
  if (!est) return;
  const ahora = performance.now();
  cx.clearRect(0, 0, anchoCss, altoCss); // transparente: el panel del tablero pone el fondo
  // puntitos en las casillas vacías (ya se sacaron las flechas de ahí)
  if (cell >= 7) {
    cx.fillStyle = "rgba(47,62,74,.28)";
    const r = Math.max(0.8, cell * 0.05);
    for (let y = 0; y < est.filas; y++) for (let x = 0; x < est.cols; x++) {
      if (est.celda[y * est.cols + x] !== -1 || ocup0[y * est.cols + x] === -1) continue; // solo donde había flecha y ya salió
      cx.beginPath(); cx.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, 6.2832); cx.fill();
    }
  }
  rebotes = rebotes.filter((r) => ahora - r.t0 < r.dur);
  const rojas = new Map(rebotes.map((r) => [r.id, (ahora - r.t0) / r.dur]));
  for (const id of est.vivas) {
    const f = est.flechas[id];
    if (rojas.has(id)) flecha(f, 0.45 * Math.sin(Math.PI * rojas.get(id)), ROJO);
    else if (id === pista) flecha(f, 0, VERDE, 1.5);
    else flecha(f, 0, TINTA);
  }
  volando = volando.filter((v) => ahora - v.t0 < v.dur);
  for (const v of volando) {
    const u = (ahora - v.t0) / v.dur;
    flecha(v.f, v.dmax * (0.3 * u + 0.7 * u * u), TINTA);
  }
  if (volando.length || rebotes.length) pedir();
}

// ----- Toques -----
function distancia(celdas, px, py) { // distancia de un punto al camino de una flecha (en casillas)
  let m = 1e9;
  for (let i = 0; i + 1 < celdas.length; i++) {
    const [ax, ay] = celdas[i], [bx, by] = celdas[i + 1];
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    m = Math.min(m, Math.hypot(px - (ax + vx * t), py - (ay + vy * t)));
  }
  return m;
}
function buscar(lx, ly) { // lx, ly en casillas (el centro de la casilla x,y es x,y)
  const x0 = Math.round(lx), y0 = Math.round(ly);
  const vistos = new Set();
  let mejor = -1, md = 1e9;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= est.cols || y >= est.filas) continue;
    const id = est.celda[y * est.cols + x];
    if (id < 0 || vistos.has(id)) continue;
    vistos.add(id);
    const d = distancia(est.flechas[id].celdas, lx, ly);
    if (d < md) { md = d; mejor = id; }
  }
  const umbral = Math.min(1.1, Math.max(0.55, 14 / cell)); // en tableros muy chicos el dedo es más grande que la casilla
  return md <= umbral ? mejor : -1;
}

lienzo.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!jugando || pausado || terminado || !est) return;
  const r = lienzo.getBoundingClientRect();
  const id = buscar(((e.clientX - r.left) / r.width) * est.cols - 0.5, ((e.clientY - r.top) / r.height) * est.filas - 0.5);
  if (id < 0) return;
  if (bloqueo(est, id) === -1) salir(id); else fallar(id);
});

function salir(id) {
  const f = est.flechas[id], e = extendida(f);
  quitar(est, id);
  quitadas++;
  if (pista === id) pista = -1;
  volando.push({ f, t0: performance.now(), dur: 140 + e.dmax * 12, dmax: e.dmax });
  pintarHud();
  pedir();
  if (!est.vivas.size) { terminado = true; setTimeout(ganar, Math.max(400, 240 + e.dmax * 12)); } // espera a que termine de salir la última
}

function fallar(id) {
  if (rebotes.some((r) => r.id === id)) return; // un doble toque no cuesta dos corazones
  vidas--;
  rebotes.push({ id, t0: performance.now(), dur: 520 });
  try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
  pintarHud();
  pedir();
  if (vidas <= 0) { terminado = true; setTimeout(derrota, 650); }
}

// ----- Final de la partida -----
function mostrarFin(titulo, botones) {
  $("finTitulo").textContent = titulo;
  const c = $("finBotones");
  c.replaceChildren();
  for (const [texto, clase, fn] of botones) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + clase;
    b.textContent = texto;
    b.addEventListener("click", fn);
    c.appendChild(b);
  }
  $("fin").hidden = false;
  try { c.firstChild.focus({ preventScroll: true }); } catch (e) {}
}

async function puntos(d) { // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  encolarPuntos(ID, PUNTOS[d]);
  try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
}

async function ganar() {
  if ($("partida").hidden) return;
  jugando = false;
  if (modo === "campana") return ganarCamp();
  const primera = nivel > hechos(dif);
  if (primera) { prog[dif] = nivel; guardar(); }
  const ultimo = nivel >= NIVELES;
  mostrarFin(ultimo ? "🎉 ¡Completaste " + DIFICULTADES[dif].nombre + "!" : "🎉 ¡Nivel " + nivel + " resuelto!", [
    [ultimo ? "Ver niveles" : "Siguiente nivel ▶", "b-verde", () => (ultimo ? lista(dif) : jugar(dif, nivel + 1))],
    ["Niveles", "b-azul", () => lista(dif)],
  ]);
  if (primera) await puntos(dif);
}

async function ganarCamp() {
  const x = CAMP.nivel(nCamp), antes = resumen();
  const primera = nCamp > antes.hecho;
  if (primera) { // los niveles se abren en orden: al terminar uno se abre el siguiente
    prog.hecho = nCamp;
    prog.max = Math.max(Number(prog.max) || 1, Math.min(ETAPAS.total, nCamp + 1));
    guardar();
  }
  const ultimo = nCamp >= ETAPAS.total;
  const cierra = x.k === POR_ETAPA;                  // último nivel del estado o país
  const abreMundo = nCamp === ETAPAS.nivelesMexico;  // último de México
  const titulo = ultimo ? "🏆 ¡Completaste el mundo entero!"
    : abreMundo ? "🌍 ¡Terminaste México! Se abrió el mapa del mundo"
    : cierra ? "🎉 ¡Terminaste " + nombreE(x.etapa) + "!"
    : "🎉 ¡Nivel " + x.k + " resuelto!";
  const botones = [];
  if (!ultimo) botones.push([cierra ? "Siguiente " + (x.etapa < ETAPAS.numEstados - 1 ? "estado" : "país") + " ▶" : "Siguiente nivel ▶", "b-verde", () => jugarCamp(nCamp + 1)]);
  botones.push(["Niveles", "b-azul", () => niveles(x.etapa)]);
  if (cierra || ultimo) botones.push(["🗺️ Mapa", "b-oro", () => mapa(abreMundo ? "mundo" : undefined)]);
  mostrarFin(titulo, botones);
  if (primera) await puntos(x.dif);
}

function derrota() {
  if ($("partida").hidden) return;
  jugando = false;
  mostrarFin("💔 Te quedaste sin corazones", [
    ["Reintentar", "b-verde", reintentar],
    ["Niveles", "b-azul", irNiveles],
  ]);
}

// ----- Botones -----
$("pista").addEventListener("click", () => { // marca una flecha que sí puede salir ahora
  if (!jugando || pausado || terminado || !est) return;
  const l = libres(est);
  if (!l.length) return;
  pista = l[(Math.random() * l.length) | 0];
  pedir();
});
$("reiniciar").addEventListener("click", () => { if (!$("partida").hidden) reintentar(); });
$("continuar").addEventListener("click", () => jugarCamp(Math.min(ETAPAS.total, resumen().max)));
$("bLibre").addEventListener("click", menu);
$("bNiveles").addEventListener("click", () => niveles());
$("bMapa").addEventListener("click", () => mapa());
$("continuarLibre").addEventListener("click", () => { const d = leerUltima(); jugar(d, siguiente(d)); });
$("btn-menu").addEventListener("click", () => { if ($("partida").hidden && $("inicio").hidden) inicio(); }); // fuera de partida el ☰ dice «Menú principal»

// Menú de pausa estándar (☰ en partida): Continuar / Niveles / Salir. No hay reloj que congelar, solo se ignoran los toques.
crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => jugando && !terminado && !$("partida").hidden && $("fin").hidden,
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; pedir(); },
  extras: () => [{ icono: "📋", texto: "Niveles", clase: "b-azul", alElegir: irNiveles }],
  ayudaSalir: () => (quitadas && jugando ? "Se pierde lo que llevas de este nivel" : ""),
  alSalir: () => (modo === "campana" ? inicio() : menu()),
});

leer();
inicio();

// Sincroniza el progreso con la cuenta de Google (por cada dificultad y para la campaña gana el nivel más alto)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: m.unirMaximos,
    alCambiar: (v) => { prog = v || {}; if (!$("inicio").hidden) inicio(); else if (!$("menu").hidden) menu(); },
  });
}).catch(() => {});
