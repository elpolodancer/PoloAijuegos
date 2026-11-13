// Ruta: granjafeliz/juego-granjafeliz.js
// Granja feliz (estilo Farm Frenzy), horizontal. Menú estándar + mapa de 22 600 niveles (por ahora existen el nivel 1: gallinas y huevos, el 2, provisional: edificios, y el 3, de pruebas: pavo, oveja, vaca, osos, perro y gato).
// Modelo del original: cada nivel tiene una lista de METAS (dinero, producto, animal, edificio; ver datos-granjafeliz.js); el tiempo no limita, solo da medalla (oro/plata/completado).
// Id de puntos: "granjafeliz". Datos en datos-granjafeliz.js; estrellas y monedas en economia-granjafeliz.js.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import * as eco from "./economia-granjafeliz.js";
import * as D from "./datos-granjafeliz.js";

const ETAPAS = crearEtapas({ porEtapa: 100 });
const DIFICULTADES = [["Muy fácil", "b-verde"], ["Fácil", "b-azul"], ["Normal", "b-morado"], ["Difícil", "b-oro"], ["Experto", "b-rojo"]];
const $ = (id) => document.getElementById(id);
const pantallas = { menu: $("pantalla-menu"), libre: $("pantalla-libre") };
const btnMenu = $("btn-menu"), cv = $("c"), ctx = cv.getContext("2d"), cajaFin = $("fin");
cv.width = D.ANCHO * 2; cv.height = D.ALTO * 2;

let donde = "menu", J = null, nube = null, tAviso = 0;
const pintarMonedas = () => { $("n-monedas").textContent = eco.saldo().toLocaleString("es-MX"); };
function avisar(t, ms = 2600) { const a = $("aviso-granja"); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, ms); }

// ---------- Navegación ----------
function ir(nombre) {
  mapa.cerrar(); donde = nombre; cajaFin.hidden = true;
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  cv.hidden = nombre !== "juego";
  document.body.classList.toggle("en-juego", nombre === "juego");
  btnMenu.hidden = nombre === "menu";
  $("txt-menu").textContent = nombre === "juego" ? "Pausa" : "Menú principal"; // dentro de la partida: Pausa (estándar)
  if (nombre === "juego") ajustar();
}
function abrirMapa(n) { ir("menu"); for (const k in pantallas) pantallas[k].hidden = true; btnMenu.hidden = false; $("txt-menu").textContent = "Menú principal"; donde = "mapa"; mapa.abrir(n); }

const mapa = montarMapa({
  prefijo: "granjafeliz", etapas: ETAPAS, progreso: () => eco.avanceMapa(),
  jugarNivel: (n) => (D.NIVELES[n] ? empezar(n) : avisar("El nivel " + n + " todavía no está creado")),
  infoNivel: (n) => { const s = eco.estrellasDeNivel(n); return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: eco.MEDALLAS[s] || "sin medalla" }; },
  leyenda: "Ganas 15, 30 o 45 monedas según tu medalla (completado, plata u oro) la primera vez que la consigues",
});

const pausa = crearMenuPausa({
  puedeAbrir: () => donde === "juego" && J && !J.fin,
  alAbrir: () => { J.pausa = true; }, alContinuar: () => { J.pausa = false; },
  extras: () => [{ icono: "🔄", texto: "Repetir nivel", clase: "b-azul", alElegir: () => empezar(J.n) }],
  alSalir: () => abrirMapa(J.n),
});
btnMenu.addEventListener("click", () => (donde === "juego" ? pausa.abrir() : ir("menu")));

for (const [t, c] of DIFICULTADES) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt grande " + c; b.innerHTML = '<span class="b-ico">🐔</span> <span></span>'; b.lastElementChild.textContent = t;
  b.addEventListener("click", () => avisar("El modo libre todavía está en construcción (" + t + ")"));
  $("lista-dificultad").appendChild(b);
}
$("btn-libre").onclick = () => ir("libre");
$("btn-niveles").onclick = () => abrirMapa(eco.avanceMapa().max);
$("btn-mapa").onclick = () => abrirMapa();

// ---------- Escenario ----------
const CAMPO = { x: 20, y: 60, w: 600, h: 370 };
const CAJAS = { pozo: { x: 640, y: 60, w: 150, h: 75 }, almacen: { x: 640, y: 145, w: 150, h: 75 }, camion: { x: 640, y: 230, w: 150, h: 75 }, comprar: { x: 640, y: 315, w: 150, h: 75 } };
// Franja «⬆ mejorar» al pie de las cajas de Almacén y Camión (28 de alto para que se pueda tocar bien en el celular)
const franja = (c) => ({ x: c.x, y: c.y + c.h - 28, w: c.w, h: 28 });
const FRANJAS = { almacen: franja(CAJAS.almacen), camion: franja(CAJAS.camion) };
// Edificios (nivel con NIVELES[n].edificios): ocupan una franja al pie del campo; los animales y el pasto quedan por encima de ella.
// Cada espacio: arriba el edificio (se toca para procesar) y abajo la franja «⬆ mejorar» (28 de alto en las cajas; aquí 26 para que quepa).
const FRANJA_EDIF = { x: CAMPO.x, y: 350, w: CAMPO.w, h: CAMPO.y + CAMPO.h - 350 };
const espacio = (i) => ({ x: 30 + i * 146, y: 356, w: 138, h: 70 });
const espacioMejora = (r) => ({ x: r.x, y: r.y + r.h - 26, w: r.w, h: 26 });
const limiteY = () => (J && J.edif.length ? FRANJA_EDIF.y - 8 : CAMPO.y + CAMPO.h - 10); // hasta dónde caminan los animales
const dentro = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const azar = (a, b) => a + Math.random() * (b - a);

function ajustar() { // el escenario 16:9 ocupa el espacio libre (deja libres las esquinas de los botones fijos)
  const aw = innerWidth - 150, ah = innerHeight - 12, s = Math.min(aw / D.ANCHO, ah / D.ALTO);
  cv.style.width = D.ANCHO * s + "px"; cv.style.height = D.ALTO * s + "px";
  cv.style.left = 140 + (aw - D.ANCHO * s) / 2 + "px"; cv.style.top = (innerHeight - D.ALTO * s) / 2 + "px";
  if (J && J.fin) colocarFin();
}
addEventListener("resize", ajustar);

function nuevoAnimal(tipo) { return { tipo, x: azar(CAMPO.x + 30, CAMPO.x + CAMPO.w - 30), y: azar(CAMPO.y + 40, limiteY() - 10), hambre: azar(0, 0.4), prod: azar(0, 0.5), est: "vaga", t: 0, dest: null, objetivo: null, mord: 0 }; }
function empezar(n) {
  const N = D.NIVELES[n];
  J = { n, N, t: 0, dinero: N.dineroInicial, ventas: 0, rec: {}, agua: N.aguaInicial, pozo: 0, pasto: [], animales: [], suelo: [], almacen: {}, camion: 0, pago: 0, mejoras: { almacen: (N.mejoras && N.mejoras.almacen) || 0, camion: (N.mejoras && N.mejoras.camion) || 0 }, osos: [], proxOso: N.osos ? (N.osos.horario ? Infinity : (N.osos.primero ?? D.PRIMER_OSO)) : Infinity, horario: N.osos && N.osos.horario ? [...N.osos.horario] : null, perro: null, gato: (N.regalo || []).includes("gato") ? { x: CAMPO.x + 20, y: CAMPO.y + 60, dest: null } : null, edif: (N.edificios || []).map((id) => ({ id, nivel: (N.construidos || []).includes(id) ? 0 : -1, trab: 0, lote: 0, cola: [] })), flot: [], fin: false, pausa: false };
  for (const tipo in N.animales) for (let i = 0; i < N.animales[tipo]; i++) J.animales.push(nuevoAnimal(tipo));
  ir("juego");
  avisar("Metas: " + N.metas.map(textoMeta).join(" · ") + (N.pista ? "\n" + N.pista : ""), N.pista ? 7000 : 3500);
}

function flotar(x, y, txt) { J.flot.push({ x, y, txt, t: 1.2 }); }
// Regalos de inicio (NIVELES[n].regalo): el gato ya viene contigo; las llamadas al perro son gratis
const regalo = (x) => !!(J && J.N.regalo && J.N.regalo.includes(x));
const costoPerro = () => (regalo("perro") ? 0 : D.PERRO.costo);
// ---------- Metas del nivel ----------
// avanceMeta(m) → { actual, objetivo, icono }. El nivel termina cuando TODAS están cumplidas (el tiempo solo da medalla).
function avanceMeta(m) {
  if (m.tipo === "dinero") return { actual: J.ventas, objetivo: m.n, icono: "💰" };
  if (m.tipo === "producto") return { actual: J.rec[m.id] || 0, objetivo: m.n, icono: D.PRODUCTOS[m.id].emoji };
  if (m.tipo === "animal") return { actual: J.animales.filter((a) => a.tipo === m.id).length, objetivo: m.n, icono: D.ANIMALES[m.id].emoji };
  if (m.tipo === "edificio") return { actual: J.edif.some((e) => e.id === m.id && e.nivel >= 0) ? 1 : 0, objetivo: 1, icono: D.EDIFICIOS[m.id].emoji };
  return { actual: 0, objetivo: 1, icono: "❔" };
}
const metasCumplidas = () => J.N.metas.every((m) => { const a = avanceMeta(m); return a.actual >= a.objetivo; });
function textoMeta(m) {
  if (m.tipo === "dinero") return "vender $" + m.n.toLocaleString("es-MX");
  if (m.tipo === "producto") return "recoger " + m.n + " " + D.PRODUCTOS[m.id].nombre.toLowerCase();
  if (m.tipo === "animal") return "tener " + m.n + " " + D.ANIMALES[m.id].nombre.toLowerCase();
  if (m.tipo === "edificio") return "construir " + D.EDIFICIOS[m.id].nombre.toLowerCase();
  return "?";
}
// Medalla que llevas AHORA según el tiempo (0 a 3 → ver eco.MEDALLAS)
const medallaAhora = () => eco.estrellasDe({ gano: true, segundos: J.t, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] });
// Todo producto que entra al almacén pasa por aquí (así cuenta para las metas de «producto»)
function aAlmacen(tipo) { J.almacen[tipo] = (J.almacen[tipo] || 0) + 1; J.rec[tipo] = (J.rec[tipo] || 0) + 1; }
const pesoAlmacen = () => Object.keys(J.almacen).reduce((t, k) => t + J.almacen[k] * D.PRODUCTOS[k].peso, 0);
// Mejoras de almacén y camión (datos en D.MEJORAS). J.mejoras guarda el nivel de cada una (0 = base); se reinician en cada nivel, igual que el dinero.
const capAlmacen = () => D.MEJORAS.almacen.capacidad[J.mejoras.almacen];
const capCamion = () => D.MEJORAS.camion.capacidad[J.mejoras.camion];
const segCamion = () => D.MEJORAS.camion.seg[J.mejoras.camion];
const costoMejora = (que) => { const n = J.mejoras[que]; return n < D.MEJORAS[que].capacidad.length - 1 ? D.MEJORAS[que].costo[n + 1] : null; }; // null = ya está al máximo
// Compra la siguiente mejora de «almacen» o «camion». Devuelve true si se compró.
function mejorar(que) {
  if (!J || J.fin || J.pausa) return false;
  const c = CAJAS[que], costo = costoMejora(que);
  if (costo == null) { flotar(c.x + c.w / 2, c.y + 20, "Nivel máximo"); return false; }
  if (J.dinero < costo) { flotar(c.x + c.w / 2, c.y + 20, "Falta dinero"); return false; }
  J.dinero -= costo; J.mejoras[que]++; flotar(c.x + c.w / 2, c.y + 20, "¡Mejorado!");
  return true;
}
// Qué se llevaría el camión ahora: primero lo que más vale por peso, mientras quepa (CAPACIDAD_CAMION). Devuelve { lleva: {producto: cantidad}, pago }
function cargaCamion() {
  let libre = capCamion(), pago = 0; const lleva = {};
  const tipos = Object.keys(J.almacen).filter((k) => J.almacen[k] > 0)
    .sort((a, b) => D.PRODUCTOS[b].valor / D.PRODUCTOS[b].peso - D.PRODUCTOS[a].valor / D.PRODUCTOS[a].peso);
  for (const k of tipos) {
    const P = D.PRODUCTOS[k], n = Math.min(J.almacen[k], Math.floor(libre / P.peso));
    if (n > 0) { lleva[k] = n; libre -= n * P.peso; pago += n * P.valor; }
  }
  return { lleva, pago };
}
// Pasto libre más cercano para este animal. Cada pasto tiene v mordidas y los animales que ya van hacia él (o comen de él) tienen reservadas las que
// les faltan (mordidas - a.mord); sin reserva, varios se amontonaban en un mismo pasto y se lo acababan a mordidas sueltas. Prefiere un pasto donde
// quepa lo que le falta; si no hay, uno con al menos 1 mordida libre (come lo que haya y sigue en otro: a.mord se conserva hasta quedar lleno,
// así los animales que comen distinto —gallina 2, vaca 5— no dejan pastos con mordidas que nadie puede usar). null = todo el pasto está reservado.
function pastoLibre(a) {
  const falta = D.ANIMALES[a.tipo].mordidas - a.mord; let mejor = null, md = Infinity, parcial = null, mp = Infinity;
  for (const p of J.pasto) {
    let usado = 0;
    for (const o of J.animales) if (o !== a && o.objetivo === p) usado += D.ANIMALES[o.tipo].mordidas - o.mord;
    const libre = p.v - usado;
    if (libre < 1) continue;
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    if (libre >= falta) { if (d < md) { md = d; mejor = p; } } else if (d < mp) { mp = d; parcial = p; }
  }
  return mejor || parcial;
}
// ----- Osos, perro y gato (datos en D.OSOS, D.PERRO, D.GATO) -----
// Osos J.osos: { tipo, x, y, golpes, bloqueo (segundos que el perro lo tiene quieto), dest }. Se capturan tocándolos (D.OSOS[tipo].golpes clics) y dejan en el suelo su jaula.
// Perro J.perro: { fase: "viene" | "bloquea", t, ob (el oso), x, y }. Gato J.gato: { x, y, dest }.
const botonesAyuda = () => {
  const b = []; let x = 478;
  if (J.N.osos && J.N.perro !== false) { b.push({ id: "perro", x, y: 12, w: 98, h: 32 }); x += 104; }
  if (J.N.gato || regalo("gato")) b.push({ id: "gato", x, y: 12, w: 98, h: 32 });
  return b;
};
function nuevoOso() {
  const tipos = J.N.osos.tipos || ["oso"], tipo = tipos[Math.floor(Math.random() * tipos.length)];
  J.osos.push({ tipo, x: Math.random() < 0.5 ? CAMPO.x + 4 : CAMPO.x + CAMPO.w - 4, y: azar(CAMPO.y + 40, limiteY()), golpes: 0, bloqueo: 0, dest: null });
  flotar(CAMPO.x + CAMPO.w / 2, CAMPO.y + 20, "¡Un " + D.OSOS[tipo].nombre.toLowerCase() + "!");
}
function golpear(o) {
  const O = D.OSOS[o.tipo];
  if (++o.golpes < O.golpes) return;
  J.osos.splice(J.osos.indexOf(o), 1);
  J.suelo.push({ tipo: O.producto, x: o.x, y: o.y, t: D.SEG_SUELO });
  flotar(o.x, o.y - 20, "¡Atrapado!");
}
// Vender un animal: se va el que lleva menos producción a medias (pierdes lo menos posible) y te pagan VENTA_ANIMAL × precio. No cuenta para la meta de «dinero» (solo vale lo que vende el camión).
const precioVenta = (tipo) => Math.floor(D.ANIMALES[tipo].precio * D.VENTA_ANIMAL);
function venderAnimal(b) {
  const lista = J.animales.filter((a) => a.tipo === b.tipo), cx = b.x + b.w / 2, cy = b.y + Math.min(b.h, 40) / 2;
  if (!lista.length) { flotar(cx, cy, "No tienes"); return; }
  const a = lista.reduce((m, x) => (x.prod < m.prod ? x : m)), p = precioVenta(b.tipo);
  J.animales.splice(J.animales.indexOf(a), 1);
  J.dinero += p; flotar(a.x, a.y - 14, "+$" + p.toLocaleString("es-MX"));
}
function usarAyuda(id) {
  if (id === "gato") {
    if (J.gato) { flotar(580, 60, "Ya tienes gato"); return; }
    if (J.dinero < D.GATO.costo) { flotar(580, 60, "Falta dinero"); return; }
    J.dinero -= D.GATO.costo; J.gato = { x: CAMPO.x + 20, y: CAMPO.y + 60, dest: null }; return;
  }
  if (J.perro) return;
  const libres = J.osos.filter((o) => o.bloqueo <= 0);
  if (!libres.length) { flotar(530, 60, "No hay osos"); return; }
  if (J.dinero < costoPerro()) { flotar(530, 60, "Falta dinero"); return; }
  J.dinero -= costoPerro();
  const ob = libres[0], T = azar(...D.PERRO.llega);
  J.perro = { fase: "viene", t: T, T, ob, x0: CAMPO.x, y0: ob.y, x: CAMPO.x, y: ob.y };
}
const masCercano = (lista, x, y) => { let m = null, md = Infinity; for (const o of lista) { const d = Math.hypot(o.x - x, o.y - y); if (d < md) { md = d; m = o; } } return m; };
function actualizarOsos(dt) {
  if (!J.N.osos) return;
  const cada = J.N.osos.cada || D.OSOS_CADA;
  J.proxOso -= dt;
  if (J.horario) { // calendario del nivel (NIVELES[n].osos.horario): un oso por cada segundo de la lista; al acabarse siguen cayendo cada «cada» s
    while (J.horario.length && J.t >= J.horario[0]) { J.horario.shift(); nuevoOso(); }
    if (!J.horario.length) { J.horario = null; J.proxOso = azar(...cada); }
  }
  if (J.proxOso <= 0) { nuevoOso(); J.proxOso = azar(...cada); }
  for (const o of J.osos) {
    if (o.bloqueo > 0) { o.bloqueo -= dt; continue; } // el perro lo tiene quieto: no se mueve ni destruye nada
    const v = D.OSOS[o.tipo].vel, objetivo = masCercano(J.animales, o.x, o.y) || masCercano(J.pasto, o.x, o.y);
    if (!objetivo && (!o.dest || Math.hypot(o.dest.x - o.x, o.dest.y - o.y) < 6)) o.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) };
    const d_ = objetivo || o.dest, d = Math.hypot(d_.x - o.x, d_.y - o.y);
    if (d > 4) { o.x += (d_.x - o.x) / d * v * dt; o.y += (d_.y - o.y) / d * v * dt; }
    o.y = Math.min(o.y, limiteY());
    J.pasto = J.pasto.filter((p) => Math.hypot(p.x - o.x, p.y - o.y) > D.RADIO_OSO);                         // pasto en radio de 2 casillas
    J.suelo = J.suelo.filter((h) => D.PRODUCTOS[h.tipo].jaula || Math.hypot(h.x - o.x, h.y - o.y) > 24);     // productos que pisa (las jaulas no)
    const antes = J.animales.length;
    J.animales = J.animales.filter((a) => Math.hypot(a.x - o.x, a.y - o.y) > 22);                            // animales que toca
    if (J.animales.length < antes) flotar(o.x, o.y - 24, "¡Se comió un animal!");
  }
}
function actualizarPerro(dt) {
  const P = J.perro; if (!P) return;
  if (!J.osos.includes(P.ob)) { J.perro = null; return; } // el oso ya fue capturado
  if (P.fase === "viene") {
    P.t -= dt; const k = Math.max(0, P.t / P.T);
    P.x = P.ob.x + (P.x0 - P.ob.x) * k; P.y = P.ob.y + (P.y0 - P.ob.y) * k;
    if (P.t <= 0) { P.fase = "bloquea"; P.ob.bloqueo = azar(...D.PERRO.bloquea); }
  } else { P.x = P.ob.x + 24; P.y = P.ob.y + 6; if (P.ob.bloqueo <= 0) J.perro = null; }
}
function actualizarGato(dt) {
  const G = J.gato; if (!G) return;
  const peso = pesoAlmacen(), cap = capAlmacen();
  const pos = J.suelo.filter((h) => !D.PRODUCTOS[h.tipo].jaula && peso + D.PRODUCTOS[h.tipo].peso <= cap); // solo productos (no jaulas) que quepan en el almacén
  const h = masCercano(pos, G.x, G.y);
  let dest = h;
  if (!dest) { if (!G.dest || Math.hypot(G.dest.x - G.x, G.dest.y - G.y) < 6) G.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) }; dest = G.dest; }
  const d = Math.hypot(dest.x - G.x, dest.y - G.y);
  if (d > 3) { G.x += (dest.x - G.x) / d * D.GATO.vel * dt; G.y += (dest.y - G.y) / d * D.GATO.vel * dt; }
  if (h && d < 12) { aAlmacen(h.tipo); J.suelo.splice(J.suelo.indexOf(h), 1); }
}
// ----- Edificios de procesamiento (datos en D.EDIFICIOS y D.MEJORAS.fabricaN) -----
// e.nivel: -1 = todavía sin construir; 0 a 4 = nivel de mejora. e.trab = segundos que faltan del lote en marcha; e.lote = cuántas unidades lleva;
// e.cola = lotes que esperan (cada uno es la cantidad ya descontada del almacén). Todo se reinicia en cada nivel, igual que el dinero.
const filaEdif = (e) => D.MEJORAS[D.EDIFICIOS[e.id].fabrica];
const loteEdif = (e) => filaEdif(e).lote[e.nivel];
const costoEdif = (e) => { const C = D.EDIFICIOS[e.id].costos; return e.nivel < C.length - 1 ? C[e.nivel + 1] : null; }; // null = nivel máximo
function tocarEdificio(i) {
  const e = J.edif[i], E = D.EDIFICIOS[e.id], r = espacio(i), cx = r.x + r.w / 2;
  if (e.nivel < 0) { // construir
    if (J.dinero < E.costo) { flotar(cx, r.y - 6, "Falta dinero"); return; }
    J.dinero -= E.costo; e.nivel = 0; flotar(cx, r.y - 6, "¡Construido!"); return;
  }
  const hay = J.almacen[E.entra] || 0;
  if (!hay) { flotar(cx, r.y - 6, "Falta " + D.PRODUCTOS[E.entra].nombre.toLowerCase()); return; }
  if (e.trab > 0 && e.cola.length >= D.MAX_COLA_EDIF) { flotar(cx, r.y - 6, "Cola llena"); return; }
  const n = Math.min(loteEdif(e), hay);
  J.almacen[E.entra] -= n;
  if (e.trab > 0) e.cola.push(n); else { e.lote = n; e.trab = E.seg; }
}
function mejorarEdificio(i) {
  const e = J.edif[i], r = espacio(i), cx = r.x + r.w / 2, costo = costoEdif(e);
  if (costo == null) { flotar(cx, r.y - 6, "Nivel máximo"); return; }
  if (J.dinero < costo) { flotar(cx, r.y - 6, "Falta dinero"); return; }
  J.dinero -= costo; e.nivel++; flotar(cx, r.y - 6, "¡Mejorado!");
}
function actualizarEdificios(dt) {
  J.edif.forEach((e, i) => {
    if (e.trab <= 0) return;
    e.trab -= dt;
    if (e.trab > 0) return;
    const E = D.EDIFICIOS[e.id], r = espacio(i);
    for (let k = 0; k < e.lote; k++) J.suelo.push({ tipo: E.sale, x: r.x + 16 + Math.random() * (r.w - 32), y: r.y - 14 + azar(-4, 2), t: D.SEG_SUELO });
    e.lote = 0; e.trab = 0;
    if (e.cola.length) { e.lote = e.cola.shift(); e.trab = E.seg; }
  });
}
// Botones de compra (columna derecha, bajo el camión): uno por animal de NIVELES[n].comprables (por defecto solo la gallina, como en el nivel 1)
function botonesCompra() {
  const t = (J && J.N.comprables) || ["gallina"], k = t.length;
  if (k === 1) { const b = { tipo: t[0], ...CAJAS.comprar }; return [{ ...b, venta: { x: b.x, y: b.y + b.h - 26, w: b.w, h: 26 } }]; } // botón grande: franja «Vender» al pie
  const h = (122 - 4 * (k - 1)) / k; // 122 de alto en total; con 4 animales cada botón mide ~27
  return t.map((tipo, i) => { const b = { tipo, x: CAJAS.comprar.x, y: CAJAS.comprar.y + i * (h + 4), w: CAJAS.comprar.w, h }; return { ...b, venta: { x: b.x + b.w - 34, y: b.y, w: 34, h: b.h } }; }); // botones chicos: zona 💲 a la derecha
}
const cuantos = (tipo) => J.animales.filter((a) => a.tipo === tipo).length;
function comprar(b) {
  const A = D.ANIMALES[b.tipo], cx = b.x + b.w / 2, cy = b.y + Math.min(b.h, 40) / 2;
  if (cuantos(b.tipo) >= A.max) flotar(cx, cy, "Máximo"); else if (J.dinero < A.precio) flotar(cx, cy, "Falta dinero"); else { J.dinero -= A.precio; J.animales.push(nuevoAnimal(b.tipo)); }
}
function tocar(x, y) {
  if (!J || J.fin || J.pausa) return;
  for (const b of botonesAyuda()) if (dentro(b, x, y)) { usarAyuda(b.id); return; } // 🐕 perro / 🐈 gato (en la barra de arriba)
  for (const o of J.osos) if (Math.hypot(o.x - x, o.y - y) < 34) { golpear(o); return; } // capturar oso
  for (const h of J.suelo) if (Math.hypot(h.x - x, h.y - y) < 24) { // recoger producto
    if (pesoAlmacen() + D.PRODUCTOS[h.tipo].peso > capAlmacen()) { flotar(h.x, h.y, "Almacén lleno"); return; }
    aAlmacen(h.tipo); J.suelo.splice(J.suelo.indexOf(h), 1); return;
  }
  for (const q in FRANJAS) if (dentro(FRANJAS[q], x, y)) { mejorar(q); return; } // ⬆ mejorar almacén / camión
  if (dentro(CAJAS.pozo, x, y)) { if (!J.pozo && J.agua < D.MAX_AGUA) J.pozo = D.SEG_POZO; return; }
  if (dentro(CAJAS.camion, x, y)) {
    if (J.camion) return;
    const c = cargaCamion();
    if (!c.pago) { if (pesoAlmacen() > 0) flotar(715, 250, "No cabe en el camión"); return; }
    for (const k in c.lleva) J.almacen[k] -= c.lleva[k];
    J.pago = c.pago; J.camion = segCamion(); return;
  }
  for (const b of botonesCompra()) if (dentro(b, x, y)) { if (dentro(b.venta, x, y)) venderAnimal(b); else comprar(b); return; }
  for (let i = 0; i < J.edif.length; i++) { // edificios: arriba procesar / construir, abajo mejorar
    const r = espacio(i);
    if (!dentro(r, x, y)) continue;
    if (J.edif[i].nivel >= 0 && dentro(espacioMejora(r), x, y)) mejorarEdificio(i); else tocarEdificio(i);
    return;
  }
  if (J.edif.length && y >= FRANJA_EDIF.y) return; // la franja de edificios no es campo: ahí no se planta
  if (dentro(CAMPO, x, y)) { // plantar pasto con 1 de agua
    if (J.agua < 1) flotar(x, y, "Sin agua 💧"); else if (J.pasto.length >= D.MAX_PASTO) flotar(x, y, "Mucho pasto"); else { J.agua--; J.pasto.push({ x, y, v: 4 }); }
  }
}
cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); tocar((e.clientX - r.left) / r.width * D.ANCHO, (e.clientY - r.top) / r.height * D.ALTO); });

function actualizar(dt) {
  J.t += dt;
  if (J.pozo > 0) { J.pozo -= dt; if (J.pozo <= 0) { J.pozo = 0; J.agua = D.MAX_AGUA; } }
  actualizarEdificios(dt);
  actualizarOsos(dt); actualizarPerro(dt); actualizarGato(dt);
  if (J.camion > 0) { J.camion -= dt; if (J.camion <= 0) { J.camion = 0; J.dinero += J.pago; J.ventas += J.pago; flotar(715, 250, "+$" + J.pago); J.pago = 0; } }
  for (const a of J.animales) {
    const A = D.ANIMALES[a.tipo];
    a.t += dt;
    // Nunca mueren. Con hambre (hambre = 1) y sin pasto se quedan quietos y su ciclo de producción se PAUSA hasta que comen.
    if (a.hambre < 1) { a.hambre = Math.min(1, a.hambre + dt / A.segHambre); a.prod += dt / A.segCiclo; }
    if (a.prod >= 1) { a.prod = 0; J.suelo.push({ tipo: A.producto, x: a.x + azar(-10, 10), y: a.y + 12, t: D.SEG_SUELO }); }
    if (a.est === "vaga") {
      if (a.objetivo && !J.pasto.includes(a.objetivo)) a.objetivo = a.dest = null; // otro animal se lo comió
      if (a.hambre > 0.5 && J.pasto.length && (a.objetivo || (a.objetivo = pastoLibre(a)))) a.dest = a.objetivo; // va al pasto libre más cercano (lo reserva)
      else if (a.hambre >= 1) a.dest = null; // sin pasto: quieto y triste
      else if (!a.dest || Math.hypot(a.dest.x - a.x, a.dest.y - a.y) < 6) a.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) };
      if (a.dest) {
        const d = Math.hypot(a.dest.x - a.x, a.dest.y - a.y);
        if (d > 4) { a.x += (a.dest.x - a.x) / d * A.vel * dt; a.y += (a.dest.y - a.y) / d * A.vel * dt; }
        if (a.objetivo && d < 12) { a.est = "come"; a.t = 0; }
      }
    } else { // come
      if (!J.pasto.includes(a.objetivo)) { a.est = "vaga"; a.objetivo = a.dest = null; continue; }
      if (a.t > 0.8) {
        a.t = 0; a.mord++;
        if (--a.objetivo.v <= 0) J.pasto.splice(J.pasto.indexOf(a.objetivo), 1);
        if (a.mord >= A.mordidas) { a.hambre = 0; a.mord = 0; a.est = "vaga"; a.objetivo = a.dest = null; }
        else if (!J.pasto.includes(a.objetivo)) { a.est = "vaga"; a.objetivo = a.dest = null; } // se acabó el pasto a medias: busca otro y conserva lo comido
      }
    }
  }
  for (const h of J.suelo) h.t -= dt;
  J.suelo = J.suelo.filter((h) => h.t > 0);
  for (const f of J.flot) f.t -= dt;
  J.flot = J.flot.filter((f) => f.t > 0);
  if (metasCumplidas()) terminar(true); // el tiempo ya no hace perder: solo cambia la medalla
}

// ---------- Dibujo ----------
function caja(r, ctxFill) { ctx.fillStyle = ctxFill; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); }
function txt(t, x, y, tam = 16, color = "#fff", al = "left") { ctx.font = "700 " + tam + "px system-ui,sans-serif"; ctx.fillStyle = color; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
function emo(e, x, y, tam) { ctx.font = tam + "px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// Franja de edificios: espacio vacío (construir), edificio con su estado y barra de avance, y la franja ⬆ mejorar
function dibujarEdificios() {
  caja(FRANJA_EDIF, "rgba(70,45,20,.35)");
  J.edif.forEach((e, i) => {
    const E = D.EDIFICIOS[e.id], r = espacio(i);
    if (e.nivel < 0) { // sin construir
      const puede = J.dinero >= E.costo;
      caja(r, puede ? "rgba(160,100,10,.55)" : "rgba(20,20,24,.45)");
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.55; emo(E.emoji, r.x + 28, r.y + 26, 28); ctx.globalAlpha = 1;
      txt(E.nombre, r.x + 52, r.y + 20, 13); txt("🏗️ Construir", r.x + 52, r.y + 38, 12, "#fff4c2"); txt("$" + E.costo.toLocaleString("es-MX"), r.x + 52, r.y + 55, 12, puede ? "#fff4c2" : "#c9c9d0");
      return;
    }
    const hay = J.almacen[E.entra] || 0, ocupado = e.trab > 0;
    caja(r, ocupado ? "rgba(40,100,160,.88)" : hay ? "rgba(40,120,50,.9)" : "rgba(20,20,24,.78)");
    emo(E.emoji, r.x + 24, r.y + 18, 28);
    txt(E.nombre, r.x + 46, r.y + 12, 13);
    txt(ocupado ? "⏳ " + Math.ceil(e.trab) + " s · ×" + e.lote + (e.cola.length ? " +" + e.cola.length : "") : hay ? D.PRODUCTOS[E.entra].emoji + "×" + Math.min(hay, loteEdif(e)) + " → " + D.PRODUCTOS[E.sale].emoji : "Falta " + D.PRODUCTOS[E.entra].emoji, r.x + 46, r.y + 28, 12, "#fff4c2");
    if (ocupado) { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(r.x + 8, r.y + 38, r.w - 16, 4); ctx.fillStyle = "#ffe27a"; ctx.fillRect(r.x + 8, r.y + 38, (r.w - 16) * (1 - e.trab / E.seg), 4); }
    pintarFranja(espacioMejora(r), costoEdif(e), e.nivel + 1, D.EDIFICIOS[e.id].costos.length);
  });
}

// Franja inferior de Almacén / Camión: costo de la siguiente mejora y nivel (dorada si alcanza el dinero)
function franjaMejora(que) { pintarFranja(FRANJAS[que], costoMejora(que), J.mejoras[que] + 1, D.MEJORAS[que].capacidad.length); }
function pintarFranja(f, costo, nv, niveles) {
  const puede = costo != null && J.dinero >= costo;
  ctx.fillStyle = costo == null ? "rgba(70,70,76,.95)" : puede ? "rgba(214,150,20,.96)" : "rgba(52,52,58,.95)";
  ctx.beginPath(); ctx.roundRect(f.x, f.y, f.w, f.h, [0, 0, 12, 12]); ctx.fill();
  txt(costo == null ? "Nivel máx. " + nv + "/" + niveles : "⬆ $" + costo.toLocaleString("es-MX") + " · Nv " + nv + "/" + niveles, f.x + f.w / 2, f.y + f.h / 2, 12, puede ? "#fff" : "#c9c9d0", "center");
}

function dibujar() {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, D.ANCHO, D.ALTO); // transparente: se ve la madera
  if (!J) return;
  caja({ x: 20, y: 8, w: 770, h: 40 }, "rgba(20,20,24,.78)");
  txt("💵 $" + J.dinero, 36, 28, 18, "#fff4c2");
  { // panel de metas: un chip por meta, de izquierda a derecha entre 💵 y los botones 🐕 🐈 (x 120 a 470); la letra se achica si no caben
    const items = J.N.metas.map((m) => { const a = avanceMeta(m), ok = a.actual >= a.objetivo; return { t: a.icono + " " + Math.min(a.actual, a.objetivo).toLocaleString("es-MX") + "/" + a.objetivo.toLocaleString("es-MX"), ok }; });
    let tam = 15; const medir = () => { ctx.font = "700 " + tam + "px system-ui,sans-serif"; return items.reduce((s, i) => s + ctx.measureText(i.t).width + 16, 0); };
    while (tam > 10 && medir() > 350) tam--;
    let x = 120;
    for (const i of items) { txt(i.t, x, 28, tam, i.ok ? "#9dffb0" : "#fff"); x += ctx.measureText(i.t).width + 16; }
  }
  for (const b of botonesAyuda()) {
    const hecho = b.id === "gato" && J.gato, costo = b.id === "gato" ? D.GATO.costo : costoPerro(), ocupado = b.id === "perro" && J.perro;
    const puede = !hecho && !ocupado && J.dinero >= costo && (b.id === "gato" || J.osos.some((o) => o.bloqueo <= 0));
    caja(b, hecho ? "rgba(60,110,60,.9)" : puede ? "rgba(160,100,10,.92)" : "rgba(60,60,66,.9)");
    emo(b.id === "gato" ? "🐈" : "🐕", b.x + 16, b.y + b.h / 2, 20);
    txt(hecho ? "✔ tienes" : ocupado ? "en camino" : costo ? "$" + costo.toLocaleString("es-MX") : "gratis", b.x + 32, b.y + b.h / 2, 12, "#fff4c2");
  }
  { const med = medallaAhora(); txt("⏱ " + mmss(J.t) + " " + (["", "🥉", "🥈", "🥇"][med]), 772, 28, 17, med === 3 ? "#ffe27a" : med === 2 ? "#e4e8ee" : "#f0c9a0", "right"); } // sube; el emoji es la medalla que llevas
  caja(CAMPO, "rgba(88,160,60,.88)");
  for (const p of J.pasto) emo(p.v >= 3 ? "🌿" : "🌱", p.x, p.y, 22);
  if (J.edif.length) dibujarEdificios();
  for (const h of J.suelo) {
    if (!(h.t > 3 || Math.floor(h.t * 6) % 2)) continue;
    if (D.PRODUCTOS[h.tipo].jaula) { // jaula: barrotes sobre el oso
      ctx.save(); ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.strokeRect(h.x - 18, h.y - 18, 36, 36);
      for (let k = -9; k <= 9; k += 9) { ctx.beginPath(); ctx.moveTo(h.x + k, h.y - 18); ctx.lineTo(h.x + k, h.y + 18); ctx.stroke(); } ctx.restore();
      emo(D.PRODUCTOS[h.tipo].emoji, h.x, h.y, 26);
    } else emo(D.PRODUCTOS[h.tipo].emoji, h.x, h.y, 20);
  }
  for (const a of J.animales.slice().sort((p, q) => p.y - q.y)) {
    emo(D.ANIMALES[a.tipo].emoji, a.x, a.y + Math.sin(J.t * 8 + a.x) * (a.est === "vaga" ? 1.5 : 0), D.ANIMALES[a.tipo].tam);
    if (a.hambre >= 1) emo("😢", a.x + D.ANIMALES[a.tipo].tam / 2, a.y - D.ANIMALES[a.tipo].tam / 2, 14);
  }
  if (J.gato) emo("🐈", J.gato.x, J.gato.y, 26);
  for (const o of J.osos) {
    const O = D.OSOS[o.tipo];
    emo(O.emoji, o.x, o.y + Math.sin(J.t * 6 + o.x) * (o.bloqueo > 0 ? 0 : 1.5), 42);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(o.x - 18, o.y - 30, 36, 5); ctx.fillStyle = "#ffe27a"; ctx.fillRect(o.x - 18, o.y - 30, 36 * o.golpes / O.golpes, 5); // avance de captura
  }
  if (J.perro) emo("🐕", J.perro.x, J.perro.y, 30);
  caja(CAJAS.pozo, "rgba(20,20,24,.78)"); emo("⛲", 672, 98, 34);
  txt("Pozo", 700, 82, 15); txt(J.pozo > 0 ? "Llenando… " + Math.ceil(J.pozo) : "💧 " + J.agua + " / " + D.MAX_AGUA, 700, 108, 14, "#bfe4fb");
  caja(CAJAS.almacen, "rgba(20,20,24,.78)"); emo("📦", 672, 170, 34);
  txt("Almacén", 700, 157, 15); txt("⚖️ " + pesoAlmacen() + " / " + capAlmacen(), 700, 177, 14, "#fff4c2"); franjaMejora("almacen");
  caja(CAJAS.camion, cargaCamion().pago > 0 && !J.camion ? "rgba(40,120,50,.9)" : "rgba(20,20,24,.78)"); emo("🚚", 672, 255, 34);
  txt("Vender", 700, 241, 15); txt(J.camion > 0 ? "En camino… " + Math.ceil(J.camion) : "$" + cargaCamion().pago, 700, 258, 14, "#fff4c2"); txt("Carga máx. " + capCamion(), 700, 271, 11, "#d8d8d8"); franjaMejora("camion");
  for (const b of botonesCompra()) {
    const A = D.ANIMALES[b.tipo], n = cuantos(b.tipo), puede = J.dinero >= A.precio && n < A.max;
    caja(b, puede ? "rgba(160,100,10,.92)" : "rgba(20,20,24,.78)");
    const v = b.venta;
    caja(v, n > 0 ? "rgba(150,50,40,.95)" : "rgba(60,60,66,.9)");
    if (b.h > 60) { // botón grande: arriba comprar, abajo la franja de vender
      emo(A.emoji, 672, b.y + 28, 30); txt("Comprar", 700, b.y + 16, 15); txt("$" + A.precio.toLocaleString("es-MX") + "  ·  " + n + "/" + A.max, 700, b.y + 36, 13, "#fff4c2");
      txt("💲 Vender $" + precioVenta(b.tipo).toLocaleString("es-MX"), v.x + v.w / 2, v.y + v.h / 2, 12, n > 0 ? "#fff" : "#999", "center"); continue;
    }
    emo(A.emoji, b.x + 18, b.y + b.h / 2, Math.min(22, b.h - 4));
    txt("$" + A.precio.toLocaleString("es-MX"), b.x + 36, b.y + b.h / 2, 12, "#fff4c2");
    txt(n + "/" + A.max, v.x - 4, b.y + b.h / 2, 11, n >= A.max ? "#ff9a8c" : "#d8d8d8", "right");
    emo("💲", v.x + v.w / 2, v.y + v.h / 2, Math.min(16, b.h - 8));
  }
  for (const f of J.flot) { ctx.globalAlpha = Math.min(1, f.t); txt(f.txt, f.x, f.y - (1.2 - f.t) * 30, 16, "#fff", "center"); ctx.globalAlpha = 1; }
}

// ---------- Fin del nivel ----------
function colocarFin() {
  const r = cv.getBoundingClientRect();
  Object.assign(cajaFin.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
}
function terminar(gano) {
  J.fin = true;
  const seg = Math.ceil(J.t);
  let res = { estrellas: 0, monedas: 0 };
  if (gano) { res = eco.registrarNivel(J.n, eco.estrellasDe({ gano, segundos: seg, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] })); pintarMonedas(); if (nube) nube.guardado(); }
  const caja_ = (c, t, f) => { const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + c; b.textContent = t; b.onclick = f; return b; };
  const sig = D.NIVELES[J.n + 1] ? J.n + 1 : 0;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = gano ? "¡Nivel " + J.n + " completado!" : "Nivel no terminado";
  texto.lastChild.textContent = eco.estrellasTexto(eco.estrellasDe({ gano: true, segundos: seg, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] })) + " " + eco.MEDALLAS[eco.estrellasDe({ gano: true, segundos: seg, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] })] + " · " + mmss(seg) + (res.monedas ? " · +" + res.monedas + " monedas" : "");
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  fila.append(caja_("b-azul", "Repetir nivel", () => empezar(J.n)), caja_("b-gris", "Mapa", () => abrirMapa(J.n)));
  cajaFin.replaceChildren(texto);
  if (gano && sig) cajaFin.appendChild(caja_("grande b-verde", "Siguiente nivel ▶", () => empezar(sig))); // primero y más grande; en el último nivel se oculta
  cajaFin.appendChild(fila);
  if (gano && sig) cajaFin.children[1].className = "b3d txt grande b-verde";
  cajaFin.hidden = false; colocarFin();
}

// ---------- Bucle ----------
let previo = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, (ahora - previo) / 1000 || 0); previo = ahora;
  if (donde === "juego" && J && !J.pausa && !J.fin) actualizar(dt);
  if (donde === "juego") dibujar();
}
requestAnimationFrame(bucle);

// Sincronización con la cuenta (opcional: funciona igual sin internet)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar("granjafeliz", { clave: eco.CLAVE_PROGRESO, fusionar: eco.fusionar, alCambiar: () => { pintarMonedas(); mapa.refrescar(); } });
}).catch(() => {});

pintarMonedas();
ir("menu");
