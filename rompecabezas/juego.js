// Ruta: rompecabezas/juego.js
// Rompecabezas con 4 pantallas (menú → categoría → ajustes → juego), piezas con lengüetas,
// número de piezas con deslizador, rotación opcional, pausa, zoom y subida segura a imgbb
// mediante un Apps Script (la API key NUNCA va aquí).

import { URL_SUBIDA_IMAGENES } from "../compartido/configs.js";

// ---------- AJUSTES ----------
const ID = "rompecabezas";
const URL_SUBIDA = URL_SUBIDA_IMAGENES;         // se cambia en compartido/configs.js
const COLUMNAS_MIN = 3;         // el deslizador empieza con este número de columnas en el lado largo
const COLUMNAS_MAX = 40;        // y termina aquí: 40 → unas 1600 piezas. Súbelo si tu celular aguanta más
const PIEZAS_INICIAL = 36;      // número de piezas que aparece al abrir los ajustes
const LADO_MAX = 2000;          // la imagen se reduce a este lado máximo (px) antes de usarse/subirse
const IMAGEN_MAX_MB = 15;       // tamaño máximo del archivo elegido
const PIEZA_W = 80;             // ancho de pieza en unidades del «mundo» (no son píxeles)
const IMAN = 0.35;              // qué tan cerca (fracción de pieza) para que un grupo se fije en su lugar del tablero
const UNION = 0.35;             // qué tan cerca (fracción de pieza) para que dos piezas vecinas se peguen entre sí (en cualquier parte)
const ZOOM_MAX = 8;
const ZOOM_MIN_REL = 0.6;       // lo más que se puede alejar: este % del zoom con el que empieza el juego (0.6 = 60 %)
const ZONA_PIEZAS = 0.4;        // tamaño de la zona donde se reparten las piezas (0.4 = 60 % más chica; 1 = como antes)
const TABLERO_ANCHO = 0.84;     // al empezar, el tablero ocupa este % del ancho de la pantalla
const DENSIDAD = 0.6;           // cuánto se pueden amontonar las piezas fuera del tablero (menos = más espacio)
const GUIA_TENUE = 0;           // transparencia de la imagen sobre el tablero (0 = vacío, como el original)
const TAP_PX = 8;               // movimiento máximo (px) para que un toque cuente como «girar pieza» (solo con rotación activada)
const SPRITE_MAX_PX = 16e6;     // al arrastrar, el grupo se congela como imagen si no pasa de esta área (px); si no, se dibuja pieza por pieza
const PIEZAS_POR_PUNTO = 8;     // al perfil: 1 punto por cada 8 piezas
const GUARDADAS_MAX = 60;       // cuántas imágenes se recuerdan en «Mis imágenes» (las más viejas se olvidan de la lista, no de imgbb)
const CLAVE_GALERIA = "rompecabezas:imagenes";
const CLAVE_HUELLAS = "rompecabezas:huellas";   // «huella» de cada imagen ya subida → su enlace (así la misma imagen no se sube dos veces)
const HUELLAS_MAX = 200;

// Categorías del menú. Tipos: «galeria» (tus imágenes guardadas en imgbb), «archivo» (elegir del dispositivo)
// y «urls» (imágenes fijas de ibb.co):  { id: "familia", nombre: "Familia", tipo: "urls", urls: ["https://i.ibb.co/..."] }
const CATEGORIAS = [
  { id: "mias", nombre: "Mis imágenes", tipo: "galeria", emoji: "📷" },
  { id: "archivo", nombre: "Desde mi dispositivo", tipo: "archivo", emoji: "➕" },
];

// ---------- ESTADO ----------
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const g = lienzo.getContext("2d");
let dpr = 1;
let fuente = null;              // canvas con la imagen (ya reducida)
let origenImg = "";             // "archivo" (elegida del dispositivo) | "nube" (ya está en imgbb)
let urlNube = null;
let volverA = "menu";           // a dónde regresa la X de los ajustes
let opciones = [], idx = 0, bordes = null;
let cols = 0, rows = 0, rotacion = false;
let pw = PIEZA_W, ph = PIEZA_W, BW = 0, BH = 0, padW = 0, kS = 1;
let piezas = [], sueltas = [], colocadas = 0;   // «sueltas» ahora es la lista de GRUPOS sin fijar (el último está arriba)
let mundo = { x0: 0, y0: 0, x1: 0, y1: 0 };
let zoomMin = 0.1;              // se calcula al repartir las piezas (ZOOM_MIN_REL × zoom inicial)
let cam = { x: 0, y: 0, s: 1 };
let guia = false, t0 = 0, acum = 0, terminado = false, iniciado = false, pausado = false;
let sucio = false, temporizadorMsg = null, rafPrev = 0;
let capa = null;                // lienzo auxiliar: todo el tablero SIN el grupo que se arrastra (se pinta una sola vez por arrastre)
let rectL = null;               // posición del lienzo en pantalla (se guarda para no recalcular el layout en cada evento)

const clamp = (s) => Math.min(ZOOM_MAX, Math.max(zoomMin, s));
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const tiempoActual = () => Math.floor(acum + (t0 ? (Date.now() - t0) / 1000 : 0));

function aviso(texto, fijo) {
  const m = $("msg");
  m.textContent = texto;
  m.hidden = false;
  clearTimeout(temporizadorMsg);
  if (!fijo) temporizadorMsg = setTimeout(() => (m.hidden = true), 4000);
}

function rng(s) {   // números al azar repetibles (misma semilla → misma imagen)
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- TEXTURAS DE FONDO (tela de mezclilla y lino, dibujadas por código) ----------
function texturas() {
  const r = rng(11);
  const jean = document.createElement("canvas");
  jean.width = jean.height = 256;
  let x = jean.getContext("2d");
  x.fillStyle = "#1f4568"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    x.fillStyle = r() < 0.5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.09)";
    x.fillRect((r() * 256) | 0, (r() * 256) | 0, 1 + ((r() * 2) | 0), 1);
  }
  x.lineWidth = 1;
  for (let i = -256; i <= 256; i += 4) {
    x.strokeStyle = (i / 4) % 2 ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.06)";
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke();
  }
  const lino = document.createElement("canvas");
  lino.width = lino.height = 256;
  x = lino.getContext("2d");
  x.fillStyle = "#cbb78f"; x.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    x.fillStyle = (r() < 0.5 ? "rgba(255,250,235," : "rgba(95,72,40,") + (0.05 + r() * 0.1) + ")";
    x.fillRect(0, y, 256, 1);
  }
  for (let xx = 0; xx < 256; xx += 2) {
    x.fillStyle = (r() < 0.5 ? "rgba(255,250,235," : "rgba(95,72,40,") + (0.05 + r() * 0.1) + ")";
    x.fillRect(xx, 0, 1, 256);
  }
  for (let i = 0; i < 2500; i++) {
    x.fillStyle = r() < 0.5 ? "rgba(255,255,255,.08)" : "rgba(80,60,30,.1)";
    x.fillRect((r() * 256) | 0, (r() * 256) | 0, 1, 1);
  }
  const st = document.documentElement.style;
  st.setProperty("--jean", "url(" + jean.toDataURL() + ")");
  st.setProperty("--lino", "url(" + lino.toDataURL() + ")");
}

// ---------- PANTALLAS ----------
const PANTALLAS = ["menu", "cat", "cfg", "juego"];
function pantalla(nombre) {
  for (const p of PANTALLAS) $(p).hidden = p !== nombre;
  document.body.classList.toggle("en-juego", nombre === "juego");
  if (nombre !== "juego") scrollTo(0, 0);
}

function carta(marco, nombre, alAbrir) {
  const b = document.createElement("button");
  b.className = "carta";
  b.innerHTML = '<span class="pila"><i></i><i></i></span>';
  const m = document.createElement("span");
  m.className = "marco";
  m.appendChild(marco);
  b.appendChild(m);
  if (nombre) {
    const n = document.createElement("span");
    n.className = "nom";
    n.textContent = nombre;
    b.appendChild(n);
  }
  b.addEventListener("click", alAbrir);
  return b;
}

function marcoEmoji(emoji, semilla) {
  const c = document.createElement("canvas");
  c.width = c.height = 320;
  const x = c.getContext("2d");
  const r = rng(semilla);
  const h = r() * 360;
  const gr = x.createLinearGradient(0, 0, 320, 320);
  gr.addColorStop(0, `hsl(${h} 70% 55%)`); gr.addColorStop(1, `hsl(${(h + 70) % 360} 75% 38%)`);
  x.fillStyle = gr; x.fillRect(0, 0, 320, 320);
  x.font = "150px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, 160, 172);
  return c;
}

function marcoImg(url) {
  const im = document.createElement("img");
  im.src = url; im.loading = "lazy"; im.alt = "";
  return im;
}

function pintarMenu() {
  const cont = $("cats");
  cont.innerHTML = "";
  CATEGORIAS.forEach((c, i) => {
    let marco;
    if (c.tipo === "galeria" && leerGaleria()[0]) marco = marcoImg(leerGaleria()[0]);   // vista previa: la más reciente
    else if (c.tipo === "urls" && c.urls && c.urls[0] && urlValida(c.urls[0])) marco = marcoImg(c.urls[0]);
    else marco = marcoEmoji(c.emoji || "🧩", i + 3);
    cont.appendChild(carta(marco, c.nombre, () => abrirCategoria(c)));
  });
}

function abrirCategoria(c) {
  if (c.tipo === "archivo") { $("archivo").click(); return; }
  const cont = $("catImgs");
  cont.innerHTML = "";
  $("catTitulo").textContent = c.nombre;
  const vacio = (t) => { const p = document.createElement("p"); p.className = "vacio"; p.textContent = t; cont.appendChild(p); };
  if (c.tipo === "galeria") {
    const lista = leerGaleria();
    if (!lista.length) vacio("Aún no hay imágenes guardadas. Elige una desde tu dispositivo: al jugar se guarda aquí sola (necesitas haber entrado con Google en el portal).");
    for (const u of lista) cont.appendChild(carta(marcoImg(u), "", () => elegirUrl(u, "cat")));
  } else if (c.tipo === "urls") {
    const lista = (c.urls || []).filter(urlValida);
    if (!lista.length) vacio("Esta categoría no tiene imágenes válidas de ibb.co.");
    for (const u of lista) cont.appendChild(carta(marcoImg(u), "", () => elegirUrl(u, "cat")));
  }
  pantalla("cat");
}
$("catCerrar").addEventListener("click", () => pantalla("menu"));

// ---------- AJUSTES (número de piezas y rotación) ----------
// Elige columnas×filas con celdas casi cuadradas según la proporción de la imagen
function calcularOpciones() {
  const asp = fuente.width / fuente.height;
  const vistos = new Set();
  opciones = [];
  for (let k = COLUMNAS_MIN; k <= COLUMNAS_MAX; k++) {
    let c, r;
    if (asp >= 1) { c = k; r = Math.max(2, Math.round(k / asp)); }
    else { r = k; c = Math.max(2, Math.round(k * asp)); }
    if (vistos.has(c * r)) continue;
    vistos.add(c * r);
    opciones.push({ c, r, n: c * r });
  }
  opciones.sort((a, b) => a.n - b.n);
}

function crearBordes(c, r) {   // lengüetas al azar (+1 afuera, -1 adentro, 0 borde plano)
  const aba = [], der = [];
  for (let i = 0; i < r; i++) {
    aba[i] = []; der[i] = [];
    for (let j = 0; j < c; j++) {
      aba[i][j] = i < r - 1 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      der[i][j] = j < c - 1 ? (Math.random() < 0.5 ? 1 : -1) : 0;
    }
  }
  return { aba, der };
}

// Dibuja una arista de (ax,ay) a (bx,by). s: 0 plana, +1 lengüeta hacia afuera, -1 hacia adentro. t: alto de la lengüeta
function arista(ctx, ax, ay, bx, by, s, t) {
  if (!s) { ctx.lineTo(bx, by); return; }
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = uy * s, ny = -ux * s;
  const p = (u, v) => [ax + ux * L * u + nx * v * t, ay + uy * L * u + ny * v * t];
  ctx.lineTo(...p(0.37, 0));
  ctx.bezierCurveTo(...p(0.37, 0.35), ...p(0.28, 0.45), ...p(0.28, 0.75));
  ctx.bezierCurveTo(...p(0.28, 1.15), ...p(0.72, 1.15), ...p(0.72, 0.75));
  ctx.bezierCurveTo(...p(0.72, 0.45), ...p(0.63, 0.35), ...p(0.63, 0));
  ctx.lineTo(bx, by);
}

function trazarCortes(x, w, h, c, r, b, t) {   // todas las líneas de corte (vista previa)
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const x0 = j * w, y0 = i * h;
      if (j < c - 1) { x.moveTo(x0 + w, y0); arista(x, x0 + w, y0, x0 + w, y0 + h, b.der[i][j], t); }
      if (i < r - 1) { x.moveTo(x0 + w, y0 + h); arista(x, x0 + w, y0 + h, x0, y0 + h, b.aba[i][j], t); }
    }
  }
}

function dibujarPrev() {
  if (!fuente) return;
  const caja = $("prevCaja"), prev = $("prev");
  const asp = fuente.width / fuente.height;
  const maxW = caja.clientWidth, maxH = innerHeight * 0.5;
  if (!maxW) return;
  let w = maxW, h = w / asp;
  if (h > maxH) { h = maxH; w = h * asp; }
  const d = Math.min(devicePixelRatio || 1, 2);
  prev.style.width = w + "px"; prev.style.height = h + "px";
  prev.width = Math.max(1, Math.round(w * d)); prev.height = Math.max(1, Math.round(h * d));
  const x = prev.getContext("2d");
  x.drawImage(fuente, 0, 0, prev.width, prev.height);
  const cw = prev.width / cols, ch = prev.height / rows;
  x.beginPath();
  trazarCortes(x, cw, ch, cols, rows, bordes, 0.22 * Math.min(cw, ch));
  x.lineWidth = Math.max(1, d * 1.2);
  x.strokeStyle = "rgba(255,255,255,.92)";
  x.stroke();
}

function aplicarOpcion() {
  const o = opciones[idx];
  cols = o.c; rows = o.r;
  bordes = crearBordes(cols, rows);
  $("nPiezas").textContent = o.n;
  const rango = $("rango");
  rango.style.setProperty("--f", opciones.length > 1 ? idx / (opciones.length - 1) : 0);
  cancelAnimationFrame(rafPrev);
  rafPrev = requestAnimationFrame(dibujarPrev);
}

function ponerRotacion(on) {
  rotacion = on;
  $("rot").classList.toggle("on", on);
  $("rot").setAttribute("aria-checked", String(on));
  $("rot").firstElementChild.textContent = on ? "90" : "0";
}

function abrirAjustes(desde) {
  volverA = desde;
  calcularOpciones();
  let mejor = 0;
  opciones.forEach((o, i) => { if (Math.abs(o.n - PIEZAS_INICIAL) < Math.abs(opciones[mejor].n - PIEZAS_INICIAL)) mejor = i; });
  idx = mejor;
  const rango = $("rango");
  rango.min = 0; rango.max = opciones.length - 1; rango.value = idx;
  ponerRotacion(rotacion);
  $("guardar").hidden = origenImg !== "archivo" || !!urlNube;
  $("guardar").disabled = false;
  $("enlace").hidden = !urlNube;
  pantalla("cfg");
  aplicarOpcion();
}

$("rango").addEventListener("input", () => { idx = Number($("rango").value); aplicarOpcion(); });
$("rot").addEventListener("click", () => ponerRotacion(!rotacion));
$("cfgCerrar").addEventListener("click", () => pantalla(volverA));
$("jugar").addEventListener("click", jugar);
addEventListener("resize", () => { if (!$("cfg").hidden) dibujarPrev(); });

// ---------- RESPONSIVE / DIBUJO DEL JUEGO ----------
function tamano() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  rectL = null;
  if (arr) arr.cache = null;
  const r = lienzo.getBoundingClientRect();
  if (!r.width || !r.height) return;
  lienzo.width = Math.max(1, Math.round(r.width * dpr));
  lienzo.height = Math.max(1, Math.round(r.height * dpr));
  pedir();
}
new ResizeObserver(tamano).observe(lienzo);

function pedir() {
  if (sucio) return;
  sucio = true;
  requestAnimationFrame(dibujar);
}

// Dibuja una pieza en el contexto x. v = rectángulo visible del mundo (para saltarse las que no se ven) o null
function dp(x, p, v) {
  const cx = p.x + pw / 2, cy = p.y + ph / 2;
  if (v && (cx + v.m < v.x0 || cx - v.m > v.x1 || cy + v.m < v.y0 || cy - v.m > v.y1)) return;
  x.save();
  x.translate(cx, cy);
  if (p.rot) x.rotate((p.rot * Math.PI) / 2);
  x.drawImage(p.cv, -pw / 2 - padW, -ph / 2 - padW, p.cv.width * kS, p.cv.height * kS);
  x.restore();
}

function vista(W, H) {
  const s = cam.s * dpr;
  return { x0: cam.x, y0: cam.y, x1: cam.x + W / s, y1: cam.y + H / s, m: Math.max(pw, ph) * 0.9 + padW };  // m: cabe una pieza girada
}

// Pinta todo el tablero en el contexto x (el del lienzo o uno auxiliar), sin el grupo «excluir»
function pintarEscena(x, W, H, excluir) {
  const s = cam.s * dpr;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, W, H);                       // el fondo de lino es CSS (queda quieto detrás)
  x.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  if (guia || GUIA_TENUE > 0) {
    x.globalAlpha = guia ? 0.6 : GUIA_TENUE;
    x.drawImage(fuente, 0, 0, BW, BH);
    x.globalAlpha = 1;
  }
  x.strokeStyle = "rgba(255,255,255,.95)";
  x.lineWidth = 2.5 / cam.s;
  x.strokeRect(0, 0, BW, BH);
  const v = vista(W, H);
  for (const p of piezas) if (p.ok) dp(x, p, v);
  for (const gr of sueltas) if (gr !== excluir) for (const p of gr.m) dp(x, p, v);
}

// Al empezar a arrastrar: el resto del tablero se pinta UNA vez en «capa» y el grupo se congela como imagen.
// Después, cada cuadro solo copia esas dos imágenes (en vez de redibujar todas las piezas).
function congelar(gr, W, H) {
  const s = cam.s * dpr;
  if (!capa) capa = document.createElement("canvas");
  if (capa.width !== W || capa.height !== H) { capa.width = W; capa.height = H; }
  pintarEscena(capa.getContext("2d"), W, H, gr);
  const mitad = Math.max(pw, ph) / 2 + padW;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of gr.m) {
    const cx = p.x + pw / 2, cy = p.y + ph / 2;
    x0 = Math.min(x0, cx - mitad); y0 = Math.min(y0, cy - mitad);
    x1 = Math.max(x1, cx + mitad); y1 = Math.max(y1, cy + mitad);
  }
  const w = Math.ceil((x1 - x0) * s), h = Math.ceil((y1 - y0) * s);
  let sprite = null;
  if (w * h <= SPRITE_MAX_PX && w <= 4096 && h <= 4096) {
    sprite = document.createElement("canvas");
    sprite.width = w; sprite.height = h;
    const x = sprite.getContext("2d");
    x.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    for (const p of gr.m) dp(x, p, null);
  }
  return { sprite, x0, y0, ax: 0, ay: 0 };       // ax, ay: cuánto se ha movido el grupo desde que se congeló
}

function dibujar() {
  sucio = false;
  const W = lienzo.width, H = lienzo.height;
  if (!fuente || !piezas.length) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); return; }
  if (arr && arr.mov) {                          // arrastrando: camino rápido
    if (!arr.cache) arr.cache = congelar(arr.g, W, H);
    const c = arr.cache, s = cam.s * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.drawImage(capa, 0, 0);
    if (c.sprite) {
      g.drawImage(c.sprite, Math.round((c.x0 + c.ax - cam.x) * s), Math.round((c.y0 + c.ay - cam.y) * s));
    } else {                                     // grupo enorme: se dibuja pieza por pieza, pero solo ese grupo
      g.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      const v = vista(W, H);
      for (const p of arr.g.m) dp(g, p, v);
    }
    return;
  }
  pintarEscena(g, W, H, null);
}

// ---------- PIEZAS ----------
function hacerPieza(r, c, w, h, t, pad, s) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w + 2 * pad);
  cv.height = Math.ceil(h + 2 * pad);
  const x = cv.getContext("2d");
  x.translate(pad, pad);
  x.beginPath();
  x.moveTo(0, 0);
  arista(x, 0, 0, w, 0, s.arr, t);
  arista(x, w, 0, w, h, s.der, t);
  arista(x, w, h, 0, h, s.aba, t);
  arista(x, 0, h, 0, 0, s.izq, t);
  x.closePath();
  x.save();
  x.clip();
  x.drawImage(fuente, c * w - pad, r * h - pad, w + 2 * pad, h + 2 * pad, -pad, -pad, w + 2 * pad, h + 2 * pad);
  x.restore();
  x.lineJoin = "round";
  x.lineWidth = Math.max(1.4, w * 0.05);          // sombra fina por fuera para que se vea sobre el lino
  x.strokeStyle = "rgba(70,50,20,.22)";
  x.stroke();
  x.lineWidth = Math.max(1, w * 0.024);           // borde blanco, como en el original
  x.strokeStyle = "rgba(255,255,255,.96)";
  x.stroke();
  return cv;
}

function iniciar() {
  if (!fuente) return;
  acum = 0; t0 = 0; terminado = false; iniciado = false; pausado = false; colocadas = 0; guia = false;
  const pwS = fuente.width / cols, phS = fuente.height / rows;   // tamaño de pieza en px de la imagen
  kS = PIEZA_W / pwS;
  pw = PIEZA_W; ph = phS * kS;
  BW = cols * pw; BH = rows * ph;
  const t = 0.22 * Math.min(pwS, phS);            // alto de lengüeta
  const pad = Math.ceil(t * 1.1) + 2;
  padW = pad * kS;

  piezas = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s = {
        arr: r > 0 ? -bordes.aba[r - 1][c] : 0, der: bordes.der[r][c],
        aba: bordes.aba[r][c], izq: c > 0 ? -bordes.der[r][c - 1] : 0,
      };
      piezas.push({ r, c, x: 0, y: 0, rot: 0, ok: false, cv: hacerPieza(r, c, pwS, phS, t, pad, s) });
    }
  }
  repartir();
}

// Tablero al centro y las piezas amontonadas en las franjas de arriba y de abajo (como el original)
function repartir() {
  const W = lienzo.width / dpr, H = lienzo.height / dpr;
  const s = Math.min(ZOOM_MAX, (W * TABLERO_ANCHO) / BW, (H * 0.5) / BH);
  zoomMin = s * ZOOM_MIN_REL;                     // no se puede alejar más que esto (evita lag y alejarse sin querer)
  cam.s = s;
  cam.x = BW / 2 - W / (2 * s);
  cam.y = BH / 2 - H / (2 * s);

  const vx0 = cam.x, vx1 = cam.x + W / s, vy0 = cam.y, vy1 = cam.y + H / s;
  let aY0 = vy0 - ph * 0.2, aY1 = -ph * 1.05;     // franja de arriba (posiciones y de la esquina de la pieza)
  let bY0 = BH + ph * 0.05, bY1 = vy1 - ph * 0.8; // franja de abajo
  const ancho = vx1 - vx0;
  const altoDisp = Math.max(0, aY1 - aY0) + Math.max(0, bY1 - bY0);
  const altoNec = (piezas.length * pw * ph * DENSIDAD) / ancho;
  if (altoDisp < altoNec) {                       // muchas piezas: las franjas crecen hacia afuera (se baja/sube con el dedo)
    const extra = (altoNec - altoDisp) / 2;
    aY0 -= extra; bY1 += extra;
    if (aY1 < aY0 + ph) aY1 = aY0 + ph;
    if (bY1 < bY0 + ph) bY1 = bY0 + ph;
  }
  // Zona más chica: las franjas se acortan hacia el tablero (el lado pegado al tablero no se mueve)
  aY0 = aY1 - Math.max(ph, (aY1 - aY0) * ZONA_PIEZAS);
  bY1 = bY0 + Math.max(ph, (bY1 - bY0) * ZONA_PIEZAS);
  const hA = Math.max(1, aY1 - aY0), hB = Math.max(1, bY1 - bY0);
  for (const p of piezas) {
    p.x = vx0 - pw * 0.25 + Math.random() * (ancho - pw * 0.5);
    p.y = Math.random() < hA / (hA + hB) ? aY0 + Math.random() * hA : bY0 + Math.random() * hB;
    p.rot = rotacion ? Math.floor(Math.random() * 4) : 0;
    p.ok = false;
    p.g = { m: [p], ok: false };                  // grupo de una sola pieza
  }
  mundo = { x0: Math.min(vx0, 0) - pw, y0: aY0 - ph * 0.2, x1: Math.max(vx1, BW) + pw, y1: bY1 + ph * 1.2 };
  sueltas = piezas.map((p) => p.g).sort(() => Math.random() - 0.5);
  pedir();
}

function verTodo() {
  if (arr) arr.cache = null;
  const W = lienzo.width / dpr, H = lienzo.height / dpr;
  const ww = mundo.x1 - mundo.x0, hh = mundo.y1 - mundo.y0;
  cam.s = clamp(Math.min(W / ww, H / hh));
  cam.x = mundo.x0 - (W / cam.s - ww) / 2;
  cam.y = mundo.y0 - (H / cam.s - hh) / 2;
  pedir();
}

function jugar() {
  if (!fuente) return;
  pantalla("juego");
  tamano();
  $("pausaMenu").hidden = true; $("finMenu").hidden = true;
  if (opciones[idx].n > 300) {
    aviso("Preparando piezas…", true);
    setTimeout(() => { iniciar(); $("msg").hidden = true; }, 40);
  } else {
    $("msg").hidden = true;
    iniciar();
  }
  // Una imagen elegida del dispositivo se guarda sola en imgbb (en segundo plano, ya con el juego en pantalla)
  if (origenImg === "archivo" && !urlNube) setTimeout(() => guardarEnNube(true), 500);
}

// ---------- TIEMPO, PAUSA Y FINAL ----------
function iniciarReloj() {
  iniciado = true;
  if (!t0 && !terminado && !pausado) t0 = Date.now();
}

function pausar() {
  if (terminado || !piezas.length) return;
  pausado = true;
  if (t0) { acum += (Date.now() - t0) / 1000; t0 = 0; }
  $("pausaInfo").textContent = colocadas + " / " + piezas.length + " piezas · " + fmt(tiempoActual());
  $("pGuia").textContent = guia ? "Ocultar imagen guía" : "Ver imagen guía";
  $("pausaMenu").hidden = false;
}
function continuar() {
  pausado = false;
  $("pausaMenu").hidden = true;
  if (iniciado && !terminado) t0 = Date.now();
}
$("pausa").addEventListener("click", pausar);
$("pContinuar").addEventListener("click", continuar);
$("pGuia").addEventListener("click", () => { guia = !guia; if (arr) arr.cache = null; pedir(); continuar(); });
$("pTodo").addEventListener("click", () => { verTodo(); continuar(); });
$("pMezclar").addEventListener("click", () => {
  if (colocadas > 0 && !confirm("Se mezclarán de nuevo las piezas. ¿Continuar?")) return;
  $("pausaMenu").hidden = true;
  jugar();
});
$("pPiezas").addEventListener("click", () => {
  if (colocadas > 0 && !confirm("Se perderá el avance. ¿Continuar?")) return;
  $("pausaMenu").hidden = true;
  abrirAjustes(volverA);
});
$("pSalir").addEventListener("click", () => {
  if (colocadas > 0 && !confirm("Se perderá el avance. ¿Salir?")) return;
  $("pausaMenu").hidden = true;
  pantalla("menu");
});
$("fOtra").addEventListener("click", () => { $("finMenu").hidden = true; jugar(); });
$("fPiezas").addEventListener("click", () => { $("finMenu").hidden = true; abrirAjustes(volverA); });
$("fSalir").addEventListener("click", () => { $("finMenu").hidden = true; pantalla("menu"); });

async function ganar() {
  if (t0) { acum += (Date.now() - t0) / 1000; t0 = 0; }
  terminado = true;
  const pts = Math.max(1, Math.round(piezas.length / PIEZAS_POR_PUNTO));
  $("finInfo").textContent = piezas.length + " piezas · " + fmt(tiempoActual()) + " · +" + pts + " pts (si tienes sesión)";
  $("finMenu").hidden = false;
  try {
    const mod = await import("../compartido/jugador.js");
    await mod.sumarPuntos(ID, pts);
  } catch (e) {}
}

// ---------- ZOOM, ARRASTRE Y GIRO ----------
const punt = new Map();
let arr = null, pan = false, pinch = null;
const pos = (e) => { const r = rectL || (rectL = lienzo.getBoundingClientRect()); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const aMundo = (px, py) => ({ x: cam.x + px / cam.s, y: cam.y + py / cam.s });

function zoom(f, px, py) {
  if (arr) arr.cache = null;
  const wx = cam.x + px / cam.s, wy = cam.y + py / cam.s;
  cam.s = clamp(cam.s * f);
  cam.x = wx - px / cam.s;
  cam.y = wy - py / cam.s;
  pedir();
}

function buscar(wx, wy) {                        // devuelve { g: grupo, pz: pieza tocada } o null
  const hx = pw * 0.6, hy = ph * 0.6;
  for (let i = sueltas.length - 1; i >= 0; i--) {
    const gr = sueltas[i];
    for (const p of gr.m) {
      let dx = wx - (p.x + pw / 2), dy = wy - (p.y + ph / 2);
      for (let k = 0; k < p.rot; k++) { const t = dx; dx = dy; dy = -t; }   // deshace el giro de la pieza
      if (Math.abs(dx) <= hx && Math.abs(dy) <= hy) return { g: gr, pz: p };
    }
  }
  return null;
}

// ---------- GRUPOS: piezas vecinas que se pegan entre sí ----------
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function moverGrupo(gr, dx, dy) {
  for (const p of gr.m) { p.x += dx; p.y += dy; }
}

function girarGrupo(gr, pv) {                     // gira todo el grupo 90° alrededor de la pieza tocada
  const cx = pv.x + pw / 2, cy = pv.y + ph / 2;
  for (const p of gr.m) {
    const dx = p.x + pw / 2 - cx, dy = p.y + ph / 2 - cy;
    p.x = cx - dy - pw / 2;
    p.y = cy + dx - ph / 2;
    p.rot = (p.rot + 1) % 4;
  }
}

// ¿Alguna pieza del grupo está pegada a su vecina de verdad (la que le toca)? Si sí, une los dos grupos.
function unirUno(gr) {
  const tol = UNION * Math.min(pw, ph);
  for (const p of gr.m) {
    for (const [dc, dr] of VECINOS) {
      const c = p.c + dc, r = p.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const q = piezas[r * cols + c];
      if (q.g === gr || q.g.ok || q.rot !== p.rot) continue;     // solo si tienen el mismo giro
      // Dónde debería estar el centro de p respecto al de q (el desfase del tablero, girado igual que las piezas)
      let vx = -dc * pw, vy = -dr * ph;
      for (let k = 0; k < p.rot; k++) { const t = vx; vx = -vy; vy = t; }
      const ex = q.x + pw / 2 + vx, ey = q.y + ph / 2 + vy;
      const fx = ex - (p.x + pw / 2), fy = ey - (p.y + ph / 2);
      if (Math.hypot(fx, fy) >= tol) continue;
      moverGrupo(gr, fx, fy);                      // el grupo soltado se ajusta al que ya estaba
      const otro = q.g;
      for (const m of otro.m) { m.g = gr; gr.m.push(m); }
      sueltas.splice(sueltas.indexOf(otro), 1);
      return true;
    }
  }
  return false;
}

// ¿Alguna pieza del grupo está sobre su lugar del tablero (y sin girar)? Entonces TODO el grupo se queda fijo
function fijar(gr) {
  if (gr.m[0].rot !== 0) return false;
  const tol = IMAN * Math.min(pw, ph);
  for (const p of gr.m) {
    const fx = p.c * pw - p.x, fy = p.r * ph - p.y;
    if (Math.hypot(fx, fy) >= tol) continue;
    for (const m of gr.m) { m.x = m.c * pw; m.y = m.r * ph; m.rot = 0; m.ok = true; }
    gr.ok = true;
    sueltas.splice(sueltas.indexOf(gr), 1);
    colocadas += gr.m.length;
    if (colocadas === piezas.length) ganar();
    return true;
  }
  return false;
}

function asentar(gr) {                            // se llama al soltar un grupo (o al girarlo)
  let unido = false;
  while (unirUno(gr)) unido = true;               // puede pegarse con varios vecinos a la vez
  const fijo = fijar(gr);
  if ((unido || fijo) && navigator.vibrate) navigator.vibrate(fijo ? 25 : 12);
  pedir();
}

function soltar() {
  const gr = arr.g;
  arr = null;
  asentar(gr);
}

lienzo.addEventListener("pointerdown", (e) => {
  if (!fuente || !piezas.length || pausado || terminado) return;
  lienzo.setPointerCapture(e.pointerId);
  if (!punt.size) rectL = null;                   // al empezar un gesto se recalcula la posición del lienzo una vez
  const p = pos(e);
  punt.set(e.pointerId, p);
  if (punt.size === 1) {
    const w = aMundo(p.x, p.y);
    const hit = buscar(w.x, w.y);
    if (hit) {
      arr = { g: hit.g, pz: hit.pz, lx: w.x, ly: w.y, sx: p.x, sy: p.y, tx: 0, ty: 0, mov: false, cache: null };
      sueltas.splice(sueltas.indexOf(hit.g), 1);
      sueltas.push(hit.g);                        // el grupo queda encima
      iniciarReloj();
      pedir();
    } else pan = true;
  } else if (punt.size === 2) {
    if (arr) soltar();
    pan = false;
    const [a, b] = [...punt.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  e.preventDefault();
});

lienzo.addEventListener("pointermove", (e) => {
  if (!punt.has(e.pointerId)) return;
  const p = pos(e), ant = punt.get(e.pointerId);
  punt.set(e.pointerId, p);
  if (punt.size === 1) {
    if (arr) {                                    // la pieza sigue al dedo desde el primer píxel (sin zona muerta)
      const w = aMundo(p.x, p.y);
      const dx = w.x - arr.lx, dy = w.y - arr.ly;
      arr.lx = w.x; arr.ly = w.y;
      moverGrupo(arr.g, dx, dy);                  // todo el grupo se mueve junto
      arr.tx += dx; arr.ty += dy;                 // total movido (para deshacerlo si resulta ser un toque)
      if (arr.cache) { arr.cache.ax += dx; arr.cache.ay += dy; }
      // Con rotación activada, un movimiento corto sigue contando como «toque»; sin rotación, cualquier movimiento es arrastre
      if (!arr.mov && Math.hypot(p.x - arr.sx, p.y - arr.sy) > (rotacion ? TAP_PX : 0)) arr.mov = true;
      pedir();
    } else if (pan) {
      cam.x -= (p.x - ant.x) / cam.s; cam.y -= (p.y - ant.y) / cam.s;
      pedir();
    }
  } else if (punt.size === 2 && pinch) {
    const [a, b] = [...punt.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const wx = cam.x + pinch.cx / cam.s, wy = cam.y + pinch.cy / cam.s;
    cam.s = clamp((cam.s * d) / pinch.d);
    cam.x = wx - cx / cam.s; cam.y = wy - cy / cam.s;
    pinch.d = d; pinch.cx = cx; pinch.cy = cy;
    pedir();
  }
});

function fin(e) {
  if (!punt.has(e.pointerId)) return;
  punt.delete(e.pointerId);
  if (arr) {
    if (!arr.mov && rotacion && e.type === "pointerup") {   // un toque sin arrastrar gira la pieza 90°
      const { g: gr, pz, tx, ty } = arr;
      arr = null;
      moverGrupo(gr, -tx, -ty);                   // el toque no debe mover la pieza
      girarGrupo(gr, pz);
      asentar(gr);
    } else soltar();
  }
  pinch = null;
  pan = punt.size === 1;                          // si queda un dedo, sigue moviendo la vista
}
lienzo.addEventListener("pointerup", fin);
lienzo.addEventListener("pointercancel", fin);
lienzo.addEventListener("contextmenu", (e) => e.preventDefault());

lienzo.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = pos(e);
  zoom(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
}, { passive: false });

addEventListener("keydown", (e) => {
  if ($("juego").hidden) return;
  if (e.key === "Escape") { if (pausado) continuar(); else pausar(); }
});

// ---------- IMAGEN: LOCAL Y NUBE ----------
function cargar(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("No se pudo abrir la imagen"));
    i.src = src;
  });
}

function reducir(img) {
  const k = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const x = c.getContext("2d");
  x.fillStyle = "#fff";                           // fondo blanco para PNG/GIF con transparencia
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

$("archivo").addEventListener("change", async () => {
  const f = $("archivo").files[0];
  $("archivo").value = "";
  if (!f) return;
  if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return aviso("Usa una imagen JPG, PNG, WEBP o GIF");
  if (f.size > IMAGEN_MAX_MB * 1048576) return aviso("La imagen pesa más de " + IMAGEN_MAX_MB + " MB");
  const u = URL.createObjectURL(f);
  try {
    fuente = reducir(await cargar(u));
    origenImg = "archivo"; urlNube = null;
    abrirAjustes("menu");
  } catch (e) {
    aviso(e.message);
  } finally {
    URL.revokeObjectURL(u);
  }
});

// Solo se aceptan imágenes alojadas en imgbb (https://i.ibb.co/...)
function urlValida(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && /(^|\.)ibb\.co$/.test(x.hostname);
  } catch (e) { return false; }
}

async function elegirUrl(u, desde) {
  if (!urlValida(u)) return aviso("Enlace de imagen no permitido");
  try {
    aviso("Cargando imagen…", true);
    fuente = reducir(await cargar(u));
    origenImg = "nube"; urlNube = u;
    $("msg").hidden = true;
    abrirAjustes(desde);
  } catch (e) {
    aviso(e.message);
  }
}

function leerGaleria() {
  try { return JSON.parse(localStorage.getItem(CLAVE_GALERIA) || "[]").filter(urlValida); } catch (e) { return []; }
}
function guardarGaleria(u) {
  const l = [u, ...leerGaleria().filter((x) => x !== u)].slice(0, GUARDADAS_MAX);
  try { localStorage.setItem(CLAVE_GALERIA, JSON.stringify(l)); } catch (e) {}
}

// El token de Firebase demuestra al Apps Script que quien sube tiene sesión iniciada
async function tokenSesion() {
  const fb = await import("../compartido/firebase.js");
  const u = fb.auth && fb.auth.currentUser;
  if (!u) throw new Error("Entra con Google en el portal para guardar imágenes");
  return u.getIdToken();
}

// «Huella» de una imagen (dos sumas rápidas del texto base64): sirve para no subir dos veces la misma imagen
function huella(txt) {
  let a = 0x811c9dc5, b = 0x01000193 ^ txt.length;
  for (let i = 0; i < txt.length; i++) {
    const c = txt.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b + c, 0x85ebca6b) ^ (b >>> 13);
  }
  return (a >>> 0).toString(36) + "-" + (b >>> 0).toString(36) + "-" + txt.length;
}
function leerHuellas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_HUELLAS) || "{}"); } catch (e) { return {}; }
}
function guardarHuella(h, url) {
  const m = leerHuellas();
  delete m[h];
  m[h] = url;                                     // la más reciente queda al final
  const claves = Object.keys(m);
  for (const k of claves.slice(0, Math.max(0, claves.length - HUELLAS_MAX))) delete m[k];
  try { localStorage.setItem(CLAVE_HUELLAS, JSON.stringify(m)); } catch (e) {}
}

// Sube la imagen elegida a imgbb y la añade a «Mis imágenes». auto = true cuando lo dispara «Jugar»
let subiendo = null, avisoSesion = false;
async function guardarEnNube(auto) {
  const mia = fuente;                             // por si el jugador cambia de imagen mientras sube
  if (!mia || origenImg !== "archivo" || urlNube || subiendo === mia) return;
  if (URL_SUBIDA.startsWith("PEGA")) { if (!auto) aviso("Falta pegar la URL de tu Apps Script en compartido/configs.js"); return; }
  if (navigator.onLine === false) { aviso("Sin conexión: la imagen no se guardó en tu galería"); return; }
  let token;
  try {
    token = await tokenSesion();
  } catch (e) {
    if (!auto || !avisoSesion) aviso(e.message || "No se pudo comprobar la sesión");   // en automático, el aviso sale una sola vez
    avisoSesion = true;
    return;
  }
  subiendo = mia;
  $("guardar").disabled = true;
  aviso("Guardando imagen en tu galería…", true);
  try {
    const imagen = mia.toDataURL("image/jpeg", 0.88).split(",")[1];
    const h = huella(imagen);
    let url = leerHuellas()[h];                   // ¿ya se había subido esta misma imagen?
    if (!url || !urlValida(url)) {
      // Sin cabecera Content-Type (text/plain) para evitar el preflight CORS de Apps Script
      const r = await fetch(URL_SUBIDA, { method: "POST", body: JSON.stringify({ token, imagen }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo subir");
      url = j.url;
      guardarHuella(h, url);
    }
    guardarGaleria(url);
    pintarMenu();                                 // la tarjeta «Mis imágenes» muestra la más reciente
    if (fuente === mia) {
      urlNube = url;
      $("guardar").hidden = true;
      $("enlace").hidden = false;
    }
    aviso("Imagen guardada en tu galería ☁️");
  } catch (e) {
    aviso(e.message || "Error al subir");
  } finally {
    if (subiendo === mia) subiendo = null;
    if (fuente === mia && !urlNube) $("guardar").disabled = false;
  }
}
$("guardar").addEventListener("click", () => guardarEnNube(false));

$("enlace").addEventListener("click", async () => {
  if (!urlNube) return;
  const link = location.origin + location.pathname + "?img=" + encodeURIComponent(urlNube);
  try { await navigator.clipboard.writeText(link); aviso("Enlace copiado"); } catch (e) { prompt("Copia el enlace:", link); }
});

// ---------- ARRANQUE ----------
texturas();
pintarMenu();
pantalla("menu");
const q = new URLSearchParams(location.search).get("img");
if (q && urlValida(q)) elegirUrl(q, "menu");
