// Ruta: estacionamiento/mapa-estacionamiento.js
// MENÚ PRINCIPAL del Estacionamiento: el mapa. Pantalla blanca que cubre el juego.
//
//   Vista «mexico»  (principal)  México de cerca, nada más. Se llena de agua azul clara que SUBE un escalón por cada estado terminado
//                                (32 escalones; llena con los 3200 niveles). Cada estado es un punto: tócalo para ver sus 100 niveles.
//   Vista «estado»               Los 100 niveles de un estado (el color indica las monedas que da; el número chico es el tamaño).
//   Vista «mundo»                SOLO existe al terminar los 3200 niveles de México: nadie sabe de ella antes. Mundo con agua que sube
//                                un escalón por país terminado (194) y la lista de países.
//   Vista «pais»                 Los 100 niveles de un país.
//
// Uso (lo hace juego-estacionamiento.js):
//   const mapa = montarMapa({
//     progreso: () => ({ max, hecho }),       // max = nivel más alto desbloqueado, hecho = nivel más alto terminado
//     jugarNivel: (n) => { ... },             // la persona eligió el nivel n
//     alCambiarVista: (esPrincipal) => { ... } // para rotular el botón ☰ («Menú principal» no se muestra en la vista principal)
//   });
//   mapa.abrir();                // vista principal
//   mapa.abrir(n);               // abre la lista de niveles de la etapa del nivel n
//   mapa.abrir(n, true);         // abre la vista principal de su zona (México o Mundo) para que se vea subir el agua
//   mapa.cerrar(); mapa.refrescar(); mapa.principal(); mapa.esPrincipal(); mapa.abierto();
//
// No usa Firebase ni red: funciona sin internet. El agua se mueve sola (olas con un poco de «disturbio»); con «reducir movimiento»
// activado en el sistema queda quieta.

import { configNivel, NIVELES_MEXICO, NIVELES_POR_ETAPA, TOTAL_NIVELES } from "./niveles-estacionamiento.js";
import { ESTADOS_ORDEN, PAISES_ORDEN, NUM_ESTADOS, NUM_PAISES, nombrePais, banderaPais, resumen, etapaDe, baseEstado, basePais } from "./etapas-estacionamiento.js";
import { MEXICO, CONTINENTES, LAGOS } from "./geografia-estacionamiento.js";

// ----- Ajustes -----
// false = el agua sube por escalones (un estado o un país terminado = un escalón), como se diseñó.
// true  = sube un poquito con cada nivel terminado (más continuo).
const ASCENSO_SUAVE = false;

const NS = "http://www.w3.org/2000/svg";
const CLAVE_AGUA = "estacionamiento-agua";        // dónde estaba el agua la última vez (para verla SUBIR al volver al mapa)
const CLAVE_MUNDO = "estacionamiento-mundo-visto"; // «1» cuando ya entraste al mundo (apaga el aviso de novedad)
const AZUL_ATRAS = "#bfe4fb", AZUL_FRENTE = "#8ccdf5", BORDE = "#8fa9c0", SOMBRA = "#e3e9ef", TINTA = "#2b3a4a";
const COLOR_HECHO = "#1f78c8", COLOR_ACTUAL = "#ff9a1f", COLOR_BLOQUEADO = "#b4bcc6";

// Fondo: la misma madera que el resto de los juegos (clara u oscura según el modo; la clase «oscura» la pone compartido/fondo-madera.js en <html>)
const MADERA_CLARA = new URL("../imagenes/fondomaderaclara.webp", import.meta.url).href;
const MADERA_OSCURA = new URL("../imagenes/fondomaderaoscura.webp", import.meta.url).href;
const ESTILO = `
.m-raiz{position:fixed;inset:0;z-index:5;display:flex;flex-direction:column;gap:6px;background:url("${MADERA_CLARA}") center/cover no-repeat,#d9a866;color:${TINTA};font-family:system-ui,sans-serif;
  padding:max(8px,env(safe-area-inset-top)) max(110px,env(safe-area-inset-right)) 8px max(110px,env(safe-area-inset-left));touch-action:pan-y}
.m-raiz[hidden]{display:none}
html.oscura .m-raiz{background:url("${MADERA_OSCURA}") center/cover no-repeat,#1d2024;color:#f1f2f4}
html.oscura .m-info,html.oscura .m-leyenda{color:#c9ccd3}
.m-info:empty{display:none}
@media (max-aspect-ratio:1/1){.m-raiz{padding:calc(104px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) calc(66px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}}
.m-cab{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 14px;text-align:center}
.m-textos{min-width:0}
.m-titulo{margin:0;font-size:1.25rem;line-height:1.2}
.m-info{margin:2px 0 0;font-size:.82rem;color:#5b6b7c;line-height:1.3}
.m-acciones{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.m-acciones .b3d{--t:42px;font-size:15px}
.m-cuerpo{flex:1 1 0;min-height:0;display:flex;flex-direction:column;align-items:center;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 2px 12px}
.m-cuerpo>svg{display:block;width:100%;flex:1 1 auto;min-height:0;max-height:100%;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.m-cuerpo.m-mundo>svg{flex:none;height:auto;max-height:42vh}
.m-leyenda{margin:0 0 8px;font-size:.78rem;color:#5b6b7c;text-align:center}
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
.m-pulso{transform-box:fill-box;transform-origin:center;animation:m-pulso 1.7s ease-out infinite}
@keyframes m-pulso{from{transform:scale(1);opacity:.9}to{transform:scale(2.6);opacity:0}}
.m-nuevo{animation:latido .6s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.m-pulso,.m-nuevo{animation:none}}
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

// ---------- Agua: dos capas de olas que se mueven, recortadas con la silueta ----------
// caja = { x0, x1, yBase, yTope, fondo, amp }: yBase = parte más baja de la silueta, yTope = la más alta, fondo = hasta dónde se pinta
function crearAgua(svg, id, dSilueta, caja, objetivo, desde) {
  const A = caja.amp;
  const cp = el("clipPath", { id }, el("defs", {}, svg));
  el("path", { d: dSilueta }, cp);
  const g = el("g", { "clip-path": "url(#" + id + ")", "pointer-events": "none" }, svg);
  const atras = el("path", { fill: AZUL_ATRAS }, g);
  const frente = el("path", { fill: AZUL_FRENTE, opacity: 0.8 }, g);
  // con f = 0 las olas quedan por debajo de la silueta (no se ve agua); con f = 1 la cubren por completo
  const y0 = caja.yBase + 2.5 * A, y1 = caja.yTope - 2.5 * A;
  const paso = Math.max(6, (caja.x1 - caja.x0) / 90);
  let f = desde, espera = 0.4;

  function pintar(t) {
    const yN = y0 + (y1 - y0) * f;
    const turb = 1 + 0.3 * Math.sin(t * 0.5); // el oleaje «respira»: a ratos más agitado, a ratos más calmo
    let da = "M" + caja.x0 + " " + caja.fondo, df = da;
    for (let x = caja.x0; x <= caja.x1 + paso; x += paso) {
      const ya = yN + A * turb * (0.6 * Math.sin(x * 0.021 + t * 1.3) + 0.4 * Math.sin(x * 0.047 - t * 0.9));
      const yf = yN + A * 0.6 + A * 0.9 * turb * (0.55 * Math.sin(x * 0.018 - t * 1.1 + 1.7) + 0.45 * Math.sin(x * 0.052 + t * 0.8 + 0.6));
      da += "L" + x.toFixed(1) + " " + ya.toFixed(1);
      df += "L" + x.toFixed(1) + " " + yf.toFixed(1);
    }
    const cierre = "L" + (caja.x1 + paso).toFixed(1) + " " + caja.fondo + "Z";
    atras.setAttribute("d", da + cierre);
    frente.setAttribute("d", df + cierre);
  }
  return {
    pintar,
    quieto() { f = objetivo; pintar(0); },
    tick(dt, t) {
      if (espera > 0) espera -= dt;
      else {
        f += (objetivo - f) * (1 - Math.exp(-dt * 1.8)); // sube suave y frena al llegar
        if (Math.abs(objetivo - f) < 0.0008) f = objetivo;
      }
      pintar(t);
    },
  };
}

// ---------- El mapa ----------
export function montarMapa(o) {
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

  let vista = "mexico";   // mexico | estado | mundo | pais
  let indice = 0;         // estado o país abierto
  let abierto = false;
  let aguas = [], raf = 0, tPrev = 0, idAgua = 0;

  const prog = () => resumen(o.progreso());
  const nuevoMundo = () => prog().mexicoCompleto && !leerMundoVisto();

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
    const p = prog();
    boton("Continuar · nivel " + p.max, "▶", "b-verde", () => o.jugarNivel(p.max));
  }
  const ir = (v, i = 0) => { vista = v; indice = i; pintar(); };

  // Lista de los 100 niveles de una etapa. base = nivel anterior al primero de la etapa.
  function rejillaNiveles(base) {
    const p = prog();
    const leyenda = h("p", "m-leyenda", "El color indica las monedas que da: 🟩 15 · 🟦 25 · 🟪 35 · 🟨 45 · 🟥 60 monedas — el número chico es el tamaño del tablero.");
    const rej = h("div", "m-rej");
    let actual = null;
    for (let k = 1; k <= NIVELES_POR_ETAPA; k++) {
      const n = base + k, cfg = configNivel(n);
      const bloq = n > p.max, hecho = n <= p.hecho, esActual = !hecho && n === p.max;
      const clase = cfg.tam <= 19 ? "b-verde" : cfg.tam <= 29 ? "b-azul" : cfg.tam <= 39 ? "b-morado" : cfg.tam <= 45 ? "b-oro" : "b-rojo";
      const b = h("button", "b3d m-nv " + clase + (esActual ? " activo" : ""));
      b.type = "button";
      b.disabled = bloq;
      b.setAttribute("aria-label", "Nivel " + k + ": tablero " + cfg.tam + " por " + cfg.tam + ", " + cfg.premio + " monedas" + (bloq ? " (bloqueado)" : hecho ? " (completado)" : ""));
      b.append(h("b", "", String(k)), h("small", "", cfg.tam + "×" + cfg.tam));
      if (hecho) b.appendChild(h("span", "b-info", "✓"));
      b.addEventListener("click", () => o.jugarNivel(n));
      rej.appendChild(b);
      if (esActual) actual = b;
    }
    cuerpo.append(leyenda, rej);
    // la lista se abre mostrando el nivel en el que vas
    if (actual && actual.scrollIntoView) actual.scrollIntoView({ block: "center" });
  }

  // --- vista: México ---
  function vistaMexico() {
    const p = prog();
    titulo.textContent = "México";
    info.textContent = nuevoMundo() ? "¡Apareció algo nuevo! 🌍" : ""; // (se quitó el texto «0 de 32 estados completados · toca un punto…»)
    botonContinuar();
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
      const hecho = i < p.estadosHechos, abierto = i * NIVELES_POR_ETAPA + 1 <= p.max, esActual = i === p.estadoActual && !p.mexicoCompleto;
      if (!abierto && !hecho) return; // los estados que aún no se desbloquean ni se dibujan
      const g = el("g", { class: "m-punto" }, svg);
      puntos.push({ g, x, y });
      if (esActual) el("circle", { cx: x, cy: y, r: 8, fill: "none", stroke: COLOR_ACTUAL, "stroke-width": 2.5, class: "m-pulso", "pointer-events": "none" }, g);
      el("circle", { cx: x, cy: y, r: esActual ? 8 : 6, fill: esActual ? COLOR_ACTUAL : hecho ? COLOR_HECHO : abierto ? "#fff" : COLOR_BLOQUEADO, stroke: abierto || hecho ? COLOR_HECHO : "#fff", "stroke-width": 2, "pointer-events": "none" }, g);
      el("circle", { cx: x, cy: y, r: 15, fill: "transparent", class: "m-zona" }, g);
      accesible(g, e.nombre + (hecho ? " (completado)" : abierto ? "" : " (bloqueado)"), () => {
        if (abierto) ir("estado", i);
        else info.textContent = "🔒 " + e.nombre + ": primero termina " + ESTADOS_ORDEN[Math.max(0, i - 1)].nombre + ".";
      });
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
    boton("México", "◀", "b-gris", () => ir("mexico"));
    if (p.max > base && p.max <= base + NIVELES_POR_ETAPA) botonContinuar();
    rejillaNiveles(base);
  }

  // --- vista: mundo ---
  function vistaMundo() {
    const p = prog();
    titulo.textContent = "🌍 Mundo";
    info.textContent = "💧 " + p.paisesHechos + " de " + NUM_PAISES + " países completados · toca un país para ver sus niveles";
    boton("México", "◀", "b-gris", () => ir("mexico"));
    if (p.max > NIVELES_MEXICO) botonContinuar();
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
      const abierto = basePais(i) + 1 <= p.max;
      if (!abierto) return; // los países sin desbloquear no aparecen en la lista
      const b = h("button", "m-pais" + (hechos >= NIVELES_POR_ETAPA ? " m-hecho" : "") + (abierto && hechos < NIVELES_POR_ETAPA && i === p.paisActual ? " m-actual" : ""));
      b.type = "button";
      b.disabled = !abierto;
      b.setAttribute("aria-label", nombrePais(codigo) + ": " + hechos + " de " + NIVELES_POR_ETAPA + " niveles" + (abierto ? "" : " (bloqueado)"));
      b.append(h("span", "m-bandera", banderaPais(codigo)), h("b", "", nombrePais(codigo)), h("small", "", abierto ? hechos + " / " + NIVELES_POR_ETAPA : "🔒"));
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
    boton("Mundo", "◀", "b-gris", () => ir("mundo"));
    if (p.max > base && p.max <= base + NIVELES_POR_ETAPA) botonContinuar();
    rejillaNiveles(base);
  }

  function pintar() {
    detener();
    aguas = [];
    cuerpo.replaceChildren();
    cuerpo.classList.remove("m-mundo");
    acciones.replaceChildren();
    if (vista === "mexico") vistaMexico();
    else if (vista === "estado") vistaEstado();
    else if (vista === "mundo") vistaMundo();
    else vistaPais();
    if (aguas.length) arrancar();
    if (o.alCambiarVista) o.alCambiarVista(vista === "mexico");
  }

  function principal() { vista = "mexico"; indice = 0; if (abierto) pintar(); }

  addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && abierto && vista !== "mexico") { ev.preventDefault(); principal(); }
  });

  return {
    abrir(n, alcanzado) {
      abierto = true;
      raiz.hidden = false;
      vista = "mexico"; indice = 0;
      if (n) {
        const e = etapaDe(n);
        if (e.zona === "mexico") { if (!alcanzado) { vista = "estado"; indice = e.indice; } }
        else { vista = alcanzado ? "mundo" : "pais"; indice = e.indice; if (vista === "mundo") marcarMundoVisto(); }
      }
      pintar();
    },
    cerrar() { abierto = false; raiz.hidden = true; detener(); aguas = []; },
    refrescar() { if (abierto) pintar(); },
    principal,
    esPrincipal: () => vista === "mexico",
    abierto: () => abierto,
  };
}
