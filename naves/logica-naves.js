// Ruta: naves/logica-naves.js
// SIMULACIÓN del juego «Naves». Es lógica pura y DETERMINISTA (sin DOM, sin azar, sin Date): el juego la dibuja y los bots
// (ia-naves.js) la usan para comprobar que cada nivel se puede pasar. Si cambias algo aquí, vuelve a correr
// `node naves/verificar-naves.mjs` (README-naves.md, sección «Bots»).
//
// Campo lógico de 360 × 640. La nave va abajo (Y_NAVE), dispara sola y se mueve de lado a lado hacia un objetivo x.
// Los enemigos bajan en manada; si cruzan la línea de la base (Y_BASE) cuentan como «fugas».
// 60 pasos por segundo. Todo lo que dependa de la dificultad sale de las tablas de este archivo (ARMAS y TIPOS).

export const W = 360, H = 640, Y_NAVE = 545, Y_BASE = 600, TPS = 60, VEL_NAVE = 360, R_NAVE = 11;
export const NUM_TIERS = 50;
const G = 1.13; // crecimiento por tier: la vida de los enemigos y el daño por segundo del arma crecen IGUAL (así van «equiparados»)

export const acotar = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- Armas: 50 tiers (10 familias × 5 marcas) ----------
const FAM_ARMAS = ["Blaster", "Pulso", "Láser", "Plasma", "Ión", "Nova", "Gauss", "Fotón", "Quásar", "Singular"];
const COL_ARMAS = ["#9be7ff", "#7dffb0", "#ff7d7d", "#ffa95c", "#d38bff", "#ffe66b", "#7db0ff", "#ff8bd5", "#b6ff6b", "#ffffff"];
const ROMANOS = ["I", "II", "III", "IV", "V"];
// k = 1..50. Más tier = más cadencia, más balas en abanico (1 → 7), más perforación (0 → 4) y más daño por bala.
export const ARMAS = (() => {
  const r = [];
  for (let k = 1; k <= NUM_TIERS; k++) {
    const fam = Math.floor((k - 1) / 5), marca = (k - 1) % 5;
    const cd = Math.max(5, Math.round(TPS / (3 + 0.07 * (k - 1)))); // pasos entre disparos
    const tiros = TPS / cd;                                          // disparos por segundo
    const balas = 1 + Math.floor((k - 1) / 8);
    const pierce = Math.floor((k - 1) / 12);
    const dano = +((6 * Math.pow(G, k - 1)) / (tiros * balas)).toFixed(2); // con decimales: si se redondeara, los primeros tiers serían iguales
    r.push({
      k, nombre: FAM_ARMAS[fam] + " " + ROMANOS[marca], color: COL_ARMAS[fam],
      cd, tiros, balas, pierce, dano, vel: 520, abanico: 7,
      dps: dano * tiros * balas,                                     // daño por segundo si todas las balas pegan
      costo: k === 1 ? 0 : Math.round(40 * Math.pow(1.2, k - 2)),    // monedas
    });
  }
  return r;
})();
export const armaDe = (k) => ARMAS[acotar(Math.floor(Number(k)) || 1, 1, NUM_TIERS) - 1];

// ---------- Enemigos: 50 tiers (misma cuenta) y 5 comportamientos ----------
const FAM_ENEM = ["Larvas", "Avispas", "Escarabajos", "Mantis", "Polillas", "Medusas", "Arañas", "Cangrejos", "Drones", "Centinelas"];
const COL_ENEM = ["#8fd14f", "#ffd23f", "#c77b4a", "#4fd1a1", "#c9a0ff", "#6fb7ff", "#ff7b7b", "#ff9f4a", "#9aa7b5", "#ff5fa8"];
export const hpBase = (t) => Math.max(2, Math.round(4 * Math.pow(G, t - 1)));
export const velBase = (t) => 42 * (1 + 0.012 * (t - 1)); // px/s
export const enemigoDe = (t) => {
  t = acotar(Math.floor(Number(t)) || 1, 1, NUM_TIERS);
  const fam = Math.floor((t - 1) / 5), marca = (t - 1) % 5;
  return { t, nombre: FAM_ENEM[fam] + " " + ROMANOS[marca], color: COL_ENEM[fam], hp: hpBase(t), vel: velBase(t) };
};
// hp = multiplicador de vida, vel = multiplicador de velocidad, r = radio, desde = primer tier en el que aparece
export const TIPOS = [
  { id: 0, nom: "Zángano", hp: 1, vel: 1, r: 12, desde: 1 },
  { id: 1, nom: "Zigzag", hp: 0.8, vel: 1.15, r: 11, desde: 2, amp: 46, per: 150 },
  { id: 2, nom: "Rápido", hp: 0.6, vel: 2, r: 10, desde: 4 },
  { id: 3, nom: "Blindado", hp: 3, vel: 0.7, r: 16, desde: 6 },
  { id: 4, nom: "Tirador", hp: 1.6, vel: 0.75, r: 13, desde: 9, cada: 130 },
];
const VEL_BALA_ENEMIGA = 150 / TPS;

// ---------- Estado ----------
// niv = { n, tier, arma, spawns: [{ tk, tp, x, ph }], dur (s), maxTk, vidas, maxFugas }
export function crearEstado(niv) {
  return { tk: 0, x: W / 2, cd: 0, inv: 0, vidas: niv.vidas, fugas: 0, enem: [], balas: [], malas: [], sp: 0, sig: 1, muertos: 0, fin: 0, ev: null };
}
// Copia independiente (la usan los bots para probar jugadas sin tocar la partida)
export function clonar(S) {
  return {
    ...S,
    enem: S.enem.map((e) => ({ ...e })),
    balas: S.balas.map((b) => ({ ...b, hit: b.hit ? b.hit.slice() : null })),
    malas: S.malas.map((b) => ({ ...b })),
    ev: null,
  };
}

// Un paso (1/60 s). tx = x hacia la que se mueve la nave. Si S.ev es un arreglo, anota los sucesos para dibujar:
// { t: "muere"|"fuga"|"golpe"|"tiro", x, y, tp }
export function paso(S, niv, tx) {
  if (S.fin) return;
  const A = niv.arma, E = S.enem, ev = S.ev;

  // nave
  const m = VEL_NAVE / TPS, d = tx - S.x;
  S.x = acotar(S.x + (d > m ? m : d < -m ? -m : d), 18, W - 18);
  if (S.inv > 0) S.inv--;

  // apariciones
  const sp = niv.spawns;
  while (S.sp < sp.length && sp[S.sp].tk <= S.tk) {
    const q = sp[S.sp++], T = TIPOS[q.tp];
    const hp = Math.max(1, Math.round(hpBase(niv.tier) * T.hp));
    E.push({ id: S.sig++, tp: q.tp, x: q.x, x0: q.x, y: -T.r, hp, hpm: hp, vy: (velBase(niv.tier) * T.vel) / TPS, t0: S.tk, ph: q.ph || 0, cd: T.cada || 0, r: T.r + Math.min(4, niv.tier * 0.08), fl: 0 });
  }

  // disparo automático (solo si hay enemigos en el campo)
  if (S.cd > 0) S.cd--;
  if (S.cd <= 0 && E.length) {
    S.cd = A.cd;
    const n = A.balas;
    for (let i = 0; i < n; i++) {
      const ang = ((i - (n - 1) / 2) * A.abanico * Math.PI) / 180;
      S.balas.push({ x: S.x, y: Y_NAVE - 14, vx: (Math.sin(ang) * A.vel) / TPS, vy: (-Math.cos(ang) * A.vel) / TPS, p: A.pierce, hit: A.pierce > 0 ? [] : null });
    }
    if (ev) ev.push({ t: "tiro", x: S.x, y: Y_NAVE - 14 });
  }

  // enemigos: mover y disparar
  for (let j = 0; j < E.length; j++) {
    const e = E[j], T = TIPOS[e.tp];
    e.y += e.vy;
    if (T.amp) e.x = acotar(e.x0 + T.amp * Math.sin((2 * Math.PI * (S.tk - e.t0)) / T.per + e.ph), e.r, W - e.r);
    if (e.fl > 0) e.fl--;
    if (T.cada && e.y > 30 && e.y < 430 && --e.cd <= 0) {
      e.cd = T.cada;
      const dx = S.x - e.x, dy = Y_NAVE - e.y, L = Math.hypot(dx, dy) || 1;
      S.malas.push({ x: e.x, y: e.y + e.r, vx: (dx / L) * VEL_BALA_ENEMIGA, vy: (dy / L) * VEL_BALA_ENEMIGA });
    }
  }

  // balas de la nave: mover y golpear
  const B = S.balas;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i];
    b.x += b.vx; b.y += b.vy;
    let borrar = b.y < -10 || b.x < -10 || b.x > W + 10;
    if (!borrar) {
      for (let j = 0; j < E.length; j++) {
        const e = E[j], dx = b.x - e.x, dy = b.y - e.y, rr = e.r + 3;
        if (dx * dx + dy * dy >= rr * rr) continue;
        if (b.hit) { if (b.hit.includes(e.id)) continue; b.hit.push(e.id); }
        e.hp -= A.dano; e.fl = 4;
        if (ev) ev.push({ t: "golpe", x: b.x, y: b.y });
        if (b.p-- <= 0) { borrar = true; break; }
      }
    }
    if (borrar) { B[i] = B[B.length - 1]; B.pop(); }
  }

  // enemigos: muertes, fugas y choques con la nave
  for (let j = E.length - 1; j >= 0; j--) {
    const e = E[j];
    let quitar = false;
    if (e.hp <= 0) { S.muertos++; quitar = true; if (ev) ev.push({ t: "muere", x: e.x, y: e.y, tp: e.tp }); }
    else if (e.y >= Y_BASE) { S.fugas++; quitar = true; if (ev) ev.push({ t: "fuga", x: e.x, y: Y_BASE, tp: e.tp }); }
    else if (S.inv <= 0) {
      const dx = e.x - S.x, dy = e.y - Y_NAVE, rr = e.r + R_NAVE;
      if (dx * dx + dy * dy < rr * rr) { S.vidas--; S.inv = 75; quitar = true; if (ev) ev.push({ t: "choque", x: e.x, y: e.y, tp: e.tp }); }
    }
    if (quitar) { E[j] = E[E.length - 1]; E.pop(); }
  }

  // balas enemigas
  const M = S.malas;
  for (let i = M.length - 1; i >= 0; i--) {
    const b = M[i];
    b.x += b.vx; b.y += b.vy;
    let borrar = b.y > H + 10 || b.x < -10 || b.x > W + 10;
    if (!borrar && S.inv <= 0) {
      const dx = b.x - S.x, dy = b.y - Y_NAVE;
      if (dx * dx + dy * dy < (R_NAVE + 4) * (R_NAVE + 4)) { S.vidas--; S.inv = 75; borrar = true; if (ev) ev.push({ t: "choque", x: b.x, y: b.y, tp: -1 }); }
    }
    if (borrar) { M[i] = M[M.length - 1]; M.pop(); }
  }

  S.tk++;
  if (S.vidas <= 0 || S.fugas > niv.maxFugas || S.tk > niv.maxTk) S.fin = -1;
  else if (S.sp >= sp.length && !E.length) S.fin = 1;
}
