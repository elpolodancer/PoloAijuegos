// Ruta: pixelart/juego.js
// «Pixelart por números»: subes una imagen (se guarda en imgbb), se divide en una cuadrícula de
// 1000, 2500 o 5000 celdas por el lado largo y en hasta 60 colores numerados; la pintas con
// pincel o relleno. Solo se pinta una celda si el color elegido es el que le corresponde.

// ---------------- Ajustes ----------------
const ID = "pixelart";
const TAMANOS = [1000, 2500, 5000, 10000];   // celdas del lado más largo
const PUNTOS_IMAGEN = { 1000: 40, 2500: 100, 5000: 200, 10000: 400 }; // puntos al perfil por terminar la imagen (proporcionales al avance)
const N_COLORES = 60;                         // colores por defecto
const COLORES_POR_TAMANO = { 10000: 120 };    // tamaños con más colores
const MAX_LADO_SUBIDA = 2000;                 // la imagen se reduce a esto antes de subirla (y se convierte a WebP)
const MAX_BASE64 = 5.5e6;                     // el Apps Script acepta hasta ~6 MB
const GUARDAR_CADA = 2500;                    // ms entre guardados del avance
const GALERIA_KEY = "pixelart_galeria";
const ZOOM_MAX_PX = 64;                       // píxeles de pantalla por celda al acercar al máximo
const NUMEROS_DESDE_PX = 14;                  // desde este tamaño de celda (px CSS) se dibujan los números

const $ = (id) => document.getElementById(id);
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---------------- Módulos comunes (opcionales) ----------------
let jugador = null, firebase = null, configs = null, usuario = null;
const cargarComunes = (async () => {
  try { jugador = await import("../compartido/jugador.js"); } catch (e) {}
  try { firebase = await import("../compartido/firebase.js"); } catch (e) {}
  try { configs = await import("../compartido/configs.js"); } catch (e) {}
  try { if (jugador && jugador.alCambiarSesion) jugador.alCambiarSesion((u) => { usuario = u; }); } catch (e) {}
})();

async function obtenerToken() {
  await cargarComunes;
  if (!jugador) throw new Error("La sesión no está disponible (¿sin conexión?)");
  let u = (firebase && firebase.auth && firebase.auth.currentUser) || usuario;
  if (!u) {
    await jugador.entrar();
    for (let i = 0; i < 20 && !((firebase && firebase.auth && firebase.auth.currentUser) || usuario); i++) await new Promise((r) => setTimeout(r, 100));
    u = (firebase && firebase.auth && firebase.auth.currentUser) || usuario;
  }
  if (!u || typeof u.getIdToken !== "function") throw new Error("No se pudo leer tu sesión (revisa que compartido/firebase.js exporte «auth»)");
  return u.getIdToken();
}

function enviarPuntos(p) {
  try {
    if (p > 0 && usuario && jugador && jugador.sumarPuntos) Promise.resolve(jugador.sumarPuntos(ID, p)).catch(() => {});
  } catch (e) {}
}

// ---------------- Avisos y pantallas ----------------
let tAviso = null;
function aviso(txt) {
  const a = $("aviso");
  a.textContent = txt;
  a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => (a.hidden = true), 2200);
}
function cargando(msg, pct) {
  $("cargando").hidden = false;
  $("cargandoMsg").textContent = msg;
  $("cargandoBarra").style.width = (pct == null ? 0 : Math.round(pct * 100)) + "%";
}
const finCarga = () => ($("cargando").hidden = true);

// ---------------- Imágenes ----------------
function cargarImagen(url, cors) {
  return new Promise((ok, no) => {
    const im = new Image();
    if (cors) im.crossOrigin = "anonymous";
    im.onload = () => ok(im);
    im.onerror = () => no(new Error("No se pudo cargar la imagen"));
    im.src = url;
  });
}
function esIbb(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "ibb.co" || u.hostname.endsWith(".ibb.co"));
  } catch (e) { return false; }
}

// Convierte a WebP (mucho más liviano). Si el navegador no sabe crear WebP (Safari antiguo), usa JPEG.
async function reducirImagen(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const im = await cargarImagen(url, false);
    const k = Math.min(1, MAX_LADO_SUBIDA / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.imageSmoothingQuality = "high";
    x.drawImage(im, 0, 0, w, h);
    const formatos = ["image/webp", "image/jpeg"];
    for (const f of formatos) {
      for (const q of [0.85, 0.75, 0.65, 0.5]) {
        const url2 = c.toDataURL(f, q);
        if (!url2.startsWith("data:" + f)) break; // el navegador no soporta este formato
        const d = url2.split(",")[1];
        if (d.length < MAX_BASE64) return d;
      }
    }
    throw new Error("La imagen es demasiado pesada");
  } finally { URL.revokeObjectURL(url); }
}

async function subirImagen(b64) {
  await cargarComunes;
  const dest = configs && configs.URL_SUBIDA_IMAGENES;
  if (!dest) throw new Error("Falta URL_SUBIDA_IMAGENES en compartido/configs.js");
  const token = await obtenerToken();
  // text/plain evita el «preflight» de CORS, que Apps Script no responde
  const r = await fetch(dest, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token, imagen: b64 }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "No se pudo subir la imagen");
  if (!esIbb(j.url)) throw new Error("Respuesta inesperada del servidor de imágenes");
  return j.url;
}

// ---------------- Galería (localStorage) ----------------
function leerGaleria() {
  try { return JSON.parse(localStorage.getItem(GALERIA_KEY) || "[]").filter((g) => g && esIbb(g.url)); } catch (e) { return []; }
}
function guardarGaleria(l) { try { localStorage.setItem(GALERIA_KEY, JSON.stringify(l)); } catch (e) {} }

// ---------------- Avance (IndexedDB) ----------------
let dbP = null;
function db() {
  if (!dbP) dbP = new Promise((ok, no) => {
    const r = indexedDB.open("pixelart", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("partidas", { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  return dbP;
}
async function idbGet(id) {
  const d = await db();
  return new Promise((ok, no) => { const q = d.transaction("partidas").objectStore("partidas").get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => no(q.error); });
}
async function idbPut(rec) {
  const d = await db();
  return new Promise((ok, no) => { const t = d.transaction("partidas", "readwrite"); t.objectStore("partidas").put(rec); t.oncomplete = () => ok(); t.onerror = () => no(t.error); });
}
async function idbDel(id) {
  const d = await db();
  return new Promise((ok, no) => { const t = d.transaction("partidas", "readwrite"); t.objectStore("partidas").delete(id); t.oncomplete = () => ok(); t.onerror = () => no(t.error); });
}
const idPartida = (url, n) => url + "|" + n;

// ---------------- Paleta (corte por mediana + k-means) ----------------
function crearPaleta(im, nColores) {
  const L = 220;
  const k = Math.min(1, L / Math.max(im.naturalWidth, im.naturalHeight));
  const sw = Math.max(1, Math.round(im.naturalWidth * k)), sh = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = sw; c.height = sh;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff"; x.fillRect(0, 0, sw, sh);
  x.drawImage(im, 0, 0, sw, sh);
  const px = x.getImageData(0, 0, sw, sh).data;
  const n = sw * sh;
  const PESO = [2, 4, 3];

  let cajas = [{ ix: Array.from({ length: n }, (_, i) => i) }];
  function medir(b) {
    const mn = [255, 255, 255], mx = [0, 0, 0];
    for (const i of b.ix) for (let c3 = 0; c3 < 3; c3++) { const v = px[i * 4 + c3]; if (v < mn[c3]) mn[c3] = v; if (v > mx[c3]) mx[c3] = v; }
    let canal = 0, rango = 0;
    for (let c3 = 0; c3 < 3; c3++) { const r = (mx[c3] - mn[c3]) * PESO[c3]; if (r > rango) { rango = r; canal = c3; } }
    b.canal = canal; b.rango = rango;
  }
  medir(cajas[0]);
  while (cajas.length < nColores) {
    let mejor = -1, puntaje = 0;
    cajas.forEach((b, i) => { const p = b.rango * b.ix.length; if (b.ix.length > 1 && b.rango > 0 && p > puntaje) { puntaje = p; mejor = i; } });
    if (mejor < 0) break;
    const b = cajas[mejor], cn = b.canal;
    b.ix.sort((a, c2) => px[a * 4 + cn] - px[c2 * 4 + cn]);
    const m = b.ix.length >> 1;
    const A = { ix: b.ix.slice(0, m) }, B = { ix: b.ix.slice(m) };
    medir(A); medir(B);
    cajas.splice(mejor, 1, A, B);
  }
  let cen = cajas.map((b) => {
    let r = 0, g = 0, bl = 0;
    for (const i of b.ix) { r += px[i * 4]; g += px[i * 4 + 1]; bl += px[i * 4 + 2]; }
    const t = b.ix.length;
    return [r / t, g / t, bl / t];
  });
  // Refinar con k-means
  for (let it = 0; it < 5; it++) {
    const s = new Float64Array(cen.length * 3), cnt = new Uint32Array(cen.length);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      let best = 0, bd = Infinity;
      for (let j = 0; j < cen.length; j++) {
        const dr = r - cen[j][0], dg = g - cen[j][1], db2 = b - cen[j][2];
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db2 * db2;
        if (d < bd) { bd = d; best = j; }
      }
      s[best * 3] += r; s[best * 3 + 1] += g; s[best * 3 + 2] += b; cnt[best]++;
    }
    cen = cen.map((c0, j) => (cnt[j] ? [s[j * 3] / cnt[j], s[j * 3 + 1] / cnt[j], s[j * 3 + 2] / cnt[j]] : c0));
  }
  // Redondear, quitar repetidos y ordenar de oscuro a claro
  const vistos = new Set(), pal = [];
  for (const c0 of cen) {
    const q = c0.map(Math.round);
    const key = q.join(",");
    if (!vistos.has(key)) { vistos.add(key); pal.push(q); }
  }
  pal.sort((a, b) => 0.3 * a[0] + 0.59 * a[1] + 0.11 * a[2] - (0.3 * b[0] + 0.59 * b[1] + 0.11 * b[2]));
  return pal;
}

// Tabla color→número con 5 bits por canal (así cada celda se asigna con una sola consulta)
function crearLUT(pal) {
  const lut = new Uint8Array(32768);
  for (let r5 = 0; r5 < 32; r5++) for (let g5 = 0; g5 < 32; g5++) for (let b5 = 0; b5 < 32; b5++) {
    const r = r5 * 8 + 4, g = g5 * 8 + 4, b = b5 * 8 + 4;
    let best = 0, bd = Infinity;
    for (let j = 0; j < pal.length; j++) {
      const dr = r - pal[j][0], dg = g - pal[j][1], db2 = b - pal[j][2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db2 * db2;
      if (d < bd) { bd = d; best = j; }
    }
    lut[(r5 << 10) | (g5 << 5) | b5] = best;
  }
  return lut;
}

// Divide la imagen en celdas por franjas (así no hace falta un canvas gigante, que falla en iOS)
async function construirObjetivo(im, W, H, lut, nColores) {
  const target = new Uint8Array(W * H);
  const totales = new Uint32Array(nColores);
  const franja = Math.max(1, Math.min(H, Math.floor(1500000 / W)));
  const c = document.createElement("canvas");
  c.width = W;
  const x = c.getContext("2d", { willReadFrequently: true });
  for (let y0 = 0; y0 < H; y0 += franja) {
    const bh = Math.min(franja, H - y0);
    c.height = bh;
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, bh);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    const sy = (y0 * im.naturalHeight) / H, sh = (bh * im.naturalHeight) / H;
    x.drawImage(im, 0, sy, im.naturalWidth, sh, 0, 0, W, bh);
    const d = x.getImageData(0, 0, W, bh).data;
    let o = y0 * W;
    for (let p = 0; p < d.length; p += 4) {
      const v = lut[((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3)];
      target[o++] = v;
      totales[v]++;
    }
    cargando("Dividiendo en celdas…", (y0 + bh) / H);
    await frame();
  }
  return { target, totales };
}

// ---------------- Estado del juego ----------------
let J = null;          // partida abierta
let cvs, ctx, cw = 0, ch = 0, Q = 1, imgData, img32, colX;
let sucio = true, corriendo = false, tGuardar = null;
let radioPx = 18, modo = "pincel";
const HL = 0xff3fd2ff;      // celda del color elegido (ámbar), formato ABGR
const LINEA = 0xffc4c4c4;
const FONDO = 0xff1a222b;

const pintado = (i) => (J.bits[i >> 3] >> (i & 7)) & 1;
const marcar = (i) => { J.bits[i >> 3] |= 1 << (i & 7); };

function empaquetar(c) { return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; }

async function empezar(url, N) {
  cargando("Cargando imagen…", 0);
  try {
    const im = await cargarImagen(url, true);
    const larga = Math.max(im.naturalWidth, im.naturalHeight);
    const W = im.naturalWidth >= im.naturalHeight ? N : Math.max(1, Math.round((N * im.naturalWidth) / larga));
    const H = im.naturalWidth >= im.naturalHeight ? Math.max(1, Math.round((N * im.naturalHeight) / larga)) : N;
    const id = idPartida(url, N);
    let rec = null;
    try { rec = await idbGet(id); } catch (e) {}

    cargando("Eligiendo los colores…", 0);
    await frame();
    const pal = rec && rec.pal && rec.W === W && rec.H === H ? rec.pal : crearPaleta(im, COLORES_POR_TAMANO[N] || N_COLORES);
    const lut = crearLUT(pal);
    const { target, totales } = await construirObjetivo(im, W, H, lut, pal.length);

    const nBytes = (W * H + 7) >> 3;
    const bits = rec && rec.bits && rec.bits.length === nBytes ? new Uint8Array(rec.bits) : new Uint8Array(nBytes);
    const restantes = Uint32Array.from(totales);
    let pintadas = 0;
    for (let i = 0; i < W * H; i++) if ((bits[i >> 3] >> (i & 7)) & 1) { pintadas++; restantes[target[i]]--; }

    J = {
      url, N, W, H, id, pal, target, bits, totales, restantes, total: W * H, pintadas,
      puntosDados: (rec && rec.puntosDados) || 0,
      pal32: pal.map(empaquetar),
      ghost32: pal.map((c) => empaquetar(c.map((v) => Math.round(v * 0.14 + 238 * 0.86)))),
      sel: 0, escala: 1, ox: 0, oy: 0, vista: false,
    };
    abrirJuego();
  } catch (e) {
    aviso(e instanceof RangeError ? "Tu dispositivo no tiene memoria para este tamaño; prueba uno menor" : e.message || "No se pudo abrir la imagen");
  } finally {
    finCarga();
  }
}

function abrirJuego() {
  $("menu").hidden = true;
  $("juego").hidden = false;
  $("bVista").classList.remove("on");
  cvs = $("cv");
  ctx = cvs.getContext("2d");
  construirPaleta();
  ajustarCanvas();
  encajar();
  seleccionar(siguienteIncompleto(-1));
  ponerModo("pincel");
  corriendo = true;
  sucio = true;
  requestAnimationFrame(tick);
  if (J.pintadas === J.total) aviso("¡Esta imagen ya está completa! 🎉");
}

function cerrarJuego() {
  guardar();
  corriendo = false;
  J = null;
  $("juego").hidden = true;
  $("menu").hidden = false;
  pintarGaleria();
}

function tick() {
  if (!corriendo) return;
  if (sucio) { sucio = false; dibujar(); actualizarInfo(); }
  requestAnimationFrame(tick);
}

// ---------------- Paleta en pantalla ----------------
function construirPaleta() {
  const p = $("paleta");
  p.innerHTML = "";
  J.pal.forEach((c, v) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = String(v + 1);
    b.style.background = `rgb(${c[0]},${c[1]},${c[2]})`;
    b.style.color = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] > 140 ? "#000" : "#fff";
    b.dataset.v = v;
    if (J.totales[v] === 0) b.hidden = true;
    if (J.restantes[v] === 0) b.classList.add("hecho");
    b.addEventListener("click", () => seleccionar(v));
    p.appendChild(b);
  });
}
function siguienteIncompleto(desde) {
  const n = J.pal.length;
  for (let k = 1; k <= n; k++) {
    const v = (desde + k + n) % n;
    if (J.restantes[v] > 0) return v;
  }
  return Math.max(0, desde);
}
function seleccionar(v) {
  J.sel = v;
  [...$("paleta").children].forEach((b, i) => b.classList.toggle("sel", i === v));
  const b = $("paleta").children[v];
  if (b && b.scrollIntoView) b.scrollIntoView({ inline: "center", block: "nearest" });
  sucio = true;
}
function actualizarInfo() {
  $("pct").textContent = ((J.pintadas / J.total) * 100).toFixed(2) + "%";
  $("info").textContent = "Color " + (J.sel + 1) + " · faltan " + J.restantes[J.sel].toLocaleString("es");
}

// ---------------- Vista (zoom y desplazamiento) ----------------
function ajustarCanvas() {
  const r = $("lienzo").getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  Q = Math.max(0.6, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(1.2e6 / (w * h))));
  cw = Math.floor(w * Q); ch = Math.floor(h * Q);
  cvs.width = cw; cvs.height = ch;
  imgData = ctx.createImageData(cw, ch);
  img32 = new Uint32Array(imgData.data.buffer);
  colX = new Int32Array(cw);
  sucio = true;
}
const escalaEncaje = () => Math.min(cw / J.W, ch / J.H) * 0.98;
function limitarVista() {
  const lo = escalaEncaje() * 0.5, hi = ZOOM_MAX_PX * Q;
  J.escala = Math.max(lo, Math.min(hi, J.escala));
  const ai = J.W * J.escala, al = J.H * J.escala, m = 40 * Q;
  J.ox = ai <= cw ? (cw - ai) / 2 : Math.max(cw - ai - m, Math.min(m, J.ox));
  J.oy = al <= ch ? (ch - al) / 2 : Math.max(ch - al - m, Math.min(m, J.oy));
}
function encajar() {
  J.escala = escalaEncaje();
  J.ox = (cw - J.W * J.escala) / 2;
  J.oy = (ch - J.H * J.escala) / 2;
  limitarVista();
  sucio = true;
}
function zoomEn(px, py, factor) {
  const s0 = J.escala;
  J.escala = s0 * factor;
  limitarVista();
  const k = J.escala / s0;
  J.ox = px - (px - J.ox) * k;
  J.oy = py - (py - J.oy) * k;
  limitarVista();
  sucio = true;
}

// ---------------- Dibujo ----------------
let anillo = null; // {x, y} mientras se arrastra con el pincel
function dibujar() {
  if (!J) return;
  const { W, H, target, bits, pal32, ghost32, escala: s, ox, oy, sel, vista } = J;
  const rejilla = s >= 9 * Q;
  for (let x = 0; x < cw; x++) colX[x] = Math.floor((x + 0.5 - ox) / s);
  for (let y = 0; y < ch; y++) {
    const o0 = y * cw;
    const cy = Math.floor((y + 0.5 - oy) / s);
    if (cy < 0 || cy >= H) { img32.fill(FONDO, o0, o0 + cw); continue; }
    const base = cy * W;
    const bordeFila = rejilla && y > 0 && Math.floor((y - 0.5 - oy) / s) !== cy;
    for (let x = 0; x < cw; x++) {
      const cx = colX[x];
      if (cx < 0 || cx >= W) { img32[o0 + x] = FONDO; continue; }
      const i = base + cx, v = target[i];
      let c;
      if ((bits[i >> 3] >> (i & 7)) & 1 || vista) c = pal32[v];
      else {
        c = v === sel ? HL : ghost32[v];
        if (bordeFila || (rejilla && x > 0 && colX[x - 1] !== cx)) c = LINEA;
      }
      img32[o0 + x] = c;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Números de las celdas sin pintar
  if (!vista && s >= NUMEROS_DESDE_PX * Q) {
    const x0 = Math.max(0, Math.floor(-ox / s)), x1 = Math.min(W - 1, Math.floor((cw - ox) / s));
    const y0 = Math.max(0, Math.floor(-oy / s)), y1 = Math.min(H - 1, Math.floor((ch - oy) / s));
    ctx.font = "bold " + Math.floor(s * 0.5) + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if ((bits[i >> 3] >> (i & 7)) & 1) continue;
      const v = target[i];
      ctx.fillStyle = v === sel ? "#3a2a00" : "#6b6b6b";
      ctx.fillText(String(v + 1), ox + (x + 0.5) * s, oy + (y + 0.5) * s);
    }
  }
  if (anillo && modo === "pincel") {
    ctx.beginPath();
    ctx.arc(anillo.x, anillo.y, Math.max(radioPx * Q, 0.6 * J.escala), 0, Math.PI * 2);
    ctx.lineWidth = 2 * Q; ctx.strokeStyle = "#000"; ctx.stroke();
    ctx.lineWidth = Q; ctx.strokeStyle = "#fff"; ctx.stroke();
  }
}

// ---------------- Pintar ----------------
function cambio(n) {
  if (n <= 0) return;
  J.pintadas += n;
  J.restantes[J.sel] -= n;
  sucio = true;
  programarGuardado();
  const meta = Math.floor((J.pintadas / J.total) * PUNTOS_IMAGEN[J.N]);
  if (meta > J.puntosDados) { enviarPuntos(meta - J.puntosDados); J.puntosDados = meta; }
  if (J.restantes[J.sel] === 0) {
    const v = J.sel;
    $("paleta").children[v].classList.add("hecho");
    if (J.pintadas === J.total) { J.vista = true; $("bVista").classList.add("on"); aviso("¡Imagen completa! 🎉"); guardar(); }
    else { aviso("¡Color " + (v + 1) + " completo!"); seleccionar(siguienteIncompleto(v)); }
  }
}

function pintarDisco(fx, fy, r) {
  const { W, H, target, bits, sel } = J;
  const y0 = Math.max(0, Math.floor(fy - r)), y1 = Math.min(H - 1, Math.floor(fy + r));
  const r2 = r * r;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - fy;
    const m = r2 - dy * dy;
    if (m < 0) continue;
    const h = Math.sqrt(m);
    const xa = Math.max(0, Math.ceil(fx - h - 0.5)), xb = Math.min(W - 1, Math.floor(fx + h - 0.5));
    const base = y * W;
    for (let x = xa; x <= xb; x++) {
      const i = base + x;
      if (target[i] !== sel) continue;
      if ((bits[i >> 3] >> (i & 7)) & 1) continue;
      bits[i >> 3] |= 1 << (i & 7);
      n++;
    }
  }
  return n;
}
function estampar(px, py) {
  const s = J.escala;
  const r = Math.max(0.6, (radioPx * Q) / s);
  cambio(pintarDisco((px - J.ox) / s, (py - J.oy) / s, r));
}
function trazo(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const paso = Math.max(2 * Q, radioPx * Q * 0.5);
  const k = Math.max(1, Math.ceil(d / paso));
  for (let j = 1; j <= k; j++) estampar(a.x + ((b.x - a.x) * j) / k, a.y + ((b.y - a.y) * j) / k);
}

function rellenar(px, py) {
  const { W, H, target, bits } = J;
  const cx = Math.floor((px - J.ox) / J.escala), cy = Math.floor((py - J.oy) / J.escala);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return;
  const i0 = cy * W + cx, v = target[i0];
  if (pintado(i0)) { aviso("Esa celda ya está pintada"); return; }
  if (v !== J.sel) { seleccionar(v); aviso("Es el color " + (v + 1)); return; }
  const libre = (i) => target[i] === v && !((bits[i >> 3] >> (i & 7)) & 1);
  const pila = [i0];
  let n = 0;
  while (pila.length) {
    const i = pila.pop();
    if (!libre(i)) continue;
    const y = (i / W) | 0, fila = y * W, x = i - fila;
    let xa = x, xb = x;
    while (xa > 0 && libre(fila + xa - 1)) xa--;
    while (xb < W - 1 && libre(fila + xb + 1)) xb++;
    for (let k = xa; k <= xb; k++) { const j = fila + k; bits[j >> 3] |= 1 << (j & 7); n++; }
    for (const yy of [y - 1, y + 1]) {
      if (yy < 0 || yy >= H) continue;
      let dentro = false;
      for (let k = xa; k <= xb; k++) {
        const l = libre(yy * W + k);
        if (l && !dentro) { pila.push(yy * W + k); dentro = true; } else if (!l) dentro = false;
      }
    }
  }
  cambio(n);
}

// ---------------- Guardado ----------------
function programarGuardado() {
  if (tGuardar) return;
  tGuardar = setTimeout(() => { tGuardar = null; guardar(); }, GUARDAR_CADA);
}
function guardar() {
  clearTimeout(tGuardar); tGuardar = null;
  if (!J) return;
  idbPut({ id: J.id, url: J.url, N: J.N, W: J.W, H: J.H, pal: J.pal, bits: J.bits, pintadas: J.pintadas, puntosDados: J.puntosDados, fecha: Date.now() }).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (document.hidden) guardar(); });
addEventListener("pagehide", guardar);

// ---------------- Entrada (dedo, ratón, rueda) ----------------
const punteros = new Map();
let panUnico = false, ultimo = null, inicioTap = null, movio = false, gesto = null;
function pos(e) {
  const r = cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) * Q, y: (e.clientY - r.top) * Q };
}
function datosGesto() {
  const p = [...punteros.values()];
  return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2 };
}
function iniciarEntrada() {
  cvs = $("cv");
  cvs.addEventListener("contextmenu", (e) => e.preventDefault());
  cvs.addEventListener("pointerdown", (e) => {
    if (!J) return;
    cvs.setPointerCapture(e.pointerId);
    const p = pos(e);
    punteros.set(e.pointerId, p);
    if (punteros.size === 2) { gesto = datosGesto(); ultimo = null; anillo = null; sucio = true; return; }
    if (punteros.size > 2) return;
    movio = false;
    inicioTap = p;
    ultimo = p;
    panUnico = modo === "mover" || modo === "relleno" || e.button === 1 || e.button === 2;
    if (!panUnico && modo === "pincel") { anillo = p; estampar(p.x, p.y); sucio = true; }
  });
  cvs.addEventListener("pointermove", (e) => {
    if (!J || !punteros.has(e.pointerId)) return;
    const p = pos(e);
    punteros.set(e.pointerId, p);
    if (punteros.size === 2 && gesto) {
      const g = datosGesto();
      J.ox += g.cx - gesto.cx; J.oy += g.cy - gesto.cy;
      zoomEn(g.cx, g.cy, g.d / gesto.d);
      gesto = g;
      return;
    }
    if (punteros.size !== 1 || !ultimo) return;
    if (Math.hypot(p.x - inicioTap.x, p.y - inicioTap.y) > 8 * Q) movio = true;
    if (panUnico) {
      if (movio) { J.ox += p.x - ultimo.x; J.oy += p.y - ultimo.y; limitarVista(); sucio = true; }
    } else {
      anillo = p;
      trazo(ultimo, p);
      sucio = true;
    }
    ultimo = p;
  });
  const soltar = (e) => {
    if (!punteros.has(e.pointerId)) return;
    const eraUno = punteros.size === 1;
    punteros.delete(e.pointerId);
    if (punteros.size < 2) gesto = null;
    if (eraUno && J && modo === "relleno" && !movio && inicioTap && e.type === "pointerup") rellenar(inicioTap.x, inicioTap.y);
    if (!punteros.size) { ultimo = null; anillo = null; sucio = true; }
    else if (punteros.size === 1) { ultimo = [...punteros.values()][0]; panUnico = true; movio = true; }
  };
  cvs.addEventListener("pointerup", soltar);
  cvs.addEventListener("pointercancel", soltar);
  cvs.addEventListener("wheel", (e) => {
    if (!J) return;
    e.preventDefault();
    const p = pos(e);
    zoomEn(p.x, p.y, e.deltaY < 0 ? 1.2 : 1 / 1.2);
  }, { passive: false });
}

function ponerModo(m) {
  modo = m;
  document.querySelectorAll("[data-modo]").forEach((b) => b.classList.toggle("on", b.dataset.modo === m));
  anillo = null;
  sucio = true;
}

// ---------------- Menú y galería ----------------
function pintarGaleria() {
  const g = $("galeria");
  g.innerHTML = "";
  const lista = leerGaleria();
  if (!lista.length) {
    const v = document.createElement("div");
    v.className = "vacio";
    v.textContent = "Aún no hay imágenes. Toca «Subir imagen» para empezar.";
    g.appendChild(v);
    return;
  }
  lista.forEach((it) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "foto";
    const im = document.createElement("img");
    im.loading = "lazy"; im.alt = ""; im.src = it.url;
    const t = document.createElement("span");
    t.textContent = it.nombre || "Imagen";
    const x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.textContent = "✕"; x.title = "Quitar de la galería";
    x.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (!confirm("¿Quitar «" + (it.nombre || "Imagen") + "» de la galería y borrar su avance?")) return;
      guardarGaleria(leerGaleria().filter((o) => o.url !== it.url));
      for (const n of TAMANOS) { try { await idbDel(idPartida(it.url, n)); } catch (e) {} }
      pintarGaleria();
    });
    b.append(im, t, x);
    b.addEventListener("click", () => abrirPreparar(it.url));
    g.appendChild(b);
  });
}

async function abrirPreparar(url) {
  $("prevImg").src = url;
  const caja = $("tamanos");
  caja.innerHTML = "";
  for (const N of TAMANOS) {
    let pct = null;
    try { const r = await idbGet(idPartida(url, N)); if (r) pct = (r.pintadas / (r.W * r.H)) * 100; } catch (e) {}
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b" + (pct != null ? " fuerte" : "");
    const a = document.createElement("span");
    a.textContent = N + " × " + N;
    const c = document.createElement("small");
    c.textContent = pct != null ? "Continuar · " + pct.toFixed(1) + "%" : N === 1000 ? "1 millón de celdas" : N === 2500 ? "6,25 millones" : N === 5000 ? "25 millones" : "100 millones · 120 colores";
    b.append(a, c);
    b.addEventListener("click", () => { $("preparar").hidden = true; empezar(url, N); });
    caja.appendChild(b);
  }
  $("preparar").hidden = false;
}

async function alElegirArchivo(archivo) {
  const est = $("estadoSubida");
  try {
    if (!archivo || !archivo.type.startsWith("image/")) throw new Error("Elige un archivo de imagen");
    est.textContent = "Preparando imagen…";
    const b64 = await reducirImagen(archivo);
    est.textContent = "Subiendo…";
    const url = await subirImagen(b64);
    const nombre = (archivo.name || "Imagen").replace(/\.[^.]+$/, "").slice(0, 40);
    guardarGaleria([{ url, nombre, fecha: Date.now() }, ...leerGaleria().filter((o) => o.url !== url)]);
    est.textContent = "";
    pintarGaleria();
    abrirPreparar(url);
  } catch (e) {
    est.textContent = e.message || "No se pudo subir la imagen";
  }
}

// ---------------- Arranque ----------------
iniciarEntrada();
$("archivo").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; alElegirArchivo(f); });
$("cerrarPrep").addEventListener("click", () => ($("preparar").hidden = true));
$("volver").addEventListener("click", cerrarJuego);
document.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => ponerModo(b.dataset.modo)));
$("bVista").addEventListener("click", () => { if (!J) return; J.vista = !J.vista; $("bVista").classList.toggle("on", J.vista); sucio = true; });
$("bEncajar").addEventListener("click", () => J && encajar());
$("bReiniciar").addEventListener("click", () => {
  if (!J || !confirm("¿Borrar todo el avance de esta imagen? (los puntos ya ganados se conservan)")) return;
  J.bits.fill(0);
  J.pintadas = 0;
  J.restantes = Uint32Array.from(J.totales);
  J.vista = false;
  $("bVista").classList.remove("on");
  construirPaleta();
  seleccionar(siguienteIncompleto(-1));
  guardar();
  sucio = true;
});
$("radio").addEventListener("input", (e) => { radioPx = Number(e.target.value); });
addEventListener("resize", () => { if (J) { ajustarCanvas(); limitarVista(); } });

pintarGaleria();
const imgUrl = new URLSearchParams(location.search).get("img");
if (imgUrl && esIbb(imgUrl)) abrirPreparar(imgUrl);
