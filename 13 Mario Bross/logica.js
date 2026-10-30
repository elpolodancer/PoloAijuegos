// Ruta: pradera/logica.js
// Reglas y física de «Pradera» (sin pantalla): se llama a paso() 60 veces por segundo.
// Unidades: 1 casilla = T = 16. Velocidades en unidades por paso.
export const T = 16, ALTO = 15;
export const PIE_PEQ = 15, PIE_GRANDE = 26;       // alturas del zorro chico y grande
export const TIEMPO = 300;                         // segundos del nivel
export const SALIDA_CASTILLO = 147;                // columna donde termina el nivel (puerta del castillo)

// ===== AJUSTES DE FÍSICA =====
const CAMINAR = 1.7, CORRER = 2.6;                 // velocidad máxima
const ACEL_SUELO = 0.1, ACEL_AIRE = 0.07, FRENO = 0.12;
const SALTO = 5.8, SALTO_CORRIENDO = 0.12;         // impulso inicial y bono por velocidad
const G_SUBIDA = 0.28, G_SUBIDA_CORTA = 0.7, G_BAJADA = 0.45, VY_MAX = 7.5;
const INVULNERABLE = 120;                          // pasos de invulnerabilidad al encogerse
// =============================

const SOLIDOS = new Set(["#", "B", "?", "P", "T", "S", "U"]);

function crearEnemigo(tipo, tx, ty) {
  const h = tipo === "t" ? 20 : 14;
  return { tipo, x: tx * T + 1, y: (ty + 1) * T - h, w: 14, h, vx: 0, vy: 0, dir: -1, estado: "vivo", activo: false, t: 0, gracia: 0 };
}

// previo = { puntos, monedas, vidas } para seguir la partida tras perder una vida
export function nuevoJuego(nivel, previo) {
  const W = nivel[0].length;
  const g = nivel.map((f) => [...f]);
  const enemigos = [];
  let mastil = -1;
  for (let ty = 0; ty < g.length; ty++) for (let tx = 0; tx < W; tx++) {
    const c = g[ty][tx];
    if (c === "e" || c === "t") { enemigos.push(crearEnemigo(c, tx, ty)); g[ty][tx] = "."; }
    if (c === "G" && mastil < 0) mastil = tx;
  }
  return {
    W, g, enemigos, mastil, items: [], efectos: [], escombros: [], reb: {}, ev: [],
    camX: 0, tick: 0, segs: TIEMPO, bonus: 0, resultado: null,
    puntos: previo ? previo.puntos : 0, monedas: previo ? previo.monedas : 0, vidas: previo ? previo.vidas : 3,
    j: { x: 2 * T + 2, y: 13 * T - PIE_PEQ, w: 12, h: PIE_PEQ, vx: 0, vy: 0, gr: true, dir: 1, grande: false, inv: 0, estado: "vivo", t: 0, coy: 0, buf: 0, pyAnt: 0, anim: 0 },
  };
}

// ---------- Casillas y colisiones ----------
function casilla(e, tx, ty) {
  if (tx < 0 || tx >= e.W) return "#";
  if (ty < 0 || ty >= ALTO) return ".";
  return e.g[ty][tx];
}
function chocaSolido(e, x, y, w, h) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (SOLIDOS.has(casilla(e, tx, ty))) return true;
  return false;
}
function moverX(e, o) {
  o.x += o.vx;
  if (!chocaSolido(e, o.x, o.y, o.w, o.h)) return false;
  if (o.vx > 0) o.x = Math.floor((o.x + o.w - 0.001) / T) * T - o.w;
  else o.x = (Math.floor(o.x / T) + 1) * T;
  return true;
}
function moverY(e, o) {
  o.y += o.vy;
  if (!chocaSolido(e, o.x, o.y, o.w, o.h)) return null;
  if (o.vy > 0) { o.y = Math.floor((o.y + o.h - 0.001) / T) * T - o.h; o.vy = 0; return "suelo"; }
  o.y = (Math.floor(o.y / T) + 1) * T; o.vy = 0;
  return "techo";
}
const solapa = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- Acciones ----------
function morir(e) {
  const j = e.j;
  if (j.estado !== "vivo") return;
  j.estado = "muriendo"; j.t = 0; j.vy = -6; j.vx = 0;
  e.ev.push("muerte");
}
function herir(e) {
  const j = e.j;
  if (j.inv > 0) return;
  if (j.grande) {
    j.grande = false; j.y += PIE_GRANDE - PIE_PEQ; j.h = PIE_PEQ; j.inv = INVULNERABLE;
    e.ev.push("encoge");
  } else morir(e);
}
function crecer(e) {
  const j = e.j;
  if (!j.grande) { j.grande = true; j.y -= PIE_GRANDE - PIE_PEQ; j.h = PIE_GRANDE; }
}
function sumaMoneda(e) {
  e.monedas++; e.puntos += 200; e.ev.push("moneda");
  if (e.monedas % 100 === 0) { e.vidas++; e.ev.push("vida"); }
}

function golpear(e, tx, ty) {
  const c = e.g[ty][tx], clave = ty * e.W + tx;
  if (c === "?") {
    e.g[ty][tx] = "U"; e.reb[clave] = 10;
    e.efectos.push({ x: tx * T + 4, y: ty * T - 4, vy: -5, t: 0 });
    sumaMoneda(e);
  } else if (c === "P") {
    e.g[ty][tx] = "U"; e.reb[clave] = 10;
    e.items.push({ x: tx * T + 1, y: ty * T, w: 14, h: 14, vx: 0, vy: 0, dir: 1, sale: 16 });
    e.ev.push("aparece");
  } else if (c === "B") {
    if (e.j.grande) {
      e.g[ty][tx] = "."; e.puntos += 50; e.ev.push("romper");
      for (const [dx, dy] of [[-1.5, -4], [1.5, -4], [-1, -2.5], [1, -2.5]]) e.escombros.push({ x: tx * T + 4, y: ty * T + 4, vx: dx, vy: dy });
    } else { e.reb[clave] = 10; e.ev.push("golpe"); }
  } else return;
  // Los bichos que estaban encima del bloque golpeado caen
  for (const en of e.enemigos) {
    if ((en.estado === "vivo" || en.estado === "caparazon") && Math.abs(en.x + en.w / 2 - (tx * T + 8)) < 14 && Math.abs(en.y + en.h - ty * T) < 3) {
      en.estado = "cayendo"; en.vy = -3; en.vx = 0.5; e.puntos += 100;
    }
  }
}

// ---------- Jugador ----------
function pasoJugador(e, inp) {
  const j = e.j;
  j.pyAnt = j.y + j.h;
  if (j.inv > 0) j.inv--;
  const max = inp.correr ? CORRER : CAMINAR, ac = j.gr ? ACEL_SUELO : ACEL_AIRE;
  if (inp.der && !inp.izq) { j.dir = 1; if (j.vx < max) j.vx = Math.min(max, j.vx + ac * (j.vx < 0 ? 2.5 : 1)); }
  else if (inp.izq && !inp.der) { j.dir = -1; if (j.vx > -max) j.vx = Math.max(-max, j.vx - ac * (j.vx > 0 ? 2.5 : 1)); }
  else {
    const f = j.gr ? FRENO : 0.015;
    j.vx = Math.abs(j.vx) <= f ? 0 : j.vx - Math.sign(j.vx) * f;
  }
  if (Math.abs(j.vx) > max) j.vx -= Math.sign(j.vx) * 0.05;

  // Salto con margen: se puede pulsar un instante antes de pisar y un instante después de salir del borde
  j.coy = j.gr ? 6 : j.coy - 1;
  j.buf = inp.saltoNuevo ? 6 : j.buf - 1;
  if (j.buf > 0 && j.coy > 0) {
    j.vy = -(SALTO + Math.abs(j.vx) * SALTO_CORRIENDO); j.gr = false; j.buf = 0; j.coy = 0;
    e.ev.push("salto");
  }
  const g = j.vy < 0 ? (inp.salto ? G_SUBIDA : G_SUBIDA_CORTA) : G_BAJADA;
  j.vy = Math.min(j.vy + g, VY_MAX);

  if (moverX(e, j)) j.vx = 0;
  const r = moverY(e, j);
  j.gr = r === "suelo";
  if (r === "techo") {
    const ty = Math.floor(j.y / T) - 1, cx = j.x + j.w / 2;
    let mejor = -1, dist = 1e9;
    for (let tx = Math.floor(j.x / T); tx <= Math.floor((j.x + j.w - 0.001) / T); tx++) {
      if (!SOLIDOS.has(casilla(e, tx, ty))) continue;
      const d = Math.abs(tx * T + 8 - cx);
      if (d < dist) { dist = d; mejor = tx; }
    }
    if (mejor >= 0 && ty >= 0) golpear(e, mejor, ty);
  }
  if (j.x < e.camX) { j.x = e.camX; if (j.vx < 0) j.vx = 0; }
  if (j.gr && Math.abs(j.vx) > 0.2) j.anim += Math.abs(j.vx); else if (!j.gr) j.anim = 0;
}

function tocarCasillas(e) {
  const j = e.j;
  const x0 = Math.floor(j.x / T), x1 = Math.floor((j.x + j.w - 0.001) / T), y0 = Math.floor(j.y / T), y1 = Math.floor((j.y + j.h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = casilla(e, tx, ty);
    if (c === "c") { e.g[ty][tx] = "."; sumaMoneda(e); }
    else if (c === "G" && j.estado === "vivo") {
      const alt = Math.min(1, Math.max(0, 1 - (j.y + j.h - 3 * T) / (9 * T)));
      const pts = Math.round((100 + alt * 4900) / 100) * 100;
      e.puntos += pts; e.bonusMastil = pts;
      j.estado = "mastil"; j.vx = 0; j.vy = 0; j.x = e.mastil * T - j.w + 3; j.dir = 1;
      e.ev.push("mastil");
      return;
    }
  }
}

// ---------- Enemigos ----------
function pasoEnemigo(e, en, vista) {
  if (!en.activo) { if (en.x < e.camX + vista + 40) en.activo = true; else return; }
  if (en.estado === "aplastado") { if (--en.t <= 0) en.borrar = true; return; }
  if (en.estado === "cayendo") { en.vy += 0.4; en.y += en.vy; en.x += en.vx; if (en.y > ALTO * T + 40) en.borrar = true; return; }
  if (en.gracia > 0) en.gracia--;
  const v = en.tipo === "t" ? (en.estado === "disparado" ? 3.2 : en.estado === "caparazon" ? 0 : 0.4) : 0.45;
  en.vx = v * en.dir;
  if (v && moverX(e, en)) { en.dir *= -1; if (en.estado === "disparado") e.ev.push("golpe"); }
  en.vy = Math.min(en.vy + 0.4, 6);
  moverY(e, en);
  if (en.y > ALTO * T + 30 || en.x + en.w < e.camX - 80) en.borrar = true;
}

function patear(e, en, dir) {
  en.estado = "disparado"; en.dir = dir; en.gracia = 14; e.puntos += 400; e.ev.push("patada");
}

function interaccionEnemigos(e) {
  const j = e.j;
  for (const s of e.enemigos) {
    if (s.tipo !== "t" || s.estado !== "disparado" || !s.activo) continue;
    for (const o of e.enemigos) {
      if (o === s || !o.activo || (o.estado !== "vivo" && o.estado !== "caparazon") || !solapa(s, o)) continue;
      o.estado = "cayendo"; o.vy = -3; o.vx = s.dir * 1.2; e.puntos += 100; e.ev.push("patada");
    }
  }
  for (const en of e.enemigos) {
    if (!en.activo || en.estado === "aplastado" || en.estado === "cayendo" || !solapa(j, en)) continue;
    const desde = j.vy > 0 && j.pyAnt <= en.y + 8;
    const dirDesde = j.x + j.w / 2 < en.x + en.w / 2 ? 1 : -1;
    if (en.estado === "vivo") {
      if (desde) {
        if (en.tipo === "t") { en.estado = "caparazon"; en.y += en.h - 14; en.h = 14; en.gracia = 10; }
        else { en.estado = "aplastado"; en.t = 30; en.y += en.h - 5; en.h = 5; }
        e.puntos += 100; j.vy = -4; e.ev.push("aplasta");
      } else herir(e);
    } else if (en.estado === "caparazon") {
      if (en.gracia > 0) continue;
      patear(e, en, dirDesde);
      if (desde) j.vy = -4;
    } else if (en.gracia <= 0) { // disparado
      if (desde) { en.estado = "caparazon"; en.gracia = 10; j.vy = -4; e.puntos += 100; e.ev.push("aplasta"); }
      else herir(e);
    }
    if (j.estado !== "vivo") return;
  }
}

// ---------- Frutas, efectos ----------
function pasoItems(e) {
  const j = e.j;
  for (const it of e.items) {
    if (it.sale > 0) { it.sale--; it.y -= 1; }
    else {
      it.vx = 0.7 * it.dir;
      if (moverX(e, it)) it.dir *= -1;
      it.vy = Math.min(it.vy + 0.4, 6);
      moverY(e, it);
      if (it.y > ALTO * T + 30) it.borrar = true;
    }
    if (j.estado === "vivo" && it.sale <= 0 && solapa(j, it)) {
      it.borrar = true; crecer(e); e.puntos += 1000; e.ev.push("poder");
    }
  }
  e.items = e.items.filter((i) => !i.borrar);
  for (const f of e.efectos) { f.y += f.vy; f.vy += 0.4; f.t++; }
  e.efectos = e.efectos.filter((f) => f.t < 28);
  for (const d of e.escombros) { d.x += d.vx; d.y += d.vy; d.vy += 0.4; }
  e.escombros = e.escombros.filter((d) => d.y < ALTO * T + 40);
  for (const k in e.reb) if (--e.reb[k] <= 0) delete e.reb[k];
}

// ---------- Paso principal ----------
// inp = { izq, der, salto (mantenido), saltoNuevo (recién pulsado), correr }; vista = ancho visible en unidades
export function paso(e, inp, vista) {
  e.ev = [];
  if (e.resultado) return;
  const j = e.j;
  e.tick++;
  if (j.estado === "vivo") {
    if (e.tick % 60 === 0 && --e.segs <= 0) { e.segs = 0; morir(e); }
    pasoJugador(e, inp);
    if (j.estado === "vivo") tocarCasillas(e);
    if (j.estado === "vivo" && j.y > ALTO * T + 8) morir(e);
    if (j.estado === "vivo") {
      for (const en of e.enemigos) pasoEnemigo(e, en, vista);
      interaccionEnemigos(e);
      e.enemigos = e.enemigos.filter((en) => !en.borrar);
    }
  } else if (j.estado === "muriendo") {
    j.t++; j.vy = Math.min(j.vy + 0.35, 8); j.y += j.vy;
    if (j.t > 100) e.resultado = "murio";
  } else if (j.estado === "mastil") {
    j.y += 2;
    if (j.y + j.h >= 12 * T) { j.y = 12 * T - j.h; j.estado = "camina"; j.x = (e.mastil + 1) * T + 1; j.vx = 0; j.vy = 0; }
  } else if (j.estado === "camina") {
    pasoJugador(e, { der: true });
    if (j.x >= SALIDA_CASTILLO * T) { j.estado = "gano"; j.t = 0; e.bonus = e.segs * 50; e.puntos += e.bonus; e.ev.push("gano"); }
  } else if (j.estado === "gano") {
    if (++j.t > 40) e.resultado = "gano";
  }
  pasoItems(e);
  const objetivo = j.x + j.w / 2 - vista * 0.42;
  e.camX = Math.max(e.camX, Math.min(objetivo, e.W * T - vista));
}
