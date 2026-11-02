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
const IMAN = 0.35;              // qué tan cerca (fracción de pieza) para que encaje sola
const ZOOM_MAX = 8;
const ZOOM_MIN_REL = 0.6;       // lo más que se puede alejar: este % del zoom con el que empieza el juego (0.6 = 60 %)
const ZONA_PIEZAS = 0.4;        // tamaño de la zona donde se reparten las piezas (0.4 = 60 % más chica; 1 = como antes)
const TABLERO_ANCHO = 0.84;     // al empezar, el tablero ocupa este % del ancho de la pantalla
const DENSIDAD = 0.6;           // cuánto se pueden amontonar las piezas fuera del tablero (menos = más espacio)
const GUIA_TENUE = 0;           // transparencia de la imagen sobre el tablero (0 = vacío, como el original)
const TAP_PX = 8;               // movimiento máximo (px) para que un toque cuente como «girar pieza»
const PIEZAS_POR_PUNTO = 8;     // al perfil: 1 punto por cada 8 piezas
const GUARDADAS_MAX = 12;
const CLAVE_GALERIA = "rompecabezas:imagenes";

// Categorías del menú. Tipos: «galeria» (imágenes guardadas), «archivo» (elegir del dispositivo),
// «pintura» (imágenes dibujadas por el código; pintor = atardecer | bosque | oceano | mosaico | galaxia | globos)
// y «urls» (tus propias imágenes de ibb.co):  { id: "familia", nombre: "Familia", tipo: "urls", urls: ["https://i.ibb.co/..."] }
const CATEGORIAS = [
  { id: "mias", nombre: "Mis imágenes", tipo: "galeria", emoji: "📷" },
  { id: "archivo", nombre: "Desde mi dispositivo", tipo: "archivo", emoji: "➕" },
  { id: "atardeceres", nombre: "Atardeceres", tipo: "pintura", pintor: "atardecer", cuantas: 8 },
  { id: "bosques", nombre: "Bosques", tipo: "pintura", pintor: "bosque", cuantas: 8 },
  { id: "oceanos", nombre: "Océanos", tipo: "pintura", pintor: "oceano", cuantas: 8 },
  { id: "mosaicos", nombre: "Mosaicos", tipo: "pintura", pintor: "mosaico", cuantas: 8 },
  { id: "galaxias", nombre: "Galaxias", tipo: "pintura", pintor: "galaxia", cuantas: 8 },
  { id: "globos", nombre: "Globos", tipo: "pintura", pintor: "globos", cuantas: 8 },
];

// ---------- ESTADO ----------
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const g = lienzo.getContext("2d");
let dpr = 1;
let fuente = null;              // canvas con la imagen (ya reducida)
let origenImg = "";             // "archivo" | "nube" | "pintura"
let urlNube = null;
let volverA = "menu";           // a dónde regresa la X de los ajustes
let opciones = [], idx = 0, bordes = null;
let cols = 0, rows = 0, rotacion = false;
let pw = PIEZA_W, ph = PIEZA_W, BW = 0, BH = 0, padW = 0, kS = 1;
let piezas = [], sueltas = [], colocadas = 0;
let mundo = { x0: 0, y0: 0, x1: 0, y1: 0 };
let zoomMin = 0.1;              // se calcula al repartir las piezas (ZOOM_MIN_REL × zoom inicial)
let cam = { x: 0, y: 0, s: 1 };
let guia = false, t0 = 0, acum = 0, terminado = false, iniciado = false, pausado = false;
let sucio = false, temporizadorMsg = null, rafPrev = 0;

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

// ---------- IMÁGENES DIBUJADAS POR CÓDIGO (originales, sin archivos) ----------
function pAtardecer(x, W, H, r) {
  const h = r() * 360;
  const cielo = x.createLinearGradient(0, 0, 0, H * 0.75);
  cielo.addColorStop(0, `hsl(${(h + 220) % 360} 55% 22%)`);
  cielo.addColorStop(0.55, `hsl(${(h + 330) % 360} 70% 50%)`);
  cielo.addColorStop(1, `hsl(${(h + 30) % 360} 90% 70%)`);
  x.fillStyle = cielo; x.fillRect(0, 0, W, H);
  const sx = W * (0.25 + r() * 0.5), sy = H * (0.45 + r() * 0.12), sr = H * (0.08 + r() * 0.05);
  const halo = x.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 4);
  halo.addColorStop(0, "rgba(255,240,200,.9)"); halo.addColorStop(1, "rgba(255,200,120,0)");
  x.fillStyle = halo; x.fillRect(0, 0, W, H);
  x.fillStyle = "#fff6d8"; x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.fill();
  for (let i = 0; i < 4; i++) {
    const base = H * (0.62 + i * 0.1), amp = H * (0.12 - i * 0.015), f = 2 + r() * 3, ph = r() * 9;
    x.fillStyle = `hsl(${(h + 260) % 360} ${35 - i * 5}% ${28 - i * 6}%)`;
    x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 8) {
      x.lineTo(px, base - amp * (Math.sin((px / W) * f * 6.28 + ph) * 0.5 + Math.sin((px / W) * f * 17 + ph * 2) * 0.3 + 0.5));
    }
    x.lineTo(W, H); x.closePath(); x.fill();
  }
}
function pBosque(x, W, H, r) {
  const h = 90 + r() * 90;
  const cielo = x.createLinearGradient(0, 0, 0, H);
  cielo.addColorStop(0, `hsl(${h + 40} 60% 80%)`); cielo.addColorStop(1, `hsl(${h} 50% 90%)`);
  x.fillStyle = cielo; x.fillRect(0, 0, W, H);
  for (let capa = 0; capa < 6; capa++) {
    const y0 = H * (0.42 + capa * 0.11), n = 9 + capa * 5;
    x.fillStyle = `hsl(${h} ${38 + capa * 7}% ${64 - capa * 9}%)`;
    for (let i = 0; i < n; i++) {
      const px = ((i + r() * 0.8) / n) * W * 1.1 - W * 0.05, hh = H * (0.2 + capa * 0.035) * (0.8 + r() * 0.5), ww = hh * 0.46;
      x.beginPath(); x.moveTo(px, y0 - hh); x.lineTo(px + ww / 2, y0); x.lineTo(px - ww / 2, y0); x.fill();
    }
    x.fillRect(0, y0, W, H - y0);
  }
}
function pOceano(x, W, H, r) {
  const h = 180 + r() * 50;
  const cielo = x.createLinearGradient(0, 0, 0, H * 0.5);
  cielo.addColorStop(0, `hsl(${h + 10} 70% 62%)`); cielo.addColorStop(1, `hsl(${h - 120} 90% 82%)`);
  x.fillStyle = cielo; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.arc(W * (0.2 + r() * 0.6), H * 0.22, H * 0.07, 0, 7); x.fill();
  for (let i = 0; i < 7; i++) {
    const base = H * (0.46 + i * 0.08), amp = H * (0.015 + i * 0.006), f = 3 + r() * 5, ph = r() * 9;
    x.fillStyle = `hsl(${h} ${75 - i * 3}% ${62 - i * 7}%)`;
    x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 6) x.lineTo(px, base + amp * Math.sin((px / W) * f * 6.28 + ph));
    x.lineTo(W, H); x.closePath(); x.fill();
  }
}
function pMosaico(x, W, H, r) {
  const h = r() * 360, n = 16, c = W / n;
  x.fillStyle = `hsl(${h} 40% 18%)`; x.fillRect(0, 0, W, H);
  for (let j = 0; j * c < H + c; j++) {
    for (let i = 0; i < n; i++) {
      const hh = (h + r() * 140) % 360;
      x.fillStyle = `hsl(${hh} 80% ${45 + r() * 20}%)`;
      x.beginPath(); x.arc(i * c + c / 2, j * c + c / 2, c * 0.46, 0, 7); x.fill();
      x.fillStyle = `hsl(${(hh + 40) % 360} 85% 75%)`;
      x.beginPath(); x.arc(i * c + c / 2, j * c + c / 2, c * (0.12 + r() * 0.18), 0, 7); x.fill();
    }
  }
}
function pGalaxia(x, W, H, r) {
  x.fillStyle = "#050818"; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "lighter";
  const h = r() * 360;
  for (let i = 0; i < 9; i++) {
    const px = W * (0.1 + r() * 0.8), py = H * (0.1 + r() * 0.8), rr = H * (0.25 + r() * 0.35);
    const gr = x.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, `hsla(${(h + i * 38) % 360},90%,55%,.45)`); gr.addColorStop(1, "hsla(0,0%,0%,0)");
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < 700; i++) {
    x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    const s = r() < 0.04 ? 3 : 1.2; x.fillRect(r() * W, r() * H, s, s);
  }
  x.globalCompositeOperation = "source-over";
}
function pGlobos(x, W, H, r) {
  const h = 190 + r() * 40;
  const cielo = x.createLinearGradient(0, 0, 0, H);
  cielo.addColorStop(0, `hsl(${h} 80% 60%)`); cielo.addColorStop(1, `hsl(${h - 30} 85% 88%)`);
  x.fillStyle = cielo; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 38; i++) {
    const px = r() * W, py = H * 0.1 + r() * H * 0.75, rr = H * (0.05 + r() * 0.07), hh = r() * 360;
    x.strokeStyle = "rgba(60,60,80,.45)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(px, py + rr * 1.15); x.quadraticCurveTo(px + rr * 0.3, py + rr * 2, px, py + rr * 2.6); x.stroke();
    const gr = x.createRadialGradient(px - rr * 0.3, py - rr * 0.35, rr * 0.1, px, py, rr * 1.2);
    gr.addColorStop(0, `hsl(${hh} 90% 78%)`); gr.addColorStop(1, `hsl(${hh} 80% 45%)`);
    x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, rr * 0.88, rr * 1.12, 0, 0, 7); x.fill();
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(px - rr * 0.3, py - rr * 0.4, rr * 0.16, rr * 0.28, 0.5, 0, 7); x.fill();
  }
}
const PINTORES = { atardecer: pAtardecer, bosque: pBosque, oceano: pOceano, mosaico: pMosaico, galaxia: pGalaxia, globos: pGlobos };

function pintar(pintor, semilla, W, H) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  PINTORES[pintor](c.getContext("2d"), W, H, rng(semilla * 7919 + 13));
  return c;
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
    if (c.tipo === "pintura") marco = pintar(c.pintor, 1, 320, 240);
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
    if (!lista.length) vacio("Aún no hay imágenes guardadas. Elige una desde tu dispositivo y toca «Guardar imagen».");
    for (const u of lista) cont.appendChild(carta(marcoImg(u), "", () => elegirUrl(u, "cat")));
  } else if (c.tipo === "urls") {
    const lista = (c.urls || []).filter(urlValida);
    if (!lista.length) vacio("Esta categoría no tiene imágenes válidas de ibb.co.");
    for (const u of lista) cont.appendChild(carta(marcoImg(u), "", () => elegirUrl(u, "cat")));
  } else {
    for (let i = 1; i <= (c.cuantas || 8); i++) {
      cont.appendChild(carta(pintar(c.pintor, i, 320, 240), "", () => {
        fuente = pintar(c.pintor, i, 1600, 1200);
        origenImg = "pintura"; urlNube = null;
        abrirAjustes("cat");
      }));
    }
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

function dibujar() {
  sucio = false;
  const W = lienzo.width, H = lienzo.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);                       // el fondo de lino es CSS (queda quieto detrás)
  if (!fuente || !piezas.length) return;
  const s = cam.s * dpr;
  g.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";

  if (guia || GUIA_TENUE > 0) {
    g.globalAlpha = guia ? 0.6 : GUIA_TENUE;
    g.drawImage(fuente, 0, 0, BW, BH);
    g.globalAlpha = 1;
  }
  g.strokeStyle = "rgba(255,255,255,.95)";
  g.lineWidth = 2.5 / cam.s;
  g.strokeRect(0, 0, BW, BH);

  const vx1 = cam.x + W / s, vy1 = cam.y + H / s;
  const m = Math.max(pw, ph) * 0.9 + padW;       // margen (cabe una pieza girada)
  const dp = (p) => {
    const cx = p.x + pw / 2, cy = p.y + ph / 2;
    if (cx + m < cam.x || cx - m > vx1 || cy + m < cam.y || cy - m > vy1) return;
    g.save();
    g.translate(cx, cy);
    if (p.rot) g.rotate((p.rot * Math.PI) / 2);
    g.drawImage(p.cv, -pw / 2 - padW, -ph / 2 - padW, p.cv.width * kS, p.cv.height * kS);
    g.restore();
  };
  for (const p of piezas) if (p.ok) dp(p);
  for (const p of sueltas) dp(p);
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
  }
  mundo = { x0: Math.min(vx0, 0) - pw, y0: aY0 - ph * 0.2, x1: Math.max(vx1, BW) + pw, y1: bY1 + ph * 1.2 };
  sueltas = piezas.slice().sort(() => Math.random() - 0.5);
  pedir();
}

function verTodo() {
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
$("pGuia").addEventListener("click", () => { guia = !guia; pedir(); continuar(); });
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
const pos = (e) => { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const aMundo = (px, py) => ({ x: cam.x + px / cam.s, y: cam.y + py / cam.s });

function zoom(f, px, py) {
  const wx = cam.x + px / cam.s, wy = cam.y + py / cam.s;
  cam.s = clamp(cam.s * f);
  cam.x = wx - px / cam.s;
  cam.y = wy - py / cam.s;
  pedir();
}

function buscar(wx, wy) {
  const hx = pw * 0.6, hy = ph * 0.6;
  for (let i = sueltas.length - 1; i >= 0; i--) {
    const p = sueltas[i];
    let dx = wx - (p.x + pw / 2), dy = wy - (p.y + ph / 2);
    for (let k = 0; k < p.rot; k++) { const t = dx; dx = dy; dy = -t; }   // deshace el giro de la pieza
    if (Math.abs(dx) <= hx && Math.abs(dy) <= hy) return p;
  }
  return null;
}

function encajar(p) {                              // ¿está en su lugar (y sin girar)? entonces se queda fija
  if (p.rot !== 0 || Math.hypot(p.x - p.c * pw, p.y - p.r * ph) >= IMAN * Math.min(pw, ph)) return false;
  p.x = p.c * pw; p.y = p.r * ph; p.ok = true;
  sueltas.splice(sueltas.indexOf(p), 1);
  colocadas++;
  if (navigator.vibrate) navigator.vibrate(12);
  if (colocadas === piezas.length) ganar();
  return true;
}

function soltar() {
  const p = arr.pz;
  arr = null;
  encajar(p);
  pedir();
}

lienzo.addEventListener("pointerdown", (e) => {
  if (!fuente || !piezas.length || pausado || terminado) return;
  lienzo.setPointerCapture(e.pointerId);
  const p = pos(e);
  punt.set(e.pointerId, p);
  if (punt.size === 1) {
    const w = aMundo(p.x, p.y);
    const pz = buscar(w.x, w.y);
    if (pz) {
      arr = { pz, dx: w.x - pz.x, dy: w.y - pz.y, sx: p.x, sy: p.y, mov: false };
      sueltas.splice(sueltas.indexOf(pz), 1);
      sueltas.push(pz);                           // queda encima
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
    if (arr) {
      if (!arr.mov && Math.hypot(p.x - arr.sx, p.y - arr.sy) > TAP_PX) arr.mov = true;
      if (arr.mov) {
        const w = aMundo(p.x, p.y);
        arr.pz.x = w.x - arr.dx; arr.pz.y = w.y - arr.dy;
        pedir();
      }
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
      const p = arr.pz;
      arr = null;
      p.rot = (p.rot + 1) % 4;
      encajar(p);
      pedir();
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

$("guardar").addEventListener("click", async () => {
  if (!fuente || origenImg !== "archivo" || urlNube) return;
  if (URL_SUBIDA.startsWith("PEGA")) return aviso("Falta pegar la URL de tu Apps Script en compartido/configs.js");
  const b = $("guardar");
  b.disabled = true;
  aviso("Subiendo imagen…", true);
  try {
    const token = await tokenSesion();
    const imagen = fuente.toDataURL("image/jpeg", 0.88).split(",")[1];
    // Sin cabecera Content-Type (text/plain) para evitar el preflight CORS de Apps Script
    const r = await fetch(URL_SUBIDA, { method: "POST", body: JSON.stringify({ token, imagen }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "No se pudo subir");
    urlNube = j.url;
    guardarGaleria(j.url);
    $("guardar").hidden = true;
    $("enlace").hidden = false;
    aviso("Imagen guardada ☁️");
  } catch (e) {
    b.disabled = false;
    aviso(e.message || "Error al subir");
  }
});

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
