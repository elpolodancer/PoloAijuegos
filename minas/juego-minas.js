// Ruta: minas/juego-minas.js
// «Minero Tycoon»: varias minas con dinero compartido; compra pozos (hasta 1000 por mina), sube de nivel a mineros, ascensor y almacén, contrata gerentes y haz prestigio.
// Las reglas están en logica-minas.js y los números enormes en grande.js.
import * as L from "./logica-minas.js";
import * as B from "./grande.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
const ID = "minas", GUARDA = "minas_partida3", NUBE = "minas_nube";  // clave nueva: el formato cambió (números enormes y varias minas); la partida vieja ya no sirve
const H = 112;                                 // alto de cada fila en px (igual que .fila en index.html)
// Al perfil: pozo nuevo +10, asesor +5, prestigio +50, mina nueva +100 (se anotan en el dispositivo y se envían con internet y sesión)
const MINERAL = ["⚫", "🪙", "💎", "🟣", "🔶", "💠"];
const $ = (id) => document.getElementById(id);
const escena = $("escena"), filasEl = $("filas");
const fmt = B.fmt;
const fx = (n) => (n < 1e6 ? String(n) : fmt(n));
const est = (a) => { const x = typeof a === "number" ? a : B.aNum(a); return x >= 1000 || !isFinite(x) ? fmt(a) : x >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10); };   // como el panel del juego original: 14.8, 124, 1.06K
function aviso(t) { const a = $("aviso"); a.textContent = t; a.style.opacity = 1; clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.style.opacity = 0), 3500); }

// ----- Partida -----
let E = L.nuevoEstado(), sel = 0, modo = 1;   // sel: mina que se ve; modo: 1, 10, 100 o 0 (máximo)
// Nube: copia compacta (minas_nube) que sincroniza compartido/progreso.js. tNube solo cambia cuando cambia lo comprado (no el dinero)
let nube = null, tNube = 0, lastHuella = "", sucioNube = false, ultSubida = 0, tEnv = 0;
const mina = () => E.minas[sel];
const esB = (o) => o && Number.isFinite(o.m) && Number.isFinite(o.e) && o.m >= 0;
const okT = (o) => o && Number.isFinite(o.n) && Number.isFinite(o.f) && Number.isFinite(o.t) && o.ger >= 0 && o.ger <= 3;
const minaOk = (M) => M && Number.isInteger(M.j) && Number.isFinite(M.estrellas) && esB(M.run) && esB(M.pool) && Array.isArray(M.pozos) && M.pozos.length <= L.AJ.MAX_POZOS
  && okT(M.asc) && esB(M.asc.c) && okT(M.alm) && esB(M.alm.dep) && esB(M.alm.c) && M.pozos.every((p) => okT(p) && esB(p.dep));
function cargar() {
  try {
    const g = JSON.parse(localStorage.getItem(GUARDA)), S = g && g.E;
    if (!S || !esB(S.din) || !Array.isArray(S.minas) || !S.minas.length || !S.minas.every((M, j) => minaOk(M) && M.j === j)) return;
    S.minas.forEach((M) => { M.sucio = true; M.U = B.CERO; });
    E = S; if (g.pend >= 1) encolarPuntos(ID, Math.floor(g.pend)); sel = Math.min(Math.max(0, g.sel | 0), E.minas.length - 1);
    const seg = (Date.now() - g.t) / 1000;
    if (seg > 30) { const x = L.fuera(E, seg); if (x.m > 0) aviso("Mientras no estabas ganaste $" + fmt(x)); }
  } catch (e) {}
}
function guardar() {
  try { localStorage.setItem(GUARDA, JSON.stringify({ E, sel, t: Date.now() })); } catch (e) {}
  const h = L.huella(E);
  if (h !== lastHuella) { lastHuella = h; tNube = Date.now(); sucioNube = true; }
  if (L.hayAvance(E)) {
    if (!tNube) tNube = Date.now();
    try { localStorage.setItem(NUBE, JSON.stringify(L.aInstantanea(E, tNube))); } catch (e) {}
    if (sucioNube && nube && Date.now() - ultSubida > 20000) { ultSubida = Date.now(); sucioNube = false; nube.guardado(); }   // como mucho una subida cada 20 s (los ejecutivos suben niveles solos)
  }
}
// Puntos: a la cola local; se envían juntos unos segundos después (y al salir)
function puntos(p) { encolarPuntos(ID, p); clearTimeout(tEnv); tEnv = setTimeout(vaciar, 4000); }
function vaciar() { import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {}); }

// ----- Filas (solo existen en el DOM las que se ven: con 1000 pozos serían demasiadas) -----
// Fila 0 = almacén, fila 1 = ascensor, fila q ≥ 2 = pozo q − 1. Cada fila mide H px y empieza en q × H dentro de #filas.
const vivas = new Map();
function crearFila(q) {
  const tipo = q === 0 ? "w" : q === 1 ? "a" : "m", idx = tipo === "m" ? q - 2 : 0;
  const el = document.createElement("div");
  el.className = "fila" + (tipo === "w" ? " sup" : "");
  el.style.top = q * H + "px";
  el.innerHTML = '<div class="esc"><span class="dep"></span><span class="roca"></span><span class="toca" hidden>👆 toca</span></div><div class="inf"><b></b><small></small><button class="s b3d txt chico b-verde"></button><button class="g b3d txt chico b-azul"></button></div>';
  const s = (c) => el.querySelector(c), r = { q, tipo, i: idx, el, pjs: [], dep: s(".dep"), roca: s(".roca"), toca: s(".toca"), nom: s("b"), niv: s("small"), s: s(".s"), g: s(".g") };
  r.roca.textContent = tipo === "m" ? MINERAL[idx % MINERAL.length] : tipo === "w" ? "🏦" : "🏗️";
  if (tipo === "w") r.roca.className = "banco";
  for (let k = 0; k < (tipo === "m" ? 6 : tipo === "w" ? 1 : 0); k++) {   // un pozo puede tener hasta 6 mineros
    const e = document.createElement("span"); e.className = "pj"; e.textContent = tipo === "m" ? "👷" : "🚚"; e.hidden = k > 0; s(".esc").appendChild(e); r.pjs.push(e);
  }
  r.nom.textContent = tipo === "m" ? "Pozo " + (idx + 1) + (idx === 0 ? " · Carbón" : "") : tipo === "w" ? "Almacén" : "Ascensor";
  s(".esc").onclick = () => { if (L.tocar(mina(), tipo, idx)) pintar(); };
  r.nom.style.cursor = "pointer";
  if (tipo === "m") r.nom.onclick = () => { const M = mina(), t = L.estadisticas(M, idx); aviso("Pozo " + (idx + 1) + " Nv " + M.pozos[idx].n + " · Extracción total $" + est(t.total) + "/s · Mineros " + t.mineros + " · Caminata " + t.caminata + " · Extracción " + est(t.extraccion) + "/s · Capacidad " + est(t.capacidad)); };
  if (tipo === "a") r.nom.onclick = () => { const M = mina(), t = L.estadisticasAsc(M); aviso("Ascensor Nv " + M.asc.n + " · Transporte total $" + est(t.total) + "/s · Carga " + est(t.carga) + " · Velocidad de movimiento " + Number(t.movimiento.toPrecision(3)) + " · Velocidad de carga " + est(t.velCarga) + "/s"); };
  if (tipo === "w") r.nom.onclick = () => { const M = mina(), t = L.estadisticasAlm(M); aviso("Almacén Nv " + M.alm.n + " · Transporte total $" + est(t.total) + "/s · Transportadores " + t.transportadores + " · Carga por transportador " + est(t.carga) + " · Velocidad de carga " + est(t.velCarga) + "/s · Caminata " + t.caminata); };
  r.s.onclick = () => comprarNiv(r);
  r.g.onclick = () => comprarGer(r);
  filasEl.appendChild(el);
  return r;
}
const ventana = () => { const t = filasEl.getBoundingClientRect().top - escena.getBoundingClientRect().top; return [-t - 2 * H, -t + escena.clientHeight + 2 * H]; };   // rango de px visible (más un margen)
function sincronizar() {                          // crea las filas que entran en pantalla y quita las que salen
  const total = mina().pozos.length + 2, v = ventana();
  filasEl.style.height = total * H + "px";
  const q0 = Math.max(0, Math.floor(v[0] / H)), q1 = Math.min(total - 1, Math.floor(v[1] / H));
  for (const [q, r] of vivas) if (q < q0 || q > q1) { r.el.remove(); vivas.delete(q); }
  for (let q = q0; q <= q1; q++) if (!vivas.has(q)) vivas.set(q, crearFila(q));
}
function armar() {                                // reconstruye todo (al cambiar de mina o hacer prestigio)
  for (const r of vivas.values()) r.el.remove();
  vivas.clear();
  sincronizar(); pintar();
}
const nuevo = document.createElement("button"); nuevo.id = "nuevo"; nuevo.className = "b3d txt b-oro"; escena.appendChild(nuevo);
nuevo.onclick = () => {
  const M = mina();
  if (L.comprarPozo(E, M)) { puntos(10); sincronizar(); pintar(); guardar(); } else aviso("Te falta dinero");
};

const cantidad = (M, r, w) => (modo ? Math.max(1, Math.min(modo, L.nivMax(r.tipo) - w.n)) : Math.max(1, L.maxNiv(M, r.tipo, r.i, w.n, E.din)));
function comprarNiv(r) {
  const M = mina(), w = L.trab(M, r.tipo, r.i), h = L.hitos(w.n);
  if (!L.subir(E, M, r.tipo, r.i, cantidad(M, r, w))) { aviso("Te falta dinero"); return; }
  if (L.hitos(w.n) > h) aviso("¡Hito! Nivel " + w.n + ": ×2 de producción");
  pintar(); guardar();
}
function comprarGer(r) {
  const M = mina(), w = L.trab(M, r.tipo, r.i);
  if (w.ger >= 3) return;
  if (w.ger === 0 && !L.asesoresActivos(M)) { aviso("Los asesores se desbloquean cuando el pozo 1 llega al nivel " + L.AJ.NIV_ASESOR); return; }
  if (!L.comprarGer(E, M, r.tipo, r.i)) { aviso("Te falta dinero"); return; }
  if (w.ger === 1) { puntos(5); aviso("Asesor contratado: ahora trabaja solo"); } else if (w.ger === 3) aviso("¡Ejecutivo! Además sube solo el nivel de este trabajador (si cuesta menos del 10 % de tu dinero)"); else aviso("Gerente " + L.RANGOS[w.ger] + ": ×" + L.vel(w));
  pintar(); guardar();
}

// ----- Minas (selector) -----
let pills = [];
function armarMinas() {
  const cont = $("minas");
  cont.innerHTML = ""; pills = [];
  const n = E.minas.length + (E.minas.length < L.AJ.MAX_MINAS ? 1 : 0);
  for (let j = 0; j < n; j++) {
    const b = document.createElement("button"); b.className = "b3d chico txt b-azul mp";
    b.onclick = () => {
      if (j < E.minas.length) { if (sel === j) return; sel = j; armar(); armarMinas(); pintar(); guardar(); escena.scrollTo(0, 0); return; }
      if (L.comprarMina(E)) { sel = j; puntos(100); aviso("¡Mina " + (j + 1) + " desbloqueada! El dinero es compartido"); armar(); armarMinas(); pintar(); guardar(); escena.scrollTo(0, 0); }
      else aviso("Te falta dinero para la mina " + (j + 1));
    };
    cont.appendChild(b); pills.push(b);
  }
}
function pintarMinas() {
  const n = E.minas.length + (E.minas.length < L.AJ.MAX_MINAS ? 1 : 0);
  if (pills.length !== n) armarMinas();
  pills.forEach((b, j) => {
    if (j < E.minas.length) { const M = E.minas[j]; b.textContent = "⛏️ Mina " + (j + 1) + (M.estrellas ? " ⭐" + M.estrellas : "") + (M.pozos.length ? " · " + M.pozos.length : ""); b.classList.toggle("sel", j === sel); b.classList.remove("no"); }
    else { const c = L.precioMina(j); b.textContent = "🔒 Mina " + (j + 1) + " · $" + fmt(c); b.classList.remove("sel"); b.classList.toggle("no", B.mayor(c, E.din)); }
  });
}

// Aviso de confirmación dentro de la página (confirm() saca al navegador de la pantalla completa)
function confirmar(texto, alAceptar) {
  $("confTxt").textContent = texto; $("confirmar").hidden = false;
  $("confSi").onclick = () => { $("confirmar").hidden = true; alAceptar(); };
  $("confNo").onclick = () => { $("confirmar").hidden = true; };
}

// ----- Barra inferior -----
const barra = $("barra"), bModo = [];
[[1, "x1"], [10, "x10"], [100, "x100"], [0, "Máx"]].forEach(([m, t]) => {
  const b = document.createElement("button"); b.textContent = t; b.className = "b3d txt chico " + ({ 1: "b-verde", 10: "b-azul", 100: "b-morado", 0: "b-rojo" })[m]; b.onclick = () => { modo = m; bModo.forEach(([mm, bb]) => bb.classList.toggle("sel", mm === modo)); pintar(); };
  barra.appendChild(b); bModo.push([m, b]);
});
bModo[0][1].classList.add("sel");
const bPres = document.createElement("button"); bPres.className = "b3d txt chico b-oro"; barra.appendChild(bPres);
bPres.onclick = () => {
  const M = mina(), g = L.estrellasGanables(M);
  if (g < 1) { aviso("Necesitas ganar $" + fmt(L.AJ.PRESTIGIO) + " en esta mina para tu primera ⭐"); return; }
  confirmar("¿Hacer prestigio en la mina " + (sel + 1) + "? Ganas " + g + " ⭐ (+" + Math.round(g * L.AJ.BONO_ESTRELLA * 100) + " % de ganancias en esta mina para siempre), pero esta mina se reinicia" + (L.AJ.REINICIA_DIN ? " y el dinero vuelve a $" + L.AJ.DIN0 : "") + " (conservas tus estrellas y las demás minas).", () => {
    L.prestigio(E, M); puntos(50); armar(); pintar(); guardar();
  });
};
const bFin = document.createElement("button"); bFin.className = "b3d chico b-gris"; bFin.textContent = "⏬"; bFin.title = "Ir al final (nuevo pozo)"; barra.appendChild(bFin);
bFin.onclick = () => nuevo.scrollIntoView({ behavior: "smooth", block: "center" });

// ----- Dibujo -----
const x = (p) => 20 + 65 * p;                   // posición horizontal en % (20 = depósito, 85 = roca/banco)
let reloj = 0;                                  // segundos (para animar a los trabajadores con gerente)
// Fase y avance (0 a 1) de un trabajador: si es manual, la real; si tiene gerente, una animación que solo es visual (el dinero se calcula aparte)
function faseVis(M, tipo, i, w, desfase) {
  if (w.ger === 0) return w.f ? [w.f, Math.min(1, w.t / L.dur(M, tipo, i))] : [0, 0];
  if (tipo !== "m" && !M.pozos.length) return [0, 0];
  const c = L.ciclo(M, tipo, i), T = c[0] + c[1] + c[2] + (c[3] || 0);
  if (!(T > 0)) return [0, 0];
  let t = (reloj + desfase) % T;
  for (let k = 0; k < c.length; k++) { if (t < c[k]) return [k + 1, c[k] > 0 ? t / c[k] : 0]; t -= c[k]; }
  return [0, 0];
}
function pintar() {
  const M = mina(), N = M.pozos.length;
  $("din").textContent = "$ " + fmt(E.din);
  $("est").textContent = "⭐ " + M.estrellas;
  const im = L.ingreso(M), it = L.ingresoTotal(E);
  $("ips").textContent = it.m > 0 ? "$" + fmt(im) + "/s" + (E.minas.length > 1 ? " · total $" + fmt(it) + "/s" : "") : "Sin asesores: toca";
  const g = L.estrellasGanables(M);
  bPres.textContent = g >= 1 ? "⭐ Prestigio +" + g : "⭐ Prestigio";
  bPres.style.opacity = g >= 1 ? 1 : 0.55;
  if (N >= L.AJ.MAX_POZOS) { nuevo.textContent = "Mina completa (" + N + " pozos)"; nuevo.classList.remove("no"); }
  else { const cp = L.costoPozo(N, M); nuevo.textContent = (N === 0 ? "🔒 Desbloquear pozo 1 (carbón) · $" : "➕ Nuevo pozo (" + (N + 1) + ") · $") + fmt(cp); nuevo.classList.toggle("no", B.mayor(cp, E.din)); }
  pintarMinas();
  const U = L.prod(M);
  for (const r of vivas.values()) {
    const w = L.trab(M, r.tipo, r.i);
    if (!w) continue;
    const k = cantidad(M, r, w), c = L.costoNiv(M, r.tipo, r.i, w.n, k);
    const nt = r.tipo === "m" ? L.trabajadores(w.n) : 1, pt = r.tipo === "m" ? L.proxTrab(w.n) : 0;
    r.niv.textContent = "Nv " + w.n + " · ×" + fx(L.mult(w.n)) + (nt > 1 ? " · 👷" + nt : "") + " (→" + L.proxHito(w.n) + (pt && pt !== L.proxHito(w.n) ? " 👷" + pt : "") + ")" + (w.ger ? " · ⚡" + L.vel(w) : "");
    for (let j = 0; j < r.pjs.length && r.tipo === "m"; j++) r.pjs[j].hidden = j >= nt;
    r.s.textContent = w.n >= L.nivMax(r.tipo) ? "Nivel máx." : "▲ +" + k + " · $" + fmt(c);
    r.s.classList.toggle("no", B.mayor(c, E.din));
    const gc = L.costoGer(M, r.tipo, r.i, w), bloq = w.ger === 0 && !L.asesoresActivos(M);
    r.g.textContent = w.ger >= 3 ? "👔 Ejecutivo ✔" : bloq ? "🔒 Asesor · Nv " + L.AJ.NIV_ASESOR : "👔 " + L.RANGOS[w.ger + 1] + " · $" + fmt(gc);
    r.g.classList.toggle("no", bloq || B.mayor(gc, E.din));
    let dep = null;                               // lo que hay guardado en el depósito de esta fila
    if (r.tipo === "m") dep = w.ger === 0 ? w.dep : U.m > 0 ? B.mulN(M.pool, B.aNum(B.div(L.tasaPozo(w, r.i), U))) : null;   // pozos con gerente: su parte del depósito conjunto
    else if (r.tipo === "w") dep = M.alm.dep;
    r.dep.hidden = !dep || dep.m === 0 || B.menor(dep, B.num(1e-9));
    if (dep) r.dep.textContent = "📦 " + fmt(dep);
  }
}
function mover() {                                // posiciones (cada cuadro)
  const M = mina(), N = M.pozos.length, a = M.asc;
  for (const r of vivas.values()) {
    const w = L.trab(M, r.tipo, r.i);
    if (!w) continue;
    const [f, p] = faseVis(M, r.tipo, r.i, w, r.q * 0.37);
    if (r.tipo === "m") r.pjs.forEach((e, k) => { e.style.left = (f === 2 ? x(1 - p) : f === 3 ? x(p) : x(1)) - k * 4.5 + "%"; e.classList.toggle("dig", f === 1); });
    else if (r.tipo === "w") r.pjs[0].style.left = (f === 2 ? x(p) : f === 3 ? x(1 - p) : x(0)) + "%";
    r.toca.hidden = !(w.f === 0 && !L.auto(w) && L.hayTrabajo(M, r.tipo));
  }
  const [fa, pa] = faseVis(M, "a", 0, a, 0), q = fa === 1 ? pa : fa === 2 ? 1 : fa === 3 ? 1 - pa : 0;
  $("asc").style.top = H * q * (N + 1) + 30 + "px";
  $("ascl").style.height = H * (N + 1) + "px";
}

// ----- Bucle -----
let antes = performance.now(), acum = 0, textos = 0, ejec = 0;
function bucle(ahora) {
  let dt = (ahora - antes) / 1000; antes = ahora;
  reloj = ahora / 1000;
  if (dt > 2) { const g = L.fuera(E, dt); if (g.m > 0) aviso("Mientras no estabas ganaste $" + fmt(g)); dt = 0; }
  acum += Math.min(dt, 0.25);
  while (acum >= 1 / 30) { for (const M of E.minas) L.paso(E, M, 1 / 30); acum -= 1 / 30; }
  if ((ejec += dt) > 0.5) { ejec = 0; if (L.ejecutivos(E)) pintar(); }
  if ((textos += dt) > 0.15) { textos = 0; pintar(); }
  mover();
  requestAnimationFrame(bucle);
}
escena.addEventListener("scroll", () => { sincronizar(); pintar(); }, { passive: true });
addEventListener("resize", () => { sincronizar(); pintar(); });
cargar(); armarMinas(); armar();

// ----- Nube: la partida completa se une con la de la cuenta (gana la copia cuyo progreso cambió más tarde) -----
try { const c = JSON.parse(localStorage.getItem(NUBE)); tNube = (c && Number(c.t)) || 0; } catch (e) {}
lastHuella = L.huella(E);
guardar();   // crea la copia la primera vez (solo si ya hay algo comprado) y guarda los puntos pendientes de la versión anterior
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: NUBE,
    fusionar: L.unirMinas,
    alCambiar: (v) => {
      const S = L.deInstantanea(v);
      if (!S) return;
      E = S; tNube = Number(v.t) || 0; lastHuella = L.huella(E); sucioNube = false;
      const seg = (Date.now() - (Number(v.g) || Date.now())) / 1000;
      if (seg > 30) { const x = L.fuera(E, seg); if (x.m > 0) aviso("Mientras no estabas ganaste $" + fmt(x)); }
      sel = Math.min(sel, E.minas.length - 1);
      armar(); armarMinas(); pintar(); guardar();
    },
  });
}).catch(() => {});
setInterval(guardar, 5000);
addEventListener("pagehide", () => { guardar(); vaciar(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { guardar(); vaciar(); } });   // progreso.js también sincroniza la copia al ocultarse la página
requestAnimationFrame(bucle);
