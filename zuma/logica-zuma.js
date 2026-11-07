// Ruta: zuma/logica-zuma.js
// Reglas del Zuma (sin pantalla). La cadena es una lista de bolas {c, s, d, ox, oy, alc} ordenada de la COLA (s menor)
// a la CABEZA (s mayor, la más cercana al hoyo). «s» = distancia recorrida por el trayecto en px.
// d, ox, oy son solo animación (desfase visual que se va a 0).

export const R = 16;      // radio de una bola
export const D = 2 * R;   // distancia entre centros de bolas pegadas
const PASO = 2;           // separación (px) de los puntos del trayecto ya muestreado
const V_CIERRE = 260;     // velocidad (px/s) del tramo de atrás cuando corre a cerrar un hueco
const T_RUSH = 2.2;       // segundos de entrada rápida al empezar

export function azarSemilla(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----- Trayecto: espiral elíptica (los niveles futuros pueden traer otras formas con el mismo resultado) -----
// cfg: { cx, cy, rx:[ini,fin], ry:[ini,fin], vueltas }. Empieza fuera de la pantalla (abajo) y termina en el hoyo.
export function crearTrayecto(cfg) {
  const [rx0, rx1] = cfg.rx, [ry0, ry1] = cfg.ry;
  const crudo = [{ x: cfg.cx - rx0, y: cfg.cy + 300 }];
  const N = 2400;
  for (let k = 0; k <= N; k++) {
    const t = k / N, a = Math.PI + t * cfg.vueltas * 2 * Math.PI;
    crudo.push({ x: cfg.cx + (rx0 + (rx1 - rx0) * t) * Math.cos(a), y: cfg.cy + (ry0 + (ry1 - ry0) * t) * Math.sin(a) });
  }
  const cum = [0];
  for (let i = 1; i < crudo.length; i++) cum.push(cum[i - 1] + Math.hypot(crudo[i].x - crudo[i - 1].x, crudo[i].y - crudo[i - 1].y));
  const largo = cum[cum.length - 1];
  const n = Math.floor(largo / PASO);
  const xs = new Float32Array(n + 2), ys = new Float32Array(n + 2);
  let j = 1;
  for (let k = 0; k <= n + 1; k++) {
    const s = k * PASO;
    while (j < cum.length - 1 && cum[j] < s) j++;
    const u = (s - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    xs[k] = crudo[j - 1].x + (crudo[j].x - crudo[j - 1].x) * u;
    ys[k] = crudo[j - 1].y + (crudo[j].y - crudo[j - 1].y) * u;
  }
  const pos = (s) => {
    if (s <= 0) return { x: xs[0] + ((xs[1] - xs[0]) / PASO) * s, y: ys[0] + ((ys[1] - ys[0]) / PASO) * s };
    const f = Math.min(s, largo) / PASO, k = Math.floor(f), u = f - k;
    return { x: xs[k] + (xs[k + 1] - xs[k]) * u, y: ys[k] + (ys[k + 1] - ys[k]) * u };
  };
  const ang = (s) => { const a = pos(s - 1), b = pos(s + 1); return Math.atan2(b.y - a.y, b.x - a.x); };
  return { largo, pos, ang };
}

// ----- Colores de la cadena: azar con semilla, sin tres iguales seguidos (nunca nace una combinación hecha) -----
export function secuencia(n, colores, semilla) {
  const r = azarSemilla(semilla), out = [];
  for (let i = 0; i < n; i++) {
    let c = i > 0 && r() < 0.25 ? out[i - 1] : (r() * colores) | 0;
    if (i >= 2 && out[i - 1] === c && out[i - 2] === c) c = (c + 1 + ((r() * (colores - 1)) | 0)) % colores;
    out.push(c);
  }
  return out;
}

export function crearPartida(nivel) {
  return {
    nivel, tr: crearTrayecto(nivel.trayecto), cad: [], cola: secuencia(nivel.bolas, nivel.colores, nivel.semilla),
    azar: azarSemilla((nivel.semilla ^ 0x9e37) | 0), t: 0, puntos: 0, combo: 0, congelado: 0, quitadas: 0, total: nivel.bolas, estado: "jugando",
  };
}

const nueva = (c, s) => ({ c, s, d: 0, ox: 0, oy: 0, alc: false });
const junto = (a, b) => b.s - a.s <= D + 0.6;

// Tramo de color c pegado alrededor del índice k: [l, r]
function tramo(cad, k, c) {
  let l = k, r = k;
  while (l > 0 && cad[l - 1].c === c && junto(cad[l - 1], cad[l])) l--;
  while (r < cad.length - 1 && cad[r + 1].c === c && junto(cad[r], cad[r + 1])) r++;
  return [l, r];
}

// Cuántas bolas juntaría un disparo de color c que pegue en (i, delante) (para el bot de pruebas y ayudas)
export function largoSi(cad, i, delante, c) {
  const k = delante ? i + 1 : i;
  let l = 0, r = 0;
  for (let j = k - 1; j >= 0 && cad[j].c === c && (j === k - 1 || junto(cad[j], cad[j + 1])); j--) l++;
  for (let j = k; j < cad.length && cad[j].c === c && (j === k || junto(cad[j - 1], cad[j])); j++) r++;
  return l + r + 1;
}

function quitar(p, k, porHueco, ev) {
  const cad = p.cad, [l, r] = tramo(cad, k, cad[k].c), n = r - l + 1;
  if (n < 3) return false;
  const bolas = cad.slice(l, r + 1).map((b) => { const q = p.tr.pos(b.s + b.d); return { x: q.x + b.ox, y: q.y + b.oy, c: b.c }; });
  cad.splice(l, n);
  if (porHueco) p.combo++;
  const pts = n * 10 + (n - 3) * 10 + (porHueco ? p.combo * 100 : 0);
  p.puntos += pts;
  p.quitadas += n;
  if (l > 0 && l < cad.length) cad[l - 1].alc = true; // el tramo de atrás correrá a cerrar el hueco
  ev.push({ t: "quita", n, pts, combo: porHueco ? p.combo : 0, bolas });
  return true;
}

function revisarFin(p, ev) {
  if (p.estado !== "jugando") return;
  if (!p.cola.length && !p.cad.length) { p.estado = "gano"; ev.push({ t: "gano" }); }
  else if (p.cad.length && p.cad[p.cad.length - 1].s >= p.tr.largo - 6) { p.estado = "perdio"; ev.push({ t: "perdio" }); }
}

// Avanza dt segundos. Devuelve eventos: quita, gano, perdio
export function avanzar(p, dt) {
  const ev = [];
  if (p.estado !== "jugando") return ev;
  const cad = p.cad;
  if (p.congelado > 0) { // boost «detener el tiempo»: nada se mueve
    p.congelado = Math.max(0, p.congelado - dt);
    const k0 = Math.exp(-14 * dt);
    for (const b of cad) { b.d *= k0; b.ox *= k0; b.oy *= k0; }
    return ev;
  }
  p.t += dt;

  // Entran bolas nuevas por la cola
  if (p.cola.length) {
    const u = cad[0];
    if (!u) cad.unshift(nueva(p.cola.shift(), 0));
    else if (u.s >= D) cad.unshift(nueva(p.cola.shift(), u.s <= 2 * D ? u.s - D : 0));
  }

  // Velocidad: el tramo de la cabeza avanza; los tramos de atrás corren a alcanzarlo
  const vCab = p.t < T_RUSH ? p.nivel.rush : p.nivel.velocidad;
  const v = new Array(cad.length);
  const k = Math.exp(-14 * dt);
  for (let i = cad.length - 1; i >= 0; i--) {
    v[i] = i === cad.length - 1 ? vCab : junto(cad[i], cad[i + 1]) ? v[i + 1] : V_CIERRE;
    let s = cad[i].s + v[i] * dt;
    if (i < cad.length - 1) s = Math.max(cad[i].s, Math.min(s, cad[i + 1].s - D));
    cad[i].s = s;
    cad[i].d *= k; cad[i].ox *= k; cad[i].oy *= k;
  }

  // Un tramo que acaba de alcanzar al de adelante: si el color coincide, ¡combo en cadena!
  for (let i = 0; i < cad.length - 1; i++) {
    const b = cad[i];
    if (b.alc && junto(b, cad[i + 1])) {
      b.alc = false;
      if (b.c === cad[i + 1].c) { if (quitar(p, i, true, ev)) break; } else p.combo = 0;
    }
  }
  revisarFin(p, ev);
  return ev;
}

// Un disparo en (x, y): ¿toca alguna bola? -> { i, delante } (delante: queda del lado de la cabeza)
export function buscarImpacto(p, x, y, radio = 30) {
  let mejor = -1, md = radio * radio;
  for (let i = 0; i < p.cad.length; i++) {
    const b = p.cad[i], q = p.tr.pos(b.s + b.d);
    const dd = (q.x - x) ** 2 + (q.y - y) ** 2;
    if (dd < md) { md = dd; mejor = i; }
  }
  if (mejor < 0) return null;
  const b = p.cad[mejor], q = p.tr.pos(b.s), a = p.tr.ang(b.s);
  return { i: mejor, delante: (x - q.x) * Math.cos(a) + (y - q.y) * Math.sin(a) > 0 };
}

// Mete la bola disparada en la cadena (empuja a las de adelante) y revisa si junta 3 o más
export function insertar(p, i, delante, color, desde) {
  const cad = p.cad, ev = [], ref = cad[i], k = delante ? i + 1 : i;
  const b = nueva(color, delante ? ref.s + D : ref.s);
  cad.splice(k, 0, b);
  if (desde) { const q = p.tr.pos(b.s); b.ox = desde.x - q.x; b.oy = desde.y - q.y; }
  for (let j = k + 1; j < cad.length; j++) {
    const min = cad[j - 1].s + D;
    if (cad[j].s >= min) break;
    cad[j].d -= min - cad[j].s;
    cad[j].s = min;
  }
  p.combo = 0;
  if (!quitar(p, k, false, ev)) ev.push({ t: "pone" });
  revisarFin(p, ev);
  return ev;
}

// Boost: detiene la cadena (y la entrada de bolas) unos segundos
export function congelar(p, seg = 6) { p.congelado = seg; }

// Boost: bola metálica. Destruye todas las bolas que toquen el círculo (x, y, radio); las de atrás correrán a cerrar el hueco
export function destruirEn(p, x, y, radio = 28) {
  const cad = p.cad, ev = [], bolas = [];
  for (let i = cad.length - 1; i >= 0; i--) {
    const b = cad[i], q = p.tr.pos(b.s + b.d), bx = q.x + b.ox, by = q.y + b.oy;
    if ((bx - x) ** 2 + (by - y) ** 2 >= radio * radio) continue;
    bolas.push({ x: bx, y: by, c: b.c });
    cad.splice(i, 1);
    if (i > 0 && i < cad.length) cad[i - 1].alc = true;
  }
  if (bolas.length) {
    p.puntos += bolas.length * 10;
    p.quitadas += bolas.length;
    ev.push({ t: "quita", n: bolas.length, pts: bolas.length * 10, combo: 0, bolas, metal: true });
    revisarFin(p, ev);
  }
  return ev;
}

// Color del siguiente disparo: siempre uno que está (o está por entrar) en la cadena, así nunca te quedas sin jugada
export function coloresDisponibles(p) {
  return new Set([...p.cad.map((b) => b.c), ...p.cola.slice(0, 6)]);
}
export function colorDisparo(p) {
  const hay = [...coloresDisponibles(p)];
  return hay.length ? hay[(p.azar() * hay.length) | 0] : 0;
}
