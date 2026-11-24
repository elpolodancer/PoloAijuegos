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
//   Banderas: imagenes-banderas/xx.svg (xx = código ISO en minúsculas). mapa.abrir(n, true) abre la botella del país del nivel n para verla subir.
//   PAÍS BONITO (con unPais, 23 nov 2026): la silueta es tierra verde con franja de playa, manchas de pasto, flores, montañas con nieve, árboles (redondos y pinos, siempre los mismos en cada país) y una banderita en un poste;
//   nada de eso queda debajo del botón «Continuar». El agua es un poco translúcida (AGUA_TRANSPARENTE) y la banderita queda encima de ella; al completar el país la banderita se queda y la tierra con su decoración sigue a la vista (la bandera grande ya no la tapa).
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
//     resumenEstrellas: (primerNivel, ultimoNivel) => html,   // (con unPais) línea de estrellas del país: va bajo «N de 20 niveles completados» y sobre los niveles; "" = no se muestra
//     infoNivel: (n) => ({ sub, aria, clase, sinMarca, estrellasHtml }),   // estrellasHtml = estrellitas del nivel (entre el número y el tiempo)
//     botonesExtra: [{ icono, texto, clase, fn }], // van a la derecha de «Continuar» (por ejemplo ♾️ Juego libre)
//     alInfo: () => { ... },                   // botón «Info» de la vista principal
//     avisoPrincipal: () => "texto",           // línea de información bajo el título de la vista principal
//     alCambiarVista: (esPrincipal) => { ... } // avisa de cada cambio de vista (el juego vuelve a rotular el ☰: «Atrás» mientras el mapa está abierto)
//     unPais: true,                            // SOLO con crearEtapas({ soloPaises: true }): NO hay lista ni mundo; la vista principal es la botella del país donde va el jugador
//                                              //   (solo su contorno con trazo), con ◀ ▶ (países abiertos), 🗂️ Niveles (los niveles del país) y Continuar. Sin esta opción el mapa solo de países sigue como siempre.
//   (con unPais, 23 nov 2026) el botón «🗺️ Mapa» de la botella abre el MUNDO en blanco: solo se dibujan, con su trazo, los países ya desbloqueados (sus siluetas de compartido/contornos-paises.js puestas en su lugar con compartido/posiciones-paises.js); al tocar uno se abren sus 20 niveles (opción columnas) y desde ahí «Mapa» regresa al mundo.
//   (con unPais) mapa.centroPais() = punto de la pantalla dentro del país abierto · mapa.parpadear(k) = el país hace «pop» (se hincha, destella y rebota sin mostrar barras de desplazamiento; k = 0, 1, 2… lo hace más fuerte) · mapa.retenerContinuar(true/false) = oculta o muestra el botón «Continuar» del centro (lo usa la celebración de «deslizante»)
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
let POSICIONES = null;   // solo con unPais: dónde va cada silueta sobre el mapa del mundo (compartido/posiciones-paises.js, lo genera herramientas/generar-posiciones-paises-herramientas.mjs)
const GOTA = { w: 300, h: 300, d: "M150 20C215 20 255 75 255 130C255 195 200 280 150 280C100 280 45 195 45 130C45 75 85 20 150 20Z" };
const urlBandera = (codigo) => new URL("../imagenes-banderas/" + codigo.toLowerCase() + ".svg", import.meta.url).href;

// ----- Ajustes -----
// false = el agua sube por escalones (un estado o un país terminado = un escalón), como se diseñó.
// true  = sube un poquito con cada nivel terminado (más continuo).
const ASCENSO_SUAVE = false;

const NS = "http://www.w3.org/2000/svg";
const AZUL_ATRAS = "#bfe4fb", AZUL_FRENTE = "#8ccdf5", BORDE = "#8fa9c0", SOMBRA = "#e3e9ef", TINTA = "#2b3a4a";
const COLOR_HECHO = "#1f78c8", COLOR_ACTUAL = "#ff9a1f";
// País «bonito» (solo con unPais): tierra verde con playa, árboles, montañas y una banderita; el agua la cubre poco a poco y deja ver la tierra a través
const VERDE_ARRIBA = "#a6e27a", VERDE_ABAJO = "#56b24e", PLAYA = "#f3e2a6", LINEA_TIERRA = "#2f6f3a";
const AGUA_TRANSPARENTE = { atras: 0.84, frente: 0.7 };   // opacidad del agua dentro del país (1 y 0.8 = como antes, sin dejar ver la tierra)

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
.m-acciones .b3d{--t:42px;font-size:15px;height:63px}   /* alto +50 % (42 → 63 px) en País · Mapa · Continuar; el ancho sigue siendo automático (igual que antes) */
/* Botón «País»: la bandera del país de fondo; el velo oscuro deja leer el texto */
/* «Mapa»: botón redondo (63 px, solo el emoji 🌍) sobre un mar azul: se entra al mundo tocando el globo */
.m-acciones .b3d.b-mundo{width:63px;min-width:63px;padding:0;border-radius:50%;font-size:36px;background:radial-gradient(circle at 35% 30%,#d4f1ff,#3aa0e6 55%,#17548f)}
.b3d.b-bandera{background:linear-gradient(180deg,rgba(10,20,35,.15),rgba(10,20,35,.55)),var(--bandera,none) center/cover no-repeat,var(--c2);text-shadow:0 1px 3px rgba(0,0,0,.95),0 2px 0 rgba(0,0,0,.4)}
.m-cuerpo{flex:1 1 0;min-height:0;display:flex;flex-direction:column;align-items:center;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 2px 12px}
.m-cuerpo>svg{display:block;width:100%;flex:1 1 auto;min-height:0;max-height:100%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.m-cuerpo.m-mundo>svg{flex:none;height:auto;max-height:42vh}
.m-leyenda{margin:0 0 8px;font-size:.78rem;color:var(--txt-fondo-suave,#5b6b7c);text-align:center}
.m-rej{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:12px 10px;width:100%;max-width:880px;padding:6px 6px 14px}
.m-nv.b3d{width:100%;height:58px;margin:0 0 5px;flex-direction:column;gap:1px;font-size:17px;font-weight:800}
.m-nv small{font-size:11px;font-weight:600;opacity:.92}
.m-nv .m-est{display:flex;justify-content:center;line-height:0;--e:11px}   /* estrellas ganadas del nivel (las pinta el juego con infoNivel → estrellasHtml) */
.m-nv .m-est .fila-est{gap:2px}
.m-resumen{flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 16px;margin:8px 0 0;font-size:.95rem;font-weight:800;color:var(--txt-fondo,#2b3a4a);text-shadow:var(--sombra-txt,none);text-align:center}   /* «Estrellas del país»: ganadas / posibles (lo arma el juego con resumenEstrellas) */
.m-resumen .est{--e:20px;vertical-align:middle;margin-right:4px}
.m-resumen small{font-weight:700;font-size:.8em;opacity:.85}
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
.m-punto:focus-visible path{stroke:#2b3a4a}
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
.m-cuerpo.m-uno{position:relative}
.m-cuerpo.m-pop{overflow:hidden;overflow:clip;overflow-clip-margin:48px} /* durante el «pop» del país: lo que se hincha NO crea barras de desplazamiento ni mueve la vista (clip con margen de 48 px; hidden donde no existe clip) */
.b3d.b-montana{--c1:#74b57f;--c2:#2f7a45;--c3:#16452a}   /* botón «País»: verde oscuro de monte, como los pinos y el relieve del mapa */
.m-centro.b3d{--t:46px;position:absolute;z-index:2;margin:0;font-size:16px}
.m-centro.m-dos{height:auto;min-height:54px;flex-direction:column;gap:2px;padding:6px 20px;line-height:1.1}   /* «Continuar» en una línea y el nivel en la de abajo */
.m-centro.m-dos .m-l2{font-size:13px;font-weight:700;opacity:.95}
.m-titulo:empty{display:none}
.m-pais-nombre{flex:none;margin:0 0 2px;font-size:clamp(1.9rem,6vw,3rem);font-weight:900;line-height:1.1;text-align:center;color:var(--txt-fondo,#2b3a4a);text-shadow:var(--sombra-txt,0 2px 0 rgba(255,240,210,.6))}
.m-pais-niveles{flex:none;margin:14px 0 0;font-size:1rem;font-weight:700;text-align:center;color:var(--txt-fondo-suave,#5b6b7c)}   /* unPais: el botón «Continuar» va dentro del país, en su centro (se coloca con left/top desde ubicarCentro) */
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

// ---------- País «bonito» (solo con unPais) ----------
// Números al azar con semilla (el mismo país se ve siempre igual): devuelve una función que da números de 0 a 1.
function azarDe(texto) {
  let s = 2166136261;
  for (let i = 0; i < texto.length; i++) { s ^= texto.charCodeAt(i); s = Math.imul(s, 16777619); }
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Pinta sobre la silueta (ya verde): manchas de pasto, flores, montañas y árboles. «libre(x, y, m)» dice si un punto cae donde va el botón «Continuar» (ahí no se pone nada).
function pintarTierra(svg, dSil, codigo, w, hh, id, dentro, boton, banderita) {
  const rnd = azarDe(codigo), lado = Math.max(w, hh);
  // «tapado»: ahí va el botón «Continuar» o la banderita, así que no se pone nada (m = margen extra)
  const tapado = (x, y, m = 0) => (Math.abs(x - boton.x) < boton.kx + m && Math.abs(y - boton.y) < boton.ky + m) ||
    (!!banderita && x > banderita.x - 6 - m && x < banderita.x + banderita.fw + 8 + m && y > banderita.y - banderita.poste - 7 - m && y < banderita.y + 6 + m);
  const cp = el("clipPath", { id: "ct" + id }, el("defs", {}, svg));
  el("path", { d: dSil }, cp);
  const g = el("g", { "pointer-events": "none" }, svg);
  const suelo = el("g", { "clip-path": "url(#ct" + id + ")" }, g);
  // manchas de pasto claro y oscuro
  for (let i = 0; i < 10; i++) {
    const x = rnd() * w, y = rnd() * hh, rx = lado * (0.07 + rnd() * 0.14), ry = rx * (0.45 + rnd() * 0.5), oscura = i % 3 === 0;
    el("ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: rx.toFixed(1), ry: ry.toFixed(1), fill: oscura ? "#3e9a45" : "#c9f29a", opacity: oscura ? 0.22 : 0.4, transform: "rotate(" + Math.floor(rnd() * 180) + " " + x.toFixed(1) + " " + y.toFixed(1) + ")" }, suelo);
  }
  // flores chiquitas
  const FLORES = ["#ffffff", "#ffe066", "#ff9ecb", "#ffb347"];
  for (let i = 0, n = 0; i < 160 && n < 22; i++) {
    const x = rnd() * w, y = rnd() * hh;
    if (!dentro(x, y) || tapado(x, y, 6)) continue;
    el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.9 + rnd() * 0.7).toFixed(1), fill: FLORES[Math.floor(rnd() * FLORES.length)] }, suelo);
    n++;
  }
  // montañas (pocas, con nieve arriba)
  const sM = acotar(lado * 0.055, 9, 17), montes = [];
  for (let i = 0, n = 0, meta = rnd() < 0.5 ? 3 : 2; i < 220 && n < meta; i++) {
    const x = rnd() * w, y = rnd() * hh;
    if (!dentro(x, y) || !dentro(x - sM, y) || !dentro(x + sM, y) || !dentro(x, y - 1.3 * sM) || tapado(x, y - sM * 0.6, sM)) continue;
    if (montes.some((m) => Math.hypot(m.x - x, m.y - y) < sM * 3.2)) continue;
    montes.push({ x, y }); n++;
  }
  montes.sort((a, b) => a.y - b.y);
  for (const { x, y } of montes) {
    const P = (dx, dy) => (x + dx * sM).toFixed(1) + " " + (y + dy * sM).toFixed(1);
    el("ellipse", { cx: x.toFixed(1), cy: (y + 1).toFixed(1), rx: (sM * 1.1).toFixed(1), ry: (sM * 0.18).toFixed(1), fill: "rgba(0,40,0,.25)" }, g);
    el("path", { d: "M" + P(-1, 0) + "L" + P(0, -1.3) + "L" + P(1, 0) + "Z", fill: "#8d9180" }, g);
    el("path", { d: "M" + P(0, -1.3) + "L" + P(1, 0) + "L" + P(0.1, 0) + "Z", fill: "rgba(0,0,0,.2)" }, g);
    el("path", { d: "M" + P(-0.3, -0.97) + "L" + P(0, -1.3) + "L" + P(0.3, -0.97) + "L" + P(0.13, -0.86) + "L" + P(0, -0.97) + "L" + P(-0.14, -0.85) + "Z", fill: "#fff" }, g);
  }
  // árboles: redondos y pinos, sin salirse de la costa, sin amontonarse y sin quedar debajo del botón «Continuar»
  const r = acotar(lado * 0.022, 4.5, 8), arboles = [];
  for (let i = 0; i < 1100 && arboles.length < 52; i++) {
    const x = rnd() * w, y = rnd() * hh, pino = rnd() < 0.4;
    const alto = pino ? 3.3 : 2.3;
    if (!dentro(x, y) || !dentro(x - r, y - r) || !dentro(x + r, y - r) || !dentro(x, y - alto * r)) continue;
    if (tapado(x, y - r, r) || montes.some((m) => Math.hypot(m.x - x, m.y - y) < sM * 1.1)) continue;
    if (arboles.some((a) => Math.hypot(a.x - x, (a.y - y) * 1.3) < r * 2.4)) continue;
    arboles.push({ x, y, pino });
  }
  arboles.sort((a, b) => a.y - b.y);   // los de más abajo tapan a los de más arriba
  for (const { x, y, pino } of arboles) {
    const X = (dx) => (x + dx * r).toFixed(1), Y = (dy) => (y + dy * r).toFixed(1);
    el("ellipse", { cx: X(0.1), cy: Y(0.15), rx: (r * 0.9).toFixed(1), ry: (r * 0.3).toFixed(1), fill: "rgba(0,50,0,.28)" }, g);
    el("rect", { x: X(-0.17), y: Y(-0.95), width: (r * 0.34).toFixed(1), height: (r * 1.05).toFixed(1), fill: "#7a4a24" }, g);
    if (pino) {
      el("path", { d: "M" + X(-0.9) + " " + Y(-0.6) + "L" + X(0) + " " + Y(-2) + "L" + X(0.9) + " " + Y(-0.6) + "Z", fill: "#25754a" }, g);
      el("path", { d: "M" + X(-0.72) + " " + Y(-1.3) + "L" + X(0) + " " + Y(-2.7) + "L" + X(0.72) + " " + Y(-1.3) + "Z", fill: "#2c8a55" }, g);
      el("path", { d: "M" + X(-0.52) + " " + Y(-2.05) + "L" + X(0) + " " + Y(-3.3) + "L" + X(0.52) + " " + Y(-2.05) + "Z", fill: "#35a264" }, g);
    } else {
      el("circle", { cx: X(-0.55), cy: Y(-1.15), r: (r * 0.72).toFixed(1), fill: "#2f8f3c" }, g);
      el("circle", { cx: X(0.55), cy: Y(-1.15), r: (r * 0.72).toFixed(1), fill: "#2f8f3c" }, g);
      el("circle", { cx: X(0), cy: Y(-1.5), r: (r * 0.95).toFixed(1), fill: "#3aa347" }, g);
      el("circle", { cx: X(-0.3), cy: Y(-1.85), r: (r * 0.38).toFixed(1), fill: "#74d663", opacity: 0.85 }, g);
    }
  }
}
// Busca dónde plantar la banderita: dentro del país, lejos del botón «Continuar», lo más cerca posible del centro (y mejor arriba que abajo). Devuelve { x, y, fw, fh, poste } o null.
function ubicarBanderita(w, hh, dentro, boton) {
  const lado = Math.max(w, hh);
  for (const f of [1, 0.78, 0.6]) {
    const fw = acotar(lado * 0.16, 30, 52) * f, fh = fw * 0.66, poste = fh * 1.55;
    let mejor = null, ms = Infinity;
    for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) {
      const x = w * i / 30, y = hh * j / 30;                  // pie del poste
      const x0 = x - 3, x1 = x + fw + 3, y0 = y - poste - 3, y1 = y + 4;   // caja que ocupan poste y bandera
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (Math.abs(cx - boton.x) < boton.kx + (x1 - x0) / 2 && Math.abs(cy - boton.y) < boton.ky + (y1 - y0) / 2) continue;
      if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1], [cx, y0], [cx, y1], [x0, cy], [x1, cy]].every(([a, b]) => dentro(a, b))) continue;
      const sc = Math.hypot(cx - boton.x, cy - boton.y) + (cy > boton.y ? 0.35 * (cy - boton.y) : 0);
      if (sc < ms) { ms = sc; mejor = { x, y, fw, fh, poste }; }
    }
    if (mejor) return mejor;
  }
  // país muy angosto (Chile, Japón…): basta con que el poste quede en tierra; la bandera puede asomar sobre el mar
  const fw = acotar(lado * 0.16, 30, 52) * 0.75, fh = fw * 0.66, poste = fh * 1.55;
  let mejor = null, ms = Infinity;
  for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
    const x = w * i / 40, y = hh * j / 40;
    const x0 = x - 3, x1 = x + fw + 3, y0 = y - poste - 3, y1 = y + 4, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (Math.abs(cx - boton.x) < boton.kx + (x1 - x0) / 2 && Math.abs(cy - boton.y) < boton.ky + (y1 - y0) / 2) continue;
    if (![[x, y], [x, y - poste * 0.5], [x - 3, y]].every(([a, b]) => dentro(a, b))) continue;
    const sc = Math.hypot(cx - boton.x, cy - boton.y) + (cy > boton.y ? 0.35 * (cy - boton.y) : 0);
    if (sc < ms) { ms = sc; mejor = { x, y, fw, fh, poste }; }
  }
  return mejor;
}
// Poste de madera con la bandera del país (se mece un poquito; quieta con «reducir movimiento»)
function dibujarBanderita(svg, codigo, p, id, url) {
  const g = el("g", { transform: "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")", "pointer-events": "none" }, svg);
  el("ellipse", { cx: 0, cy: 1, rx: 6, ry: 2.2, fill: "rgba(0,50,0,.35)" }, g);
  el("path", { d: "M0 0L0 " + (-p.poste).toFixed(1), fill: "none", stroke: "#6b4423", "stroke-width": 2.4, "stroke-linecap": "round" }, g);
  const alto = el("g", { transform: "translate(0 " + (-p.poste).toFixed(1) + ")" }, g);
  const onda = el("g", {}, alto);
  const cp = el("clipPath", { id: "cf" + id }, el("defs", {}, onda));
  const R = { x: 1.5, y: 1, width: p.fw.toFixed(1), height: p.fh.toFixed(1), rx: 2.5 };
  el("rect", R, cp);
  el("rect", { ...R, fill: "#e8e8e8" }, onda);
  el("image", { href: url, x: 1.5, y: 1, width: p.fw.toFixed(1), height: p.fh.toFixed(1), preserveAspectRatio: "xMidYMid slice", "clip-path": "url(#cf" + id + ")" }, onda);
  el("rect", { ...R, fill: "none", stroke: "#fff", "stroke-width": 1.6 }, onda);
  el("circle", { cx: 0, cy: -1, r: 2.5, fill: "#ffc61f", stroke: "#b8860b", "stroke-width": 0.8 }, alto);   // bolita dorada en la punta del poste
  if (!quieto() && typeof onda.animate === "function") onda.animate([{ transform: "skewY(-3deg)" }, { transform: "skewY(3deg)" }], { duration: 1700, direction: "alternate", iterations: Infinity, easing: "ease-in-out" });
  return g;
}

// ---------- Agua: dos capas de olas que se mueven, recortadas con la silueta ----------
// caja = { x0, x1, yBase, yTope, fondo, amp }: yBase = parte más baja de la silueta, yTope = la más alta, fondo = hasta dónde se pinta
// op (opcional, para la «botella» de un país):
//   vel      qué tan rápido sube (por defecto 1.8)         frec   multiplica la frecuencia de las olas (siluetas chicas: 2.2)     paso   separación de los puntos de la ola
//   chorro   { x, yTop, yEntrada, ancho, escala }  una jarra se inclina arriba y su chorro cae desde yTop (la boca de la jarra) hasta la superficie MIENTRAS el agua sube (yEntrada = donde toca la silueta).
//            Mientras cae, las olas se agitan mucho (hasta ~4,5 veces su tamaño normal) y se calman solas al terminar de llenar.
//   alLlegar () => {}  se llama una vez cuando el agua termina de subir hasta «objetivo» (si es que tuvo que subir)
function crearAgua(svg, id, dSilueta, caja, objetivo, desde, op = {}) {
  const A = caja.amp, VEL = op.vel || 1.8, FR = op.frec || 1, ch = op.chorro;
  const cp = el("clipPath", { id }, el("defs", {}, svg));
  el("path", { d: dSilueta }, cp);
  const g = el("g", { "clip-path": "url(#" + id + ")", "pointer-events": "none" }, svg);
  const atras = el("path", { fill: AZUL_ATRAS, opacity: op.opAtras == null ? 1 : op.opAtras }, g);
  const frente = el("path", { fill: AZUL_FRENTE, opacity: op.opFrente == null ? 0.8 : op.opFrente }, g);
  let cAlto, cBajo, bAlto, bBajo, salpico, jarra;   // chorro: la parte de fuera de la silueta (cAlto) y la de dentro, recortada (cBajo); brillos en movimiento y salpicadura
  if (ch) {
    cAlto = el("path", { fill: AZUL_FRENTE, "pointer-events": "none" }, svg);
    bAlto = el("path", { fill: "none", stroke: "#fff", "stroke-opacity": 0.65, "stroke-linecap": "round", "pointer-events": "none" }, svg);
    cBajo = el("path", { fill: AZUL_FRENTE }, g);
    bBajo = el("path", { fill: "none", stroke: "#fff", "stroke-opacity": 0.65, "stroke-linecap": "round" }, g);
    salpico = el("ellipse", { fill: "none", stroke: "#fff", "stroke-opacity": 0.8 }, g);
    // La jarra (dibujada en vectores, con la punta de su pico en el origen para poder girarla sobre ese punto)
    jarra = el("g", { "pointer-events": "none", opacity: 0 }, svg);
    el("path", { d: "M0 0L7 2L26 2Q28 2 28 5L28 22Q28 27 23 27L9 27Q4 27 4 22L4 8Z", fill: "#cfe9ff", stroke: TINTA, "stroke-width": 1.6, "stroke-linejoin": "round" }, jarra);
    el("path", { d: "M28 8Q38 8 38 16Q38 23 28 22", fill: "none", stroke: TINTA, "stroke-width": 2.2, "stroke-linecap": "round" }, jarra);
    el("path", { d: "M8 12L8 21", fill: "none", stroke: "#fff", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-opacity": 0.9 }, jarra);
  }
  // con f = 0 las olas quedan por debajo de la silueta (no se ve agua); con f = 1 la cubren por completo
  const y0 = caja.yBase + 2.5 * A, y1 = caja.yTope - 2.5 * A;
  const paso = op.paso || Math.max(6, (caja.x1 - caja.x0) / 90);
  let f = desde, espera = ch ? 1 : 0.4, chor = 0, jv = 0, ag = 0, reloj = 0, llegado = Math.abs(objetivo - desde) < 0.0008;
  // ag = agitación (0 a 1) mientras cae el agua: las olas crecen hasta ~4,5 veces y se les suma un oleaje rápido y corto
  const superficie = (x, yN, turb, t) => yN + A * turb * (0.6 * Math.sin(x * 0.021 * FR + t * 1.3) + 0.4 * Math.sin(x * 0.047 * FR - t * 0.9)) + A * ag * 0.9 * Math.sin(x * 0.11 * FR + t * 6.5);

  function pintar(t) {
    const yN = y0 + (y1 - y0) * f;
    const turb = (1 + 0.3 * Math.sin(t * 0.5)) * (1 + 3.5 * ag); // el oleaje «respira»; y se agita muy fuerte mientras cae el agua
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
    if (ch) { pintarJarra(t); pintarChorro(t, yN, turb); }
  }
  function pintarJarra(t) {
    if (jv < 0.01) { jarra.setAttribute("opacity", 0); return; }
    const s = ch.escala || 1, x = ch.x + Math.sin(t * 3.1) * ch.ancho * 0.12;
    const ang = -(8 + 42 * chor) + Math.sin(t * 13) * 1.6 * chor;   // se inclina al verter y tiembla un poco
    jarra.setAttribute("opacity", Math.min(1, jv * 1.5).toFixed(2));
    jarra.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (ch.yTop - (1 - jv) * 16 * s).toFixed(1) + ") rotate(" + ang.toFixed(1) + ") scale(" + s.toFixed(2) + ")");
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
    salpico.setAttribute("rx", (r * (1 + 1.2 * ag)).toFixed(1)); salpico.setAttribute("ry", (r * 0.3 * (1 + 1.2 * ag)).toFixed(1));
    salpico.setAttribute("stroke-width", (ch.ancho * 0.25).toFixed(1)); salpico.setAttribute("opacity", chor.toFixed(2));
  }
  const avisarLlegada = () => { if (!llegado) { llegado = true; if (op.alLlegar) op.alLlegar(); } };
  return {
    pintar,
    quieto() { f = objetivo; chor = 0; jv = 0; ag = 0; pintar(0); avisarLlegada(); },
    tick(dt, t) {
      if (espera > 0) espera -= dt;
      else {
        f += (objetivo - f) * (1 - Math.exp(-dt * VEL)); // sube suave y frena al llegar
        if (Math.abs(objetivo - f) < 0.0008) f = objetivo;
      }
      if (ch) {
        // primero entra la jarra (jv), 0,45 s después se inclina y sale el chorro (chor), y el agua empieza a subir a 1 s
        const quiere = objetivo - f > 0.004;   // solo hay jarra si falta agua por subir
        reloj = quiere ? reloj + dt : 0;
        jv += ((quiere || chor > 0.05 ? 1 : 0) - jv) * (1 - Math.exp(-dt * 8));
        chor += ((quiere && reloj > 0.45 && objetivo - f > 0.004 ? 1 : 0) - chor) * (1 - Math.exp(-dt * 6));   // el chorro aparece al verter y se apaga al llegar
        ag += (chor - ag) * (1 - Math.exp(-dt * 5));   // la agitación sigue al chorro: sube rápido y se calma sola
      }
      pintar(t);
      if (f === objetivo && chor < 0.05 && jv < 0.05) avisarLlegada();
    },
    quitar() { g.remove(); if (ch) { cAlto.remove(); bAlto.remove(); jarra.remove(); } },
  };
}

// ---------- El mapa ----------
export function montarMapa(o) {
  if (!o || !o.etapas || typeof o.progreso !== "function" || typeof o.jugarNivel !== "function") throw new Error("montarMapa: faltan etapas, progreso o jugarNivel");
  const { soloPaises: SOLO_PAISES, estados: ESTADOS_ORDEN, paises: PAISES_ORDEN, numEstados: NUM_ESTADOS, numPaises: NUM_PAISES, porEtapa: NIVELES_POR_ETAPA, nivelesMexico: NIVELES_MEXICO, resumen, etapaDe, baseEstado, basePais } = o.etapas;
  const pre = o.prefijo || "juego";
  const UN_PAIS = SOLO_PAISES && !!o.unPais;   // mapa de un solo país (sin lista ni mundo)
  const VISTA_PRINCIPAL = SOLO_PAISES ? (UN_PAIS ? "pais" : "mundo") : "mexico";   // la vista a la que se vuelve con «principal» y que cuenta como «el mapa» para el ☰
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

  let pendienteContornos = false, contornosFallo = false;
  const repintarMundo = () => { if (UN_PAIS && abierto && vista === "mundo" && CONTORNOS && POSICIONES) pintar(); };   // el mundo se dibuja en blanco mientras llegan las siluetas; al llegar ambas se repinta
  if (UN_PAIS) import("./posiciones-paises.js").then((m) => { POSICIONES = m.POSICIONES; repintarMundo(); }).catch((e) => console.warn("mapa-niveles: no se pudo cargar compartido/posiciones-paises.js (¿está en la carpeta compartido/?); el mapa del mundo se ve sin países", e));
  if (SOLO_PAISES) import("./contornos-paises.js").then((m) => { CONTORNOS = m.CONTORNOS; repintarMundo(); if (pendienteContornos && abierto && vista === "pais") pintar(); })
    .catch((e) => { contornosFallo = true; console.warn("mapa-niveles: no se pudo cargar compartido/contornos-paises.js (¿está en la carpeta compartido/?); se dibuja una gota en lugar del país", e); if (pendienteContornos && abierto && vista === "pais") pintar(); });

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
  let popsAbiertos = 0, popScroll = [0, 0];   // pops en curso (pueden empalmarse) y posición de desplazamiento a devolver al terminar
  let botella = null;     // solo países: { svg, sil } de la botella dibujada (para centroPais y parpadear)

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
  // «Mapa»: botón redondo con el emoji del mundo (abre el mapa del mundo)
  function botonMapa(fn) {
    const b = boton("", "🌍", "b-cielo b-mundo", fn);
    b.replaceChildren(h("span", "b-ico", "🌍"));
    b.title = "Mapa del mundo"; b.setAttribute("aria-label", "Mapa del mundo");
    return b;
  }
  // «País»: la bandera del país al que lleva el botón va de fondo
  function botonPais(fn, codigo) {
    const b = boton("País", "◀", "b-montana b-bandera", fn);
    if (codigo) b.style.setProperty("--bandera", 'url("' + urlBandera(codigo) + '")');
    return b;
  }
  function botonContinuar() {
    const p = prog(), n = o.nivelContinuar ? o.nivelContinuar() : p.max;
    boton("Continuar · nivel " + n, "▶", "b-verde", () => o.jugarNivel(n));
  }
  // unPais: punto de la pantalla (px) dentro del país abierto, lo más cerca posible del centro de su caja: { x, y } o null
  function centroDelPais() {
    const b = botella;
    if (!b || !b.svg.isConnected) return null;
    try {
      const bb = b.sil.getBBox(), dentro = (x, y) => b.sil.isPointInFill(new DOMPoint(x, y));
      let cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      if (!dentro(cx, cy)) {   // país con forma rara: el punto de adentro más cercano al centro
        let mejor = null, md = Infinity;
        for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
          const x = bb.x + bb.width * i / 40, y = bb.y + bb.height * j / 40;
          if (dentro(x, y)) { const dd = (x - cx) ** 2 + (y - cy) ** 2; if (dd < md) { md = dd; mejor = [x, y]; } }
        }
        if (mejor) [cx, cy] = mejor;
      }
      const pt = new DOMPoint(cx, cy).matrixTransform(b.svg.getScreenCTM());
      return { x: pt.x, y: pt.y };
    } catch (e) { return null; }
  }

  // unPais: «Continuar» dentro del país, en su centro. Se coloca en píxeles sobre el cuerpo del mapa (que es position:relative) y se recoloca al cambiar el tamaño de la ventana.
  let btnCentro = null;
  let retener = false;   // true = el botón «Continuar» del centro se queda oculto (mientras dura la celebración de «deslizante»)
  function ubicarCentro() {
    if (!btnCentro || !btnCentro.isConnected) return;
    const c = centroDelPais();
    if (!c) return;
    const r = cuerpo.getBoundingClientRect();
    btnCentro.style.left = Math.round(c.x - r.left + cuerpo.scrollLeft - btnCentro.offsetWidth / 2) + "px";
    btnCentro.style.top = Math.round(c.y - r.top + cuerpo.scrollTop - btnCentro.offsetHeight / 2) + "px";
  }
  function botonContinuarCentro() {
    const p = prog(), n = o.nivelContinuar ? o.nivelContinuar() : p.max;
    const b = h("button", "b3d txt b-verde m-centro");
    b.type = "button";
    b.classList.add("m-dos");
    b.append(h("span", "m-l1", "▶ Continuar"), h("span", "m-l2", "Nivel " + n));
    b.addEventListener("click", () => o.jugarNivel(n));
    b.style.visibility = "hidden";   // hasta tener su sitio (se ve en el siguiente cuadro)
    cuerpo.appendChild(b);
    btnCentro = b;
    requestAnimationFrame(() => { ubicarCentro(); if (!retener) b.style.visibility = ""; });
  }
  addEventListener("resize", () => { if (abierto) ubicarCentro(); });
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
      b.append(h("b", "", String(k)));
      if (inf.estrellasHtml) { const e = h("span", "m-est"); e.innerHTML = inf.estrellasHtml; b.appendChild(e); }   // 3 estrellitas (doradas, moradas o vacías) entre el número y el tiempo
      b.append(h("small", "", inf.sub || ""));
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
    titulo.textContent = UN_PAIS ? "🗺️ Mapa" : "🌍 Niveles";
    if (UN_PAIS) {
      boton("País", "◀", "b-montana", () => ir("pais", indice)).setAttribute("aria-label", "Volver al país");
      info.textContent = "Toca un país para abrirlo";
    } else info.textContent = "💧 " + p.paisesHechos + " de " + NUM_PAISES + " países completados · toca un país para ver su mapa" + (o.avisoPrincipal && o.avisoPrincipal() ? " · " + o.avisoPrincipal() : "");
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

  // --- SOLO PAÍSES con unPais · botón «Mapa»: el mundo en blanco; solo se dibuja (con su trazo) cada país ya desbloqueado y al tocarlo se abren sus 20 niveles ---
  // Las siluetas salen de compartido/contornos-paises.js y su lugar en el mundo de compartido/posiciones-paises.js (se cargan aparte; mientras llegan se ve el mundo en blanco).
  // Con zoom (rueda, pellizco, arrastrar) se acerca: los países chicos se marcan con un punto y, al acercar, se ven sus nombres.
  function vistaMundoPaises() {
    const p = prog();
    const meta = enfoque != null ? enfoque : p.paisActual;   // el país desde el que se abrió el Mapa: ahí se acerca la vista y a él vuelve «País»
    enfoque = null;
    titulo.textContent = "🗺️ Mapa";
    info.textContent = "💧 " + p.paisesHechos + " de " + NUM_PAISES + " países completados · toca un país para ver sus niveles";
    boton("País", "◀", "b-montana", () => ir("pais", meta)).setAttribute("aria-label", "Volver al país");
    botonContinuar();
    for (const x of o.botonesExtra || []) boton(x.texto, x.icono || "•", x.clase || "b-azul", x.fn);
    if (o.alInfo) boton("Info", "ℹ️", "b-azul", o.alInfo);

    const P = proyector(-170, 180, 84, -57, 2, 1);
    const base = { x: 0, y: 0, w: P.w, h: P.h };
    const svg = el("svg", { viewBox: "0 0 " + P.w + " " + P.h, role: "group", "aria-label": "Mapa del mundo: " + p.paisesHechos + " de " + NUM_PAISES + " países completados" }, cuerpo);
    const d = CONTINENTES.map((c) => trazo(c, P)).join("");
    el("path", { d, fill: SOMBRA, transform: "translate(0 2.5)" }, svg);
    el("path", { d, fill: "#fff" }, svg);
    for (const l of LAGOS) el("path", { d: trazo(l, P), fill: "#fff", "pointer-events": "none" }, svg);
    el("path", { d, fill: "none", stroke: BORDE, "stroke-width": 0.9, "stroke-linejoin": "round", "pointer-events": "none" }, svg);

    const puntos = [], nombres = [];
    let foco = null;
    if (CONTORNOS && POSICIONES) PAISES_ORDEN.forEach((codigo, i) => {
      const bs = basePais(i);
      if (bs + 1 > p.max) return;   // los países sin desbloquear no se dibujan
      const pos = POSICIONES[codigo], c = CONTORNOS[codigo];
      if (!pos || !c) return;
      const hechos = acotar(p.hecho - bs, 0, NIVELES_POR_ETAPA), completo = hechos >= NIVELES_POR_ETAPA, actual = !completo && i === p.paisActual;
      const relleno = completo ? "#ffd23f" : actual ? "#ffb257" : VERDE_ARRIBA, linea = completo ? "#a8780b" : actual ? COLOR_ACTUAL : LINEA_TIERRA;
      const nombre = nombrePais(codigo);
      const g = el("g", { class: "m-punto" }, svg);
      el("title", {}, g).textContent = nombre;
      let cx, cy, tam;
      if (pos.length === 2) { [cx, cy] = P.p(pos[0], pos[1]); tam = 0; }   // país diminuto sin silueta: solo un punto
      else {
        const [x0, y0] = P.p(pos[0], pos[1]), a = 2 * pos[2], dd = 2 * pos[3];   // 2 = unidades del mapa por grado
        el("path", { d: c.d, transform: "matrix(" + a + " 0 0 " + dd + " " + x0.toFixed(2) + " " + y0.toFixed(2) + ")", fill: relleno, stroke: linea, "stroke-width": 1.6, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }, g);
        cx = x0 + c.w * a / 2; cy = y0 + c.h * dd / 2; tam = Math.max(c.w * a, c.h * dd);
      }
      if (tam < 40) {   // chico para el dedo: un punto visible y una zona de toque más grande (su tamaño en pantalla lo ajusta «actualizar»)
        const hit = el("circle", { cx, cy, r: 5, fill: "transparent" }, g);
        const dot = el("circle", { class: "m-zona", cx, cy, r: 3, fill: relleno, stroke: linea, "stroke-width": 1.4, "vector-effect": "non-scaling-stroke", "pointer-events": "none" }, g);
        puntos.push({ dot, hit, tam });
      }
      const t = el("text", { x: cx, y: cy, "text-anchor": "middle", "font-weight": 700, fill: TINTA, "paint-order": "stroke", stroke: "#fff", "stroke-linejoin": "round", "pointer-events": "none" }, svg);
      t.textContent = nombre;
      nombres.push({ t, cy, tam });
      accesible(g, nombre + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles" + (completo ? " (completo)" : ""), () => ir("niveles", i));
      if (i === meta) foco = { cx, cy, tam };
    });

    const r0 = svg.getBoundingClientRect(), esc0 = Math.min(r0.width / base.w, r0.height / base.h) || 1;   // píxeles de pantalla por unidad del mapa sin zoom
    const actualizar = (k) => {
      const u = 1 / (esc0 * k);   // unidades del mapa que equivalen a 1 píxel de pantalla
      for (const q of puntos) {
        const ver = q.tam * k * esc0 < 16;   // cuando el país ya se ve grande, su punto sobra
        q.dot.style.display = ver ? "" : "none";
        q.dot.setAttribute("r", 4.5 * u);
        q.hit.setAttribute("r", ver ? 13 * u : 0);
      }
      for (const n of nombres) {
        n.t.style.display = k >= 2 ? "" : "none";   // los nombres aparecen al acercar
        n.t.setAttribute("font-size", 12 * u);
        n.t.setAttribute("stroke-width", 3.5 * u);
        n.t.setAttribute("y", n.cy + 4 * u);
      }
    };
    const zoom = hacerZoomable(svg, base, actualizar);
    actualizar(1);
    if (foco) zoom.irA(foco.cx, foco.cy, acotar(250 / Math.max(foco.tam, 10), 2, 8), true);   // se acerca solo al país desde el que se abrió
  }

  // --- SOLO PAÍSES con unPais · los niveles de un país (se llega con el botón «Niveles» de la botella o tocando un país en el Mapa) ---
  // Resumen de estrellas de un país (lo arma el juego): ganadas / posibles, doradas y moradas. Va debajo de «N de 20 niveles completados» y arriba de la lista de niveles
  function resumenEstrellasPais(base) {
    const html = o.resumenEstrellas ? o.resumenEstrellas(base + 1, base + NIVELES_POR_ETAPA) : "";
    if (!html) return null;
    const d = h("div", "m-resumen");
    d.innerHTML = html;
    return d;
  }
  function vistaNivelesPais() {
    const p = prog(), codigo = PAISES_ORDEN[indice], base = basePais(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA);
    titulo.textContent = nombrePais(codigo);
    info.textContent = hechos + " de " + NIVELES_POR_ETAPA + " niveles completados";
    const mio = indice;
    botonPais(() => ir("pais", mio), codigo);
    botonMapa(() => { enfoque = mio; ir("mundo"); });   // de vuelta al mundo, acercado a este país
    botonContinuar();
    const rs = resumenEstrellasPais(base);
    if (rs) cuerpo.appendChild(rs);
    rejillaNiveles(base);
  }

  // --- SOLO PAÍSES · vista de un país: la silueta es una botella que se llena de agua, un poco con cada nivel ---
  function vistaBotella() {
    const p = prog(), codigo = PAISES_ORDEN[indice], base = basePais(indice);
    const hechos = acotar(p.hecho - base, 0, NIVELES_POR_ETAPA), completo = hechos >= NIVELES_POR_ETAPA;
    titulo.textContent = UN_PAIS ? "" : nombrePais(codigo);
    info.textContent = UN_PAIS ? "" : "País " + (indice + 1) + " de " + NUM_PAISES + " · " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados" + (completo ? " · ¡completo! ⭐" : "");
    if (UN_PAIS) {
      // 🗺️ Mapa = el mundo con los países abiertos dibujados (al tocar uno se ven sus 20 niveles) · 🗂️ niveles de este país
      botonMapa(() => { enfoque = indice; ir("mundo"); });
      boton("Niveles", "🗂️", "b-azul", () => ir("niveles", indice));
      for (const x of o.botonesExtra || []) boton(x.texto, x.icono || "•", x.clase || "b-azul", x.fn);
      if (o.alInfo) boton("Info", "ℹ️", "b-azul", o.alInfo);
    } else {
      boton("Niveles", "◀", "b-cielo", () => { enfoque = indice; ir("mundo"); });
      botonContinuar();
    }

    // unPais: mientras se descarga contornos-paises.js no se dibuja nada (así no se ve la gota de respaldo, que parece un círculo); al llegar se repinta solo
    if (UN_PAIS && !CONTORNOS && !contornosFallo) { pendienteContornos = true; return; }
    if (UN_PAIS) { cuerpo.classList.add("m-uno"); cuerpo.appendChild(h("h2", "m-pais-nombre", nombrePais(codigo))); }   // el nombre, grande, justo arriba del país
    const c = (CONTORNOS && CONTORNOS[codigo]) || GOTA, w = c.w, hh = c.h, id = ++idAgua;
    const lado = Math.max(w, hh), anchoCh = acotar(lado * 0.024, 5, 9), escJarra = anchoCh / 6, yBoca = UN_PAIS ? -30 : -40;   // yBoca = donde queda la boca de la jarra (y de ahí cae el chorro)
    const vb = { x: -15, y: Math.floor(yBoca - 26 * escJarra - 4), w: w + 30, h: 0 };   // arriba queda espacio para la jarra inclinada y el chorro
    vb.h = hh + 22 - vb.y;
    const svg = el("svg", { viewBox: vb.x + " " + vb.y + " " + vb.w + " " + vb.h, class: "m-botella", role: "img", "aria-label": nombrePais(codigo) + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles completados" }, cuerpo);
    if (UN_PAIS) {   // tierra verde con degradado, rodeada de una franja de playa
      const gr = el("linearGradient", { id: "tierra" + id, x1: 0, y1: 0, x2: 0, y2: 1 }, el("defs", {}, svg));
      el("stop", { offset: 0, "stop-color": VERDE_ARRIBA }, gr);
      el("stop", { offset: 1, "stop-color": VERDE_ABAJO }, gr);
      el("path", { d: c.d, fill: "rgba(0,40,0,.22)", transform: "translate(0 5)" }, svg);
      el("path", { d: c.d, fill: PLAYA, stroke: PLAYA, "stroke-width": 9, "stroke-linejoin": "round", "pointer-events": "none" }, svg);
    } else el("path", { d: c.d, fill: SOMBRA, transform: "translate(0 5)" }, svg);
    const sil = el("path", { d: c.d, fill: UN_PAIS ? "url(#tierra" + id + ")" : "#fff" }, svg);
    botella = { svg, sil };
    // UN_PAIS: dónde quedará el botón «Continuar» (en unidades del dibujo) para no poner árboles ni la banderita debajo
    let spotBandera = null, miniBandera = null;
    if (UN_PAIS) {
      const dentro = (x, y) => { try { return sil.isPointInFill(new DOMPoint(x, y)); } catch (e) { return false; } };
      let cx = w / 2, cy = hh / 2;
      try {
        const bb = sil.getBBox();
        cx = bb.x + bb.width / 2; cy = bb.y + bb.height / 2;
        if (!dentro(cx, cy)) {   // la misma búsqueda que centroDelPais: el punto de adentro más cercano al centro
          let md = Infinity, mejor = null;
          for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
            const x = bb.x + bb.width * i / 40, y = bb.y + bb.height * j / 40;
            if (dentro(x, y)) { const dd = (x - cx) ** 2 + (y - cy) ** 2; if (dd < md) { md = dd; mejor = [x, y]; } }
          }
          if (mejor) [cx, cy] = mejor;
        }
      } catch (e) {}
      const m = svg.getScreenCTM && svg.getScreenCTM(), esc = m && m.a > 0.05 ? m.a : 1;   // píxeles por unidad del dibujo
      const boton = { x: cx, y: cy, kx: 112 / esc, ky: 46 / esc };   // media caja del botón con holgura (≈ 90 × 36 px por 1,25)
      spotBandera = ubicarBanderita(w, hh, dentro, boton);
      pintarTierra(svg, c.d, codigo, w, hh, id, dentro, boton, spotBandera);
    }
    const objetivo = acotar(hechos / NIVELES_POR_ETAPA, 0, 1);
    const desde = memoriaAgua("pais" + indice, objetivo);   // dónde estaba el agua la última vez: de ahí sube

    // La bandera cubre la silueta cuando el país está completo (entra con un desvanecido si se acaba de llenar).
    // Con unPais (24 nov 2026) NO se cubre: la tierra bonita (pasto, árboles, montañas) se queda a la vista y la bandera es solo la banderita plantada.
    let bandera = null;
    if (objetivo >= 1 && !UN_PAIS) {
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
      const agua = crearAgua(svg, "agua" + id, c.d, { x0: -15, x1: w + 15, yBase: hh, yTope: 0, fondo: hh + 40, amp: acotar(lado * 0.016, 2.5, 5) }, objetivo, desde, {
        vel: 1.1, frec: 2.4, paso: 3.5, opAtras: UN_PAIS ? AGUA_TRANSPARENTE.atras : 1, opFrente: UN_PAIS ? AGUA_TRANSPARENTE.frente : 0.8,
        chorro: { x: ent.x, yTop: yBoca, yEntrada: ent.y, ancho: anchoCh, escala: escJarra },
        alLlegar: objetivo >= 1 ? () => {
          // ¡País lleno! AQUÍ va la animación del destello dorado (pendiente). Por ahora solo se cambia el agua por la bandera.
          if (o.alPaisCompleto) o.alPaisCompleto({ codigo, indice, svg, d: c.d, w, h: hh });
          if (bandera) {
            bandera.style.transition = "opacity 1.2s ease"; bandera.style.opacity = 1;
            if (miniBandera) { miniBandera.style.transition = "opacity .8s ease"; miniBandera.style.opacity = 0; }   // solo si hay bandera grande; con unPais la banderita se queda
          }
          setTimeout(() => { agua.quitar(); aguas = aguas.filter((a) => a !== agua); }, 1400);   // ya no hace falta la botella de este país
        } : null,
      });
      aguas.push(agua);
    }
    // la banderita va encima del agua y se queda también cuando el país está completo (con unPais ya no lo cubre la bandera grande)
    if (spotBandera) miniBandera = dibujarBanderita(svg, codigo, spotBandera, id, urlBandera(codigo));
    el("path", { d: c.d, fill: "none", stroke: UN_PAIS ? LINEA_TIERRA : BORDE, "stroke-width": UN_PAIS ? 2.6 : 2, "stroke-linejoin": "round", "pointer-events": "none" }, svg);   // con unPais, línea verde oscura fina en la orilla de la tierra
    // las siluetas se cargan aparte: al llegar, se vuelve a dibujar la botella (si no hay una animación en curso)
    if (!CONTORNOS) pendienteContornos = true;
    if (UN_PAIS) {
      cuerpo.appendChild(h("p", "m-pais-niveles", hechos + " de " + NIVELES_POR_ETAPA + " niveles completados" + (completo ? " · ¡completo! ⭐" : "")));   // debajo del país, un poco separado
      const rs = resumenEstrellasPais(base);
      if (rs) cuerpo.appendChild(rs);
      botonContinuarCentro();
    }
  }

  function pintar() {
    detener();
    aguas = [];
    botella = null;
    cuerpo.replaceChildren();
    cuerpo.classList.remove("m-mundo", "m-uno");
    btnCentro = null;
    acciones.replaceChildren();
    if (vista === "mexico") vistaMexico();
    else if (vista === "estado") vistaEstado();
    else if (vista === "mundo") (UN_PAIS ? vistaMundoPaises() : SOLO_PAISES ? vistaLista() : vistaMundo());
    else if (UN_PAIS && vista === "niveles") vistaNivelesPais();
    else (SOLO_PAISES ? vistaBotella() : vistaPais());
    if (aguas.length) arrancar();
    if (o.alCambiarVista) o.alCambiarVista(vista === VISTA_PRINCIPAL);
  }

  function principal() { vista = VISTA_PRINCIPAL; indice = UN_PAIS ? prog().paisActual : 0; enfoque = null; if (abierto) pintar(); }

  addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && abierto && vista !== VISTA_PRINCIPAL) { ev.preventDefault(); principal(); }
  });

  return {
    abrir(n, alcanzado) {
      abierto = true;
      raiz.hidden = false;
      vista = VISTA_PRINCIPAL; indice = UN_PAIS ? prog().paisActual : 0;   // con unPais se abre directo el país donde va el jugador
      if (n) {
        const e = etapaDe(n);
        if (e.zona === "mexico") { if (!alcanzado) { vista = "estado"; indice = e.indice; } }
        else if (UN_PAIS) indice = e.indice;   // la botella del país del nivel n (con alcanzado = true se ve subir el agua)
        else if (SOLO_PAISES) {   // alcanzado = true: la botella del país del nivel n (se ve subir el agua); si no, la lista bajando hasta ese país
          if (alcanzado) { vista = "pais"; indice = e.indice; } else enfoque = e.indice;
        }
        else { vista = alcanzado ? "mundo" : "pais"; indice = e.indice; if (vista === "mundo") marcarMundoVisto(); }
      }
      pintar();
    },
    cerrar() { abierto = false; raiz.hidden = true; detener(); aguas = []; },
    refrescar() { if (abierto) pintar(); },
    principal,
    // unPais: punto de la pantalla (px) dentro del país abierto, lo más cerca posible del centro de su caja: { x, y } o null
    centroPais: centroDelPais,
    // el país abierto parpadea (destello claro + trazo dorado) un instante
    // k = 0, 1, 2…: número de estrella que entró; cada «pop» es un poco más fuerte que el anterior
    parpadear(k = 0) {
      const b = botella;
      if (!b || !b.svg.isConnected) return;
      if (typeof b.svg.animate === "function") {   // el país se hincha y rebota (pop)
        const g = 1.035 + 0.015 * Math.min(k, 3);
        // Mientras dura el pop, el contenedor del mapa deja de ser desplazable: así lo que se hincha sobresale sin mostrar barras de desplazamiento (ni la de abajo) y la vista no se mueve
        if (!popsAbiertos++) { popScroll = [cuerpo.scrollLeft, cuerpo.scrollTop]; cuerpo.classList.add("m-pop"); }
        let fin = false;
        const terminar = () => {
          if (fin) return; fin = true;
          if (--popsAbiertos > 0) return;
          popsAbiertos = 0; cuerpo.classList.remove("m-pop");
          try { cuerpo.scrollLeft = popScroll[0]; cuerpo.scrollTop = popScroll[1]; } catch (e) {}
        };
        const pop = b.svg.animate([{ transform: "scale(1)" }, { transform: "scale(" + g + ")", offset: 0.3 }, { transform: "scale(.985)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out" });
        pop.onfinish = terminar; pop.oncancel = terminar;
        setTimeout(terminar, 800);   // por si el navegador no avisa que terminó
      }
      const d = b.sil.getAttribute("d");
      const flash = el("path", { d, fill: "#fff6b0", "pointer-events": "none" }, b.svg);
      const aro = el("path", { d, fill: "none", stroke: "#ffc61f", "stroke-width": 9, "stroke-linejoin": "round", "pointer-events": "none" }, b.svg);
      if (typeof flash.animate !== "function") { setTimeout(() => { flash.remove(); aro.remove(); }, 300); return; }
      aro.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 450 });
      flash.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 450, easing: "ease-out" }).onfinish = () => { flash.remove(); aro.remove(); };
    },
    // unPais: true = oculta el botón «Continuar» del centro; false = lo muestra (con un rebote si estaba oculto). Es seguro llamarla en cualquier momento.
    retenerContinuar(on) {
      const estaba = retener;
      retener = !!on;
      const b = btnCentro;
      if (!b || !b.isConnected) return;
      if (retener) { b.style.visibility = "hidden"; return; }
      if (!estaba) return;
      ubicarCentro();
      b.style.visibility = "";
      if (typeof b.animate === "function") b.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1.18)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: "ease-out" });
    },
    esPrincipal: () => vista === VISTA_PRINCIPAL,
    abierto: () => abierto,
  };
}
