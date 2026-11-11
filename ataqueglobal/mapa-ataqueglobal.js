// Ruta: ataqueglobal/mapa-ataqueglobal.js
// EL MUNDO de Ataque Global: un <canvas> con el planeta azul oscuro, su «escudo» de aurora azul claro y todos los países.
// Zoom (rueda, pellizco, botones o teclas + − 0), arrastrar para recorrer el mundo y tocar un país para seleccionarlo.
// No usa Firebase ni red. Los contornos vienen de paises-ataqueglobal.js (generado; ver herramientas/).
//
// Uso:
//   import { crearMundo } from "./mapa-ataqueglobal.js";
//   const mundo = crearMundo({ lienzo: document.getElementById("mundo"), alSeleccionar: (iso) => { /* iso o null */ } });
//   mundo.iniciar();   // empieza a dibujar (el lienzo debe estar visible)      mundo.detener();   // pausa el dibujo
//   mundo.reiniciarVista() (todo el mundo);  mundo.vistaInicial();  mundo.zoom(1.6);  mundo.seleccionar("BR");  mundo.aPantalla(lon, lat);
//   // Capas que usará la partida más adelante (ya se dibujan):
//   mundo.setDueno("MX", "#ffb020");   // país conquistado: capa translúcida de ese color encima del azul oscuro
//   mundo.setDestruido("BR", true);    // país destruido: negro con grietas rojas y una mancha carbonizada alrededor
//
// Proyección: plana (longitud/latitud sin deformar). Unidades del mundo = grados: x = lon + 180, y = 84 − lat.
import { PAISES, LIMITES, NOMBRES_ESPECIALES } from "./paises-ataqueglobal.js";
import { nombrePais } from "../compartido/etapas-mapa.js";

export const nombreTerritorio = (iso) => NOMBRES_ESPECIALES[iso] || nombrePais(iso);
// «IL» es Palestina/Israel: lleva las dos banderas. Las banderas emoji se ven como letras en algunos sistemas (Windows).
export const banderaTerritorio = (iso) => {
  const f = (c) => String.fromCodePoint(...[...c].map((x) => 0x1f1e6 + x.charCodeAt(0) - 65));
  return iso === "IL" ? f("PS") + f("IL") : f(iso);
};

// ----- Colores -----
const ESPACIO = "#030918", PLANETA_A = "#0b2554", PLANETA_B = "#061532";
const PAIS = "#102f66", PAIS_HOVER = "#17408a", PAIS_SEL = "#1f5cb0";
const PAD = 4;            // margen del planeta alrededor de los países (grados)
const MARGEN_PX = 64;     // espacio libre al ajustar la vista (los botones fijos de las esquinas)

// ----- Geometría preprocesada -----
const ANCHO = LIMITES.lon1 - LIMITES.lon0, ALTO = LIMITES.lat0 - LIMITES.lat1;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const azar = (semilla) => () => ((semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0) / 4294967296);

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

const LISTA = [];
for (const iso of Object.keys(PAISES)) {
  const d = PAISES[iso];
  const anillos = d.r.map((flat) => { const a = new Float32Array(flat.length); for (let i = 0; i < flat.length; i += 2) { a[i] = flat[i] - LIMITES.lon0; a[i + 1] = LIMITES.lat0 - flat[i + 1]; } return a; });
  const path = new Path2D();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, mayor = null, areaMayor = -1;
  for (const a of anillos) {
    path.moveTo(a[0], a[1]);
    for (let i = 2; i < a.length; i += 2) path.lineTo(a[i], a[i + 1]);
    path.closePath();
    let ax0 = 1e9, ax1 = -1e9, ay0 = 1e9, ay1 = -1e9;
    for (let i = 0; i < a.length; i += 2) { ax0 = Math.min(ax0, a[i]); ax1 = Math.max(ax1, a[i]); ay0 = Math.min(ay0, a[i + 1]); ay1 = Math.max(ay1, a[i + 1]); }
    x0 = Math.min(x0, ax0); x1 = Math.max(x1, ax1); y0 = Math.min(y0, ay0); y1 = Math.max(y1, ay1);
    const ar = (ax1 - ax0) * (ay1 - ay0);
    if (ar > areaMayor) { areaMayor = ar; mayor = { a, w: ax1 - ax0, h: ay1 - ay0 }; }
  }
  const [cx, cy, area] = centroide(mayor.a);
  LISTA.push({
    iso, path, anillos, micro: !!d.m, bbox: [x0, y0, x1, y1], c: [cx, cy], area, ww: mayor.w, hh: mayor.h,
    radio: d.m ? Math.max((x1 - x0) / 2, (y1 - y0) / 2) : 0,
    trazo: "hsl(" + (hash(iso) % 360) + " 78% 63%)",
  });
}
LISTA.sort((p, q) => Number(p.micro) - Number(q.micro) || q.area - p.area); // grandes primero, marcadores al final
const POR_ISO = new Map(LISTA.map((p) => [p.iso, p]));

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

export function crearMundo({ lienzo, alSeleccionar } = {}) {
  const ctx = lienzo.getContext("2d");
  const quieto = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, kMin = 1, kMax = 100;
  const cam = { x: ANCHO / 2, y: ALTO / 2, k: 1 };
  let sel = null, hover = null, raf = 0, activo = false, estrellas = null, tween = null;
  const estado = new Map(); // iso → { dueno, destruido, grietas }
  const anchoTexto = new Map();

  // ---------- Tamaño y límites de la cámara ----------
  function limitar() {
    cam.k = acotar(cam.k, kMin, kMax);
    const mx = W / cam.k / 2, my = H / cam.k / 2;
    const ax = ANCHO + PAD, ay = ALTO + PAD;
    cam.x = mx * 2 >= ax + PAD ? ANCHO / 2 : acotar(cam.x, mx - PAD, ax - mx);
    cam.y = my * 2 >= ay + PAD ? ALTO / 2 : acotar(cam.y, my - PAD, ay - my);
  }
  function hacerEstrellas() {
    const c = document.createElement("canvas");
    c.width = Math.max(1, W); c.height = Math.max(1, H);
    const g = c.getContext("2d"), r = azar(7);
    for (let i = 0; i < Math.round((W * H) / 5500); i++) {
      g.fillStyle = "rgba(200,225,255," + (0.25 + r() * 0.6).toFixed(2) + ")";
      const s = 0.5 + r() * 1.1;
      g.fillRect(r() * W, r() * H, s, s);
    }
    estrellas = c;
  }
  function ajustar() {
    const caja = lienzo.getBoundingClientRect();
    if (!caja.width || !caja.height) return false;
    const w = Math.round(caja.width), h = Math.round(caja.height), d = Math.min(window.devicePixelRatio || 1, 2);
    const primera = !W;
    if (w === W && h === H && d === dpr) return true;
    W = w; H = h; dpr = d;
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
    const m = W < H ? 14 : MARGEN_PX; // en vertical el mundo ocupa casi todo el ancho
    const fit = Math.min((W - m * 2) / (ANCHO + PAD * 2), (H - m * 2) / (ALTO + PAD * 2));
    kMin = Math.max(0.5, fit); kMax = kMin * 30;
    if (primera) { cam.k = kMin; cam.x = ANCHO / 2; cam.y = ALTO / 2; } else cam.k = Math.max(cam.k, kMin);
    limitar(); hacerEstrellas();
    return true;
  }

  // ---------- Dibujo ----------
  function grietasDe(iso) {
    const p = POR_ISO.get(iso), r = azar(hash(iso)), g = [];
    if (!p) return g;
    for (let i = 0; i < 7; i++) {
      const x = p.bbox[0] + r() * (p.bbox[2] - p.bbox[0]), y = p.bbox[1] + r() * (p.bbox[3] - p.bbox[1]);
      const a = r() * Math.PI * 2, l = Math.max(0.25, Math.min(p.ww, p.hh) * (0.12 + r() * 0.12));
      g.push([x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, x + Math.cos(a + 0.7) * l * 0.6, y + Math.sin(a + 0.7) * l * 0.6]);
    }
    return g;
  }
  function pintar(ahora) {
    const t = quieto() ? 0 : ahora / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = ESPACIO; ctx.fillRect(0, 0, W, H);
    if (estrellas) ctx.drawImage(estrellas, 0, 0, W, H);
    const k = cam.k;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (W / 2 - cam.x * k), dpr * (H / 2 - cam.y * k));
    ctx.lineJoin = "round";

    // Escudo planetario: aurora azul claro que respira alrededor del planeta
    for (let i = 5; i >= 0; i--) {
      const pulso = 0.86 + 0.14 * Math.sin(t * 0.9 + i * 0.8);
      ctx.strokeStyle = "rgba(110,200,255," + ((0.05 + 0.032 * (5 - i)) * pulso).toFixed(3) + ")";
      ctx.lineWidth = (i + 1) * 1.5;
      rr(ctx, -PAD, -PAD, ANCHO + PAD * 2, ALTO + PAD * 2, 7);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, -PAD, 0, ALTO + PAD);
    g.addColorStop(0, PLANETA_A); g.addColorStop(1, PLANETA_B);
    ctx.fillStyle = g; rr(ctx, -PAD, -PAD, ANCHO + PAD * 2, ALTO + PAD * 2, 7); ctx.fill();
    ctx.strokeStyle = "rgba(150,222,255,.9)"; ctx.lineWidth = 0.55; ctx.stroke();

    // Países (azul oscuro con un trazo fino de color propio)
    const trazoFino = 1.25 / k;
    for (const p of LISTA) {
      if (p.micro) continue;
      const e = estado.get(p.iso);
      ctx.fillStyle = e && e.destruido ? "#070707" : p.iso === sel ? PAIS_SEL : p.iso === hover ? PAIS_HOVER : PAIS;
      ctx.fill(p.path, "evenodd");
      if (e && e.dueno && !e.destruido) { ctx.globalAlpha = 0.4; ctx.fillStyle = e.dueno; ctx.fill(p.path, "evenodd"); ctx.globalAlpha = 1; }
    }
    ctx.lineWidth = trazoFino;
    for (const p of LISTA) { if (p.micro) continue; ctx.strokeStyle = p.trazo; ctx.stroke(p.path); }
    // Marcadores (países diminutos): círculo con un tamaño mínimo en pantalla
    for (const p of LISTA) {
      if (!p.micro) continue;
      const e = estado.get(p.iso), r = Math.max(p.radio, 3.4 / k);
      ctx.beginPath(); ctx.arc(p.c[0], p.c[1], r, 0, Math.PI * 2);
      ctx.fillStyle = e && e.destruido ? "#070707" : p.iso === sel ? PAIS_SEL : p.iso === hover ? PAIS_HOVER : PAIS;
      ctx.fill();
      if (e && e.dueno && !e.destruido) { ctx.globalAlpha = 0.4; ctx.fillStyle = e.dueno; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.lineWidth = trazoFino; ctx.strokeStyle = p.trazo; ctx.stroke();
    }
    // Destrucción: grietas rojas y mancha carbonizada que se extiende un poco sobre los vecinos
    for (const [iso, e] of estado) {
      if (!e.destruido) continue;
      const p = POR_ISO.get(iso); if (!p) continue;
      ctx.strokeStyle = "rgba(255,60,40,.95)"; ctx.lineWidth = 1.1 / k; ctx.lineCap = "round";
      ctx.beginPath();
      for (const s of e.grietas) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.moveTo(s[2], s[3]); ctx.lineTo(s[4], s[5]); }
      ctx.stroke();
      const R = acotar(Math.sqrt(p.area) * 0.95, 1.4, 9);
      const m = ctx.createRadialGradient(p.c[0], p.c[1], 0, p.c[0], p.c[1], R);
      m.addColorStop(0, "rgba(0,0,0,.6)"); m.addColorStop(0.55, "rgba(0,0,0,.28)"); m.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = m; ctx.beginPath(); ctx.arc(p.c[0], p.c[1], R, 0, Math.PI * 2); ctx.fill();
    }
    // País seleccionado: trazo blanco encima de todo
    if (sel) {
      const p = POR_ISO.get(sel);
      if (p) {
        ctx.lineWidth = 2.6 / k; ctx.strokeStyle = "#fff";
        if (p.micro) { ctx.beginPath(); ctx.arc(p.c[0], p.c[1], Math.max(p.radio, 3.4 / k), 0, Math.PI * 2); ctx.stroke(); } else ctx.stroke(p.path);
      }
    }

    // Nombres (en pantalla, sin deformarse): solo los países cuyo dibujo ya es lo bastante grande
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const p of LISTA) {
      const grande = p.ww * k;
      const forzado = p.iso === sel || p.iso === hover;
      if (!forzado && (p.micro ? p.radio * k < 12 : grande < 34)) continue;
      const sx = (p.c[0] - cam.x) * k + W / 2, sy = (p.c[1] - cam.y) * k + H / 2;
      if (sx < -80 || sx > W + 80 || sy < -20 || sy > H + 20) continue;
      const tam = acotar(Math.round(grande / 9), 11, 19);
      ctx.font = "700 " + tam + "px system-ui, sans-serif";
      const nombre = nombreTerritorio(p.iso), clave = p.iso + tam;
      let tw = anchoTexto.get(clave); if (tw == null) { tw = ctx.measureText(nombre).width; anchoTexto.set(clave, tw); }
      if (!forzado && !p.micro && (tw + 8 > grande || p.hh * k < tam + 4)) continue;
      ctx.lineWidth = 3.2; ctx.strokeStyle = "rgba(3,9,24,.9)"; ctx.strokeText(nombre, sx, sy);
      ctx.fillStyle = "#e8f3ff"; ctx.fillText(nombre, sx, sy);
    }
  }

  // ---------- Bucle ----------
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    if (tween) {
      const u = acotar((ahora - tween.t0) / tween.ms, 0, 1), e = u * u * (3 - 2 * u);
      cam.x = tween.x0 + (tween.x1 - tween.x0) * e; cam.y = tween.y0 + (tween.y1 - tween.y0) * e; cam.k = tween.k0 * Math.pow(tween.k1 / tween.k0, e);
      limitar();
      if (u >= 1) tween = null;
    }
    if (ajustar()) pintar(ahora);
  }
  function irA(x, y, k, ms = 320) {
    if (quieto() || !ms) { cam.x = x; cam.y = y; cam.k = k; limitar(); return; }
    tween = { x0: cam.x, y0: cam.y, k0: cam.k, x1: x, y1: y, k1: acotar(k, kMin, kMax), t0: performance.now(), ms };
  }

  // ---------- Selección ----------
  const aMundo = (px, py) => [(px - W / 2) / cam.k + cam.x, (py - H / 2) / cam.k + cam.y];
  function buscar(px, py) {
    const [wx, wy] = aMundo(px, py);
    const marcador = (minimo) => { // el marcador más cercano dentro de su círculo (con un mínimo táctil)
      let mejor = null, md = 1e9;
      for (const p of LISTA) {
        if (!p.micro) continue;
        const d = Math.hypot((p.c[0] - wx) * cam.k, (p.c[1] - wy) * cam.k);
        if (d <= Math.max(p.radio * cam.k, minimo) && d < md) { md = d; mejor = p.iso; }
      }
      return mejor;
    };
    const m1 = marcador(9);
    if (m1) return m1;
    for (let i = LISTA.length - 1; i >= 0; i--) { // países: del más chico al más grande
      const p = LISTA[i];
      if (p.micro || wx < p.bbox[0] || wx > p.bbox[2] || wy < p.bbox[1] || wy > p.bbox[3]) continue;
      let r = false;
      for (const a of p.anillos) if (dentro(a, wx, wy)) r = !r;
      if (r) return p.iso;
    }
    return marcador(18); // islas pequeñas en el mar: un poco más de margen al tocar
  }
  function seleccionar(iso) {
    if (iso && !POR_ISO.has(iso)) iso = null;
    if (iso === sel) return;
    sel = iso;
    if (alSeleccionar) alSeleccionar(sel);
  }

  // ---------- Gestos ----------
  const punteros = new Map();
  let arrastre = null, pellizco = null;
  const local = (ev) => { const c = lienzo.getBoundingClientRect(); return [ev.clientX - c.left, ev.clientY - c.top]; };
  function acercarEn(px, py, factor) { // zoom alrededor de un punto de la pantalla
    const [wx, wy] = aMundo(px, py);
    cam.k = acotar(cam.k * factor, kMin, kMax);
    cam.x = wx - (px - W / 2) / cam.k; cam.y = wy - (py - H / 2) / cam.k;
    limitar();
  }
  lienzo.addEventListener("pointerdown", (ev) => {
    tween = null;
    try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
    const [x, y] = local(ev);
    punteros.set(ev.pointerId, { x, y });
    if (punteros.size === 1) arrastre = { x, y, x0: x, y0: y, t: performance.now(), movido: false };
    else if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: cam.k };
      arrastre = null;
    }
  });
  lienzo.addEventListener("pointermove", (ev) => {
    const [x, y] = local(ev);
    const p = punteros.get(ev.pointerId);
    if (!p) { // el mouse pasa sin pulsar: resalta el país
      if (ev.pointerType === "mouse") { const h = buscar(x, y); if (h !== hover) { hover = h; lienzo.style.cursor = h ? "pointer" : "grab"; } }
      return;
    }
    p.x = x; p.y = y;
    if (punteros.size === 2 && pellizco) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const kNuevo = acotar(pellizco.k * (d / pellizco.d), kMin, kMax);
      acercarEn(mx, my, kNuevo / cam.k);
    } else if (arrastre) {
      if (!arrastre.movido && Math.hypot(x - arrastre.x0, y - arrastre.y0) > 6) { arrastre.movido = true; lienzo.style.cursor = "grabbing"; }
      if (arrastre.movido) { cam.x -= (x - arrastre.x) / cam.k; cam.y -= (y - arrastre.y) / cam.k; limitar(); }
      arrastre.x = x; arrastre.y = y;
    }
  });
  function soltar(ev, cancelado) {
    const era = punteros.has(ev.pointerId);
    punteros.delete(ev.pointerId);
    if (punteros.size < 2) pellizco = null;
    if (!era) return;
    if (!cancelado && arrastre && !arrastre.movido && punteros.size === 0 && performance.now() - arrastre.t < 700) {
      const [x, y] = local(ev), h = buscar(x, y);
      seleccionar(h === sel ? null : h); // tocar el mismo país otra vez lo deselecciona
    }
    if (!punteros.size) { arrastre = null; lienzo.style.cursor = hover ? "pointer" : "grab"; }
    else if (punteros.size === 1) { const [r] = [...punteros.values()]; arrastre = { x: r.x, y: r.y, x0: r.x, y0: r.y, t: 0, movido: true }; }
  }
  lienzo.addEventListener("pointerup", (ev) => soltar(ev, false));
  lienzo.addEventListener("pointercancel", (ev) => soltar(ev, true));
  lienzo.addEventListener("pointerleave", () => { hover = null; });
  lienzo.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    tween = null;
    const [x, y] = local(ev);
    acercarEn(x, y, Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0016)));
  }, { passive: false });
  lienzo.tabIndex = 0;
  lienzo.addEventListener("keydown", (ev) => {
    const paso = 40 / cam.k;
    if (ev.key === "+" || ev.key === "=") acercarEn(W / 2, H / 2, 1.4);
    else if (ev.key === "-" || ev.key === "_") acercarEn(W / 2, H / 2, 1 / 1.4);
    else if (ev.key === "0") reiniciarVista();
    else if (ev.key === "ArrowLeft") { cam.x -= paso; limitar(); }
    else if (ev.key === "ArrowRight") { cam.x += paso; limitar(); }
    else if (ev.key === "ArrowUp") { cam.y -= paso; limitar(); }
    else if (ev.key === "ArrowDown") { cam.y += paso; limitar(); }
    else return;
    ev.preventDefault();
  });
  lienzo.style.cursor = "grab";

  function reiniciarVista() { irA(ANCHO / 2, ALTO / 2, kMin); }
  // Al abrir la partida: en pantallas horizontales se ve todo el mundo; en vertical (celular) se empieza más cerca de África y Europa y se recorre con el dedo
  function vistaInicial() { irA(ANCHO / 2, ALTO / 2, W < H ? kMin * 3.4 : kMin, 0); }

  return {
    iniciar() { if (activo) return; activo = true; ajustar(); raf = requestAnimationFrame(cuadro); },
    detener() { activo = false; cancelAnimationFrame(raf); raf = 0; },
    reiniciarVista, vistaInicial,
    zoom(factor) { tween = null; const k0 = cam.k; irA(cam.x, cam.y, acotar(k0 * factor, kMin, kMax), 160); },
    seleccionar,
    seleccionado: () => sel,
    aPantalla: (lon, lat) => [(lon - LIMITES.lon0 - cam.x) * cam.k + W / 2, (LIMITES.lat0 - lat - cam.y) * cam.k + H / 2],
    setDueno(iso, color) { const e = estado.get(iso) || {}; e.dueno = color || null; estado.set(iso, e); },
    setDestruido(iso, si) { const e = estado.get(iso) || {}; e.destruido = !!si; if (si && !e.grietas) e.grietas = grietasDe(iso); estado.set(iso, e); },
    limpiarEstados() { estado.clear(); },
    paises: () => LISTA.map((p) => p.iso),
  };
}
