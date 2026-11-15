// Ruta: granjafeliz/bot-niveles-granjafeliz.mjs   (PROYECTO: Portal Juegos · Granja feliz)
// Solo para consola:   node bot-niveles-granjafeliz.mjs [opciones]
//
// BOT DE REVISIÓN DE NIVELES. Carga el juego REAL (juego-granjafeliz.js) con un DOM falso y lo juega como lo haría una persona: toques limitados por
// segundo, tiempo de reacción y toques perdidos. NO modifica ningún archivo del juego: trabaja sobre una copia temporal con un «gancho» al final
// (globalThis.__granja) para poder leer el estado y tocar. Así usa las reglas VIGENTES: hambre y pasto, almacén por espacio, camión por peso,
// edificios de 25→15 s sin cola, pozo de $19, osos con calendario, etc. Si cambias datos-granjafeliz.js, vuelve a correrlo.
//
// Qué responde, por nivel y por perfil de jugador (novato / normal / experto):
//   · ¿se puede ganar?  (% de partidas ganadas, y por qué se pierde si no)
//   · ¿cuánto tarda?    (mediana, y comparado con oroSeg / plataSeg del nivel)
//   · ¿qué medalla saca cada perfil? (3★ oro, 2★ plata, 1★ completado)
//   · ¿qué función nueva muerde?  animales muertos de hambre, comidos por osos, productos caducados en el suelo, «almacén lleno», toques sin efecto
//   · cota por ciclos: lo mínimo que tardan los edificios en fabricar lo que piden las metas (si es mayor que el oro, ese oro es casi imposible)
//   · ¿el tiempo lo manda el jugador o los ciclos? («ocio» = % del tiempo en que el bot no tenía nada útil que tocar: si es alto, la persona
//     no puede acelerar y el oro depende de los ciclos de producción, no de su habilidad)
//   · tiempos de oro/plata SUGERIDOS (solo sugerencia: oro ≈ mediana del perfil normal, plata ≈ 1.1 × mediana del novato)
//
// Opciones:  --niveles=1-10 (o 3,5,7)   --semillas=8   --tmax=900 (segundos de juego antes de darlo por atascado)
//            --perfiles=novato,normal,experto   --golpes-oso=3 (prueba cuántos toques pide el oso; el archivo de datos trae 8)
//            --depurar=nivel:perfil:semilla (ej. 10:novato:1: imprime el estado cada 30 s de esa partida)   --md=ruta.md (dónde guardar el informe; por defecto junto a este archivo)   --sin-md   --compartido=ruta (carpeta de compartido/ si no es ../compartido)
// Nota: es un jugador automático. Juega razonable, pero NO es una persona: úsalo para comparar niveles entre sí y detectar problemas gordos,
// y confirma con personas reales (README: «falta probarlo con personas»).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v === undefined ? true : v]; }));
const rango = (s) => String(s).split(",").flatMap((p) => { const [a, b] = p.split("-").map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
const NIVELES = args.niveles ? rango(args.niveles) : rango("1-10");
const SEMILLAS = Number(args.semillas) || 8;
const TMAX = Number(args.tmax) || 900;
const DT = 0.05;   // igual que el tope de un cuadro del juego (bucle: Math.min(0.05, ...))

// ============================== Perfiles de jugador ==============================
// aps = toques por segundo · reaccion = segundos que tarda en notar algo nuevo (producto, oso) · fallo = probabilidad de un toque perdido
const PERFILES = {
  novato:  { aps: 1.2, reaccion: 1.0,  fallo: 0.10, umbralEnvio: 30, invierteHasta: 90 },
  normal:  { aps: 2.0, reaccion: 0.5,  fallo: 0.04, umbralEnvio: 20, invierteHasta: 120 },
  experto: { aps: 3.5, reaccion: 0.25, fallo: 0.01, umbralEnvio: 20, invierteHasta: 150 },
  // «agresivo» = el techo: toca como el experto pero invierte pronto (más gallinas, mejora los edificios desde que faltan 2 unidades). Sirve para saber si el oro es alcanzable con otra estrategia.
  agresivo: { aps: 3.5, reaccion: 0.25, fallo: 0.01, umbralEnvio: 20, invierteHasta: 300, invierteSiempre: true, maxGallinas: 10, demMejora: 2 },
};
const PERFILES_USAR = (args.perfiles ? String(args.perfiles).split(",") : Object.keys(PERFILES)).filter((p) => PERFILES[p]);   // por defecto los 4

// ============================== Copia temporal del juego con «gancho» ==============================
const dirsComp = [args.compartido, path.join(AQUI, "..", "compartido"), AQUI].filter(Boolean);
const buscar = (f, dirs) => { const r = dirs.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)); if (!r) throw new Error("No encuentro " + f + " (busqué en: " + dirs.join(", ") + ")"); return r; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "granja-bot-"));
fs.mkdirSync(path.join(TMP, "granjafeliz")); fs.mkdirSync(path.join(TMP, "compartido"));
for (const f of ["datos-granjafeliz.js", "economia-granjafeliz.js", "escena-granjafeliz.js", "panel-almacen-granjafeliz.js", "salida-granjafeliz.js", "tutorial-granjafeliz.js"])
  fs.copyFileSync(buscar(f, [AQUI]), path.join(TMP, "granjafeliz", f));
fs.copyFileSync(buscar("etapas-mapa.js", dirsComp), path.join(TMP, "compartido", "etapas-mapa.js"));
// El mapa y el menú de pausa son solo pantalla: se reemplazan por cáscaras vacías. progreso.js no se copia (el juego lo importa con try/catch).
fs.writeFileSync(path.join(TMP, "compartido", "mapa-niveles.js"), "export const montarMapa = () => ({ abrir() {}, cerrar() {}, refrescar() {}, principal() {}, esPrincipal: () => true, abierto: () => false });\n");
fs.writeFileSync(path.join(TMP, "compartido", "menu-pausa.js"), "export const crearMenuPausa = () => ({ abrir() {}, cerrar() {}, abierto: () => false });\n");
const GANCHO = `
;globalThis.__granja = { get J() { return J; }, D, eco, ES, CAJAS, CAMPO, FRANJAS, actualizar, tocar, empezar, enviarCarga, metasPendientes, metasCumplidas,
  pesoAlmacen, capAlmacen, capCamion, segCamion, costoMejora, costoEdif, costoRecarga, pozoAuto, capPozo, espacio, espacioMejora, botonesCompra,
  animalAbierto, cuantos, precioVenta, pesoAlm, pesoCam, ordenes: () => ({ donde }) };
`;
fs.writeFileSync(path.join(TMP, "granjafeliz", "juego-granjafeliz.js"), fs.readFileSync(buscar("juego-granjafeliz.js", [AQUI]), "utf8") + GANCHO);

// ============================== DOM falso (lo mínimo para que el juego cargue) ==============================
const memoria = {};
globalThis.localStorage = { getItem: (k) => (k in memoria ? memoria[k] : null), setItem: (k, v) => { memoria[k] = String(v); }, removeItem: (k) => { delete memoria[k]; }, clear: () => { for (const k in memoria) delete memoria[k]; } };
const mudo = () => new Proxy(function () {}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : p === Symbol.iterator ? function* () {} : p === "then" ? undefined : mudo()), apply: () => mudo(), set: () => true, construct: () => mudo() });
const ctx2d = new Proxy({}, { get: (t, p) => (p === "measureText" ? (s) => ({ width: String(s).length * 7 }) : p in t ? t[p] : () => ({ addColorStop() {} })), set: (t, p, v) => { t[p] = v; return true; } });
const ids = {};
function elem(tag = "div", lejos = false) {
  const hijos = [], esc = {};
  const base = {
    tagName: String(tag).toUpperCase(), style: new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => { t[p] = v; return true; } }), dataset: {}, hidden: false, textContent: "", innerHTML: "", className: "", value: "", disabled: false, children: hijos, width: 0, height: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(h) { hijos.push(h); return h; }, append(...hs) { hijos.push(...hs); }, replaceChildren(...hs) { hijos.length = 0; hijos.push(...hs); }, insertBefore(h) { hijos.push(h); return h; },
    remove() {}, setAttribute() {}, getAttribute: () => null, removeAttribute() {}, addEventListener(t, f) { (esc[t] ||= []).push(f); }, removeEventListener() {},
    querySelector: () => elem("div", true), querySelectorAll: () => [], focus() {}, blur() {}, click() {}, contains: () => false, getContext: () => ctx2d,
    getBoundingClientRect: () => (lejos ? { left: 9999, top: 0, right: 10100, bottom: 40, width: 100, height: 40 } : { left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450 }),
  };
  let primero, ultimo;
  Object.defineProperty(base, "firstChild", { get: () => (primero ||= elem()) });
  Object.defineProperty(base, "lastChild", { get: () => (ultimo ||= elem()) });
  return new Proxy(base, { get: (t, p) => (p in t ? t[p] : typeof p === "symbol" ? undefined : mudo()), set: (t, p, v) => { t[p] = v; return true; } });
}
globalThis.document = { getElementById: (id) => (ids[id] ||= elem()), createElement: (t) => elem(t), createElementNS: (ns, t) => elem(t), createTextNode: () => elem(), querySelector: () => elem("div", true), querySelectorAll: () => [],
  head: elem(), body: elem(), documentElement: elem(), activeElement: null, addEventListener() {}, visibilityState: "visible" };
Object.assign(globalThis, { innerWidth: 844, innerHeight: 390, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false }) });

// Números al azar con semilla: cada partida del bot se puede repetir igual
const semilla = (s) => { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

await import(pathToFileURL(path.join(TMP, "granjafeliz", "juego-granjafeliz.js")).href);
const G = globalThis.__granja, D = G.D;
if (args["golpes-oso"]) D.OSOS.oso.golpes = Number(args["golpes-oso"]);

// ============================== El bot ==============================
function crearBot(P, rnd) {
  const vistoEn = new WeakMap(), vedado = new WeakMap(), enfria = new Map();
  const J = () => G.J, t = () => G.J.t;
  const diag = { taps: 0, tapsInutiles: 0, gastadas: 0, acreditadas: 0 };
  const visible = (o) => { let t0 = vistoEn.get(o); if (t0 === undefined) { t0 = t(); vistoEn.set(o, t0); } return t() - t0 >= P.reaccion && !(vedado.get(o) > t()); };
  const puede = (k) => !(enfria.get(k) > t()), enfriar = (k, s) => enfria.set(k, t() + s);
  const dentro = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const tap = (x, y, clave, extra = {}) => ({ x, y, clave, ...extra });
  const cabe = (tipo) => G.pesoAlmacen() + G.pesoAlm(tipo) <= G.capAlmacen();

  // ¿k se fabrica (a través de edificios de este nivel) a partir de «de»?
  const desciende = (m, de, prof = 0) => { if (prof > 6) return false; for (const e of J().edif) { const E = D.EDIFICIOS[e.id]; if (E.sale === m && (E.entra === de || desciende(E.entra, de, prof + 1))) return true; } return false; };
  // Productos del almacén que NO se venden porque las metas pendientes los necesitan como materia prima (y el edificio que los usa ya está construido)
  function reservado() {
    const j = J(), pend = G.metasPendientes(), res = {};
    for (const k of Object.keys(j.almacen)) {
      if (!j.edif.some((e) => e.nivel >= 0 && D.EDIFICIOS[e.id].entra === k)) continue;
      let d = 0; for (const m of pend) if (m.tipo === "producto" && m.id !== k && desciende(m.id, k)) d += m.faltan;
      if (d > 0) res[k] = Math.min(j.almacen[k], d);
    }
    return res;
  }
  // La mejor carga posible para el camión (como cargaCamion del juego, pero sin lo reservado)
  function planEnvio() {
    const j = J(); if (j.camion > 0 || j.pago > 0) return null;
    const res = reservado(); let libre = G.capCamion(), pago = 0; const carga = {};
    const tipos = Object.keys(j.almacen).filter((k) => j.almacen[k] > (res[k] || 0)).sort((a, b) => D.PRODUCTOS[b].valor / G.pesoCam(b) - D.PRODUCTOS[a].valor / G.pesoCam(a));
    for (const k of tipos) { const n = Math.min(j.almacen[k] - (res[k] || 0), Math.floor(libre / G.pesoCam(k))); if (n > 0) { carga[k] = n; libre -= n * G.pesoCam(k); pago += n * D.PRODUCTOS[k].valor; } }
    return pago > 0 ? { carga, pago, peso: G.capCamion() - libre } : null;
  }
  // Compras que piden las metas, en orden (edificios de la cadena, luego animales)
  function deseos() {
    const j = J(), out = [], pend = G.metasPendientes(), nec = new Set();
    const cadena = (prod) => { const i = j.edif.findIndex((e) => D.EDIFICIOS[e.id].sale === prod); if (i < 0 || nec.has(i)) return; nec.add(i); cadena(D.EDIFICIOS[j.edif[i].id].entra); };
    for (const m of pend) { if (m.tipo === "producto") cadena(m.id); if (m.tipo === "edificio") { const i = j.edif.findIndex((e) => e.id === m.id); if (i >= 0) nec.add(i); } }
    for (const i of [...nec].sort((a, b) => D.EDIFICIOS[j.edif[a].id].costo - D.EDIFICIOS[j.edif[b].id].costo)) if (j.edif[i].nivel < 0) out.push({ tipo: "edificio", i, costo: D.EDIFICIOS[j.edif[i].id].costo });
    for (const m of pend) if (m.tipo === "animal" && G.animalAbierto(m.id) && G.cuantos(m.id) < D.ANIMALES[m.id].max) out.push({ tipo: "animal", id: m.id, costo: D.ANIMALES[m.id].precio });
    return out;
  }
  // Compras opcionales: mejoras que de verdad hacen falta e inversión en gallinas al principio
  function opcionales(lejos) {
    const j = J(), out = [], pend = G.metasPendientes();
    const cAlm = G.costoMejora("almacen");
    const bloqueado = j.suelo.some((h) => !cabe(h.tipo));
    if (cAlm != null && (bloqueado || G.pesoAlmacen() >= 0.85 * G.capAlmacen())) out.push({ tipo: "mejora", que: "almacen", costo: cAlm });
    const cCam = G.costoMejora("camion"), res = reservado();
    const pesoVendible = Object.keys(j.almacen).reduce((s, k) => s + Math.max(0, j.almacen[k] - (res[k] || 0)) * G.pesoCam(k), 0);
    if (cCam != null && pesoVendible > 1.3 * G.capCamion()) out.push({ tipo: "mejora", que: "camion", costo: cCam });
    j.edif.forEach((e, i) => {
      if (e.nivel < 0) return; const c = G.costoEdif(e); if (c == null) return; const sale = D.EDIFICIOS[e.id].sale;
      let dem = 0; for (const m of pend) if (m.tipo === "producto" && (m.id === sale || desciende(m.id, sale))) dem += m.faltan;
      if (dem >= (P.demMejora || 6)) out.push({ tipo: "mejoraEdif", i, costo: c });
    });
    if ((lejos || P.invierteSiempre) && t() < P.invierteHasta && G.animalAbierto("gallina") && G.cuantos("gallina") < (P.maxGallinas || 6)) out.push({ tipo: "animal", id: "gallina", costo: D.ANIMALES.gallina.precio });
    return out;
  }
  function ejecutarCompra(w) {
    if (w.tipo === "edificio" || w.tipo === "mejoraEdif") { const r = G.espacio(w.i); const q = w.tipo === "edificio" ? { x: r.x + r.w / 2, y: r.y + 12 } : (() => { const m = G.espacioMejora(r); return { x: m.x + m.w / 2, y: m.y + m.h / 2 }; })(); return tap(q.x, q.y, w.tipo + w.i); }
    if (w.tipo === "animal") { const b = G.botonesCompra().find((x) => x.tipo === w.id); return tap(b.x + b.w / 2, b.y + b.h / 2, "buy" + w.id); }
    const f = G.FRANJAS[w.que]; return tap(f.x + f.w / 2, f.y + f.h / 2, "up" + w.que);
  }
  function comprar() {
    const j = J(), crit = deseos(), c0 = crit[0] || null, reserva = G.pozoAuto() ? 0 : 25;
    if (c0 && j.dinero >= c0.costo && puede("c" + c0.tipo + (c0.i ?? c0.id))) return ejecutarCompra(c0);
    const lejos = !!c0 && c0.costo - j.dinero > 300;
    for (const w of opcionales(lejos)) {
      const colchon = c0 && !lejos ? c0.costo : 0;
      if (j.dinero >= w.costo + colchon + reserva && puede("o" + w.tipo + (w.i ?? w.id ?? w.que))) return ejecutarCompra(w);
    }
    return null;
  }
  function enviar() {
    const p = planEnvio(); if (!p || !puede("envio")) return null;
    const j = J(), c0 = deseos()[0], pend = G.metasPendientes();
    const faltaDinero = c0 && j.dinero < c0.costo && j.dinero + p.pago >= c0.costo;
    const dm = pend.find((m) => m.tipo === "dinero"), cierraMeta = dm && p.pago >= dm.faltan;
    const bloquea = j.suelo.some((h) => !cabe(h.tipo));
    if (!(p.peso >= 0.8 * G.capCamion() || G.pesoAlmacen() >= 0.7 * G.capAlmacen() || p.pago >= P.umbralEnvio || faltaDinero || cierraMeta || bloquea)) return null;
    return tap(0, 0, "envio", { costo: 2, fn: () => G.enviarCarga(p.carga) });
  }
  // Un lugar del campo libre de botones, cajas, edificios, productos y osos (los toques ahí se los llevaría otra cosa)
  function lugarLibre(x, y) {
    const j = J(), C = G.CAMPO, rects = [...Object.values(G.CAJAS), ...Object.values(G.FRANJAS), ...j.edif.map((_, i) => G.espacio(i)), ...G.botonesCompra().flatMap((b) => [b, b.venta])];
    for (let k = 0; k < 25; k++) {
      const px = Math.max(C.x + 36, Math.min(C.x + C.w - 36, x + (rnd() - 0.5) * 90)), py = Math.max(C.y + 24, Math.min(C.y + C.h - 20, y + (rnd() - 0.5) * 60));
      if (rects.some((r) => dentro(r, px, py))) continue;
      if (j.suelo.some((h) => Math.hypot(h.x - px, h.y - py) < 30) || j.osos.some((o) => Math.hypot(o.x - px, o.y - py) < 40)) continue;
      return { x: px, y: py };
    }
    return { x: C.x + C.w / 2, y: C.y + C.h / 2 };
  }
  function pasto() {
    const j = J(), ant = j.agua >= 1 || G.pozoAuto() ? 3 : 12;
    const hambre = j.animales.filter((a) => a.est === "vaga" && !a.objetivo && a.vida <= D.SEG_VIDA - D.SEG_HAMBRE + ant);
    if (!hambre.length) return null;
    let libres = 0; for (const p of j.pasto) { let r = 0; for (const o of j.animales) if (o.objetivo === p) r++; libres += Math.max(0, p.v - r); }
    if (hambre.length <= libres || j.pasto.length >= D.MAX_PASTO) return null;
    if (!G.pozoAuto() && j.agua < 1) {
      if (j.pozo > 0 || j.agua >= G.capPozo() || j.dinero < G.costoRecarga() || !puede("pozo")) return null;
      const c = G.CAJAS.pozo; return tap(c.x + c.w / 2, c.y + 20, "pozo");
    }
    if (G.pozoAuto() && j.dinero < G.costoRecarga()) return null;
    const a = hambre.sort((p, q) => p.vida - q.vida)[0], q = lugarLibre(a.x, a.y);
    return tap(q.x, q.y, "pasto");
  }
  function elegir() {
    const j = J(), nuevo = (o) => visible(o);
    // 1) osos: se tocan hasta enjaularlos (comen animales y pisan productos)
    const osos = j.osos.filter(nuevo);
    if (osos.length) { const o = osos.sort((a, b) => b.golpes - a.golpes)[0]; return tap(o.x, o.y, null, { oso: o }); }
    // 2) jaulas: se escapan a los D.SEG_JAULA s
    const jaulas = j.suelo.filter((h) => D.PRODUCTOS[h.tipo].jaula && nuevo(h)).sort((a, b) => a.t - b.t);
    if (jaulas.length) { const h = jaulas[0]; if (cabe(h.tipo)) return tap(h.x, h.y, null, { item: h }); const e = enviar() || (planEnvio() && puede("envio") ? tap(0, 0, "envio", { costo: 2, fn: () => G.enviarCarga(planEnvio().carga) }) : null); if (e) return e; }
    // 3) hambre: pasto antes de que alguien muera
    const g = pasto(); if (g) return g;
    // 4) productos del suelo (caducan a los D.SEG_SUELO s)
    const prods = j.suelo.filter((h) => !D.PRODUCTOS[h.tipo].jaula && nuevo(h) && cabe(h.tipo)).sort((a, b) => a.t - b.t);
    if (prods.length) return tap(prods[0].x, prods[0].y, null, { item: prods[0] });
    // 5) camión
    const e = enviar(); if (e) return e;
    // 6) edificios: tocar los que están libres y tienen materia prima
    for (let i = 0; i < j.edif.length; i++) {
      const ed = j.edif[i]; if (ed.nivel < 0 || ed.trab > 0 || !((j.almacen[D.EDIFICIOS[ed.id].entra] || 0) > 0) || !puede("proc" + i)) continue;
      const r = G.espacio(i); return tap(r.x + r.w / 2, r.y + 12, "proc" + i);
    }
    // 7) compras
    return comprar();
  }
  // Un paso de tiempo: acumula «fichas de toque» según los toques por segundo del perfil
  let ficha = 0;
  function paso() {
    const j = J(); diag.acreditadas += P.aps * DT;
    ficha = Math.min(ficha + P.aps * DT, 1.5);
    while (ficha >= 1 && !j.fin) {
      const a = elegir();
      if (!a) break;
      ficha -= a.costo || 1; diag.gastadas += a.costo || 1; diag.taps++;
      if (rnd() < P.fallo) continue;                       // toque perdido
      if (a.clave) enfriar(a.clave, 0.35);
      if (a.fn) { a.fn(); continue; }
      G.tocar(a.x, a.y);
      if (a.item && j.suelo.includes(a.item)) { diag.tapsInutiles++; vedado.set(a.item, t() + 3); } // lo tocó pero algo más se llevó el toque (un botón encima)
    }
  }
  return { paso, diag };
}

// ============================== Una partida ==============================
function jugar(n, perfil, seed) {
  const rnd = semilla(seed * 7919 + n);
  Math.random = semilla(seed * 104729 + n * 31);
  localStorage.clear();
  G.empezar(n);
  const J = G.J; J.tut = null;
  const bot = crearBot(PERFILES[perfil], rnd), N = J.N;
  const cont = { hambre: 0, osoComio: 0, caducados: 0, jaulaEscapo: 0, almacenLleno: 0 };
  const vistosFlot = new WeakSet(); let previo = new Set(J.suelo);
  const dep = args.depurar && String(args.depurar) === n + ":" + perfil + ":" + seed; let sigDep = 0;
  while (!J.fin && J.t < TMAX) {
    if (dep && J.t >= sigDep) { sigDep += 30; console.error("[t=" + Math.round(J.t) + "] $" + Math.round(J.dinero) + " animales=" + J.animales.map((a) => a.tipo[0] + Math.round(a.vida)).join(",") + " agua=" + J.agua + " pozo=" + J.pozo.toFixed(1) + " pasto=" + J.pasto.length + " almacen=" + JSON.stringify(J.almacen) + " suelo=" + J.suelo.length + " osos=" + J.osos.length + " camion=" + J.camion.toFixed(1) + " edif=" + JSON.stringify(J.edif.map((e) => [e.id, e.nivel, +e.trab.toFixed(0)])) + " pend=" + JSON.stringify(G.metasPendientes())); }
    bot.paso();
    G.actualizar(DT);
    for (const f of J.flot) { if (vistosFlot.has(f)) continue; vistosFlot.add(f); if (f.txt === "Murió de hambre") cont.hambre++; else if (f.txt.includes("Se comió un animal")) cont.osoComio++; else if (f.txt === "¡Se escapó!") cont.jaulaEscapo++; else if (f.txt === "Almacén lleno") cont.almacenLleno++; }
    const ahora = new Set(J.suelo);
    for (const h of previo) if (!ahora.has(h) && h.t <= 0 && !D.PRODUCTOS[h.tipo].jaula) cont.caducados++;
    previo = ahora;
  }
  const gano = J.fin && G.metasCumplidas();
  const seg = Math.ceil(J.t), est = gano ? G.eco.estrellasDe({ gano: true, segundos: seg, estrellasSeg: [N.oroSeg, N.plataSeg] }) : 0;
  let razon = ""; if (J.fin && !gano) razon = String(ids.fin.children[0].lastChild.textContent || "").replace(/ · \d+:\d+$/, "");
  else if (!J.fin) razon = "no termina en " + TMAX + " s: espiral (compra animales y los pierde, o el dinero no alcanza para avanzar) sin llegar a la derrota";
  const d = bot.diag;
  return { gano, seg, est, razon, ocio: Math.max(0, 1 - d.gastadas / d.acreditadas), taps: d.taps, tapsInutiles: d.tapsInutiles, ...cont, dinero: Math.round(J.dinero), animales: J.animales.length };
}

// ============================== Cota por ciclos ==============================
// Mínimo de segundos que piden los edificios para fabricar lo que exigen las metas, con edificios SIN mejorar (lote 1, ciclo base) y sin importar lo hábil que sea
// la persona: cada edificio hace un ciclo a la vez y el siguiente de la cadena espera a la primera unidad. Mejorar edificios la baja, pero cuesta dinero.
function cotaCiclos(N) {
  const E = D.EDIFICIOS, seg0 = D.MEJORAS.fabrica1.seg[0], lote0 = D.MEJORAS.fabrica1.lote[0], lista = (N.edificios || []).map((i) => E[i]);
  const quien = (id) => lista.find((e) => e.sale === id), uds = {};
  const pedir = (id, n) => { const e = quien(id); if (!e) return; if ((uds[id] || 0) < n) uds[id] = n; pedir(e.entra, n); };
  for (const m of N.metas) if (m.tipo === "producto") pedir(m.id, m.n);
  const prof = (id) => { const e = quien(id); return e && quien(e.entra) ? 1 + prof(e.entra) : 0; };
  let cota = 0; for (const id in uds) cota = Math.max(cota, Math.ceil(uds[id] / lote0) * seg0 + prof(id) * seg0);
  return cota;
}

// ============================== Estadística y salida ==============================
const mediana = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const r5 = (x) => (isFinite(x) ? Math.max(5, Math.round(x / 5) * 5) : NaN);
const mmss = (s) => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0") : "—");
const t0 = Date.now();
const R = {};   // R[nivel][perfil] = [resultados]
for (const n of NIVELES) {
  R[n] = {};
  for (const p of PERFILES_USAR) { R[n][p] = []; for (let s = 1; s <= SEMILLAS; s++) R[n][p].push(jugar(n, p, s)); }
  process.stderr.write("nivel " + n + " listo\n");
}

function resumen(n, p) {
  const rs = R[n][p], g = rs.filter((r) => r.gano), tiempos = g.map((r) => r.seg), N = G.D.NIVELES[n];
  const razones = {}; for (const r of rs) if (!r.gano) razones[r.razon] = (razones[r.razon] || 0) + 1;
  return { n: rs.length, gana: g.length / rs.length, med: mediana(tiempos), p10: pct(tiempos, 0.1), p90: pct(tiempos, 0.9), oro: g.filter((r) => r.est === 3).length / rs.length, plata: g.filter((r) => r.est === 2).length / rs.length, uno: g.filter((r) => r.est === 1).length / rs.length,
    razones, ocio: media(rs.map((r) => r.ocio)), hambre: media(rs.map((r) => r.hambre)), osoComio: media(rs.map((r) => r.osoComio)), caducados: media(rs.map((r) => r.caducados)), jaulaEscapo: media(rs.map((r) => r.jaulaEscapo)),
    almacenLleno: media(rs.map((r) => r.almacenLleno)), inutiles: media(rs.map((r) => r.tapsInutiles)), oroSeg: N.oroSeg, plataSeg: N.plataSeg };
}
const f1 = (x) => (isFinite(x) ? x.toFixed(1) : "—"), pc = (x) => Math.round(x * 100) + "%";
const out = [];
const L = (s = "") => out.push(s);
L("# Informe del bot · Granja feliz · niveles " + NIVELES[0] + "–" + NIVELES[NIVELES.length - 1]);
L("");
L("Reglas vigentes leídas de `datos-granjafeliz.js`: vida de animales " + D.SEG_VIDA + " s (hambre a los " + D.SEG_HAMBRE + " s, comen " + D.SEG_COMER + " s, " + D.USOS_PASTO + " usos por pasto) · oso: **" + D.OSOS.oso.golpes + " toques** para enjaularlo · gallina " + D.ANIMALES.gallina.segCiclo + " s por huevo · almacén base " + D.MEJORAS.almacen.capacidad[0] + " de espacio · camión base " + D.MEJORAS.camion.capacidad[0] + " de peso, viaje " + D.MEJORAS.camion.seg[0] + " s · edificios " + D.MEJORAS.fabrica1.seg[0] + " s por ciclo, lote " + D.MEJORAS.fabrica1.lote[0] + ".");
L("");
L("Perfiles: " + PERFILES_USAR.map((p) => p + " (" + PERFILES[p].aps + " toques/s, reacción " + PERFILES[p].reaccion + " s, " + pc(PERFILES[p].fallo) + " de toques perdidos)").join(" · ") + ". " + SEMILLAS + " partidas por nivel y perfil, tope " + TMAX + " s.");
L("");
L("## Resumen por nivel");
L("");
L("_Cota por ciclos = lo mínimo que tardan los edificios en fabricar lo que piden las metas, sin mejorarlos (lote 1, 25 s por ciclo). Si es mayor que el oro, el oro solo se logra mejorando edificios a tiempo. «Toques sin usar» = parte de la capacidad de toques del jugador que no hizo falta: si es alta, tocar más rápido no acorta el nivel._");
L("");
L("| Nivel | Oro / Plata del juego | Cota por ciclos | " + PERFILES_USAR.map((p) => p + ": gana · mediana").join(" | ") + " | Medallas del " + (PERFILES_USAR.includes("normal") ? "normal" : PERFILES_USAR[0]) + " (3★/2★/1★) | Toques sin usar | Veredicto |");
L("|---|---|---|" + PERFILES_USAR.map(() => "---").join("|") + "|---|---|---|");
const veredictos = {}, sugeridos = {};
const base = PERFILES_USAR.includes("normal") ? "normal" : PERFILES_USAR[0];
for (const n of NIVELES) {
  const S = Object.fromEntries(PERFILES_USAR.map((p) => [p, resumen(n, p)])), B = S[base], flags = [];
  if (B.gana < 0.9) flags.push("⚠️ se pierde/atasca (" + pc(1 - B.gana) + ")");
  if (B.gana > 0) {
    if (B.med > B.plataSeg) flags.push("🐢 el normal tarda más que la plata");
    else if (B.med > B.oroSeg) flags.push("oro difícil para el normal");
    const mejor = Math.min(...PERFILES_USAR.filter((p) => p !== "novato" && p !== "normal").map((p) => S[p].gana > 0 ? S[p].med : Infinity), B.med);
    if (mejor > B.oroSeg) flags.push("⛔ ningún perfil llega al oro (el mejor: " + mmss(mejor) + ")");
    if (B.med < 0.6 * B.oroSeg) flags.push("🐇 el oro sobra");
    if (B.ocio > 0.5) flags.push("⏳ lo mandan los ciclos y el dinero, no los toques (" + pc(B.ocio) + " sin usar)");
  }
  const cota = cotaCiclos(G.D.NIVELES[n]);
  if (cota > G.D.NIVELES[n].oroSeg) flags.push(cota > G.D.NIVELES[n].plataSeg ? "🔧 ni la plata cabe en los ciclos de los edificios" : "🔧 el oro no cabe en los ciclos de los edificios");
  if (B.hambre >= 1) flags.push("🍂 mueren animales de hambre");
  if (B.osoComio >= 1) flags.push("🐻 los osos se comen animales");
  if (B.inutiles >= 1) flags.push("👆 toques sin efecto");
  veredictos[n] = flags;
  const oroS = r5(B.med * 1.1);
  sugeridos[n] = { oro: oroS, plata: isFinite(oroS) ? Math.max(oroS + r5(Math.min(120, Math.max(60, oroS * 0.35))), r5(S.novato ? S.novato.p90 * 1.05 : 0) || 0) : NaN, cota };
  L("| " + n + " | " + B.oroSeg + " / " + B.plataSeg + " | " + (cota ? cota + " s" : "—") + " | " + PERFILES_USAR.map((p) => pc(S[p].gana) + " · " + (isFinite(S[p].med) ? mmss(S[p].med) : "—")).join(" | ") + " | " + pc(B.oro) + " / " + pc(B.plata) + " / " + pc(B.uno) + " | " + pc(B.ocio) + " | " + (flags.join("; ") || "✓") + " |");
}
L("");
L("## Qué muerde en cada nivel (promedio por partida del perfil «" + base + "»)");
L("");
L("| Nivel | 🍂 muertos de hambre | 🐻 comidos por oso | 🥚 productos caducados | 🔒 jaulas escapadas | «Almacén lleno» | toques sin efecto |");
L("|---|---|---|---|---|---|---|");
for (const n of NIVELES) { const B = resumen(n, base); L("| " + n + " | " + f1(B.hambre) + " | " + f1(B.osoComio) + " | " + f1(B.caducados) + " | " + f1(B.jaulaEscapo) + " | " + f1(B.almacenLleno) + " | " + f1(B.inutiles) + " |"); }
L("");
L("## Por qué se pierde (si pasa)");
L("");
let hayPerdidas = false;
for (const n of NIVELES) for (const p of PERFILES_USAR) { const S = resumen(n, p); for (const k in S.razones) { hayPerdidas = true; L("- Nivel " + n + " · " + p + ": " + S.razones[k] + " de " + S.n + " — " + k); } }
if (!hayPerdidas) L("Ninguna partida terminó en derrota ni quedó atascada.");
L("");
L("## Curva de dificultad (mediana del perfil «" + base + "»)");
L("");
const medN = NIVELES.map((n) => resumen(n, base).med);
const mx = Math.max(...medN.filter(isFinite), 1);
for (let i = 0; i < NIVELES.length; i++) L("N" + String(NIVELES[i]).padStart(2) + " " + "█".repeat(Math.round((medN[i] / mx) * 40) || 0).padEnd(40) + " " + mmss(medN[i]) + (G.D.NIVELES[NIVELES[i]] ? "   (oro " + mmss(G.D.NIVELES[NIVELES[i]].oroSeg) + ")" : ""));
const sube = medN.map((m, i) => (i && isFinite(m) && isFinite(medN[i - 1]) && m < medN[i - 1] * 0.85 ? "N" + NIVELES[i] + " (más corto que N" + NIVELES[i - 1] + ")" : null)).filter(Boolean);
L("");
L(sube.length ? "Bajan de golpe respecto al nivel anterior: " + sube.join(", ") + ". Si no es intencional, la curva no sube poco a poco." : "La curva no tiene bajadas bruscas entre niveles seguidos.");
L("");
L("## Tiempos sugeridos (solo propuesta; no cambia ningún archivo)");
L("");
L("Misma idea que `tiempos-granjafeliz.js`: oro = 1.1 × la mediana del perfil «" + base + "»; plata = oro + margen (35 %, entre 60 y 120 s), y nunca menos que el percentil 90 del novato. Solo vale si el nivel se juega con los toques de oso que quieras de verdad. Comparado con lo que hay hoy en `NIVELES`:");
L("");
L("| Nivel | oroSeg hoy → sugerido | plataSeg hoy → sugerida | Cota por ciclos |");
L("|---|---|---|---|");
for (const n of NIVELES) { const N = G.D.NIVELES[n]; if (N) L("| " + n + " | " + N.oroSeg + " → " + (isFinite(sugeridos[n].oro) ? sugeridos[n].oro : "—") + " | " + N.plataSeg + " → " + (isFinite(sugeridos[n].plata) ? sugeridos[n].plata : "—") + " | " + (sugeridos[n].cota || "—") + " |"); }
L("");
L("_Generado con " + NIVELES.length * PERFILES_USAR.length * SEMILLAS + " partidas simuladas en " + ((Date.now() - t0) / 1000).toFixed(0) + " s._");

console.log(out.join("\n"));
if (!args["sin-md"]) { const dest = typeof args.md === "string" ? args.md : path.join(AQUI, "informe-bot-niveles-granjafeliz.md"); try { fs.writeFileSync(dest, out.join("\n") + "\n"); console.error("Informe guardado en " + dest); } catch (e) { console.error("No pude guardar el informe: " + e.message); } }
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(0);
