// Ruta: ajedrez/logica.js
// Solo reglas del ajedrez (sin pantalla): movimientos legales, enroque, al paso, coronación,
// jaque mate, ahogado, tablas. Tablero de 64 casillas: índice 0 = a8, 63 = h1.
// Piezas: positivo = blancas, negativo = negras.
export const PEON = 1, CABALLO = 2, ALFIL = 3, TORRE = 4, DAMA = 5, REY = 6;
export const INICIO = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ---------- Tablas precalculadas ----------
const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const ORT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const CAB = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SALTOS = [], REYES = [], RAYOS = [], ATQ_PEON = [[], []];
for (let s = 0; s < 64; s++) {
  const f = s >> 3, c = s & 7;
  SALTOS[s] = CAB.map(([a, b]) => [f + a, c + b]).filter(([a, b]) => dentro(a, b)).map(([a, b]) => a * 8 + b);
  REYES[s] = [...ORT, ...DIAG].map(([a, b]) => [f + a, c + b]).filter(([a, b]) => dentro(a, b)).map(([a, b]) => a * 8 + b);
  // rayos 0-3 = rectos (torre), 4-7 = diagonales (alfil)
  RAYOS[s] = [...ORT, ...DIAG].map(([a, b]) => {
    const r = [];
    for (let ff = f + a, cc = c + b; dentro(ff, cc); ff += a, cc += b) r.push(ff * 8 + cc);
    return r;
  });
  // casillas desde donde un peón de ese color atacaría la casilla s
  ATQ_PEON[0][s] = [-1, 1].filter((d) => dentro(f + 1, c + d)).map((d) => (f + 1) * 8 + c + d); // peón blanco
  ATQ_PEON[1][s] = [-1, 1].filter((d) => dentro(f - 1, c + d)).map((d) => (f - 1) * 8 + c + d); // peón negro
}
// Derechos de enroque: 1 = blancas corto, 2 = blancas largo, 4 = negras corto, 8 = negras largo
const MASC = new Array(64).fill(0);
MASC[0] = 8; MASC[7] = 4; MASC[56] = 2; MASC[63] = 1; MASC[4] = 12; MASC[60] = 3;
const PROMS = [DAMA, TORRE, ALFIL, CABALLO];

// ---------- Estado ----------
export function desdeFEN(fen) {
  const [pos, t, al, en, rel] = fen.split(" ");
  const b = new Array(64).fill(0);
  let i = 0;
  for (const ch of pos) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) { i += +ch; continue; }
    const p = "pnbrqk".indexOf(ch.toLowerCase()) + 1;
    b[i++] = ch === ch.toLowerCase() ? -p : p;
  }
  const e = { b, turno: t === "w" ? 1 : -1, enr: 0, ap: -1, rel: +rel || 0, rey: [0, 0] };
  if (al.includes("K")) e.enr |= 1;
  if (al.includes("Q")) e.enr |= 2;
  if (al.includes("k")) e.enr |= 4;
  if (al.includes("q")) e.enr |= 8;
  if (en && en !== "-") e.ap = "abcdefgh".indexOf(en[0]) + (8 - +en[1]) * 8;
  b.forEach((p, s) => { if (p === REY) e.rey[0] = s; if (p === -REY) e.rey[1] = s; });
  return e;
}

export const clave = (e) => e.b.join(",") + "|" + e.turno + "|" + e.enr + "|" + e.ap;

// ---------- Ataques y jaque ----------
export function atacada(e, sq, por) {
  const b = e.b;
  for (const s of ATQ_PEON[por === 1 ? 0 : 1][sq]) if (b[s] === por * PEON) return true;
  for (const s of SALTOS[sq]) if (b[s] === por * CABALLO) return true;
  for (const s of REYES[sq]) if (b[s] === por * REY) return true;
  const rs = RAYOS[sq];
  for (let d = 0; d < 8; d++) {
    for (const s of rs[d]) {
      const x = b[s];
      if (x === 0) continue;
      if (x * por > 0) {
        const t = Math.abs(x);
        if (t === DAMA || (d < 4 ? t === TORRE : t === ALFIL)) return true;
      }
      break;
    }
  }
  return false;
}
export const enJaque = (e, color) => atacada(e, e.rey[color === 1 ? 0 : 1], -color);

// ---------- Generar movimientos ----------
// Un movimiento: { de, a, prom?, ep?, enr? }. «soloCap» devuelve solo capturas y coronaciones (para la IA).
export function generar(e, soloCap = false) {
  const b = e.b, c = e.turno, ms = [];
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (p * c <= 0) continue;
    const t = Math.abs(p);
    if (t === PEON) {
      const dir = c === 1 ? -8 : 8, f = s >> 3, col = s & 7, pre = c === 1 ? 1 : 6, ini = c === 1 ? 6 : 1;
      const a = s + dir;
      if (b[a] === 0 && (!soloCap || f === pre)) {
        if (f === pre) PROMS.forEach((pr) => ms.push({ de: s, a, prom: pr }));
        else {
          ms.push({ de: s, a });
          if (f === ini && b[a + dir] === 0) ms.push({ de: s, a: a + dir });
        }
      }
      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (nc < 0 || nc > 7) continue;
        const a2 = a + dc, x = b[a2];
        if (x * c < 0) {
          if (f === pre) PROMS.forEach((pr) => ms.push({ de: s, a: a2, prom: pr }));
          else ms.push({ de: s, a: a2 });
        } else if (x === 0 && a2 === e.ap) ms.push({ de: s, a: a2, ep: true });
      }
    } else if (t === CABALLO || t === REY) {
      for (const a of t === CABALLO ? SALTOS[s] : REYES[s]) {
        const x = b[a];
        if (x * c <= 0 && (!soloCap || x !== 0)) ms.push({ de: s, a });
      }
      if (t === REY && !soloCap && s === (c === 1 ? 60 : 4) && (e.enr & (c === 1 ? 3 : 12)) && !atacada(e, s, -c)) {
        const kb = c === 1 ? 1 : 4, qb = c === 1 ? 2 : 8;
        if ((e.enr & kb) && !b[s + 1] && !b[s + 2] && !atacada(e, s + 1, -c) && !atacada(e, s + 2, -c))
          ms.push({ de: s, a: s + 2, enr: true });
        if ((e.enr & qb) && !b[s - 1] && !b[s - 2] && !b[s - 3] && !atacada(e, s - 1, -c) && !atacada(e, s - 2, -c))
          ms.push({ de: s, a: s - 2, enr: true });
      }
    } else {
      const d0 = t === ALFIL ? 4 : 0, d1 = t === TORRE ? 4 : 8;
      for (let d = d0; d < d1; d++) {
        for (const a of RAYOS[s][d]) {
          const x = b[a];
          if (x === 0) { if (!soloCap) ms.push({ de: s, a }); continue; }
          if (x * c < 0) ms.push({ de: s, a });
          break;
        }
      }
    }
  }
  return ms;
}

// ---------- Hacer y deshacer ----------
export function hacer(e, m) {
  const b = e.b, p = b[m.de], c = p > 0 ? 1 : -1, t = Math.abs(p);
  const u = { m, cap: b[m.a], capSq: m.a, enr: e.enr, ap: e.ap, rel: e.rel };
  if (m.ep) { u.capSq = m.a + (c === 1 ? 8 : -8); u.cap = b[u.capSq]; b[u.capSq] = 0; }
  b[m.a] = m.prom ? c * m.prom : p;
  b[m.de] = 0;
  if (m.enr) {
    const rd = m.a > m.de ? m.de + 3 : m.de - 4, ra = m.a > m.de ? m.de + 1 : m.de - 1;
    b[ra] = b[rd]; b[rd] = 0;
  }
  if (t === REY) e.rey[c === 1 ? 0 : 1] = m.a;
  e.enr &= ~MASC[m.de] & ~MASC[m.a];
  e.ap = t === PEON && Math.abs(m.a - m.de) === 16 ? (m.a + m.de) >> 1 : -1;
  e.rel = t === PEON || u.cap ? 0 : e.rel + 1;
  e.turno = -c;
  return u;
}

export function deshacer(e, u) {
  const m = u.m, b = e.b, c = -e.turno;
  e.turno = c;
  const p = m.prom ? c * PEON : b[m.a];
  b[m.de] = p;
  b[m.a] = 0;
  if (m.ep) b[u.capSq] = u.cap; else b[m.a] = u.cap;
  if (m.enr) {
    const rd = m.a > m.de ? m.de + 3 : m.de - 4, ra = m.a > m.de ? m.de + 1 : m.de - 1;
    b[rd] = b[ra]; b[ra] = 0;
  }
  if (Math.abs(p) === REY) e.rey[c === 1 ? 0 : 1] = m.de;
  e.enr = u.enr; e.ap = u.ap; e.rel = u.rel;
}

export function legales(e) {
  const c = e.turno, r = [];
  for (const m of generar(e)) {
    const u = hacer(e, m);
    if (!enJaque(e, c)) r.push(m);
    deshacer(e, u);
  }
  return r;
}

// ---------- Fin de partida ----------
function insuficiente(e) {
  const otras = e.b.filter((p) => p && Math.abs(p) !== REY);
  if (!otras.length) return true;
  return otras.length === 1 && (Math.abs(otras[0]) === CABALLO || Math.abs(otras[0]) === ALFIL);
}

// Devuelve null si la partida sigue, o { fin: "mate" | "ahogado" | "50" | "material" | "repeticion", ganador? }
export function estadoPartida(e, legs, claves) {
  if (!legs.length) return enJaque(e, e.turno) ? { fin: "mate", ganador: -e.turno } : { fin: "ahogado" };
  if (e.rel >= 100) return { fin: "50" };
  if (insuficiente(e)) return { fin: "material" };
  const k = claves[claves.length - 1];
  if (claves.filter((x) => x === k).length >= 3) return { fin: "repeticion" };
  return null;
}

// Para pruebas: cuenta las jugadas posibles hasta cierta profundidad
export function perft(e, d) {
  if (d === 0) return 1;
  const c = e.turno;
  let n = 0;
  for (const m of generar(e)) {
    const u = hacer(e, m);
    if (!enJaque(e, c)) n += perft(e, d - 1);
    deshacer(e, u);
  }
  return n;
}
