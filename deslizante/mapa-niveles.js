// Ruta: compartido/mapa-niveles.js
// MAPA DE NIVELES ESTÁNDAR (menú principal de los juegos por niveles). Pantalla de madera que cubre el juego.
// Nació en Estacionamiento; aquí está sin nada propio de ese juego: cada juego le dice sus etapas, su progreso y cómo se ve cada nivel.
//
//   Vista «mexico»  (principal)  México de cerca. Se llena de agua azul clara que SUBE un escalón por cada estado terminado.
//                                Cada estado desbloqueado es un punto: tócalo para ver sus niveles.
//   Vista «estado»               Los niveles de un estado (el juego decide qué muestra cada botón con infoNivel).
//   Vista «mundo»                SOLO existe al terminar todos los niveles de México. Mundo con agua que sube un escalón por país.
//   Vista «pais»                 Los niveles de un país.
//   MAPA SOLO DE PAÍSES (etapas = crearEtapas({ porEtapa, soloPaises: true }); estándar nuevo, 21 nov 2026): no hay México de cerca ni estados.
//                                La vista principal es «mundo» (con Continuar, los botones extra e Info) y desde ahí se abre cada país (México es el primero).
//
// MAPA SOLO DE PAÍSES (nuevo diseño, 23 nov 2026): la vista principal es una LISTA que baja de país en país: un botón alargado con la bandera de fondo y el
//   nombre del país, y debajo sus 20 niveles; luego el botón del siguiente país con sus 20 niveles, y así. Al tocar el botón de un país se abre su «botella»
//   (vista «pais»): la silueta del país (compartido/contornos-paises.js) que se llena de agua, UN POCO con cada nivel pasado, con un chorro que cae mientras sube.
//   Al llegar a los 20 niveles el país queda lleno y se cambia por su bandera (ahí está el gancho «alPaisCompleto» para el destello dorado, todavía sin hacer).
//   Banderas: imagenes/banderas/xx.svg (xx = código ISO en minúsculas). mapa.abrir(n, true) abre la botella del país del nivel n para verla subir.
//
// Uso:
//   import { crearEtapas } from "../compartido/etapas-mapa.js";
//   import { montarMapa } from "../compartido/mapa-niveles.js";
//   const mapa = montarMapa({
//     prefijo: "zuma",                         // para las claves de localStorage del mapa (agua, «mundo visto»)
//     etapas: crearEtapas({ porEtapa: 10 }),   // cuántos niveles tiene cada estado/país
//     progreso: () => ({ max, hecho }),        // max = nivel más alto desbloqueado, hecho = nivel más alto terminado (números 1, 2, 3…)
//     jugarNivel: (n) => { ... },              // la persona eligió el nivel n
//     // opcionales:
//     nivelContinuar: () => n,                 // nivel del botón «Continuar» (por defecto, max)
//     infoNivel: (n) => ({ sub, clase, aria, sinMarca }), // cómo se ve el botón del nivel n: sub = texto chico bajo el número, clase = b-verde, b-azul…,
//                                              //   aria = texto para lectores de pantalla, sinMarca = true quita el ✓ de los terminados
//     leyenda: "texto sobre la lista de niveles",
//     columnas: 5,                             // columnas fijas en la lista de niveles de cada etapa (sin esto, las que quepan en la pantalla)
//     botonesExtra: [{ icono, texto, clase, fn }], // van a la derecha de «Continuar» (por ejemplo ♾️ Juego libre)
//     alInfo: () => { ... },                   // botón «Info» de la vista principal
//     avisoPrincipal: () => "texto",           // línea de información bajo el título de la vista principal
//     alCambiarVista: (esPrincipal) => { ... } // avisa de cada cambio de vista (el juego vuelve a rotular el ☰: «Atrás» mientras el mapa está abierto)
//   });
//   mapa.abrir();                // vista principal
//   mapa.abrir(n);               // abre la lista de niveles de la etapa del nivel n
//   mapa.abrir(n, true);         // abre la vista principal de su zona (México o Mundo) para que se vea subir el agua
//   mapa.cerrar(); mapa.refrescar(); mapa.principal(); mapa.esPrincipal(); mapa.abierto();
//
// No usa Firebase ni red: funciona sin internet. El agua se mueve sola (olas con un poco de «disturbio»); con «reducir movimiento»
// activado en el sistema queda quieta. Necesita compartido/inmersivo.css (botones .b3d) y compartido/fondo-madera.js (la clase «oscura» en <html>).

import { MEXICO, CONTINENTES, LAGOS } from "./geografia-mapa.js";
import { nombrePais, banderaPais } from "./etapas-mapa.js";

// Siluetas de los países (solo las usa el mapa solo de países; se cargan aparte porque pesan ~230 KB). Mientras llegan, la botella usa una gota.
let CONTORNOS = null;
const GOTA = { w: 300, h: 300, d: "M150 20C215 20 255 75 255 130C255 195 200 280 150 280C100 280 45 195 45 130C45 75 85 20 150 20Z" };
const urlBandera = (codigo) => new URL("../imagenes/banderas/" + codigo.toLowerCase() + ".svg", import.meta.url).href;

// ----- Ajustes -----
// false = el agua sube por escalones (un estado o un país terminado = un escalón), como se diseñó.
// true  = sube un poquito con cada nivel terminado (más continuo).
const ASCENSO_SUAVE = false;

const NS = "http://www.w3.org/2000/svg";
const AZUL_ATRAS = "#bfe4fb", AZUL_FRENTE = "#8ccdf5", BORDE = "#8fa9c0", SOMBRA = "#e3e9ef", TINTA = "#2b3a4a";
const COLOR_HECHO = "#1f78c8", COLOR_ACTUAL = "#ff9a1f";

// Fondo: la misma madera que el resto de los juegos (clara u oscura según el modo; la clase «oscura» la pone compartido/fondo-madera.js en <html>)
const MADERA_CLARA = new URL("../imagenes/fondomaderaclara.webp", import.meta.url).href;
const MADERA_OSCURA = new URL("../imagenes/fondomaderaoscura.webp", import.meta.url).href;
const ESTILO = `
.m-raiz{position:fixed;inset:0;z-index:5;display:flex;flex-direction:column;gap:6px;background:url("${MADERA_CLARA}") center/cover no-repeat,#d9a866;color:var(--txt-fondo,${TINTA});font-family:system-ui,sans-serif;
  padding:max(8px,env(safe-area-inset-top)) max(160px,env(safe-area-inset-right)) 8px max(160px,env(safe-area-inset-left));touch-action:pan-y} /* 160 px: el botón «☰ Menú principal» es más ancho que «🎮 Juegos» */
.m-raiz[hidden]{display:none}
html.oscura .m-raiz{background:url("${MADERA_OSCURA}") center/cover no-repeat,#1d2024}
.m-info:empty{display:none}
@media (max-aspect-ratio:1/1){.m-raiz{padding:calc(104px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) calc(66px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}}
.m-cab{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 14px;text-align:center}
.m-textos{min-width:0}
.m-titulo{margin:0;font-size:1.25rem;line-height:1.2}
.m-info{margin:2px 0 0;font-size:.82rem;color:var(--txt-fondo-suave,#5b6b7c);line-height:1.3}
.m-acciones{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.m-acciones .b3d{--t:42px;font-size:15px}
.m-cuerpo{flex:1 1 0;min-height:0;display:flex;flex-direction:column;align-items:center;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 2px 12px}
.m-cuerpo>svg{display:block;width:100%;flex:1 1 auto;min-height:0;max-height:100%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.m-cuerpo.m-mundo>svg{flex:none;height:auto;max-height:42vh}
.m-leyenda{margin:0 0 8px;font-size:.78rem;color:var(--txt-fondo-suave,#5b6b7c);text-align:center}
.m-rej{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:12px 10px;width:100%;max-width:880px;padding:6px 6px 14px}
.m-nv.b3d{width:100%;height:58px;margin:0 0 5px;flex-direction:column;gap:1px;font-size:17px;font-weight:800}
.m-nv small{font-size:11px;font-weight:600;opacity:.92}
.m-paises{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;width:100%;max-width:900px;padding:10px 6px 14px}
.m-pais{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 6px;font:inherit;color:${TINTA};text-align:center;background:#f2f7fb;border:2px solid #c9d9e8;border-radius:14px;cursor:pointer;touch-action:manipulation}
.m-pais:hover:not(:disabled){border-color:#5aa9e6}
.m-pais:disabled{opacity:.45;cursor:default}
.m-pais.m-hecho{background:#dff1ff;border-color:#8ccdf5}
.m-pais.m-actual{border-color:#ff9a1f;box-shadow:0 0 0 2px rgba(255,154,31,.35)}
.m-pais .m-bandera{font-size:1.8rem;line-height:1.1}
.m-pais b{font-size:.85rem;line-height:1.15}
.m-pais small{font-size:.72rem;color:#5b6b7c}
.m-punto{cursor:pointer;outline:none}
.m-punto:focus-visible circle.m-zona{stroke:#2b3a4a;stroke-width:2}
/* Lista de países: botón con la bandera de fondo + sus niveles debajo */
.m-col{display:flex;flex-direction:column;align-items:center;width:100%;padding:4px 2px 24px}
.m-sec{width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;margin-bottom:10px}
.m-sec>.m-rej{padding-top:2px}
.m-pbtn{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:70px;margin:4px 0 8px;padding:8px 14px 14px;font:inherit;color:#fff;text-align:left;
  border:3px solid #fff;border-radius:16px;cursor:pointer;overflow:hidden;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  background:linear-gradient(90deg,rgba(10,20,35,.66),rgba(10,20,35,.3)),var(--bandera,none) center/cover no-repeat,#5b6b7c;
  box-shadow:0 4px 0 rgba(0,0,0,.35),0 6px 10px rgba(0,0,0,.3)}
.m-pbtn:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,.35)}
.m-pbtn:focus-visible{outline:3px solid #2b3a4a;outline-offset:2px}
.m-pbtn b{font-size:1.15rem;line-height:1.15;text-shadow:0 2px 4px rgba(0,0,0,.85)}
.m-pbtn small{flex:none;font-size:.82rem;font-weight:800;text-shadow:0 1px 3px rgba(0,0,0,.95);white-space:nowrap}
.m-pbtn .m-barra{position:absolute;left:0;right:0;bottom:0;height:7px;background:rgba(0,0,0,.5)}
.m-pbtn .m-barra i{display:block;height:100%;background:#4fc3ff}
.m-pbtn.m-hecho .m-barra i{background:#ffd23f}
.m-pbtn.m-actual{border-color:#ff9a1f}
.m-cuerpo>svg.m-botella{cursor:default;touch-action:auto}
.m-pulso{transform-box:fill-box;transform-origin:center;animation:m-pulso 1.7s ease-out infinite}
@keyframes m-pulso{from{transform:scale(1);opacity:.9}to{transform:scale(2.6);opacity:0}}
.m-nuevo,.m-nv.activo{animation:m-latido .6s ease-in-out infinite alternate}
@keyframes m-latido{to{filter:brightness(1.3)}}
@media (prefers-reduced-motion:reduce){.m-pulso,.m-nuevo,.m-nv.activo{animation:none}}
`;

// ---------- Utilidades de dibujo ----------
const el = (tag, attrs, padre) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (padre) padre.appendChild(n);
  return n;
};
const h = (tag, clase, texto) => {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
};
// Proyección plana: l0..l1 = longitudes, laTop..laBot = latitudes, s = unidades por grado, kx = ancho relativo de un grado de longitud
const proyector = (l0, l1, laTop, laBot, s, kx) => ({ w: (l1 - l0) * s * kx, h: (laTop - laBot) * s, p: (lo, la) => [(lo - l0) * s * kx, (laTop - la) * s] });
const trazo = (pts, P) => "M" + pts.map(([lo, la]) => { const [x, y] = P.p(lo, la); return x.toFixed(1) + " " + y.toFixed(1); }).join("L") + "Z";
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const quieto = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function accesible(nodo, etiqueta, accion) {
  nodo.setAttribute("role", "button");
  nodo.setAttribute("tabindex", "0");
  nodo.setAttribute("aria-label", etiqueta);
  nodo.addEventListener("click", accion);
  nodo.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); accion(); } });
}
function etiqueta(svg, x, y, texto, tam) { // texto con borde blanco para que se lea sobre el agua
  const t = el("text", { x, y, "text-anchor": "middle", "font-size": tam, "font-weight": 700, fill: TINTA, "paint-order": "stroke", stroke: "#fff", "stroke-width": 4, "stroke-linejoin": "round", "pointer-events": "none" }, svg);
  t.textContent = texto;
}

// ---------- Zoom y desplazamiento de un mapa SVG ----------
// Rueda (scroll) o pellizco para acercar; arrastrar para mover. Un toque corto sigue funcionando en los puntos.
// base = { x, y, w, h } es el viewBox completo (zoom 1, no se puede alejar más). alZoom(k) avisa del zoom actual (1..MAX_ZOOM).
const MAX_ZOOM = 10;
const ZOOM_ESTADO_ACTUAL = 3; // cuánto se acerca el mapa de México al estado actual al abrirlo (1 = México entero)
function hacerZoomable(svg, base, alZoom) {
  let vb = { ...base };
  const dedos = new Map();
  let movido = false, inicio = null;
  const zoomActual = () => base.w / vb.w;
  function aplicar() {
    vb.x = acotar(vb.x, base.x, base.x + base.w - vb.w);
    vb.y = acotar(vb.y, base.y, base.y + base.h - vb.h);
    svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    if (alZoom) alZoom(zoomActual());
  }
  // pantalla → coordenadas del SVG (el viewBox se ajusta con «meet», así que puede haber franjas vacías a los lados)
  function aSvg(cx, cy) {
    const r = svg.getBoundingClientRect();
    const k = Math.min(r.width / vb.w, r.height / vb.h) || 1;
    const ox = (r.width - vb.w * k) / 2, oy = (r.height - vb.h * k) / 2;
    return { x: vb.x + (cx - r.left - ox) / k, y: vb.y + (cy - r.top - oy) / k, k };
  }
  function zoom(f, cx, cy) {
    const nz = acotar(zoomActual() * f, 1, MAX_ZOOM), ff = nz / zoomActual();
    if (ff === 1) return;
    const r = svg.getBoundingClientRect();
    const p = aSvg(cx == null ? r.left + r.width / 2 : cx, cy == null ? r.top + r.height / 2 : cy);
    const w = base.w / nz, hh = base.h / nz;
    vb = { x: p.x - (p.x - vb.x) * (w / vb.w), y: p.y - (p.y - vb.y) * (hh / vb.h), w, h: hh };
    aplicar();
  }
  // Va a un punto (cx, cy en coordenadas del SVG) con el zoom k; con animar = true se desliza suave (quieto si «reducir movimiento»)
  let anim = 0;
  const parar = () => { if (anim) cancelAnimationFrame(anim); anim = 0; };
  function irA(cx, cy, k, animar) {
    parar();
    k = acotar(k, 1, MAX_ZOOM);
    const w = base.w / k, hh = base.h / k;
    const fin = { x: acotar(cx - w / 2, base.x, base.x + base.w - w), y: acotar(cy - hh / 2, base.y, base.y + base.h - hh), w, h: hh };
    if (!animar || quieto()) { vb = fin; aplicar(); return; }
    const ini = { ...vb }, t0 = performance.now(), dur = 700;
    const paso = (ahora) => {
      const f = Math.min(1, (ahora - t0) / dur), e = 1 - Math.pow(1 - f, 3); // frena al llegar
      vb = { x: ini.x + (fin.x - ini.x) * e, y: ini.y + (fin.y - ini.y) * e, w: ini.w + (fin.w - ini.w) * e, h: ini.h + (fin.h - ini.h) * e };
      aplicar();
      anim = f < 1 ? requestAnimationFrame(paso) : 0;
    };
    anim = requestAnimationFrame(paso);
  }
  svg.addEventListener("wheel", (e) => { parar(); e.preventDefault(); zoom(e.deltaY < 0 ? 1.25 : 1 / 1.25, e.clientX, e.clientY); }, { passive: false });
  svg.addEventListener("pointerdown", (e) => {
    parar(); // si la persona toca el mapa, se cancela el acercamiento automático
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 1) { movido = false; inicio = { x: e.clientX, y: e.clientY }; } else movido = true;
  });
  svg.addEventListener("pointermove", (e) => {
    const v = dedos.get(e.pointerId);
    if (!v) return;
    const nuevo = { x: e.clientX, y: e.clientY };
    if (dedos.size === 1) {
      if (!movido && Math.hypot(nuevo.x - inicio.x, nuevo.y - inicio.y) > 8) { movido = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} }
      if (movido) {
        const k = aSvg(0, 0).k;
        vb.x -= (nuevo.x - v.x) / k; vb.y -= (nuevo.y - v.y) / k;
        aplicar();
      }
    } else if (dedos.size === 2) {
      const otro = [...dedos.entries()].find(([id]) => id !== e.pointerId)[1];
      const d0 = Math.hypot(v.x - otro.x, v.y - otro.y) || 1, d1 = Math.hypot(nuevo.x - otro.x, nuevo.y - otro.y) || 1;
      const k = aSvg(0, 0).k;
      vb.x -= ((nuevo.x - v.x) / 2) / k; vb.y -= ((nuevo.y - v.y) / 2) / k; // el punto medio también arrastra
      zoom(d1 / d0, (nuevo.x + otro.x) / 2, (nuevo.y + otro.y) / 2);
    }
    dedos.set(e.pointerId, nuevo);
  });
  const soltar = (e) => { dedos.delete(e.pointerId); if (!dedos.size) setTimeout(() => { movido = false; }, 0); };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  // Si el toque fue en realidad un arrastre o pellizco, no cuenta como clic sobre un punto o botón del mapa
  svg.addEventListener("click", (e) => { if (movido) { e.stopPropagation(); e.preventDefault(); } }, true);
  return { irA };
}

// ---------- Agua: dos capas de olas que se mueven, recortadas con la silueta ----------
// caja = { x0, x1, yBase, yTope, fondo, amp }: yBase = parte más baja de la silueta, yTope = la más alta, fondo = hasta dónde se pinta
// op (opcional, para la «botella» de un país):
//   vel      qué tan rápido sube (por defecto 1.8)         frec   multiplica la frecuencia de las olas (siluetas chicas: 2.2)     paso   separación de los puntos de la ola
//   chorro   { x, yTop, yEntrada, ancho }  un chorro de agua que cae desde yTop hasta la superficie MIENTRAS el agua sube (yEntrada = donde toca la silueta)
//   alLlegar () => {}  se llama una vez cuando el agua termina de subir hasta «objetivo» (si es que tuvo que subir)
function crearAgua(svg, id, dSilueta, caja, objetivo, desde, op = {}) {
  const A = caja.amp, VEL = op.vel || 1.8, FR = op.frec || 1, ch = op.chorro;
  const cp = el("clipPath", { id }, el("defs", {}, svg));
  el("path", { d: dSilueta }, cp);
  const g = el("g", { "clip-path": "url(#" + id + ")", "pointer-events": "none" }, svg);
  const atras = el("path", { fill: AZUL_ATRAS }, g);
  const frente = el("path", { fill: AZUL_FRENTE, opacity: 0.8 }, g);
  let cAlto, cBajo, bAlto, bBajo, salpico;   // chorro: la parte de fuera de la silueta (cAlto) y la de dentro, recortada (cBajo); brillos en movimiento y salpicadura
  if (ch) {
    cAlto = el("path", { fill: AZUL_FRENTE, "pointer-events": "none" }, svg);
    bAlto = el("path", { fill: "none", stroke: "#fff", "stroke-opacity": 0.65, "stroke-linecap": "round", "pointer-events": "none" }, svg);
    cBajo = el("path", { fill: AZUL_FRENTE }, g);
    bBajo = el("path", { fill: "none", stroke: "#fff", "stroke-opacity": 0.65, "stroke-linecap": "round" }, g);
    salpico = el("ellipse", { fill: "none", stroke: "#fff", "stroke-opacity": 0.8 }, g);
  }
  // con f = 0 las olas quedan por debajo de la silueta (no se ve agua); con f = 1 la cubren por completo
  const y0 = caja.yBase + 2.5 * A, y1 = caja.yTope - 2.5 * A;
  const paso = op.paso || Math.max(6, (caja.x1 - caja.x0) / 90);
  let f = desde, espera = 0.4, chor = 0, llegado = Math.abs(objetivo - desde) < 0.0008;
  const superficie = (x, yN, turb, t) => yN + A * turb * (0.6 * Math.sin(x * 0.021 * FR + t * 1.3) + 0.4 * Math.sin(x * 0.047 * FR - t * 0.9));

  function pintar(t) {
    const yN = y0 + (y1 - y0) * f;
    const turb = 1 + 0.3 * Math.sin(t * 0.5); // el oleaje «respira»: a ratos más agitado, a ratos más calmo
    let da = "M" + caja.x0 + " " + caja.fondo, df = da;
    for (let x = caja.x0; x <= caja.x1 + paso; x += paso) {
      const ya = superficie(x, yN, turb, t);
      const yf = yN + A * 0.6 + A * 0.9 * turb * (0.55 * Math.sin(x * 0.018 * FR - t * 1.1 + 1.7) + 0.45 * Math.sin(x * 0.052 * FR + t * 0.8 + 0.6));
      da += "L" + x.toFixed(1) + " " + ya.toFixed(1);
      df += "L" + x.toFixed(1) + " " + yf.toFixed(1);
    }
    const cierre = "L" + (caja.x1 + paso).toFixed(1) + " " + caja.fondo + "Z";
    atras.setAttribute("d", da + cierre);
    frente.setAttribute("d", df + cierre);
    if (ch) pintarChorro(t, yN, turb);
  }
  function pintarChorro(t, yN, turb) {
    if (chor < 0.01) { for (const n of [cAlto, cBajo, bAlto, bBajo]) n.setAttribute("d", ""); salpico.setAttribute("rx", 0); return; }
    const w = ch.ancho * (0.5 + 0.5 * chor), x = ch.x + Math.sin(t * 3.1) * ch.ancho * 0.12;
    const yFin = ch.yTop + (Math.max(ch.yTop, superficie(ch.x, yN, turb, t)) - ch.yTop) * chor;   // el chorro baja hasta tocar el agua
    const col = (a, b, ancho) => (b > a ? "M" + (x - ancho / 2).toFixed(1) + " " + a.toFixed(1) + "L" + (x + ancho / 2).toFixed(1) + " " + a.toFixed(1) + "L" + (x + ancho / 2).toFixed(1) + " " + b.toFixed(1) + "L" + (x - ancho / 2).toFixed(1) + " " + b.toFixed(1) + "Z" : "");
    const linea = (a, b) => (b > a ? "M" + (x - w * 0.18).toFixed(1) + " " + a.toFixed(1) + "L" + (x - w * 0.18).toFixed(1) + " " + b.toFixed(1) : "");
    const yE = Math.min(yFin, ch.yEntrada);
    cAlto.setAttribute("d", col(ch.yTop, yE, w));
    cBajo.setAttribute("d", col(Math.max(ch.yTop, ch.yEntrada), yFin, w));
    for (const b of [bAlto, bBajo]) { b.setAttribute("stroke-width", (w * 0.22).toFixed(1)); b.setAttribute("stroke-dasharray", (w * 1.6).toFixed(1) + " " + (w * 2.4).toFixed(1)); b.setAttribute("stroke-dashoffset", (-t * w * 14).toFixed(1)); }
    bAlto.setAttribute("d", linea(ch.yTop, yE));
    bBajo.setAttribute("d", linea(Math.max(ch.yTop, ch.yEntrada), yFin));
    const r = ch.ancho * (1.3 + 0.6 * Math.sin(t * 9));   // salpicadura donde cae el chorro
    salpico.setAttribute("cx", x.toFixed(1)); salpico.setAttribute("cy", yFin.toFixed(1));
    salpico.setAttribute("rx", r.toFixed(1)); salpico.setAttribute("ry", (r * 0.3).toFixed(1));
    salpico.setAttribute("stroke-width", (ch.ancho * 0.25).toFixed(1)); salpico.setAttribute("opacity", chor.toFixed(2));
  }
  const avisarLlegada = () => { if (!llegado) { llegado = true; if (op.alLlegar) op.alLlegar(); } };
  return {
    pintar,
    quieto() { f = objetivo; chor = 0; pintar(0); avisarLlegada(); },
    tick(dt, t) {
      if (espera > 0) espera -= dt;
      else {
        f += (objetivo - f) * (1 - Math.exp(-dt * VEL)); // sube suave y frena al llegar
        if (Math.abs(objetivo - f) < 0.0008) f = objetivo;
      }
      if (ch) chor += ((objetivo - f > 0.004 ? 1 : 0) - chor) * (1 - Math.exp(-dt * 6));   // el chorro aparece al empezar y se apaga al llegar
      pintar(t);
      if (f === objetivo && chor < 0.05) avisarLlegada();
    },
    quitar() { g.remove(); if (ch) { cAlto.remove(); bAlto.remove(); } },
  };
}

// ---------- El mapa ----------
export function montarMapa(o) {
  if (!o || !o.etapas || typeof o.progreso !== "function" || typeof o.jugarNivel !== "function") throw new Error("montarMapa: faltan etapas, progreso o jugarNivel");
  const { soloPaises: SOLO_PAISES, estados: ESTADOS_ORDEN, paises: PAISES_ORDEN, numEstados: NUM_ESTADOS, numPaises: NUM_PAISES, porEtapa: NIVELES_POR_ETAPA, nivelesMexico: NIVELES_MEXICO, resumen, etapaDe, baseEstado, basePais } = o.etapas;
  const pre = o.prefijo || "juego";
  const VISTA_PRINCIPAL = SOLO_PAISES ? "pais" : "mexico";   // la vista a la que se vuelve con «principal» y que cuenta como «el mapa» para el ☰
  const CLAVE_AGUA = pre + "-agua";          // dónde estaba el agua la última vez (para verla SUBIR al volver al mapa)
  const CLAVE_MUNDO = pre + "-mundo-visto";  // «1» cuando ya entraste al mundo (apaga el aviso de novedad)

  // ---------- Memoria de dónde estaba el agua ----------
  function memoriaAgua(zona, objetivo) {
    let m = {};
    try { m = JSON.parse(localStorage.getItem(CLAVE_AGUA) || "{}") || {}; } catch (e) {}
    const antes = typeof m[zona] === "number" ? m[zona] : objetivo; // primera vez: sin animación
    m[zona] = objetivo;
    try { localStorage.setItem(CLAVE_AGUA, JSON.stringify(m)); } catch (e) {}
    return antes;
  }
  const leerMundoVisto = () => { try { return localStorage.getItem(CLAVE_MUNDO) === "1"; } catch (e) { return false; } };
  const marcarMundoVisto = () => { try { localStorage.setItem(CLAVE_MUNDO, "1"); } catch (e) {} };

  let pendienteContornos = false;
  if (SOLO_PAISES) import("./contornos-paises.js").then((m) => { CONTORNOS = m.CONTORNOS; if (pendienteContornos && abierto && vista === "pais") pintar(); }).catch(() => {});

  const estilo = document.createElement("style");
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const raiz = h("div", "m-raiz");
  raiz.hidden = true;
  const cab = h("div", "m-cab");
  const textos = h("div", "m-textos");
  const titulo = h("h2", "m-titulo");
  const info = h("p", "m-info");
  textos.append(titulo, info);
  const acciones = h("div", "m-acciones");
  cab.append(textos, acciones);
  const cuerpo = h("div", "m-cuerpo");
  raiz.append(cab, cuerpo);
  (document.body || document.documentElement).appendChild(raiz);

  let vista = VISTA_PRINCIPAL;   // mexico | estado | mundo | pais
  let indice = 0;         // estado o país abierto
  let abierto = false;
  let aguas = [], raf = 0, tPrev = 0, idAgua = 0;

  const prog = () => resumen(o.progreso());
  const nuevoMundo = () => !SOLO_PAISES && prog().mexicoCompleto && !leerMundoVisto();

  // --- animación del agua ---
  function detener() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function bucle(ahora) {
    raf = requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (ahora - tPrev) / 1000 || 0);
    tPrev = ahora;
    for (const a of aguas) a.tick(dt, ahora / 1000);
  }
  function arrancar() {
    detener();
    if (!aguas.length) return;
    if (quieto()) { aguas.forEach((a) => a.quieto()); return; }
    aguas.forEach((a) => a.pintar(0));
    tPrev = performance.now();
    raf = requestAnimationFrame(bucle);
  }

  // --- piezas comunes ---
  function boton(texto, icono, clase, fn) {
    const b = h("button", "b3d txt " + clase);
    b.type = "button";
    const i = h("span", "b-ico", icono);
    b.append(i, document.createTextNode(" " + texto));
    b.addEventListener("click", fn);
    acciones.appendChild(b);
    return b;
  }
  function botonContinuar() {
    const p = prog(), n = o.nivelContinuar ? o.nivelContinuar() : p.max;
    boton("Continuar · nivel " + n, "▶", "b-verde", () => o.jugarNivel(n));
  }
  const ir = (v, i = 0) => { vista = v; indice = i; pintar(); };

  // Lista de los niveles de una etapa. base = nivel anterior al primero de la etapa.
  // destino = dónde se pone (por defecto, el cuerpo del mapa); en la lista de países va dentro de la sección de cada país. Devuelve el botón del nivel actual.
  function rejillaNiveles(base, destino = cuerpo, enLista = false) {
    const p = prog();
    if (o.leyenda && !enLista) destino.appendChild(h("p", "m-leyenda", o.leyenda));
    const rej = h("div", "m-rej");
    if (o.columnas > 0) { rej.style.gridTemplateColumns = "repeat(" + o.columnas + ",minmax(0,1fr))"; rej.style.maxWidth = Math.min(880, o.columnas * 84) + "px"; }   // filas de «columnas» en «columnas»
    let actual = null;
    for (let k = 1; k <= NIVELES_POR_ETAPA; k++) {
      const n = base + k, inf = (o.infoNivel && o.infoNivel(n)) || {};
      const bloq = n > p.max, hecho = n <= p.hecho, esActual = !hecho && n === p.max;
      const b = h("button", "b3d m-nv " + (inf.clase || "b-azul") + (esActual ? " activo" : ""));
      b.type = "button";
      b.disabled = bloq;
      b.setAttribute("aria-label", "Nivel " + k + (inf.aria ? ": " + inf.aria : "") + (bloq ? " (bloqueado)" : hecho ? " (completado)" : ""));
      b.append(h("b", "", String(k)), h("small", "", inf.sub || ""));
      if (hecho && !inf.sinMarca) b.appendChild(h("span", "b-info", "✓"));
      b.addEventListener("click", () => o.jugarNivel(n));
      rej.appendChild(b);
      if (esActual) actual = b;
    }
    destino.appendChild(rej);
    // la lista se abre mostrando el nivel en el que vas
    if (!enLista && actual && actual.scrollIntoView) actual.scrollIntoView({ block: "center" });
    return actual;
  }

  // --- vista: México ---
  function vistaMexico() {
    const p = prog();
    titulo.textContent = "México";
    info.textContent = nuevoMundo() ? "¡Apareció algo nuevo! 🌍" : (o.avisoPrincipal ? o.avisoPrincipal() || "" : "");
    botonContinuar();
    for (const x of o.botonesExtra || []) boton(x.texto, x.icono || "•", x.clase || "b-azul", x.fn); // junto a Continuar (p. ej. ♾️ Juego libre)
    if (o.alInfo) boton("Info", "ℹ️", "b-azul", o.alInfo); // explica cómo jugar
    if (p.mexicoCompleto) {
      const b = boton("Mundo", "🌍", "b-azul" + (nuevoMundo() ? " m-nuevo" : ""), () => { marcarMundoVisto(); ir("mundo"); });
      b.setAttribute("aria-label", "Abrir el mapa del mundo");
    }

    const P = proyector(-118.8, -86.2, 33.2, 14, 20, 0.9);
    const baseMx = { x: -6, y: 0, w: P.w + 12, h: P.h };
    const svg = el("svg", { viewBox: baseMx.x + " " + baseMx.y + " " + baseMx.w + " " + baseMx.h, role: "img", "aria-label": "México: " + p.estadosHechos + " de " + NUM_ESTADOS + " estados completados" }, cuerpo);
    const dm = trazo(MEXICO, P);
    el("path", { d: dm, fill: SOMBRA, transform: "translate(0 5)" }, svg);
    el("path", { d: dm, fill: "#fff" }, svg);
    const objetivo = ASCENSO_SUAVE ? Math.min(p.hecho, NIVELES_MEXICO) / NIVELES_MEXICO : p.estadosHechos / NUM_ESTADOS;
    const desde = memoriaAgua("mexico", objetivo);
    aguas.push(crearAgua(svg, "agua" + ++idAgua, dm, { x0: -6, x1: P.w + 6, yBase: P.p(0, 14.4)[1], yTope: P.p(0, 32.8)[1], fondo: P.h + 30, amp: 4.5 }, objetivo, desde));
    el("path", { d: dm, fill: "none", stroke: BORDE, "stroke-width": 2, "stroke-linejoin": "round", "pointer-events": "none" }, svg);

    const puntos = []; // para que los puntos conserven su tamaño en pantalla al acercar
    ESTADOS_ORDEN.forEach((e, i) => {
      const [x, y] = P.p(e.lon, e.lat);
      const hecho = i < p.estadosHechos, abierto = i * NIVELES_POR_ETAPA + 1 <= p.max, esActual = i === p.estadoActual && !hecho && !p.mexicoCompleto;
      if (!abierto) return; // los estados que aún no se desbloquean no se dibujan
      const g = el("g", { class: "m-punto" }, svg);
      puntos.push({ g, x, y });
      if (esActual) el("circle", { cx: x, cy: y, r: 8, fill: "none", stroke: COLOR_ACTUAL, "stroke-width": 2.5, class: "m-pulso", "pointer-events": "none" }, g);
      el("circle", { cx: x, cy: y, r: esActual ? 8 : 6, fill: esActual ? COLOR_ACTUAL : hecho ? COLOR_HECHO : "#fff", stroke: COLOR_HECHO, "stroke-width": 2, "pointer-events": "none" }, g);
      el("circle", { cx: x, cy: y, r: 15, fill: "transparent", class: "m-zona" }, g);
      accesible(g, e.nombre + (hecho ? " (completado)" : ""), () => ir("estado", i));
      if (esActual) etiqueta(g, x, y - 13, e.nombre, 15);
    });
    const z = hacerZoomable(svg, baseMx, (k) => {
      for (const q of puntos) q.g.setAttribute("transform", "translate(" + q.x + " " + q.y + ") scale(" + (1 / k).toFixed(4) + ") translate(" + -q.x + " " + -q.y + ")");
    });
    // Al entrar al mapa, la vista se acerca sola al estado donde vas (con México completo se deja entero)
    if (!p.mexicoCompleto) {
      const e = ESTADOS_ORDEN[p.estadoActual], [ex, ey] = P.p(e.lon, e.lat);
      z.irA(ex, ey, ZOOM_ESTADO_ACTUAL, true);
    }
  }

  // --- vista: un estado ---
  function vistaEstado() {
    const p = prog(), e = ESTADOS_ORDEN[indice], base = baseEstado(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA);
    titulo.textContent = "📍 " + e.nombre;
    info.textContent = "Etapa " + (indice + 1) + " de " + NUM_ESTADOS + " · " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados";
    boton("México", "◀", "b-cielo", () => ir("mexico"));
    if (p.max > base && p.max <= base + NIVELES_POR_ETAPA) botonContinuar();
    rejillaNiveles(base);
  }

  // --- vista: mundo ---
  function vistaMundo() {
    const p = prog();
    titulo.textContent = "🌍 Mundo";
    const resumenMundo = "💧 " + p.paisesHechos + " de " + NUM_PAISES + " países completados · toca un país para ver sus niveles";
    if (SOLO_PAISES) {   // vista principal: Continuar, botones extra (p. ej. ♾️ Modo libre) e Info, como la de México en el mapa clásico
      info.textContent = resumenMundo + (o.avisoPrincipal && o.avisoPrincipal() ? " · " + o.avisoPrincipal() : "");
      botonContinuar();
      for (const x of o.botonesExtra || []) boton(x.texto, x.icono || "•", x.clase || "b-azul", x.fn);
      if (o.alInfo) boton("Info", "ℹ️", "b-azul", o.alInfo);
    } else {
      info.textContent = resumenMundo;
      boton("México", "◀", "b-cielo", () => ir("mexico"));
      if (p.max > NIVELES_MEXICO) botonContinuar();
    }
    cuerpo.classList.add("m-mundo");

    const P = proyector(-170, 180, 84, -57, 2, 1);
    const baseMu = { x: 0, y: 0, w: P.w, h: P.h };
    const svg = el("svg", { viewBox: "0 0 " + P.w + " " + P.h, role: "img", "aria-label": "Mundo: " + p.paisesHechos + " de " + NUM_PAISES + " países completados" }, cuerpo);
    const d = CONTINENTES.map((c) => trazo(c, P)).join("");
    el("path", { d, fill: SOMBRA, transform: "translate(0 2.5)" }, svg);
    el("path", { d, fill: "#fff" }, svg);
    const objetivo = ASCENSO_SUAVE ? acotar((p.hecho - NIVELES_MEXICO) / (NUM_PAISES * NIVELES_POR_ETAPA), 0, 1) : p.paisesHechos / NUM_PAISES;
    const desde = memoriaAgua("mundo", objetivo);
    aguas.push(crearAgua(svg, "agua" + ++idAgua, d, { x0: 0, x1: P.w, yBase: P.p(0, -55)[1], yTope: P.p(0, 83.5)[1], fondo: P.h + 20, amp: 3.5 }, objetivo, desde));
    for (const l of LAGOS) el("path", { d: trazo(l, P), fill: "#fff", "pointer-events": "none" }, svg);
    el("path", { d, fill: "none", stroke: BORDE, "stroke-width": 0.9, "stroke-linejoin": "round", "pointer-events": "none" }, svg);

    hacerZoomable(svg, baseMu);
    const lista = h("div", "m-paises");
    PAISES_ORDEN.forEach((codigo, i) => {
      const hechos = acotar(p.hecho - basePais(i), 0, NIVELES_POR_ETAPA);
      if (basePais(i) + 1 > p.max) return; // los países sin desbloquear no aparecen en la lista
      const b = h("button", "m-pais" + (hechos >= NIVELES_POR_ETAPA ? " m-hecho" : "") + (hechos < NIVELES_POR_ETAPA && i === p.paisActual ? " m-actual" : ""));
      b.type = "button";
      b.setAttribute("aria-label", nombrePais(codigo) + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles");
      b.append(h("span", "m-bandera", banderaPais(codigo)), h("b", "", nombrePais(codigo)), h("small", "", hechos + " / " + NIVELES_POR_ETAPA));
      b.addEventListener("click", () => ir("pais", i));
      lista.appendChild(b);
    });
    cuerpo.appendChild(lista);
  }

  // --- vista: un país ---
  function vistaPais() {
    const p = prog(), codigo = PAISES_ORDEN[indice], base = basePais(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA);
    titulo.textContent = banderaPais(codigo) + " " + nombrePais(codigo);
    info.textContent = "País " + (indice + 1) + " de " + NUM_PAISES + " · " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados";
    boton("Mundo", "◀", "b-cielo", () => ir("mundo"));
    if (p.max > base && p.max <= base + NIVELES_POR_ETAPA) botonContinuar();
    rejillaNiveles(base);
  }

  // --- SOLO PAÍSES · vista principal: la lista (bandera + nombre del país y debajo sus 20 niveles, país tras país) ---
  let enfoque = null;      // país al que se baja al abrir la lista (null = el actual)
  let vigia = null;        // carga cada bandera cuando se acerca a la pantalla
  function vistaLista() {
    const p = prog();
    titulo.textContent = "🌍 Niveles";
    info.textContent = "💧 " + p.paisesHechos + " de " + NUM_PAISES + " países completados · toca un país para ver su mapa" + (o.avisoPrincipal && o.avisoPrincipal() ? " · " + o.avisoPrincipal() : "");
    botonContinuar();
    for (const x of o.botonesExtra || []) boton(x.texto, x.icono || "•", x.clase || "b-azul", x.fn);
    if (o.alInfo) boton("Info", "ℹ️", "b-azul", o.alInfo);
    if (o.leyenda) cuerpo.appendChild(h("p", "m-leyenda", o.leyenda));
    const col = h("div", "m-col");
    cuerpo.appendChild(col);
    if (vigia) vigia.disconnect();
    vigia = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.style.setProperty("--bandera", 'url("' + e.target.dataset.bandera + '")'); vigia.unobserve(e.target); }
    }, { root: cuerpo, rootMargin: "500px 0px" }) : null;
    const meta = enfoque != null ? enfoque : p.paisActual;
    let ir_a = null;
    PAISES_ORDEN.forEach((codigo, i) => {
      const base = basePais(i);
      if (base + 1 > p.max) return; // los países sin desbloquear no aparecen
      const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA), completo = hechos >= NIVELES_POR_ETAPA;
      const sec = h("section", "m-sec");
      const pb = h("button", "m-pbtn" + (completo ? " m-hecho" : "") + (!completo && i === p.paisActual ? " m-actual" : ""));
      pb.type = "button";
      pb.setAttribute("aria-label", nombrePais(codigo) + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles. Ver el mapa");
      pb.append(h("b", "", nombrePais(codigo)), h("small", "", completo ? "⭐ " + hechos + " / " + NIVELES_POR_ETAPA : "💧 " + hechos + " / " + NIVELES_POR_ETAPA));
      const barra = h("span", "m-barra"), rel = h("i");
      rel.style.width = (hechos / NIVELES_POR_ETAPA * 100) + "%";
      barra.appendChild(rel); pb.appendChild(barra);
      pb.dataset.bandera = urlBandera(codigo);
      if (vigia) vigia.observe(pb); else pb.style.setProperty("--bandera", 'url("' + pb.dataset.bandera + '")');
      pb.addEventListener("click", () => ir("pais", i));
      sec.appendChild(pb);
      const actual = rejillaNiveles(base, sec, true);
      col.appendChild(sec);
      if (i === meta) ir_a = actual || sec;
    });
    enfoque = null;
    if (ir_a && ir_a.scrollIntoView) ir_a.scrollIntoView({ block: ir_a.tagName === "BUTTON" && ir_a.classList.contains("m-nv") ? "center" : "start" });
  }

  // --- SOLO PAÍSES · los 20 niveles del país abierto (se llega con el botón «Niveles» de la botella) ---
  function vistaNivelesPais() {
    const p = prog(), codigo = PAISES_ORDEN[indice], base = basePais(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA);
    titulo.textContent = nombrePais(codigo);
    info.textContent = hechos + " de " + NIVELES_POR_ETAPA + " niveles completados";
    boton("Mapa", "◀", "b-cielo", () => ir("pais", indice));
    botonContinuar();
    rejillaNiveles(base);
  }

  // --- SOLO PAÍSES · vista de un país: la silueta es una botella que se llena de agua, un poco con cada nivel ---
  function vistaBotella() {
    const p = prog(), codigo = PAISES_ORDEN[indice], base = basePais(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA), completo = hechos >= NIVELES_POR_ETAPA;
    titulo.textContent = nombrePais(codigo);
    info.textContent = "País " + (indice + 1) + " de " + NUM_PAISES + " · " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados" + (completo ? " · ¡completo! ⭐" : "");
    // Navegación país por país (todos los anteriores al actual están abiertos): ◀ anterior · ▶ siguiente · 🗂️ niveles de este país · Continuar
    if (indice > 0) boton("", "◀", "b-cielo", () => ir("pais", indice - 1)).setAttribute("aria-label", "País anterior");
    if (indice + 1 < NUM_PAISES && basePais(indice + 1) + 1 <= p.max) boton("", "▶", "b-cielo", () => ir("pais", indice + 1)).setAttribute("aria-label", "País siguiente");
    boton("Niveles", "🗂️", "b-azul", () => ir("niveles", indice));
    botonContinuar();

    const c = (CONTORNOS && CONTORNOS[codigo]) || GOTA, w = c.w, hh = c.h, id = ++idAgua;
    const vb = { x: -15, y: -62, w: w + 30, h: hh + 84 };   // arriba queda espacio para el chorro
    const svg = el("svg", { viewBox: vb.x + " " + vb.y + " " + vb.w + " " + vb.h, class: "m-botella", role: "img", "aria-label": nombrePais(codigo) + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados" }, cuerpo);
    el("path", { d: c.d, fill: SOMBRA, transform: "translate(0 5)" }, svg);
    const sil = el("path", { d: c.d, fill: "#fff" }, svg);
    const objetivo = acotar(hechos / NIVELES_POR_ETAPA, 0, 1);
    const desde = memoriaAgua("pais" + indice, objetivo);   // dónde estaba el agua la última vez: de ahí sube

    // La bandera cubre la silueta cuando el país está completo (entra con un desvanecido si se acaba de llenar)
    let bandera = null;
    if (objetivo >= 1) {
      const cb = el("clipPath", { id: "cb" + id }, el("defs", {}, svg));
      el("path", { d: c.d }, cb);
      bandera = el("image", { href: urlBandera(codigo), x: 0, y: 0, width: w, height: hh, preserveAspectRatio: "xMidYMid slice", "clip-path": "url(#cb" + id + ")", "pointer-events": "none" }, svg);
      bandera.style.opacity = desde >= 1 ? 1 : 0;
    }
    if (objetivo < 1 || desde < 1) {
      // punto por donde cae el chorro: el primer lugar de la silueta, cerca del centro, que está debajo de la entrada
      let ent = { x: w / 2, y: 0 };
      try {
        buscar: for (const dx of [0, -0.08, 0.08, -0.16, 0.16, -0.25, 0.25]) {
          const x = w / 2 + dx * w;
          for (let y = 0; y <= hh; y += hh / 70) if (sil.isPointInFill(new DOMPoint(x, y))) { ent = { x, y }; break buscar; }
        }
      } catch (e) {}
      const lado = Math.max(w, hh);
      const agua = crearAgua(svg, "agua" + id, c.d, { x0: -15, x1: w + 15, yBase: hh, yTope: 0, fondo: hh + 40, amp: acotar(lado * 0.016, 2.5, 5) }, objetivo, desde, {
        vel: 1.1, frec: 2.4, paso: 3.5,
        chorro: { x: ent.x, yTop: vb.y + 4, yEntrada: ent.y, ancho: acotar(lado * 0.024, 5, 9) },
        alLlegar: objetivo >= 1 ? () => {
          // ¡País lleno! AQUÍ va la animación del destello dorado (pendiente). Por ahora solo se cambia el agua por la bandera.
          if (o.alPaisCompleto) o.alPaisCompleto({ codigo, indice, svg, d: c.d, w, h: hh });
          if (bandera) { bandera.style.transition = "opacity 1.2s ease"; bandera.style.opacity = 1; }
          setTimeout(() => { agua.quitar(); aguas = aguas.filter((a) => a !== agua); }, 1400);   // ya no hace falta la botella de este país
        } : null,
      });
      aguas.push(agua);
    }
    el("path", { d: c.d, fill: "none", stroke: TINTA, "stroke-width": 3.5, "stroke-linejoin": "round", "pointer-events": "none" }, svg);   // trazo que rodea al país
    // las siluetas se cargan aparte: al llegar, se vuelve a dibujar la botella (si no hay una animación en curso)
    if (!CONTORNOS) pendienteContornos = true;
  }

  function pintar() {
    detener();
    aguas = [];
    cuerpo.replaceChildren();
    cuerpo.classList.remove("m-mundo");
    acciones.replaceChildren();
    if (vista === "mexico") vistaMexico();
    else if (vista === "estado") vistaEstado();
    else if (vista === "mundo") (SOLO_PAISES ? vistaLista() : vistaMundo());
    else if (SOLO_PAISES && vista === "niveles") vistaNivelesPais();
    else (SOLO_PAISES ? vistaBotella() : vistaPais());
    if (aguas.length) arrancar();
    if (o.alCambiarVista) o.alCambiarVista(vista === VISTA_PRINCIPAL);
  }

  function principal() { vista = VISTA_PRINCIPAL; indice = SOLO_PAISES ? prog().paisActual : 0; enfoque = null; if (abierto) pintar(); }

  addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && abierto && vista !== VISTA_PRINCIPAL) { ev.preventDefault(); principal(); }
  });

  return {
    abrir(n, alcanzado) {
      abierto = true;
      raiz.hidden = false;
      vista = VISTA_PRINCIPAL; indice = SOLO_PAISES ? prog().paisActual : 0;   // solo países: se abre directo el país donde va el jugador
      if (n) {
        const e = etapaDe(n);
        if (e.zona === "mexico") { if (!alcanzado) { vista = "estado"; indice = e.indice; } }
        else if (SOLO_PAISES) indice = e.indice;   // la botella del país del nivel n (con alcanzado = true se ve subir el agua)
        else { vista = alcanzado ? "mundo" : "pais"; indice = e.indice; if (vista === "mundo") marcarMundoVisto(); }
      }
      pintar();
    },
    cerrar() { abierto = false; raiz.hidden = true; detener(); aguas = []; },
    refrescar() { if (abierto) pintar(); },
    principal,
    esPrincipal: () => vista === VISTA_PRINCIPAL,
    abierto: () => abierto,
  };
}
