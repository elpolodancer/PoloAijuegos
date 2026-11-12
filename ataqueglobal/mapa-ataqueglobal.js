// Ruta: ataqueglobal/mapa-ataqueglobal.js
// EL MUNDO de Ataque Global: un GLOBO en 3D (proyección ortográfica dibujada en un <canvas>, sin librerías).
// Arrastra para girar el planeta (con un poco de inercia), pellizca / rueda / botones / teclas + − 0 para el zoom, toca un país para seleccionarlo.
// Zoom: desde el planeta completo flotando en el espacio (imagen de referencia 1) hasta un par de países llenando la pantalla (imagen 2).
// No usa Firebase ni red. Los contornos vienen de paises-ataqueglobal.js (generado; ver herramientas/).
//
// Uso (mismas funciones que antes, el resto del juego no cambia):
//   import { crearMundo } from "./mapa-ataqueglobal.js";
//   const mundo = crearMundo({ lienzo, alSeleccionar: (iso) => {}, giroAuto: false });
//   mundo.iniciar(); mundo.detener(); mundo.reiniciarVista() (planeta completo); mundo.vistaInicial(); mundo.zoom(1.6);
//   mundo.seleccionar("BR"); mundo.enfocar("BR", 6) (centra el país y acerca); mundo.aPantalla(lon, lat) → [x, y] o null si está al otro lado;
//   mundo.setVision(["MX"], 0.10) → NIEBLA NEGRA: solo se ve esa fracción (0 a 1) de la superficie del planeta alrededor de esos países; 1 = sin niebla.
//     Sin llamarla, todo el planeta está tapado. Bajo la niebla no se dibuja, no se nombra ni se puede tocar nada. mundo.vision() devuelve la fracción.
//   mundo.centrarEn("MX") → centra la cámara en el país y lo acerca. mundo.setDueno("MX", "#fff23a", true): 3.er parámetro = es del jugador (trazo brillante con resplandor).
//   mundo.setDueno("US", "#ff3b30") → país de un bot: se tiñe fuerte de su color y lleva un trazo de ese color.
//   mundo.setDueno("MX", "#ffb020"); mundo.setDestruido("BR", true); mundo.limpiarEstados(); mundo.paises();
//   mundo.posicion("MX") → { x, y, visible }: dónde cae el centro del país en pantalla (lo usa el menú circular). crearMundo({ alCuadro }) llama a alCuadro tras pintar cada cuadro.
//   mundo.modoApuntar(fn) → mientras haya fn, tocar el mapa NO selecciona: llama fn({ x, y, lon, lat, iso, visible }) (iso = territorio tocado, null si es mar o está bajo la niebla); modoApuntar(null) lo apaga.
//   mundo.setMira(lon, lat) dibuja una mira en ese punto (setMira(null) la quita). mundo.lanzar({ de:[lon,lat], a:[lon,lat], ms, espera, color, alImpactar }) manda un misil: vuela, explota y llama alImpactar. mundo.cancelarVuelos().
//   centroTerritorio(iso) → [lon, lat]; radioTerritorio(iso) → grados; distanciaAngular([lon,lat],[lon,lat]) → grados.
//   vecinosDe("MX") → ids de los territorios que tocan a MX (PROVISIONAL: se calcula con los contornos; ver el comentario de VECINOS).
import { PAISES, NOMBRES_ESPECIALES, DIVISIONES } from "./paises-ataqueglobal.js";
import { nombrePais } from "../compartido/etapas-mapa.js";

// Estados Unidos, Canadá y Rusia NO existen como un solo territorio: están partidos en divisiones independientes (ids US1…US5, CA1…CA9, RU1…RU7;
// ver DIVISIONES en paises-ataqueglobal.js). Cada división se comporta como un país más (dueño, selección, niebla, destrucción).
export const nombreTerritorio = (iso) => NOMBRES_ESPECIALES[iso] || nombrePais(iso);
// Rótulo corto que se pinta sobre el mapa (la ficha usa el nombre completo)
export const etiquetaTerritorio = (iso) => (DIVISIONES[iso] && DIVISIONES[iso].corto) || nombreTerritorio(iso);
// País entero al que pertenece un territorio (una división de EE. UU. → "US"; cualquier otro → él mismo)
export const paisDe = (iso) => (DIVISIONES[iso] ? DIVISIONES[iso].pais : iso);
// Divisiones de un país entero: divisionesDe("CA") → ["CA1", …, "CA9"]; si no está dividido → [iso]
export const divisionesDe = (pais) => { const l = Object.keys(DIVISIONES).filter((k) => DIVISIONES[k].pais === pais); return l.length ? l : [pais]; };
// «IL» es Palestina/Israel: lleva las dos banderas. Las banderas emoji se ven como letras en algunos sistemas (Windows).
export const banderaTerritorio = (iso) => {
  const f = (c) => String.fromCodePoint(...[...c].map((x) => 0x1f1e6 + x.charCodeAt(0) - 65));
  iso = paisDe(iso); // una división lleva la bandera de su país
  return iso === "IL" ? f("PS") + f("IL") : f(iso);
};

const RAD = Math.PI / 180, DOS_PI = Math.PI * 2;
const PASO_MAX = 2;            // al preparar los contornos, ningún lado mide más de esto (grados): así las líneas largas se curvan con el globo
const ZOOM_MAX = 30;           // veces que se puede acercar desde el planeta completo
const TIERRAS = ["#2f5f2b", "#356a30", "#2a5527"]; // verde oscuro de tierra con césped: tres tonos casi iguales (cada país usa uno, estable por código)
const ALFA_BOT = 0.72;         // un país de un bot se tiñe MUCHO de su color para identificarlo de un vistazo
const ALFA_JUGADOR = 0.12;     // tu país conserva su verde casi intacto: lo que lo distingue es su trazo brillante
// NIEBLA DE GUERRA. La visión se mide como fracción de la SUPERFICIE del planeta: un casquete esférico alrededor de cada país propio.
// Un casquete que cubre la fracción f tiene radio angular θ con cos θ = 1 − 2f: 10 % ≈ 37°, 50 % = un hemisferio, 100 % = todo (sin niebla).
const FUNDIDO_NIEBLA = 0.07;   // borde difuso (en coseno): dentro del radio se ve limpio y, un poco afuera, se oscurece hasta negro total
const MARGEN_TOQUE = 0.02;     // dentro de este margen del borde el terreno aún cuenta como visto; más afuera no se puede tocar ni se escribe su nombre
const COLOR_SEL = "#86d65e", COLOR_DESTRUIDO = "#0b0b0b"; // el seleccionado se aclara a verde césped (y lleva trazo blanco)

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const azar = (semilla) => () => ((semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0) / 4294967296);
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const dif = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // ángulo equivalente en (−π, π]

// ----- Geometría preprocesada (una sola vez) -----
function densificar(flat) { // [lon,lat,…] → lo mismo con puntos extra en los lados largos
  const out = [], n = flat.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, x0 = flat[i * 2], y0 = flat[i * 2 + 1], x1 = flat[j * 2], y1 = flat[j * 2 + 1];
    out.push(x0, y0);
    const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    if (d > PASO_MAX && d < 180) { const m = Math.ceil(d / PASO_MAX); for (let k = 1; k < m; k++) out.push(x0 + ((x1 - x0) * k) / m, y0 + ((y1 - y0) * k) / m); }
  }
  return out;
}
function trig(flat) { // seno y coseno de lon y lat de cada punto, para proyectar rápido en cada cuadro
  const n = flat.length / 2, t = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const l = flat[i * 2] * RAD, p = flat[i * 2 + 1] * RAD;
    t[i * 4] = Math.sin(l); t[i * 4 + 1] = Math.cos(l); t[i * 4 + 2] = Math.sin(p); t[i * 4 + 3] = Math.cos(p);
  }
  return t;
}
function centroide(a) { // centroide con signo de un anillo plano [x,y,x,y…]
  let A = 0, cx = 0, cy = 0;
  const n = a.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const x0 = a[j * 2], y0 = a[j * 2 + 1], x1 = a[i * 2], y1 = a[i * 2 + 1], f = x0 * y1 - x1 * y0;
    A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  if (Math.abs(A) < 1e-9) return [a[0], a[1], 0];
  return [cx / (3 * A), cy / (3 * A), Math.abs(A / 2)];
}
function dentro(a, x, y) { // punto en anillo (par-impar)
  let r = false;
  const n = a.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = a[i * 2], yi = a[i * 2 + 1], xj = a[j * 2], yj = a[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}
const vec = (lon, lat) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];

const LISTA = [];
for (const iso of Object.keys(PAISES)) {
  const d = PAISES[iso];
  const orig = d.r.map((f) => Float32Array.from(f));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, mayor = null, areaMayor = -1;
  const partes = []; // cada anillo con su ancho y alto (para poder elegir el principal por un punto «centro»)
  for (const a of orig) {
    let ax0 = 1e9, ax1 = -1e9, ay0 = 1e9, ay1 = -1e9;
    for (let i = 0; i < a.length; i += 2) { ax0 = Math.min(ax0, a[i]); ax1 = Math.max(ax1, a[i]); ay0 = Math.min(ay0, a[i + 1]); ay1 = Math.max(ay1, a[i + 1]); }
    x0 = Math.min(x0, ax0); x1 = Math.max(x1, ax1); y0 = Math.min(y0, ay0); y1 = Math.max(y1, ay1);
    const ar = (ax1 - ax0) * (ay1 - ay0);
    partes.push({ a, w: ax1 - ax0, h: ay1 - ay0 });
    if (ar > areaMayor) { areaMayor = ar; mayor = partes[partes.length - 1]; }
  }
  const fijo = DIVISIONES[iso] && DIVISIONES[iso].centro; // división con partes separadas (Alaska): la parte principal es la que contiene este punto
  if (fijo) { const p = partes.find((q) => dentro(q.a, fijo[0], fijo[1])); if (p) mayor = p; }
  const [cx, cy, area] = centroide(mayor.a);
  const cv = vec(cx, cy);
  let ang = 0; // radio angular del país (para saber si está del lado oculto sin proyectarlo)
  for (const a of orig) for (let i = 0; i < a.length; i += 2) { const v = vec(a[i], a[i + 1]); ang = Math.max(ang, Math.acos(acotar(v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2], -1, 1))); }
  let angPrincipal = 0; // radio angular de la parte más grande del país: su propio territorio siempre se ve completo bajo la niebla
  for (let i = 0; i < mayor.a.length; i += 2) { const v = vec(mayor.a[i], mayor.a[i + 1]); angPrincipal = Math.max(angPrincipal, Math.acos(acotar(v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2], -1, 1))); }
  const micro = !!d.m;
  const anillos = micro ? [] : orig.map((a) => { const f = densificar(a); return { t: trig(f), n: f.length / 2 }; });
  LISTA.push({
    iso, micro, orig, anillos, bbox: [x0, y0, x1, y1], c: [cx, cy], cv, ang, angPrincipal, area, ww: mayor.w, hh: mayor.h,
    radio: micro ? Math.max((x1 - x0) / 2, (y1 - y0) / 2) : 0, // grados
    color: TIERRAS[hash(iso) % TIERRAS.length],
  });
}
LISTA.sort((p, q) => Number(p.micro) - Number(q.micro) || q.area - p.area); // grandes primero, marcadores al final
const POR_ISO = new Map(LISTA.map((p) => [p.iso, p]));

// ----- Vecindad (PROVISIONAL, README fase 2: grafo real con Natural Earth) -----
// Dos territorios son vecinos si algún vértice de uno queda a menos de ~1° de un vértice del otro (los contornos generados comparten sus fronteras).
// Los que quedan sin vecino (islas) se enlazan con los 2 más cercanos a menos de 25°, en los dos sentidos.
let VECINOS = null;
function calcularVecinos() {
  const CELDA = 0.6, celdas = new Map(), clave = (x, y) => x + "," + y, V = new Map();
  for (const p of LISTA) for (const a of p.orig) for (let i = 0; i < a.length; i += 2) {
    const k = clave(Math.floor(a[i] / CELDA), Math.floor(a[i + 1] / CELDA));
    let s = celdas.get(k); if (!s) { s = new Set(); celdas.set(k, s); } s.add(p.iso);
  }
  for (const p of LISTA) {
    const set = new Set();
    for (const a of p.orig) for (let i = 0; i < a.length; i += 2) {
      const cx = Math.floor(a[i] / CELDA), cy = Math.floor(a[i + 1] / CELDA);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const s = celdas.get(clave(cx + dx, cy + dy)); if (s) for (const o of s) if (o !== p.iso) set.add(o); }
    }
    V.set(p.iso, set);
  }
  for (const p of LISTA) {
    if (V.get(p.iso).size) continue;
    const cerca = LISTA.filter((q) => q !== p).map((q) => [q, Math.acos(acotar(p.cv[0] * q.cv[0] + p.cv[1] * q.cv[1] + p.cv[2] * q.cv[2], -1, 1))])
      .filter((x) => x[1] <= 25 * RAD).sort((a, b) => a[1] - b[1]).slice(0, 2);
    for (const [q] of cerca) { V.get(p.iso).add(q.iso); V.get(q.iso).add(p.iso); }
  }
  return V;
}
export const centroTerritorio = (iso) => { const p = POR_ISO.get(iso); return p ? p.c : null; };
export const radioTerritorio = (iso) => { const p = POR_ISO.get(iso); return p && !p.micro ? p.angPrincipal / RAD : 0; }; // radio de su parte principal, en grados
export function distanciaAngular(a, b) { // grados entre dos puntos [lon, lat] del planeta
  const u = vec(a[0], a[1]), v = vec(b[0], b[1]);
  return Math.acos(acotar(u[0] * v[0] + u[1] * v[1] + u[2] * v[2], -1, 1)) / RAD;
}
export function vecinosDe(iso) {
  if (!VECINOS) VECINOS = calcularVecinos();
  const s = VECINOS.get(iso);
  return s ? [...s] : [];
}

export function crearMundo({ lienzo, alSeleccionar, alCuadro, congelado, giroAuto = false } = {}) { // congelado(): true detiene el vuelo de los misiles (pausa)
  const ctx = lienzo.getContext("2d");
  const quieto = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, Rmin = 100, Rmax = 3000;
  const cam = { lon: 10 * RAD, lat: 25 * RAD, R: 100 }; // centro de la vista (radianes) y radio del planeta en píxeles
  let sl0, cl0, sp0, cp0, CX = 0, CY = 0;               // trigonometría de la cámara, recalculada en cada cuadro
  let sel = null, raf = 0, activo = false, fondo = null, tween = null, inercia = null, ultimo = 0, ultimoToque = 0;
  const estado = new Map(); // iso → { dueno, destruido, grietas }
  const anchoTexto = new Map();
  const punteros = new Map();
  let arrastre = null, pellizco = null;
  let apuntador = null, mira = null; // modo apuntar (tocar el mapa llama a apuntador) y su mira
  const vuelos = [], explosiones = [];

  // ---------- Niebla de guerra ----------
  // Por omisión TODO el planeta está tapado (sin fuentes de visión): cada partida debe llamar a setVision(paisesPropios, fraccion).
  const niebla = { fuentes: [], fraccion: 0, version: 0, lienzo: null, ctx: null, img: null, mw: 0, mh: 0, div: 4, clave: "" };
  const nieblaActiva = () => niebla.fraccion < 1;
  function visibleVec(v, margen = MARGEN_TOQUE) { // ¿este punto del planeta (vector unitario) queda dentro de la visión?
    if (!nieblaActiva()) return true;
    for (const s of niebla.fuentes) if (v[0] * s.cv[0] + v[1] * s.cv[1] + v[2] * s.cv[2] >= s.u - margen) return true;
    return false;
  }
  function setVision(isos, fraccion) {
    const lista = (Array.isArray(isos) ? isos : [isos]).map((i) => POR_ISO.get(i)).filter(Boolean);
    const f = acotar(Number(fraccion) || 0, 0, 1), cosR = 1 - 2 * f;
    niebla.fraccion = f;
    // el país propio siempre se ve entero: el radio es el mayor entre la visión y el tamaño de su parte principal
    niebla.fuentes = lista.map((p) => ({ cv: p.cv, c: p.c, u: Math.min(cosR, Math.cos(Math.min(Math.PI, p.angPrincipal + 0.02))) }));
    niebla.version++;
    if (sel && !visibleVec(POR_ISO.get(sel).cv)) seleccionar(null);
  }
  // Máscara de niebla en baja resolución (se recalcula solo si la cámara o la visión cambian): alfa 255 = negro total, 0 = visible.
  function prepararNiebla() {
    if (!nieblaActiva()) return false;
    const n = niebla, R = cam.R, div = Math.max(4, Math.ceil(Math.sqrt((W * H) / 90000)));
    const mw = Math.ceil(W / div), mh = Math.ceil(H / div);
    if (!n.lienzo) { n.lienzo = document.createElement("canvas"); n.ctx = n.lienzo.getContext("2d"); }
    if (mw !== n.mw || mh !== n.mh || div !== n.div) { n.lienzo.width = mw; n.lienzo.height = mh; n.mw = mw; n.mh = mh; n.div = div; n.img = n.ctx.createImageData(mw, mh); n.clave = ""; }
    const clave = [cam.lon, cam.lat, R, W, H, n.version].join(",");
    if (clave === n.clave) return true;
    n.clave = clave;
    const fu = n.fuentes.map((s) => { // cada fuente en el marco de la cámara (x a la derecha, y arriba, z hacia el jugador)
      const l = s.c[0] * RAD, p = s.c[1] * RAD, sl = Math.sin(l), cl = Math.cos(l), sp = Math.sin(p), cp = Math.cos(p), dc = cl * cl0 + sl * sl0;
      return { x: cp * (sl * cl0 - cl * sl0), y: cp0 * sp - sp0 * cp * dc, z: sp0 * sp + cp0 * cp * dc, u: s.u };
    });
    const d = n.img.data, F = FUNDIDO_NIEBLA, ns = fu.length;
    let k = 0;
    for (let j = 0; j < mh; j++) {
      const v0 = (CY - (j + 0.5) * div) / R;
      for (let i = 0; i < mw; i++, k += 4) {
        let u = ((i + 0.5) * div - CX) / R, v = v0, r2 = u * u + v * v;
        if (r2 > 0.9999) { const e = Math.sqrt(0.9999 / r2); u *= e; v *= e; r2 = 0.9999; } // fuera del disco: se repite el valor del borde (sin halo claro)
        const w = Math.sqrt(1 - r2);
        let t = 0;
        for (let q = 0; q < ns; q++) { const s = fu[q], tt = (u * s.x + v * s.y + w * s.z - s.u + F) / F; if (tt > t) t = tt; }
        d[k + 3] = t >= 1 ? 0 : Math.round(255 * (1 - t * t * (3 - 2 * t))); // RGB queda en 0: negro
      }
    }
    n.ctx.putImageData(n.img, 0, 0);
    return true;
  }

  function fijarCam() {
    sl0 = Math.sin(cam.lon); cl0 = Math.cos(cam.lon); sp0 = Math.sin(cam.lat); cp0 = Math.cos(cam.lat);
    CX = W / 2; CY = H / 2;
  }
  function limitar() {
    cam.R = acotar(cam.R, Rmin, Rmax);
    cam.lat = acotar(cam.lat, -85 * RAD, 85 * RAD);
    cam.lon = dif(cam.lon);
  }
  // [x, y, cos] de un punto del planeta en pantalla; cos < 0 = está al otro lado
  function proy(lonD, latD) {
    const l = lonD * RAD, p = latD * RAD, sl = Math.sin(l), cl = Math.cos(l), sp = Math.sin(p), cp = Math.cos(p), dc = cl * cl0 + sl * sl0;
    return [CX + cam.R * cp * (sl * cl0 - cl * sl0), CY - cam.R * (cp0 * sp - sp0 * cp * dc), sp0 * sp + cp0 * cp * dc];
  }
  // Pantalla → [lon, lat] en grados (o null si el punto cae fuera del planeta)
  function invertir(px, py) {
    fijarCam();
    const x = px - CX, y = CY - py, r = Math.hypot(x, y);
    if (r > cam.R) return null;
    if (r < 1e-6) return [cam.lon / RAD, cam.lat / RAD];
    const rho = r / cam.R, c = Math.asin(rho), sc = Math.sin(c), cc = Math.cos(c);
    const lat = Math.asin(acotar(cc * sp0 + ((y / cam.R) * sc * cp0) / rho, -1, 1));
    const lon = cam.lon + Math.atan2((x / cam.R) * sc, rho * cp0 * cc - (y / cam.R) * sp0 * sc);
    return [dif(lon) / RAD, lat / RAD];
  }

  // ---------- Tamaño ----------
  function hacerFondo() { // espacio profundo con nebulosa azul y estrellas (se dibuja una vez por tamaño)
    const c = document.createElement("canvas");
    c.width = Math.max(1, W); c.height = Math.max(1, H);
    const g = c.getContext("2d"), r = azar(7);
    g.fillStyle = "#02030a"; g.fillRect(0, 0, W, H);
    const neb = (x, y, rad, col) => { const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, col); q.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = q; g.fillRect(0, 0, W, H); };
    neb(W * 0.5, H * 0.55, Math.max(W, H) * 0.55, "rgba(24,44,120,.50)");
    neb(W * 0.62, H * 0.9, Math.max(W, H) * 0.45, "rgba(50,30,110,.35)");
    neb(W * 0.25, H * 0.2, Math.max(W, H) * 0.35, "rgba(10,40,80,.30)");
    for (let i = 0; i < Math.round((W * H) / 2600); i++) {
      const col = r() < 0.12 ? "255,190,150" : r() < 0.3 ? "170,200,255" : "225,235,255";
      g.fillStyle = "rgba(" + col + "," + (0.25 + r() * 0.7).toFixed(2) + ")";
      const s = 0.5 + r() * (r() < 0.06 ? 2 : 1.1);
      g.fillRect(r() * W, r() * H, s, s);
    }
    fondo = c;
  }
  function ajustar() {
    const caja = lienzo.getBoundingClientRect();
    if (!caja.width || !caja.height) return false;
    const w = Math.round(caja.width), h = Math.round(caja.height), d = Math.min(window.devicePixelRatio || 1, 2);
    const primera = !W;
    if (w === W && h === H && d === dpr) return true;
    W = w; H = h; dpr = d;
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
    const antes = Rmin;
    Rmin = Math.min(W, H) * (W < H ? 0.42 : 0.27); // planeta completo con espacio alrededor, como en la imagen de referencia
    Rmax = Rmin * ZOOM_MAX;
    if (primera) cam.R = Rmin; else cam.R = cam.R * (Rmin / antes);
    limitar(); hacerFondo();
    return true;
  }

  // ---------- Dibujo ----------
  function trayecto(p) { // contorno del país en pantalla; lo que queda del otro lado se pega al borde del planeta
    const path = new Path2D(), R = cam.R;
    let visible = false;
    for (const a of p.anillos) {
      const t = a.t, n = a.n;
      let hay = false, antOculto = false, antSa = 0, primOculto = false, primSa = 0;
      for (let i = 0; i < n; i++) {
        const sl = t[i * 4], cl = t[i * 4 + 1], sp = t[i * 4 + 2], cp = t[i * 4 + 3], dc = cl * cl0 + sl * sl0;
        let x = cp * (sl * cl0 - cl * sl0), y = cp0 * sp - sp0 * cp * dc;
        const oculto = sp0 * sp + cp0 * cp * dc < 0;
        let sa = 0;
        if (oculto) { const r = Math.hypot(x, y) || 1e-9; x /= r; y /= r; sa = Math.atan2(-y, x); } else visible = true;
        if (!hay) { path.moveTo(CX + R * x, CY - R * y); hay = true; primOculto = oculto; primSa = sa; }
        else if (oculto && antOculto) { const d = dif(sa - antSa); path.arc(CX, CY, R, antSa, antSa + d, d < 0); } // por el borde, no en línea recta
        else path.lineTo(CX + R * x, CY - R * y);
        antOculto = oculto; antSa = sa;
      }
      if (hay && antOculto && primOculto) { const d = dif(primSa - antSa); path.arc(CX, CY, R, antSa, antSa + d, d < 0); }
      path.closePath();
    }
    return visible ? path : null;
  }
  function grietasDe(iso) { // grietas en grados de lon/lat
    const p = POR_ISO.get(iso), r = azar(hash(iso)), g = [];
    if (!p) return g;
    for (let i = 0; i < 7; i++) {
      const x = p.bbox[0] + r() * (p.bbox[2] - p.bbox[0]), y = p.bbox[1] + r() * (p.bbox[3] - p.bbox[1]);
      const a = r() * DOS_PI, l = Math.max(0.25, Math.min(p.ww, p.hh) * (0.12 + r() * 0.12));
      g.push([x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, x + Math.cos(a + 0.7) * l * 0.6, y + Math.sin(a + 0.7) * l * 0.6]);
    }
    return g;
  }
  const colorDe = (p, e) => (e && e.destruido ? COLOR_DESTRUIDO : p.iso === sel ? COLOR_SEL : p.color);

  function pintar() {
    fijarCam();
    const R = cam.R;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (fondo) ctx.drawImage(fondo, 0, 0, W, H);
    ctx.lineJoin = "round";
    // Anillos tenues de órbita alrededor del planeta
    if (R < H * 0.9) {
      ctx.lineWidth = 1;
      for (const f of [1.55, 2.05, 2.7]) { ctx.strokeStyle = "rgba(90,210,230," + (0.2 / f).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(CX, CY, R * f, 0, DOS_PI); ctx.stroke(); }
    }
    // Atmósfera azul-violeta
    if (R < H * 5) {
      const a = ctx.createRadialGradient(CX, CY, R * 0.96, CX, CY, R * 1.15);
      a.addColorStop(0, "rgba(130,110,255,.9)"); a.addColorStop(0.25, "rgba(90,120,255,.45)"); a.addColorStop(1, "rgba(60,90,255,0)");
      ctx.fillStyle = a; ctx.beginPath(); ctx.arc(CX, CY, R * 1.15, 0, DOS_PI); ctx.fill();
    }
    // Planeta: océano verde azulado con el brillo desplazado hacia arriba-izquierda
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, DOS_PI); ctx.clip();
    const o = ctx.createRadialGradient(CX - R * 0.25, CY - R * 0.25, R * 0.05, CX, CY, R * 1.05);
    o.addColorStop(0, "#14607a"); o.addColorStop(0.55, "#0a3350"); o.addColorStop(1, "#041626");
    ctx.fillStyle = o; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

    // Países visibles (los del otro lado ni se calculan)
    const vx = cp0 * cl0, vy = cp0 * sl0, vz = sp0, vis = [];
    for (const p of LISTA) {
      if (p.micro) continue;
      if (p.ang < Math.PI / 2 && p.cv[0] * vx + p.cv[1] * vy + p.cv[2] * vz < -Math.sin(p.ang)) continue;
      const path = trayecto(p);
      if (path) vis.push([p, path]);
    }
    // 1) halo de aguas poco profundas alrededor de las costas
    const halo = Math.min(18, 3 + R * 0.02);
    ctx.lineWidth = halo; ctx.strokeStyle = "rgba(70,210,200,.13)";
    for (const v of vis) ctx.stroke(v[1]);
    ctx.lineWidth = halo * 0.5; ctx.strokeStyle = "rgba(90,230,210,.2)";
    for (const v of vis) ctx.stroke(v[1]);
    // 2) tierra (y encima, el color de dueño o la destrucción)
    for (const [p, path] of vis) {
      const e = estado.get(p.iso);
      ctx.fillStyle = colorDe(p, e); ctx.fill(path, "evenodd");
      if (e && e.dueno && !e.destruido) { ctx.globalAlpha = e.propio ? ALFA_JUGADOR : ALFA_BOT; ctx.fillStyle = e.dueno; ctx.fill(path, "evenodd"); ctx.globalAlpha = 1; }
    }
    // marcadores de los países diminutos
    const marcadores = [];
    for (const p of LISTA) {
      if (!p.micro) continue;
      const q = proy(p.c[0], p.c[1]);
      if (q[2] < 0.03) continue;
      const e = estado.get(p.iso), r = Math.max(p.radio * RAD * R * q[2], 4);
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, DOS_PI);
      ctx.fillStyle = colorDe(p, e); ctx.fill();
      if (e && e.dueno && !e.destruido) { ctx.globalAlpha = e.propio ? ALFA_JUGADOR : ALFA_BOT; ctx.fillStyle = e.dueno; ctx.fill(); ctx.globalAlpha = 1; }
      marcadores.push([p, q, r]);
    }
    // 3) luz y sombra del planeta (lado de noche abajo a la derecha, oscurecido hacia el borde)
    const s = ctx.createRadialGradient(CX - R * 0.32, CY - R * 0.28, R * 0.1, CX, CY, R * 1.35);
    s.addColorStop(0, "rgba(0,0,15,0)"); s.addColorStop(0.5, "rgba(0,0,15,.05)"); s.addColorStop(1, "rgba(0,0,15,.68)");
    ctx.fillStyle = s; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    // 4) fronteras claras
    ctx.lineWidth = acotar(R * 0.0035, 0.8, 2.2); ctx.strokeStyle = "rgba(255,238,205,.6)";
    for (const v of vis) ctx.stroke(v[1]);
    for (const m of marcadores) { ctx.beginPath(); ctx.arc(m[1][0], m[1][1], m[2], 0, DOS_PI); ctx.stroke(); }
    // 4b) Trazo de los dueños: cada bot con su color; TU país con un trazo más grueso, con resplandor y un filo blanco (el más brillante de todos)
    const bots = [], mios = [];
    const dueno = (iso) => { const e = estado.get(iso); return e && e.dueno && !e.destruido ? e : null; };
    for (const v of vis) { const e = dueno(v[0].iso); if (e) (e.propio ? mios : bots).push([e, () => ctx.stroke(v[1])]); }
    for (const m of marcadores) { const e = dueno(m[0].iso); if (e) (e.propio ? mios : bots).push([e, () => { ctx.beginPath(); ctx.arc(m[1][0], m[1][1], m[2], 0, DOS_PI); ctx.stroke(); }]); }
    if (bots.length) {
      ctx.lineWidth = acotar(R * 0.0045, 1.5, 2.8);
      for (const [e, trazar] of bots) { ctx.strokeStyle = e.dueno; trazar(); }
    }
    if (mios.length) {
      const w = acotar(R * 0.008, 2.4, 4.4);
      for (const [e, trazar] of mios) { ctx.globalAlpha = 0.35; ctx.lineWidth = w * 3; ctx.strokeStyle = e.dueno; trazar(); ctx.globalAlpha = 1; ctx.lineWidth = w; trazar(); }
      for (const [, trazar] of mios) { ctx.lineWidth = Math.max(1, w * 0.4); ctx.strokeStyle = "rgba(255,255,255,.9)"; trazar(); }
    }
    // Destrucción: mancha carbonizada y grietas rojas
    for (const [iso, e] of estado) {
      if (!e.destruido) continue;
      const p = POR_ISO.get(iso); if (!p) continue;
      const q = proy(p.c[0], p.c[1]);
      if (q[2] < 0) continue;
      const rr = Math.max(10, Math.min(p.ang * R * 0.95, R * 0.4));
      const m = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
      m.addColorStop(0, "rgba(0,0,0,.6)"); m.addColorStop(0.55, "rgba(0,0,0,.28)"); m.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = m; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, DOS_PI); ctx.fill();
      ctx.strokeStyle = "rgba(255,60,40,.95)"; ctx.lineWidth = acotar(R * 0.003, 1, 2.4); ctx.lineCap = "round";
      ctx.beginPath();
      for (const g of e.grietas) { const a = proy(g[0], g[1]), b = proy(g[2], g[3]), c = proy(g[4], g[5]); if (a[2] < 0 || b[2] < 0 || c[2] < 0) continue; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); }
      ctx.stroke();
    }
    // País seleccionado: trazo blanco encima de todo
    if (sel) {
      const p = POR_ISO.get(sel);
      ctx.lineWidth = acotar(R * 0.006, 2, 3.4); ctx.strokeStyle = "#fff";
      if (p && p.micro) { const q = proy(p.c[0], p.c[1]); if (q[2] > 0) { ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(p.radio * RAD * R * q[2], 4), 0, DOS_PI); ctx.stroke(); } }
      else { const v = vis.find((x) => x[0].iso === sel); if (v) ctx.stroke(v[1]); }
    }
    // NIEBLA NEGRA: tapa todo lo que quede fuera de la visión (países, fronteras, marcas de destrucción y selección)
    if (prepararNiebla()) { ctx.imageSmoothingEnabled = true; ctx.drawImage(niebla.lienzo, 0, 0, niebla.mw * niebla.div, niebla.mh * niebla.div); }
    ctx.restore();
    // Borde luminoso del planeta
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(150,170,255,.75)";
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, DOS_PI); ctx.stroke();

    pintarVuelos();

    // Nombres (en pantalla, sin deformarse): solo los países cuyo dibujo ya es lo bastante grande
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const p of LISTA) {
      if (!visibleVec(p.cv)) continue;
      const forzado = p.iso === sel;
      const q = proy(p.c[0], p.c[1]);
      if (q[2] < 0.15) continue;
      const grande = (p.micro ? 0 : p.ww) * RAD * R * q[2];
      if (!forzado && (p.micro ? p.radio * RAD * R * q[2] < 12 : grande < 34)) continue;
      if (q[0] < -80 || q[0] > W + 80 || q[1] < -20 || q[1] > H + 20) continue;
      const tam = acotar(Math.round(grande / 9), 11, 19);
      ctx.font = "700 " + tam + "px system-ui, sans-serif";
      const nombre = etiquetaTerritorio(p.iso), clave = p.iso + tam;
      let tw = anchoTexto.get(clave); if (tw == null) { tw = ctx.measureText(nombre).width; anchoTexto.set(clave, tw); }
      if (!forzado && !p.micro && (tw + 8 > grande || p.hh * RAD * R * q[2] < tam + 4)) continue;
      const ty = q[1] + (p.micro ? -(Math.max(p.radio * RAD * R, 4) + 10) : 0);
      ctx.lineWidth = 3.2; ctx.strokeStyle = "rgba(3,9,24,.9)"; ctx.strokeText(nombre, q[0], ty);
      ctx.fillStyle = "#fff4dc"; ctx.fillText(nombre, q[0], ty);
    }
  }

  // ---------- Misiles en vuelo, explosiones y mira ----------
  function avanzarVuelos(dt, ahora) {
    if (!(congelado && congelado())) {
      for (let i = vuelos.length - 1; i >= 0; i--) {
        const f = vuelos[i]; f.p += dt / f.ms;
        if (f.p >= 1) { vuelos.splice(i, 1); explosiones.push({ lon: f.b[0], lat: f.b[1], t0: ahora, color: f.color }); if (f.alImpactar) f.alImpactar(); }
      }
    }
    for (let i = explosiones.length - 1; i >= 0; i--) if (ahora - explosiones[i].t0 > 900) explosiones.splice(i, 1);
  }
  // Perfil del vuelo (t = 0..1, 5 s): SUBE casi en vertical hasta salir de la atmósfera (primer ~22 %), viaja arriba (crucero) y CAE en picada (último ~22 %).
  //   avance(t): cuánto del recorrido por la superficie ya se hizo (arranca y termina muy lento: casi vertical)
  //   altura(t): 0 = en el suelo, 1 = en el punto más alto (sube y baja rápido, meseta arriba)
  const avance = (t) => t * t * t * (t * (6 * t - 15) + 10);
  const altura = (t) => Math.sqrt(Math.max(0, Math.sin(Math.PI * acotar(t, 0, 1))));
  // Punto del recorrido (círculo máximo) en pantalla, con altura: [x, y, cos, h]; cos < 0 = al otro lado del planeta; h = altura 0..1
  function puntoDeVuelo(f, t) {
    const g = avance(acotar(t, 0, 1)), h = altura(t), o = f.ome, s1 = o < 1e-6 ? 1 : Math.sin((1 - g) * o) / Math.sin(o), s2 = o < 1e-6 ? 0 : Math.sin(g * o) / Math.sin(o);
    const x = s1 * f.va[0] + s2 * f.vb[0], y = s1 * f.va[1] + s2 * f.vb[1], z = s1 * f.va[2] + s2 * f.vb[2];
    const q = proy(Math.atan2(y, x) / RAD, Math.asin(acotar(z, -1, 1)) / RAD), e = 1 + f.alto * h;
    // Alejarse del centro (se ve bien en el borde del planeta) + subir en pantalla (se ve bien de frente): así la subida se nota en todo el globo
    const lev = cam.R * f.alto * h * 0.9 * Math.max(0, q[2]);
    return [CX + (q[0] - CX) * e, CY + (q[1] - CY) * e - lev, q[2], h, q[0], q[1]]; // [4],[5] = el punto en el suelo (para la sombra)
  }
  function pintarVuelos() {
    ctx.lineCap = "round";
    for (const f of vuelos) {
      if (f.p <= 0) continue;
      const t1 = Math.min(1, f.p), t0 = Math.max(0, t1 - 0.22), N = 12;
      let ant = null;
      ctx.strokeStyle = f.color;
      for (let i = 0; i <= N; i++) { // cola del misil: más clara y gruesa hacia la cabeza
        const q = puntoDeVuelo(f, t0 + ((t1 - t0) * i) / N);
        if (ant && q[2] > 0 && ant[2] > 0) { ctx.globalAlpha = (i / N) * 0.9; ctx.lineWidth = 1 + (2.4 * i) / N; ctx.beginPath(); ctx.moveTo(ant[0], ant[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
        ant = q;
      }
      ctx.globalAlpha = 1;
      const h = puntoDeVuelo(f, t1);
      if (h[2] > 0) {
        // sombra en el suelo: más tenue y más separada mientras más alto va (da sensación de altura)
        ctx.globalAlpha = 0.18 + 0.22 * (1 - h[3]); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(h[4], h[5], 3 + 2 * h[3], 1.6 + h[3], 0, 0, DOS_PI); ctx.fill(); ctx.globalAlpha = 1;
        // cabeza con resplandor: más grande y brillante al salir de la atmósfera
        const rad = 8 + 6 * h[3], g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], rad);
        g.addColorStop(0, "#fff"); g.addColorStop(0.35, f.color); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], rad, 0, DOS_PI); ctx.fill();
      }
      if (f.p < 0.2) { // humo y destello del despegue en el punto de salida
        const q0 = proy(f.de[0], f.de[1]);
        if (q0[2] > 0) { const u = f.p / 0.2, r = 6 + 16 * u; ctx.globalAlpha = 0.55 * (1 - u); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q0[0], q0[1], r, 0, DOS_PI); ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    for (const e of explosiones) { // explosión: destello que crece y se apaga
      const u = acotar((ultimo - e.t0) / 900, 0, 1), q = proy(e.lon, e.lat);
      if (q[2] <= 0) continue;
      const r = 8 + 40 * Math.sqrt(u), g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.35, "rgba(255,170,60,.85)"); g.addColorStop(1, "rgba(255,60,20,0)");
      ctx.globalAlpha = 1 - u * u; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, DOS_PI); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (mira) { // mira del objetivo
      const q = proy(mira.lon, mira.lat);
      if (q[2] > 0) {
        const r = 15 + (quieto() ? 0 : 3 * Math.sin(ultimo / 180));
        ctx.strokeStyle = "#2de8f5"; ctx.lineWidth = 2.2; ctx.shadowColor = "#2de8f5"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, DOS_PI);
        ctx.moveTo(q[0] - r - 9, q[1]); ctx.lineTo(q[0] - r + 6, q[1]); ctx.moveTo(q[0] + r - 6, q[1]); ctx.lineTo(q[0] + r + 9, q[1]);
        ctx.moveTo(q[0], q[1] - r - 9); ctx.lineTo(q[0], q[1] - r + 6); ctx.moveTo(q[0], q[1] + r - 6); ctx.lineTo(q[0], q[1] + r + 9);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    }
  }

  // ---------- Bucle ----------
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(50, ahora - (ultimo || ahora)); ultimo = ahora;
    if (tween) {
      const u = acotar((ahora - tween.t0) / tween.ms, 0, 1), e = u * u * (3 - 2 * u);
      cam.lon = tween.lon0 + dif(tween.lon1 - tween.lon0) * e; cam.lat = tween.lat0 + (tween.lat1 - tween.lat0) * e;
      cam.R = tween.R0 * Math.pow(tween.R1 / tween.R0, e);
      limitar();
      if (u >= 1) tween = null;
    } else if (inercia && !arrastre && !quieto()) {
      cam.lon += inercia.vl * dt; cam.lat += inercia.vp * dt;
      const f = Math.exp(-dt / 320); inercia.vl *= f; inercia.vp *= f;
      if (Math.hypot(inercia.vl, inercia.vp) < 0.00002) inercia = null;
      limitar();
    } else if (giroAuto && !quieto() && !punteros.size && !sel && cam.R < Rmin * 1.3 && ahora - ultimoToque > 4000) { cam.lon += 0.00004 * dt; limitar(); }
    avanzarVuelos(dt, ahora);
    if (ajustar()) { pintar(); if (alCuadro) alCuadro(); }
  }
  function irA(lonR, latR, R, ms = 450) {
    R = acotar(R, Rmin, Rmax); latR = acotar(latR, -85 * RAD, 85 * RAD);
    inercia = null;
    if (quieto() || !ms) { cam.lon = lonR; cam.lat = latR; cam.R = R; limitar(); tween = null; return; }
    tween = { lon0: cam.lon, lat0: cam.lat, R0: cam.R, lon1: lonR, lat1: latR, R1: R, t0: performance.now(), ms };
  }

  // ---------- Selección ----------
  function buscar(px, py) {
    const pt = invertir(px, py);
    const marcador = (minimo) => { // el marcador más cercano dentro de su círculo (con un mínimo táctil)
      let mejor = null, md = 1e9;
      for (const p of LISTA) {
        if (!p.micro) continue;
        const q = proy(p.c[0], p.c[1]);
        if (q[2] < 0.03 || !visibleVec(p.cv)) continue;
        const d = Math.hypot(q[0] - px, q[1] - py);
        if (d <= Math.max(p.radio * RAD * cam.R * q[2], minimo) && d < md) { md = d; mejor = p.iso; }
      }
      return mejor;
    };
    const m1 = marcador(9);
    if (m1) return m1;
    if (!pt) return null;
    const lon = pt[0], lat = pt[1];
    if (!visibleVec(vec(lon, lat))) return null; // bajo la niebla no se puede tocar nada
    for (let i = LISTA.length - 1; i >= 0; i--) { // países: del más chico al más grande
      const p = LISTA[i];
      if (p.micro || lon < p.bbox[0] || lon > p.bbox[2] || lat < p.bbox[1] || lat > p.bbox[3]) continue;
      let r = false;
      for (const a of p.orig) if (dentro(a, lon, lat)) r = !r;
      if (r) return p.iso;
    }
    return marcador(18); // islas pequeñas en el mar: un poco más de margen al tocar
  }
  function tocar(x, y) { // lo que hay bajo un toque, para el modo apuntar
    const pt = invertir(x, y);
    if (!pt) return { x, y, lon: null, lat: null, iso: null, visible: false };
    const visible = visibleVec(vec(pt[0], pt[1]));
    return { x, y, lon: pt[0], lat: pt[1], iso: visible ? buscar(x, y) : null, visible };
  }
  function seleccionar(iso) {
    if (iso && !POR_ISO.has(iso)) iso = null;
    if (iso === sel) return;
    sel = iso;
    if (alSeleccionar) alSeleccionar(sel);
  }

  // ---------- Gestos ----------
  const local = (ev) => { const c = lienzo.getBoundingClientRect(); return [ev.clientX - c.left, ev.clientY - c.top]; };
  function acercarEn(px, py, factor) { // zoom hacia el punto tocado: el planeta se desliza para dejar ese punto cerca del centro
    const pt = factor > 1 ? invertir(px, py) : null, k0 = cam.R;
    cam.R = acotar(cam.R * factor, Rmin, Rmax);
    if (pt && cam.R > k0) {
      const t = Math.min(0.35, Math.log(cam.R / k0) * 0.7);
      cam.lon += dif(pt[0] * RAD - cam.lon) * t; cam.lat += (pt[1] * RAD - cam.lat) * t;
    }
    limitar();
  }
  function girar(dx, dy) { // arrastrar el planeta con el dedo
    cam.lon -= dx / (cam.R * Math.max(Math.cos(cam.lat), 0.2));
    cam.lat += dy / cam.R;
    limitar();
  }
  lienzo.addEventListener("pointerdown", (ev) => {
    tween = null; inercia = null; ultimoToque = performance.now();
    try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
    const xy = local(ev), x = xy[0], y = xy[1];
    punteros.set(ev.pointerId, { x, y });
    if (punteros.size === 1) arrastre = { x, y, x0: x, y0: y, t: performance.now(), movido: false, tm: performance.now(), vl: 0, vp: 0 };
    else if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, R: cam.R };
      arrastre = null;
    }
  });
  lienzo.addEventListener("pointermove", (ev) => {
    const xy = local(ev), x = xy[0], y = xy[1];
    const p = punteros.get(ev.pointerId);
    if (!p) return; // el mouse pasando sin pulsar no hace NADA: ni resalta países ni cambia el cursor
    p.x = x; p.y = y; ultimoToque = performance.now();
    if (punteros.size === 2 && pellizco) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      cam.R = acotar(pellizco.R * (d / pellizco.d), Rmin, Rmax);
      limitar();
    } else if (arrastre) {
      if (!arrastre.movido && Math.hypot(x - arrastre.x0, y - arrastre.y0) > 6) { arrastre.movido = true; lienzo.style.cursor = "grabbing"; }
      if (arrastre.movido) {
        const lon0 = cam.lon, lat0 = cam.lat, ahora = performance.now(), dt = Math.max(1, ahora - arrastre.tm);
        girar(x - arrastre.x, y - arrastre.y);
        arrastre.vl = 0.6 * arrastre.vl + 0.4 * (dif(cam.lon - lon0) / dt); arrastre.vp = 0.6 * arrastre.vp + 0.4 * ((cam.lat - lat0) / dt);
        arrastre.tm = ahora;
      }
      arrastre.x = x; arrastre.y = y;
    }
  });
  function soltar(ev, cancelado) {
    const era = punteros.has(ev.pointerId);
    punteros.delete(ev.pointerId);
    if (punteros.size < 2) pellizco = null;
    if (!era) return;
    if (!cancelado && arrastre && !arrastre.movido && punteros.size === 0 && performance.now() - arrastre.t < 700) {
      const xy = local(ev);
      if (apuntador) apuntador(tocar(xy[0], xy[1]));
      else { const h = buscar(xy[0], xy[1]); seleccionar(h === sel ? null : h); } // tocar el mismo país otra vez lo deselecciona
    } else if (!cancelado && arrastre && arrastre.movido && punteros.size === 0 && performance.now() - arrastre.tm < 80 && Math.hypot(arrastre.vl, arrastre.vp) > 0.00008) {
      inercia = { vl: arrastre.vl, vp: arrastre.vp };
    }
    if (!punteros.size) { arrastre = null; lienzo.style.cursor = apuntador ? "crosshair" : "grab"; }
    else if (punteros.size === 1) { const r = [...punteros.values()][0]; arrastre = { x: r.x, y: r.y, x0: r.x, y0: r.y, t: 0, movido: true, tm: performance.now(), vl: 0, vp: 0 }; }
  }
  lienzo.addEventListener("pointerup", (ev) => soltar(ev, false));
  lienzo.addEventListener("pointercancel", (ev) => soltar(ev, true));
  lienzo.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    tween = null; inercia = null; ultimoToque = performance.now();
    const xy = local(ev);
    acercarEn(xy[0], xy[1], Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0016)));
  }, { passive: false });
  lienzo.tabIndex = 0;
  lienzo.addEventListener("keydown", (ev) => {
    const paso = 40;
    if (ev.key === "+" || ev.key === "=") acercarEn(W / 2, H / 2, 1.4);
    else if (ev.key === "-" || ev.key === "_") acercarEn(W / 2, H / 2, 1 / 1.4);
    else if (ev.key === "0") reiniciarVista();
    else if (ev.key === "ArrowLeft") girar(-paso, 0);
    else if (ev.key === "ArrowRight") girar(paso, 0);
    else if (ev.key === "ArrowUp") girar(0, -paso);
    else if (ev.key === "ArrowDown") girar(0, paso);
    else return;
    ev.preventDefault();
  });
  lienzo.style.cursor = apuntador ? "crosshair" : "grab";

  function reiniciarVista() { irA(cam.lon, cam.lat, Rmin); } // aleja hasta ver el planeta completo
  // Al abrir la partida: el planeta casi completo, centrado en el país indicado (con niebla es lo único que se ve); sin país, en Europa y África
  function vistaInicial(iso) { const p = iso && POR_ISO.get(iso); irA(p ? p.c[0] * RAD : 10 * RAD, p ? p.c[1] * RAD : 25 * RAD, Rmin * 1.5, 0); }
  function enfocar(iso, factor = 6) {
    const p = POR_ISO.get(iso); if (!p) return;
    const ancho = Math.max(p.micro ? p.radio * 2 : p.ww, 1);
    irA(p.c[0] * RAD, p.c[1] * RAD, Math.min(Rmin * factor, (Math.min(W, H) * 0.7) / (ancho * RAD)));
  }

  return {
    iniciar() { if (activo) return; activo = true; ultimo = 0; ajustar(); raf = requestAnimationFrame(cuadro); },
    detener() { activo = false; cancelAnimationFrame(raf); raf = 0; },
    reiniciarVista, vistaInicial, enfocar,
    zoom(factor) { irA(cam.lon, cam.lat, cam.R * factor, 200); },
    seleccionar,
    seleccionado: () => sel,
    modoApuntar(fn) { apuntador = fn || null; lienzo.style.cursor = apuntador ? "crosshair" : "grab"; },
    setMira(lon, lat) { mira = lon == null ? null : { lon, lat }; },
    lanzar({ de, a, ms = 5000, espera = 0, color = "#fff", alImpactar }) { // espera: milisegundos antes de despegar (para escalonar varios misiles)
      const va = vec(de[0], de[1]), vb = vec(a[0], a[1]), ome = Math.acos(acotar(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1));
      vuelos.push({ va, vb, b: a, ome, de, alto: acotar(0.10 + 0.14 * (ome / Math.PI), 0.10, 0.24), ms: Math.max(1, ms), p: -espera / Math.max(1, ms), color, alImpactar });
    },
    cancelarVuelos() { vuelos.length = 0; explosiones.length = 0; mira = null; },
    setVision, vision: () => niebla.fraccion,
    posicion(iso) { const p = POR_ISO.get(iso); if (!p || !W) return null; fijarCam(); const q = proy(p.c[0], p.c[1]); return { x: q[0], y: q[1], visible: q[2] > 0.05 }; }, // centro del país en pantalla
        aPantalla(lon, lat) { fijarCam(); const q = proy(lon, lat); return q[2] > 0 ? [q[0], q[1]] : null; },
    setDueno(iso, color, propio = false) { const e = estado.get(iso) || {}; e.dueno = color || null; e.propio = !!propio; estado.set(iso, e); }, // propio = país del jugador (trazo brillante)
    centrarEn(iso) { enfocar(iso, 4); }, // lleva la cámara exactamente al centro del país (con animación) y lo acerca
    setDestruido(iso, si) { const e = estado.get(iso) || {}; e.destruido = !!si; if (si && !e.grietas) e.grietas = grietasDe(iso); estado.set(iso, e); },
    limpiarEstados() { estado.clear(); },
    paises: () => LISTA.map((p) => p.iso),
  };
}
