// Ruta: minas/juego.js
// «Minero Tycoon»: compra pozos, sube de nivel a mineros, ascensor y almacén, contrata gerentes y haz prestigio. Las reglas están en logica.js.
import * as L from "./logica.js";
const ID = "minas", GUARDA = "minas_partida2";   // clave nueva: la partida vieja tenía otros valores y empezaba con un pozo
const H = 112;                                 // alto de cada fila en px (igual que .fila en index.html)
const PUNTOS_LOTE = 10;                        // al perfil: pozo nuevo +10, gerente +5, prestigio +50, por lotes
const MINERAL = ["⚫", "🪙", "💎", "🟣", "🔶", "💠"];
const $ = (id) => document.getElementById(id);
const escena = $("escena");

// ----- Números grandes: 1.5K, 2.3M, … y luego aa, ab, … -----
function fmt(n) {
  if (!isFinite(n)) return "∞";
  if (n < 1000) return n < 10 ? n.toFixed(1).replace(/\.0$/, "") : String(Math.floor(n));
  const i = Math.floor(Math.log10(n) / 3), s = i < 5 ? ["", "K", "M", "B", "T"][i] : String.fromCharCode(97 + Math.floor((i - 5) / 26) % 26) + String.fromCharCode(97 + (i - 5) % 26);
  return (n / Math.pow(10, i * 3)).toFixed(2).replace(/\.?0+$/, "") + s;
}
const est = (n) => (n >= 1000 ? fmt(n) : n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));   // como el panel del juego original: 14.8, 124, 1.06K
function aviso(t) { const a = $("aviso"); a.textContent = t; a.style.opacity = 1; clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.style.opacity = 0), 3500); }

// ----- Partida -----
let E = L.nuevoEstado(), pend = 0, modo = 1;   // modo: 1, 10, 100 o 0 (máximo)
const numeros = (o) => o && Number.isFinite(o.n) && Number.isFinite(o.f) && Number.isFinite(o.t) && o.ger >= 0 && o.ger <= 3;
function cargar() {
  try {
    const g = JSON.parse(localStorage.getItem(GUARDA)), S = g && g.E;
    if (!S || !Array.isArray(S.pozos) || !numeros(S.asc) || !numeros(S.alm) || !S.pozos.every(numeros) || !Number.isFinite(S.din)) return;
    E = S; pend = g.pend || 0;
    const seg = (Date.now() - g.t) / 1000;
    if (seg > 30) { const x = L.fuera(E, seg); if (x > 0) aviso("Mientras no estabas ganaste $" + fmt(x)); }
  } catch (e) {}
}
function guardar() { try { localStorage.setItem(GUARDA, JSON.stringify({ E, pend, t: Date.now() })); } catch (e) {} }
async function enviar(min) {
  if (pend < min) return;
  const p = Math.floor(pend); if (p < 1) return; pend -= p;
  try { const { sumarPuntos } = await import("../compartido/jugador.js"); await sumarPuntos(ID, p); } catch (e) { pend += p; }
}

// ----- Filas -----
let filas = [];
function crearFila(tipo, i) {
  const el = document.createElement("div"), sup = tipo === "w";
  el.className = "fila" + (sup ? " sup" : "");
  el.innerHTML = '<div class="esc"><span class="dep"></span><span class="roca"></span><span class="toca" hidden>👆 toca</span></div><div class="inf"><b></b><small></small><button class="s"></button><button class="g"></button></div>';
  const q = (c) => el.querySelector(c), r = { tipo, i, el, pjs: [], dep: q(".dep"), roca: q(".roca"), toca: q(".toca"), nom: q("b"), niv: q("small"), s: q(".s"), g: q(".g") };
  r.roca.textContent = tipo === "m" ? MINERAL[i % MINERAL.length] : tipo === "w" ? "🏦" : "🏗️";
  if (tipo === "w") r.roca.className = "banco";
  for (let k = 0; k < (tipo === "m" ? 6 : tipo === "w" ? 1 : 0); k++) {   // un pozo puede tener hasta 6 mineros
    const e = document.createElement("span"); e.className = "pj"; e.textContent = tipo === "m" ? "👷" : "🚚"; e.hidden = k > 0; q(".esc").appendChild(e); r.pjs.push(e);
  }
  r.nom.textContent = tipo === "m" ? "Pozo " + (i + 1) + (i === 0 ? " · Carbón" : "") : tipo === "w" ? "Almacén" : "Ascensor";
  q(".esc").onclick = () => { if (L.tocar(E, tipo, i)) pintar(); };
  if (tipo === "m") { r.nom.style.cursor = "pointer"; r.nom.onclick = () => { const s = L.estadisticas(E, i); aviso("Pozo " + (i + 1) + " Nv " + E.pozos[i].n + " · Extracción total $" + est(s.total) + "/s · Mineros " + s.mineros + " · Caminata " + s.caminata + " · Extracción " + est(s.extraccion) + "/s · Capacidad " + est(s.capacidad)); }; }
  if (tipo === "a") { r.nom.style.cursor = "pointer"; r.nom.onclick = () => { const s = L.estadisticasAsc(E); aviso("Ascensor Nv " + E.asc.n + " · Transporte total $" + est(s.total) + "/s · Carga " + est(s.carga) + " · Velocidad de movimiento " + Number(s.movimiento.toFixed(2)) + " · Velocidad de carga " + est(s.velCarga) + "/s"); }; }
  if (tipo === "w") { r.nom.style.cursor = "pointer"; r.nom.onclick = () => { const s = L.estadisticasAlm(E); aviso("Almacén Nv " + E.alm.n + " · Transporte total $" + est(s.total) + "/s · Transportadores " + s.transportadores + " · Carga por transportador " + est(s.carga) + " · Velocidad de carga " + est(s.velCarga) + "/s · Caminata " + s.caminata); }; }
  r.s.onclick = () => comprarNiv(r);
  r.g.onclick = () => comprarGer(r);
  escena.insertBefore(el, nuevo);
  return r;
}
const nuevo = document.createElement("button"); nuevo.id = "nuevo"; escena.appendChild(nuevo);
nuevo.onclick = () => { if (L.comprarPozo(E)) { pend += 10; enviar(PUNTOS_LOTE); armar(); guardar(); } else aviso("Te falta dinero"); };
function armar() {
  filas.forEach((r) => r.el.remove());
  filas = [crearFila("w", 0), crearFila("a", 0), ...E.pozos.map((_, i) => crearFila("m", i))];
  pintar();
}

function cantidad(r, w) {
  if (modo) return Math.max(1, Math.min(modo, L.nivMax(r.tipo) - w.n));
  return Math.max(1, L.maxNiv(r.tipo, r.i, w.n, E.din));
}
function comprarNiv(r) {
  const w = L.trab(E, r.tipo, r.i), h = L.hitos(w.n);
  if (!L.subir(E, r.tipo, r.i, cantidad(r, w))) { aviso("Te falta dinero"); return; }
  if (L.hitos(w.n) > h) aviso("¡Hito! Nivel " + w.n + ": ×2 de producción");
  pintar();
}
function comprarGer(r) {
  const w = L.trab(E, r.tipo, r.i);
  if (w.ger >= 3) return;
  if (w.ger === 0 && !L.asesoresActivos(E)) { aviso("Los asesores se desbloquean cuando el pozo 1 llega al nivel " + L.AJ.NIV_ASESOR); return; }
  if (!L.comprarGer(E, r.tipo, r.i)) { aviso("Te falta dinero"); return; }
  if (w.ger === 1) { pend += 5; enviar(PUNTOS_LOTE); aviso("Asesor contratado: ahora trabaja solo"); } else if (w.ger === 3) aviso("¡Ejecutivo! Además sube solo el nivel de este trabajador (si cuesta menos del 10 % de tu dinero)"); else aviso("Gerente " + L.RANGOS[w.ger] + ": ×" + L.vel(w));
  pintar();
}

// ----- Barra inferior -----
const barra = $("barra"), bModo = [];
[[1, "x1"], [10, "x10"], [100, "x100"], [0, "Máx"]].forEach(([m, t]) => {
  const b = document.createElement("button"); b.textContent = t; b.onclick = () => { modo = m; bModo.forEach(([mm, bb]) => bb.classList.toggle("sel", mm === modo)); pintar(); };
  barra.appendChild(b); bModo.push([m, b]);
});
bModo[0][1].classList.add("sel");
const bPres = document.createElement("button"); barra.appendChild(bPres);
bPres.onclick = () => {
  const g = L.estrellasGanables(E);
  if (g < 1) { aviso("Necesitas ganar $" + fmt(L.AJ.PRESTIGIO) + " en esta mina para tu primera ⭐"); return; }
  if (!confirm("¿Hacer prestigio? Ganas " + g + " ⭐ (+" + Math.round(g * L.AJ.BONO_ESTRELLA * 100) + " % de ganancias para siempre), pero la mina se reinicia (conservas tus estrellas).")) return;
  E = L.prestigio(E); pend += 50; enviar(1); armar(); guardar();
};

// ----- Dibujo -----
const x = (p) => 20 + 65 * p;                   // posición horizontal en % (20 = depósito, 85 = roca/banco)
function pintar() {
  const N = E.pozos.length, a = E.asc;
  $("din").textContent = "$ " + fmt(E.din);
  $("est").textContent = "⭐ " + E.estrellas;
  const ips = L.ingreso(E); $("ips").textContent = ips ? "$" + fmt(ips) + "/s" : "Sin asesores: toca";
  const g = L.estrellasGanables(E);
  bPres.textContent = g >= 1 ? "⭐ Prestigio +" + g : "⭐ Prestigio";
  bPres.style.opacity = g >= 1 ? 1 : 0.55;
  nuevo.textContent = N >= L.AJ.MAX_POZOS ? "Mina completa" : (N === 0 ? "🔒 Desbloquear pozo 1 (carbón) · $" : "➕ Nuevo pozo (" + (N + 1) + ") · $") + fmt(L.costoPozo(N));
  nuevo.classList.toggle("no", N < L.AJ.MAX_POZOS && L.costoPozo(N) > E.din);
  for (const r of filas) {
    const w = L.trab(E, r.tipo, r.i), k = cantidad(r, w), c = L.costoNiv(r.tipo, r.i, w.n, k);
    const nt = r.tipo === "m" ? L.trabajadores(w.n) : 1, pt = r.tipo === "m" ? L.proxTrab(w.n) : 0;
    r.niv.textContent = "Nv " + w.n + " · ×" + L.mult(w.n) + (nt > 1 ? " · 👷" + nt : "") + " (→" + L.proxHito(w.n) + (pt && pt !== L.proxHito(w.n) ? " 👷" + pt : "") + ")" + (w.ger ? " · ⚡" + L.vel(w) : "");
    for (let k = 0; k < r.pjs.length && r.tipo === "m"; k++) r.pjs[k].hidden = k >= nt;
    r.s.textContent = w.n >= L.nivMax(r.tipo) ? "Nivel máx." : "▲ +" + k + " · $" + fmt(c);
    r.s.classList.toggle("no", c > E.din);
    const gc = L.costoGer(r.tipo, r.i, w);
    const bloq = w.ger === 0 && !L.asesoresActivos(E);
    r.g.textContent = w.ger >= 3 ? "👔 Ejecutivo ✔" : bloq ? "🔒 Asesor · Nv " + L.AJ.NIV_ASESOR : "👔 " + L.RANGOS[w.ger + 1] + " · $" + fmt(gc);
    r.g.classList.toggle("no", bloq || gc > E.din);
    const dep = r.tipo === "m" ? w.dep : r.tipo === "w" ? w.dep : null;
    r.dep.hidden = !dep || dep.u < 1e-9;
    if (dep) r.dep.textContent = "📦 " + fmt(dep.u);
  }
}
function mover() {                                // posiciones (cada cuadro)
  const N = E.pozos.length, a = E.asc;
  for (const r of filas) {
    const w = L.trab(E, r.tipo, r.i), p = w.f ? Math.min(1, w.t / L.dur(E, r.tipo, r.i)) : 0;
    if (r.tipo === "m") r.pjs.forEach((e, k) => { e.style.left = (w.f === 2 ? x(1 - p) : w.f === 3 ? x(p) : x(1)) - k * 4.5 + "%"; e.classList.toggle("dig", w.f === 1); });
    else if (r.tipo === "w") r.pjs[0].style.left = (w.f === 2 ? x(p) : w.f === 3 ? x(1 - p) : x(0)) + "%";
    r.toca.hidden = !(w.f === 0 && !L.auto(w) && L.hayTrabajo(E, r.tipo));
  }
  const pa = a.f ? Math.min(1, a.t / L.dur(E, "a", 0)) : 0, q = a.f === 1 ? pa : a.f === 2 ? 1 : a.f === 3 ? 1 - pa : 0;
  $("asc").style.top = H * q * (N + 1) + 30 + "px";
  $("ascl").style.height = H * (N + 1) + "px";
}

// ----- Bucle -----
let antes = performance.now(), acum = 0, textos = 0, ejec = 0;
function bucle(ahora) {
  let dt = (ahora - antes) / 1000; antes = ahora;
  if (dt > 2) { const g = L.fuera(E, dt); if (g > 0) aviso("Mientras no estabas ganaste $" + fmt(g)); dt = 0; }
  acum += Math.min(dt, 0.25);
  while (acum >= 1 / 30) { L.paso(E, 1 / 30); acum -= 1 / 30; }
  if ((ejec += dt) > 0.5) { ejec = 0; if (L.ejecutivos(E)) pintar(); }
  if ((textos += dt) > 0.15) { textos = 0; pintar(); }
  mover();
  requestAnimationFrame(bucle);
}
cargar(); armar();
setInterval(guardar, 5000);
addEventListener("pagehide", () => { guardar(); enviar(1); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { guardar(); enviar(1); } });
requestAnimationFrame(bucle);
