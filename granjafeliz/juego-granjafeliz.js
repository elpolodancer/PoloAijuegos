// Ruta: granjafeliz/juego-granjafeliz.js
// Granja feliz (estilo Farm Frenzy), horizontal. Menú estándar + mapa de 22 600 niveles (por ahora existen el nivel 1: gallinas y huevos, el 2, provisional: edificios, y el 3, de pruebas: pavo, oveja y vaca).
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
function avisar(t) { const a = $("aviso-granja"); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 2600); }

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
  infoNivel: (n) => { const s = eco.estrellasDeNivel(n); return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: s + " de 3 estrellas" }; },
  leyenda: "Ganas 15, 30 o 45 monedas según tus estrellas la primera vez que las consigues",
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
  J = { n, N, t: 0, dinero: N.dineroInicial, ventas: 0, agua: N.aguaInicial, pozo: 0, pasto: [], animales: [], suelo: [], almacen: {}, camion: 0, pago: 0, mejoras: { almacen: (N.mejoras && N.mejoras.almacen) || 0, camion: (N.mejoras && N.mejoras.camion) || 0 }, edif: (N.edificios || []).map((id) => ({ id, nivel: -1, trab: 0, lote: 0, cola: [] })), flot: [], fin: false, pausa: false };
  for (const tipo in N.animales) for (let i = 0; i < N.animales[tipo]; i++) J.animales.push(nuevoAnimal(tipo));
  ir("juego");
}

function flotar(x, y, txt) { J.flot.push({ x, y, txt, t: 1.2 }); }
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
// ----- Edificios de procesamiento (datos en D.EDIFICIOS y D.MEJORAS.fabricaN) -----
// e.nivel: -1 = todavía sin construir; 0 a 4 = nivel de mejora. e.trab = segundos que faltan del lote en marcha; e.lote = cuántas unidades lleva;
// e.cola = lotes que esperan (cada uno es la cantidad ya descontada del almacén). Todo se reinicia en cada nivel, igual que el dinero.
const filaEdif = (e) => D.MEJORAS[D.EDIFICIOS[e.id].fabrica];
const loteEdif = (e) => filaEdif(e).lote[e.nivel];
const costoEdif = (e) => (e.nivel < filaEdif(e).costo.length - 1 ? filaEdif(e).costo[e.nivel + 1] : null); // null = nivel máximo
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
  if (k === 1) return [{ tipo: t[0], ...CAJAS.comprar }];
  const h = (122 - 4 * (k - 1)) / k; // 122 de alto en total; con 4 animales cada botón mide ~27
  return t.map((tipo, i) => ({ tipo, x: CAJAS.comprar.x, y: CAJAS.comprar.y + i * (h + 4), w: CAJAS.comprar.w, h }));
}
const cuantos = (tipo) => J.animales.filter((a) => a.tipo === tipo).length;
function comprar(b) {
  const A = D.ANIMALES[b.tipo], cx = b.x + b.w / 2, cy = b.y + Math.min(b.h, 40) / 2;
  if (cuantos(b.tipo) >= A.max) flotar(cx, cy, "Máximo"); else if (J.dinero < A.precio) flotar(cx, cy, "Falta dinero"); else { J.dinero -= A.precio; J.animales.push(nuevoAnimal(b.tipo)); }
}
function tocar(x, y) {
  if (!J || J.fin || J.pausa) return;
  for (const h of J.suelo) if (Math.hypot(h.x - x, h.y - y) < 24) { // recoger producto
    if (pesoAlmacen() + D.PRODUCTOS[h.tipo].peso > capAlmacen()) { flotar(h.x, h.y, "Almacén lleno"); return; }
    J.almacen[h.tipo] = (J.almacen[h.tipo] || 0) + 1; J.suelo.splice(J.suelo.indexOf(h), 1); return;
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
  for (const b of botonesCompra()) if (dentro(b, x, y)) { comprar(b); return; }
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
  if (J.ventas >= J.N.meta) terminar(true); else if (J.t >= J.N.tiempo) terminar(false);
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
    pintarFranja(espacioMejora(r), costoEdif(e), e.nivel + 1, filaEdif(e).costo.length);
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
  txt("Ventas " + J.ventas + " / " + J.N.meta, 400, 28, 18, "#fff", "center");
  txt("⏱ " + mmss(Math.max(0, J.N.tiempo - J.t)), 772, 28, 18, J.N.tiempo - J.t < 30 ? "#ff9a8c" : "#fff", "right");
  caja(CAMPO, "rgba(88,160,60,.88)");
  for (const p of J.pasto) emo(p.v >= 3 ? "🌿" : "🌱", p.x, p.y, 22);
  if (J.edif.length) dibujarEdificios();
  for (const h of J.suelo) { if (h.t > 3 || Math.floor(h.t * 6) % 2) emo(D.PRODUCTOS[h.tipo].emoji, h.x, h.y, 20); }
  for (const a of J.animales.slice().sort((p, q) => p.y - q.y)) {
    emo(D.ANIMALES[a.tipo].emoji, a.x, a.y + Math.sin(J.t * 8 + a.x) * (a.est === "vaga" ? 1.5 : 0), D.ANIMALES[a.tipo].tam);
    if (a.hambre >= 1) emo("😢", a.x + D.ANIMALES[a.tipo].tam / 2, a.y - D.ANIMALES[a.tipo].tam / 2, 14);
  }
  caja(CAJAS.pozo, "rgba(20,20,24,.78)"); emo("⛲", 672, 98, 34);
  txt("Pozo", 700, 82, 15); txt(J.pozo > 0 ? "Llenando… " + Math.ceil(J.pozo) : "💧 " + J.agua + " / " + D.MAX_AGUA, 700, 108, 14, "#bfe4fb");
  caja(CAJAS.almacen, "rgba(20,20,24,.78)"); emo("📦", 672, 170, 34);
  txt("Almacén", 700, 157, 15); txt("⚖️ " + pesoAlmacen() + " / " + capAlmacen(), 700, 177, 14, "#fff4c2"); franjaMejora("almacen");
  caja(CAJAS.camion, cargaCamion().pago > 0 && !J.camion ? "rgba(40,120,50,.9)" : "rgba(20,20,24,.78)"); emo("🚚", 672, 255, 34);
  txt("Vender", 700, 241, 15); txt(J.camion > 0 ? "En camino… " + Math.ceil(J.camion) : "$" + cargaCamion().pago, 700, 258, 14, "#fff4c2"); txt("Carga máx. " + capCamion(), 700, 271, 11, "#d8d8d8"); franjaMejora("camion");
  for (const b of botonesCompra()) {
    const A = D.ANIMALES[b.tipo], n = cuantos(b.tipo), puede = J.dinero >= A.precio && n < A.max;
    caja(b, puede ? "rgba(160,100,10,.92)" : "rgba(20,20,24,.78)");
    if (b.h > 60) { emo(A.emoji, 672, b.y + 38, 34); txt("Comprar", 700, b.y + 22, 15); txt("$" + A.precio.toLocaleString("es-MX"), 700, b.y + 48, 14, "#fff4c2"); continue; }
    emo(A.emoji, b.x + 20, b.y + b.h / 2, Math.min(22, b.h - 4));
    txt("$" + A.precio.toLocaleString("es-MX"), b.x + 40, b.y + b.h / 2, 13, "#fff4c2");
    txt(n + "/" + A.max, b.x + b.w - 8, b.y + b.h / 2, 11, n >= A.max ? "#ff9a8c" : "#d8d8d8", "right");
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
  if (gano) { res = eco.registrarNivel(J.n, eco.estrellasDe({ gano, segundos: seg, estrellasSeg: J.N.estrellasSeg })); pintarMonedas(); if (nube) nube.guardado(); }
  const caja_ = (c, t, f) => { const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + c; b.textContent = t; b.onclick = f; return b; };
  const sig = D.NIVELES[J.n + 1] ? J.n + 1 : 0;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = gano ? "¡Nivel " + J.n + " completado!" : "Se acabó el tiempo";
  texto.lastChild.textContent = gano ? eco.estrellasTexto(res.estrellas) + " en " + mmss(seg) + (res.monedas ? " · +" + res.monedas + " monedas" : "") : "Vendiste $" + J.ventas + " de $" + J.N.meta;
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
