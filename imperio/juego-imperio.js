// Ruta: imperio/juego-imperio.js
// Imperio: estrategia isométrica. Recolectores juntan y venden recursos, constructores levantan y reparan,
// guerreros exploran y atacan; el personaje principal pica, fabrica tablones y construye cajones.
const VEL = .23; // casillas por segundo por cada punto de velocidad (humano = 10 → 2.3 casillas/s)
const N = 44, TW = 32, TH = 16, $ = (id) => document.getElementById(id);
const RES = {
  arbol: { nom: "Madera", v: 1, n: 6, c: "#2e7d32" }, roca: { nom: "Piedra", v: 1, n: 8, c: "#9aa0a6" },
  carbon: { nom: "Carbón", v: 2, n: 8, c: "#2b2b2b" }, cobre: { nom: "Cobre", v: 3, n: 8, c: "#d2793a" },
  hierro: { nom: "Hierro", v: 4, n: 8, c: "#c9d3e6" }, oro: { nom: "Oro", v: 8, n: 8, c: "#ffd23f" },
  diamante: { nom: "Diamante", v: 20, n: 6, c: "#4de1ff" },
};
const UN = {
  h: { nom: "Personaje", hp: 100, dmg: 30, vel: 10, ico: "🧑", c: "#ff6b9d" }, // pico/pala infinito: no se guarda en el inventario
  r: { nom: "Recolector", costo: 10, hp: 100, dmg: 30, vel: 10, ico: "⛏️", c: "#3ea6ff" }, c: { nom: "Constructor", costo: 10, hp: 100, dmg: 30, vel: 10, ico: "🔨", c: "#ffb13b" },
  g: { nom: "Guerrero", costo: 10, hp: 100, dmg: 60, vel: 10, ico: "⚔️", c: "#7c5cff" }, e: { nom: "Bandido", hp: 40, vel: 7, c: "#e53935" },
};
// Animales. vel = casillas por segundo (provisional); cd = segundos entre golpes; ag = a qué distancia notan a un soldado (solo los que hacen daño)
const ANI = { // vel en puntos (humano = 10); ag = a qué distancia notan a un soldado; con = conducta
  oso: { nom: "Oso", ico: "🐻", hp: 120, dmg: 60, cd: 2, ag: 4, vel: 5, con: "sigue", carne: 20, piel: 10 },
  lobo: { nom: "Lobo", ico: "🐺", hp: 100, dmg: 40, cd: 1, ag: 7, vel: 9, con: "manada", cuero: 3, carne: 5 },
  guepardo: { nom: "Guepardo", ico: "🐆", hp: 120, dmg: 60, cd: 1, ag: 8, vel: 12, con: "decide", piel: 15, carne: 12 },
  conejo: { nom: "Conejo", ico: "🐇", hp: 50, dmg: 0, ag: 6, vel: 15, con: "huye", cuero: 2, carne: 2 },
  lagartija: { nom: "Lagartija", ico: "🦎", hp: 50, dmg: 0, ag: 6, vel: 10, con: "huye", cuero: 2, carne: 2 },
  gallina: { nom: "Gallina", ico: "🐔", hp: 50, dmg: 0, ag: 6, vel: 9, con: "huye", cuero: 2, carne: 2 },
};
const nuevoAnimal = (k, x, y) => ({ k, x, y, hp: ANI[k].hp, mh: ANI[k].hp, cd: 0, dest: null, esp: 0, obj: null });
const ITEM = { tronco: "Tronco", tablon: "Tablón", roca: "Piedra", carbon: "Carbón", cobre: "Cobre", hierro: "Hierro", oro: "Oro", diamante: "Diamante" };
const MADERA = ["tronco", "tablon"], STACK = 20, RANURAS = 10; // cada ranura guarda un solo material, hasta 20
const espacio = (inv, t) => inv.filter((s) => s.t == t).reduce((a, s) => a + STACK - s.n, 0) + (RANURAS - inv.length) * STACK;
const cuenta = (inv, t) => inv.filter((s) => s.t == t).reduce((a, s) => a + s.n, 0);
function anadir(inv, t, n) { for (const s of inv) if (s.t == t && n > 0) { const k = Math.min(n, STACK - s.n); s.n += k; n -= k; } while (n > 0) { const k = Math.min(n, STACK); inv.push({ t, n: k }); n -= k; } }
function quitar(inv, t, n) { for (let i = inv.length - 1; i >= 0 && n > 0; i--) { const s = inv[i]; if (s.t != t) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) inv.splice(i, 1); } }
function pasar(de, a, ok) { de.slice().forEach((s) => { if (!ok(s.t)) return; const k = Math.min(cuenta(de, s.t), espacio(a, s.t)); if (k > 0) { quitar(de, s.t, k); anadir(a, s.t, k); } }); }
const heroe = () => us.find((u) => u.k == "h");
const ED = {
  cajonM: { nom: "Cajón de madera", w: 1, hp: 60, c: "#a1763f" }, cajonN: { nom: "Cajón de minerales", w: 1, hp: 60, c: "#6b7280" }, centro: { nom: "Centro", w: 2, hp: 400, c: "#c9a66b" }, almacen: { nom: "Almacén", costo: 60, w: 1, hp: 150, c: "#a47148" }, torre: { nom: "Torre", costo: 120, w: 1, hp: 200, c: "#8a8fa3" } };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cv = $("lienzo"), cx = cv.getContext("2d");
let W, H, cam, anim, stock, bio, res, bloq, vis, expl, us, eds, enem, fx, dinero, oleada, tReloj, tOleada, sel, colocar, fin, muertes, pend;

function nuevo() {
  res = new Array(N * N).fill(null); bloq = new Uint8Array(N * N); expl = new Uint8Array(N * N); vis = new Uint8Array(N * N);
  us = []; eds = []; anim = []; stock = { carne: 0, piel: 0, cuero: 0 }; enem = []; fx = []; dinero = 100; oleada = 0; tReloj = 0; tOleada = 70; sel = null; colocar = null; fin = false; muertes = 0; pend = 0;
  generarMapa();
  ponerEdificio("centro", 8, 8, true); sel = crearUnidad("h");
  cam = { x: W / 2 - 0 * TW, y: H / 3, z: 1 };
  cam.x = W / 2; cam.y = H / 3 - 17 * TH;
}
// Biomas: 0 llanura, 1 bosque, 2 rocoso, 3 agua, 4 playa
function generarMapa() {
  bio = new Uint8Array(N * N);
  const sem = [{ x: 9, y: 9, t: 0 }]; // zonas de tierra: semillas aleatorias (la más cercana manda)
  [0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 2].forEach((t) => sem.push({ x: Math.random() * N, y: Math.random() * N, t }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let m = 1e9, t = 0; for (const q of sem) { const d = Math.hypot(q.x - x, q.y - y) + Math.random() * 1.5; if (d < m) { m = d; t = q.t; } }
    bio[y * N + x] = Math.hypot(x - 9, y - 9) < 6 ? 0 : t; // alrededor de tu base siempre hay llanura
  }
  const protegido = (x, y) => Math.hypot(x - 9, y - 9) < 7 || Math.hypot(x - (N - 5), y - (N - 5)) < 8;
  const agua = (x, y) => { if (x >= 0 && y >= 0 && x < N && y < N && !protegido(x, y)) bio[y * N + x] = 3; };
  const borde = (Math.random() * 4) | 0, a = Math.random() * 6, b = Math.random() * 6; // el mar siempre toca un borde
  for (let i = 0; i < N; i++) {
    const prof = Math.round(4 + 2 * Math.sin(i * .22 + a) + 1.5 * Math.sin(i * .5 + b));
    for (let k = 0; k < prof; k++) borde == 0 ? agua(i, k) : borde == 1 ? agua(i, N - 1 - k) : borde == 2 ? agua(k, i) : agua(N - 1 - k, i);
  }
  for (let l = Math.random() < .6 ? 2 : 1; l > 0; l--) { // lagos tierra adentro
    const lx = 10 + Math.random() * 24, ly = 10 + Math.random() * 24, r = 2.5 + Math.random() * 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - lx, y - ly) < r + Math.random() * .8) agua(x, y);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (bio[i] == 3) { bloq[i] = 1; continue; }
    if (D4.some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && bio[(y + dy) * N + x + dx] == 3)) bio[i] = 4;
  }
  const grupo = (gx, gy, t, c, solo) => {
    for (let k = 0; k < c * 5 && c > 0; k++) {
      const x = Math.round(gx + (Math.random() - .5) * 4), y = Math.round(gy + (Math.random() - .5) * 4), i = y * N + x;
      if (x < 0 || y < 0 || x >= N || y >= N || res[i] || bloq[i] || !solo.includes(bio[i]) || Math.hypot(x - 9, y - 9) < 4) continue;
      res[i] = { t, n: RES[t].n }; bloq[i] = 1; c--;
    }
  };
  grupo(14, 10, "arbol", 6, [0, 1, 2]); grupo(10, 14, "roca", 5, [0, 1, 2]); // algo para empezar cerca de la base
  const roc = []; bio.forEach((v, i) => v == 2 && roc.push(i));
  if (roc.length) for (let k = 0; k < 24; k++) { // minerales en grupos, solo en zonas rocosas: más raros mientras más lejos
    const i = roc[(Math.random() * roc.length) | 0], x = i % N, y = (i / N) | 0, d = Math.hypot(x - 9, y - 9);
    const pool = d < 14 ? ["carbon", "carbon", "cobre"] : d < 26 ? ["carbon", "cobre", "hierro", "hierro"] : ["hierro", "oro", "oro", "diamante"];
    grupo(x, y, pool[(Math.random() * pool.length) | 0], 5, [2]);
  }
  for (let i = 0; i < N * N; i++) { // el resto de cada zona
    if (res[i] || bloq[i] || Math.hypot(i % N - 9, ((i / N) | 0) - 9) < 4) continue;
    const r = Math.random(), t = bio[i] == 1 ? (r < .42 ? "arbol" : null) : bio[i] == 2 ? (r < .2 ? "roca" : r < .23 ? "arbol" : null) : bio[i] == 0 ? (r < .015 ? "arbol" : null) : null;
    if (t) { res[i] = { t, n: RES[t].n }; bloq[i] = 1; }
  }
  let idGrupo = 0;
  const manada = (x, y) => { // 3 o 4 lobos juntos
    const g = ++idGrupo;
    for (let m = 0, n = 3 + (Math.random() < .5 ? 1 : 0); m < n; m++) {
      let px = x + .5, py = y + .5;
      for (let k = 0; k < 8; k++) { const qx = x + .5 + (Math.random() - .5) * 3, qy = y + .5 + (Math.random() - .5) * 3; if (qx > 0 && qy > 0 && qx < N && qy < N && !bloq[(qy | 0) * N + (qx | 0)]) { px = qx; py = qy; break; } }
      anim.push({ ...nuevoAnimal("lobo", px, py), g });
    }
  };
  // animales por zona: [animal, probabilidad por casilla]
  const SP = [[["conejo", .012], ["gallina", .008], ["guepardo", .004]], [["conejo", .008], ["lobo", .003], ["oso", .005]], [["lagartija", .01], ["lobo", .0012], ["oso", .003]], null, [["lagartija", .01]]];
  for (let i = 0; i < N * N; i++) {
    const x = i % N, y = (i / N) | 0; if (bloq[i] || !SP[bio[i]] || Math.hypot(x - 9, y - 9) < 12) continue;
    for (const [k, p] of SP[bio[i]]) if (Math.random() < p) { k == "lobo" ? manada(x, y) : anim.push(nuevoAnimal(k, x + .5, y + .5)); break; }
  }
  if (!anim.some((a) => a.k == "lobo")) { // siempre hay al menos una manada
    const c = []; bio.forEach((v, i) => (v == 1 || v == 2) && !bloq[i] && Math.hypot(i % N - 9, ((i / N) | 0) - 9) >= 12 && c.push(i));
    if (c.length) { const i = c[(Math.random() * c.length) | 0]; manada(i % N, (i / N) | 0); }
  }
}
function ponerEdificio(k, x, y, listo) {
  const w = ED[k].w, b = { k, x, y, w, mh: ED[k].hp, hp: listo ? ED[k].hp : ED[k].hp * .1, prog: listo ? 1 : 0, cd: 0 };
  for (let i = 0; i < w; i++) for (let j = 0; j < w; j++) bloq[(y + j) * N + x + i] = 1;
  eds.push(b); return b;
}
function crearUnidad(k) {
  for (let r = 2; r < 6; r++) for (let a = 0; a < 40; a++) {
    const x = 9 + ((Math.random() * (2 * r + 1)) | 0) - r, y = 9 + ((Math.random() * (2 * r + 1)) | 0) - r;
    if (x >= 0 && y >= 0 && x < N && y < N && !bloq[y * N + x]) { const u = { k, x: x + .5, y: y + .5, hp: UN[k].hp, mh: UN[k].hp, p: [], o: null, cd: 0, carry: { t: null, n: 0 }, inv: k == "h" ? [] : null }; us.push(u); return u; }
  }
}
// ----- Ruta (BFS por casillas) -----
function ruta(u, tx, ty, cerca) {
  const s = (u.y | 0) * N + (u.x | 0), prev = new Int16Array(N * N).fill(-2), q = [s]; prev[s] = -1; let f = -1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % N, y = (c / N) | 0;
    if (cerca ? Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= cerca : x == tx && y == ty) { f = c; break; }
    for (const [dx, dy] of D4) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= N || b >= N || prev[b * N + a] != -2 || (bloq[b * N + a] && (cerca || a != tx || b != ty))) continue;
      prev[b * N + a] = c; q.push(b * N + a);
    }
  }
  const p = []; if (f < 0) return p;
  for (let c = f; c != s; c = prev[c]) p.push({ x: c % N + .5, y: ((c / N) | 0) + .5 });
  return p.reverse();
}
const enAgua = (x, y) => bio[(y | 0) * N + (x | 0)] == 3;
function mover(u, tx, ty, dt, v = (UN[u.k].vel || 10) * VEL) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy), s = v * dt, ok = d <= s, nx = ok ? tx : u.x + dx / d * s, ny = ok ? ty : u.y + dy / d * s;
  if (enAgua(nx, ny)) { if (!enAgua(nx, u.y)) u.x = nx; else if (!enAgua(u.x, ny)) u.y = ny; return false; } // bordea el agua
  u.x = nx; u.y = ny; return ok;
}
function paso(u, dt) { if (!u.p.length) return false; if (mover(u, u.p[0].x, u.p[0].y, dt)) u.p.shift(); return true; }
const distRect = (u, x, y, w) => Math.hypot(Math.max(x - u.x, 0, u.x - (x + w)), Math.max(y - u.y, 0, u.y - (y + w)));
const cercano = (lista, u, r) => lista.reduce((m, e) => { const d = Math.hypot(e.x - u.x, e.y - u.y); return d < r && (!m || d < m.d) ? { e, d } : m; }, null)?.e;
function bodega(u) { return eds.filter((b) => b.prog >= 1 && b.hp > 0 && (b.k == "centro" || b.k == "almacen")).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0]; }
function buscarRes(u, t) { let m = -1, md = 1e9; res.forEach((r, i) => { if (r && r.t == t && expl[i]) { const d = Math.hypot(i % N - u.x, ((i / N) | 0) - u.y); if (d < md) { md = d; m = i; } } }); return m; }
function golpe(a, b, dmg) { b.hp -= dmg; fx.push({ x1: a.x, y1: a.y, x2: b.x + (b.w ? b.w / 2 : 0), y2: b.y + (b.w ? b.w / 2 : 0), t: .15 }); }

function actualizar(u, dt) {
  u.cd = Math.max(0, u.cd - dt);
  if (u.k == "e") return iaEnemigo(u, dt);
  const o = u.o;
  if (!o) { if (u.k == "g") { const e = cercano(enem.concat(anim.filter((a) => ANI[a.k].dmg)).filter((e) => vis[(e.y | 0) * N + (e.x | 0)]), u, 5); if (e) u.o = { t: "atk", e }; } return; }
  if (o.t == "mov") { if (!paso(u, dt)) u.o = null; return; }
  if (o.t == "atk") {
    if (o.e.hp <= 0) { u.o = null; return; }
    if (Math.hypot(o.e.x - u.x, o.e.y - u.y) > 1.2) mover(u, o.e.x, o.e.y, dt);
    else if (!u.cd) { golpe(u, o.e, UN[u.k].dmg); u.cd = .8; }
    return;
  }
  if (o.t == "pic") { // el personaje pica árboles, rocas y minerales: 1 golpe por segundo, 10 golpes
    const i = o.i, r = res[i], rx = i % N, ry = (i / N) | 0; if (!r) { u.o = null; return; }
    if (distRect(u, rx, ry, 1) < 1.6) {
      o.t0 = (o.t0 || 0) + dt;
      if (o.t0 >= 1) {
        o.t0 = 0; r.g = (r.g || 0) + 1;
        if (r.g >= 10) {
          const it = r.t == "arbol" ? "tronco" : r.t;
          if (espacio(u.inv, it) < 4) { r.g = 9; aviso("Inventario lleno"); u.o = null; return; }
          anadir(u.inv, it, 4); res[i] = null; bloq[i] = 0; u.o = null; aviso("+4 " + ITEM[it]);
        }
      }
    } else if (!paso(u, dt)) { u.p = ruta(u, rx, ry, 1); if (!u.p.length) u.o = null; }
    return;
  }
  if (o.t == "con") {
    const b = o.b; if (b.hp <= 0) { u.o = null; return; }
    if (distRect(u, b.x, b.y, b.w) < 1.6) {
      if (b.prog < 1) { b.prog = Math.min(1, b.prog + dt / 8); b.hp = Math.min(b.mh, b.hp + b.mh * dt / 8.8); }
      else if (b.hp < b.mh) b.hp = Math.min(b.mh, b.hp + 25 * dt); else u.o = null;
    } else if (!paso(u, dt)) { u.p = ruta(u, b.x, b.y, b.w); if (!u.p.length) u.o = null; }
    return;
  }
  if (o.t == "rec") {
    const i = o.i, r = res[i], rx = i % N, ry = (i / N) | 0;
    if (o.f == "ir") {
      if (!r) { const j = buscarRes(u, o.tipo); if (j < 0) { o.f = u.carry.n ? "vol" : "x"; if (o.f == "x") u.o = null; } else { o.i = j; u.p = []; } return; }
      if (distRect(u, rx, ry, 1) < 1.6) { o.f = "cav"; o.t0 = 0; } else if (!paso(u, dt)) { u.p = ruta(u, rx, ry, 1); if (!u.p.length) u.o = null; }
    } else if (o.f == "cav") {
      if (!r) { o.f = u.carry.n ? "vol" : "ir"; return; }
      o.t0 += dt;
      if (o.t0 >= 1) {
        o.t0 = 0; if (u.carry.t != o.tipo) u.carry = { t: o.tipo, n: 0 };
        u.carry.n++; r.n--; if (r.n <= 0) { res[i] = null; bloq[i] = 0; }
        if (u.carry.n >= 5) o.f = "vol";
      }
    } else {
      const b = bodega(u); if (!b) { u.o = null; return; }
      if (distRect(u, b.x, b.y, b.w) < 1.6) { dinero += u.carry.n * RES[u.carry.t].v; u.carry.n = 0; o.f = "ir"; }
      else if (!paso(u, dt)) { u.p = ruta(u, b.x, b.y, b.w); if (!u.p.length) u.o = null; }
    }
  }
}
const bloqueado = (a, nx, ny) => nx < .5 || ny < .5 || nx > N - .5 || ny > N - .5 || enAgua(nx, ny) || (bloq[(ny | 0) * N + (nx | 0)] && !bloq[(a.y | 0) * N + (a.x | 0)]);
function moverA(a, tx, ty, dt, v) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1, s = Math.min(d, v * dt), nx = a.x + dx / d * s, ny = a.y + dy / d * s;
  if (bloqueado(a, nx, ny)) { a.dest = null; return false; }
  a.x = nx; a.y = ny; return d <= s;
}
function huir(a, de, dt, v) { // se aleja en zigzag y rodea obstáculos; si queda acorralado, se puede atrapar
  const base = Math.atan2(a.y - de.y, a.x - de.x) + (Math.floor(a.t) % 2 ? .3 : -.3), s = v * dt;
  for (const g of [0, .8, -.8, 1.6, -1.6]) {
    const nx = a.x + Math.cos(base + g) * s, ny = a.y + Math.sin(base + g) * s;
    if (!bloqueado(a, nx, ny)) { a.x = nx; a.y = ny; return; }
  }
}
const enPantalla = (x, y) => { const p = P(x, y); return p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H; };
function iaAnimal(a, dt) {
  const d = ANI[a.k], v = d.vel * VEL; a.cd = Math.max(0, a.cd - dt); a.t = (a.t || 0) + dt;
  const cerca = cercano(us, a, d.ag); // ve a un soldado solo si está dentro de su rango (no depende de la niebla)
  if (d.con == "huye") { if (cerca) return huir(a, cerca, dt, v); }
  else {
    let t = a.obj && a.obj.hp > 0 ? a.obj : null;
    if (t && !(d.con == "sigue" ? enPantalla(t.x, t.y) : Math.hypot(t.x - a.x, t.y - a.y) < d.ag * 1.5)) t = null; // el oso lo suelta si sale de la pantalla
    if (!t && cerca) t = cerca;
    if (!t && d.con == "manada") { const o = anim.find((b) => b !== a && b.g === a.g && b.obj && b.obj.hp > 0 && Math.hypot(b.x - a.x, b.y - a.y) < 10); if (o) t = o.obj; } // la manada avisa
    a.obj = t || null;
    if (t && d.con == "decide") { // el guepardo, al ser veloz, elige pelear o huir
      if (!a.modo || a.t > a.tm) { a.modo = Math.random() < .5 ? "pelea" : "huye"; a.tm = a.t + 6 + Math.random() * 4; }
      if (a.modo == "pelea" && a.hp < a.mh * .35) a.modo = "huye";
      if (a.modo == "huye") return huir(a, t, dt, v);
    } else if (!t) a.modo = null;
    if (t) { if (Math.hypot(t.x - a.x, t.y - a.y) > 1.1) moverA(a, t.x, t.y, dt, v); else if (!a.cd) { golpe(a, t, d.dmg); a.cd = d.cd; } return; }
  }
  if (d.con == "manada") { const l = anim.find((b) => b.g === a.g); if (l !== a) { if (Math.hypot(l.x - a.x, l.y - a.y) > 3) moverA(a, l.x, l.y, dt, v * .5); return; } } // la manada sigue a su líder
  a.esp -= dt; // vagar
  if (!a.dest) { if (a.esp > 0) return; a.dest = { x: a.x + (Math.random() - .5) * 8, y: a.y + (Math.random() - .5) * 8 }; }
  if (moverA(a, a.dest.x, a.dest.y, dt, v * .4)) { a.dest = null; a.esp = 1 + Math.random() * 3; }
}
function iaEnemigo(e, dt) {
  const u = cercano(us, e, 4); let t = u, d;
  if (!t) { t = eds.filter((b) => b.hp > 0).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0]; }
  if (!t) return;
  d = t.w ? distRect(e, t.x, t.y, t.w) : Math.hypot(t.x - e.x, t.y - e.y);
  if (d > 1.1) mover(e, t.w ? t.x + t.w / 2 : t.x, t.w ? t.y + t.w / 2 : t.y, dt);
  else if (!e.cd) { golpe(e, t, 8); e.cd = 1; }
}
function puntos(n) { pend += n; if (pend >= 10 || (fin && pend > 0)) { const p = pend; pend = 0; import("../compartido/jugador.js").then((m) => m.sumarPuntos("imperio", p)).catch(() => {}); } }
function tick(dt) {
  if (fin) return;
  tReloj += dt;
  us.forEach((u) => actualizar(u, dt)); enem.forEach((e) => actualizar(e, dt)); anim.forEach((a) => iaAnimal(a, dt));
  eds.forEach((b) => { // las torres disparan
    if (b.k != "torre" || b.prog < 1) return; b.cd = Math.max(0, b.cd - dt);
    const e = cercano(enem, { x: b.x + .5, y: b.y + .5 }, 6); if (e && !b.cd) { golpe({ x: b.x + .5, y: b.y + .5 }, e, 12); b.cd = 1; }
  });
  for (let i = enem.length - 1; i >= 0; i--) if (enem[i].hp <= 0) { enem.splice(i, 1); dinero += 15; muertes++; puntos(1); }
  for (let i = anim.length - 1; i >= 0; i--) if (anim[i].hp <= 0) { // al morir entrega carne, piel o cuero
    const d = ANI[anim[i].k], bot = ["carne", "piel", "cuero"].filter((r) => d[r]); bot.forEach((r) => (stock[r] += d[r]));
    aviso(d.nom + " cazado: " + bot.map((r) => "+" + d[r] + " " + r).join(", ")); anim.splice(i, 1);
  }
  us = us.filter((u) => u.hp > 0); eds = eds.filter((b) => { if (b.hp > 0) return true; for (let i = 0; i < b.w; i++) for (let j = 0; j < b.w; j++) bloq[(b.y + j) * N + b.x + i] = 0; return false; });
  if (sel && sel.hp <= 0) sel = null;
  fx.forEach((f) => (f.t -= dt)); fx = fx.filter((f) => f.t > 0);
  if (!us.some((u) => u.k == "h")) { fin = true; $("fin").hidden = false; $("finTxt").textContent = "Tu personaje fue derrotado."; }
  vis.fill(0);
  const ver = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const a = (x | 0) + i, b = (y | 0) + j; if (a >= 0 && b >= 0 && a < N && b < N && i * i + j * j <= r * r) vis[b * N + a] = expl[b * N + a] = 1; } };
  us.forEach((u) => ver(u.x, u.y, u.k == "g" ? 7 : 5)); eds.forEach((b) => ver(b.x, b.y, b.k == "torre" ? 8 : 6));
}
// ----- Dibujo -----
const P = (x, y) => [(x - y) * TW * cam.z + cam.x, (x + y) * TH * cam.z + cam.y];
function poly(pts, col) { cx.beginPath(); pts.forEach((p, i) => (i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]))); cx.closePath(); cx.fillStyle = col; cx.fill(); }
function caja(x, y, w, h, col) {
  const z = cam.z, A = P(x, y), B = P(x + w, y), C = P(x + w, y + w), Dd = P(x, y + w), up = (p) => [p[0], p[1] - h * z];
  poly([Dd, C, up(C), up(Dd)], shade(col, .75)); poly([C, B, up(B), up(C)], shade(col, .55)); poly([up(A), up(B), up(C), up(Dd)], col);
}
function shade(c, f) { const n = parseInt(c.slice(1), 16); return "rgb(" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v * f) | 0).join(",") + ")"; }
function barra(x, y, f, col) { const z = cam.z; cx.fillStyle = "#000a"; cx.fillRect(x - 12 * z, y, 24 * z, 4 * z); cx.fillStyle = col; cx.fillRect(x - 12 * z, y, 24 * z * Math.max(0, f), 4 * z); }
function dibujar() {
  cx.fillStyle = "#05070d"; cx.fillRect(0, 0, W, H); const z = cam.z;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (!expl[i]) continue;
    const a = P(x, y); if (a[0] < -TW * z * 2 || a[0] > W + TW * z * 2 || a[1] < -TH * z * 2 || a[1] > H + TH * z * 2) continue;
    const b = bio[i], v = (x * 7 + y * 13) % 5, col = b == 3 ? "hsl(205,55%," + (30 + 3 * Math.sin(tReloj * 1.5 + x + y)) + "%)" : b == 4 ? "hsl(45,40%," + (58 + v) + "%)" : b == 1 ? "hsl(120,30%," + (23 + v) + "%)" : b == 2 ? "hsl(30,8%," + (38 + v) + "%)" : "hsl(92,38%," + (36 + v) + "%)";
    poly([a, P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], col);
    if (!vis[i]) poly([a, P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], "rgba(5,7,13,.55)");
  }
  if (colocar && sel) { const t = tileMouse; if (t) { const ok = libre(t.x, t.y); poly([P(t.x, t.y), P(t.x + 1, t.y), P(t.x + 1, t.y + 1), P(t.x, t.y + 1)], ok ? "rgba(80,255,120,.5)" : "rgba(255,70,70,.5)"); } }
  const L = [];
  res.forEach((r, i) => { if (r && expl[i]) L.push({ d: i % N + ((i / N) | 0) + 1, f: () => dibRes(i % N, (i / N) | 0, r) }); });
  eds.forEach((b) => L.push({ d: b.x + b.y + b.w, f: () => dibEd(b) }));
  us.forEach((u) => L.push({ d: u.x + u.y, f: () => dibU(u) }));
  enem.forEach((e) => { if (vis[(e.y | 0) * N + (e.x | 0)]) L.push({ d: e.x + e.y, f: () => dibU(e) }); });
  anim.forEach((a) => { if (vis[(a.y | 0) * N + (a.x | 0)]) L.push({ d: a.x + a.y, f: () => dibA(a) }); });
  L.sort((a, b) => a.d - b.d).forEach((l) => l.f());
  fx.forEach((f) => { const a = P(f.x1, f.y1), b = P(f.x2, f.y2); cx.strokeStyle = "#ffe08a"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(a[0], a[1] - 8 * z); cx.lineTo(b[0], b[1] - 8 * z); cx.stroke(); });
}
function dibRes(x, y, r) {
  const z = cam.z, c = P(x + .5, y + .5), d = RES[r.t]; if (r.g) barra(c[0], c[1] - 34 * z, 1 - r.g / 10, "#ffb13b");
  if (r.t == "arbol") { cx.fillStyle = "#5d4037"; cx.fillRect(c[0] - 2 * z, c[1] - 12 * z, 4 * z, 12 * z); cx.fillStyle = d.c; cx.beginPath(); cx.arc(c[0], c[1] - 18 * z, 10 * z, 0, 7); cx.fill(); return; }
  cx.fillStyle = r.t == "roca" ? d.c : "#7b8294"; cx.beginPath(); cx.ellipse(c[0], c[1] - 5 * z, 12 * z, 8 * z, 0, 0, 7); cx.fill();
  if (r.t != "roca") { cx.fillStyle = d.c; [[-5, -7], [3, -9], [5, -4], [-2, -3]].forEach(([a, b]) => { cx.beginPath(); cx.arc(c[0] + a * z, c[1] + b * z, 2.6 * z, 0, 7); cx.fill(); }); }
}
function dibEd(b) {
  const z = cam.z, d = ED[b.k], h = b.k == "torre" ? 40 : b.k == "centro" ? 26 : 14;
  cx.globalAlpha = b.prog < 1 ? .6 : 1; caja(b.x + .1, b.y + .1, b.w - .2, h * (b.prog < 1 ? .4 + b.prog * .6 : 1), d.c); cx.globalAlpha = 1;
  const c = P(b.x + b.w / 2, b.y + b.w / 2); if (b.hp < b.mh) barra(c[0], c[1] - (h + 14) * z, b.hp / b.mh, "#59d96b");
  if (sel === b) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.strokeRect(c[0] - 20 * z, c[1] - (h + 4) * z, 40 * z, h * z + 10 * z); }
}
function dibA(a) {
  const z = cam.z, c = P(a.x, a.y);
  cx.fillStyle = "#0005"; cx.beginPath(); cx.ellipse(c[0], c[1], 9 * z, 4 * z, 0, 0, 7); cx.fill();
  cx.font = 17 * z + "px system-ui"; cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.fillText(ANI[a.k].ico, c[0], c[1] - 2 * z);
  if (a.hp < a.mh) barra(c[0], c[1] - 22 * z, a.hp / a.mh, "#ff9f43");
}
function dibU(u) {
  const z = cam.z, c = P(u.x, u.y), d = UN[u.k];
  cx.fillStyle = "#0005"; cx.beginPath(); cx.ellipse(c[0], c[1], 8 * z, 4 * z, 0, 0, 7); cx.fill();
  cx.fillStyle = d.c; cx.beginPath(); cx.arc(c[0], c[1] - 9 * z, 7 * z, 0, 7); cx.fill(); cx.strokeStyle = "#fff"; cx.lineWidth = sel === u ? 3 : 1; cx.stroke();
  cx.fillStyle = "#fff"; cx.font = (u.k == "e" ? "bold " : "") + 9 * z + "px system-ui"; cx.textAlign = "center"; cx.fillText(u.k == "e" ? "!" : d.ico, c[0], c[1] - 6 * z);
  if (u.carry && u.carry.n) { cx.fillStyle = RES[u.carry.t].c; cx.fillRect(c[0] + 5 * z, c[1] - 20 * z, 6 * z, 6 * z); }
  if (u.hp < u.mh) barra(c[0], c[1] - 24 * z, u.hp / u.mh, u.k == "e" ? "#ff6b6b" : "#59d96b");
}
// ----- Entrada -----
let tileMouse = null, arrastre = null;
const aMundo = (px, py) => { const a = (px - cam.x) / cam.z / TW, b = (py - cam.y) / cam.z / TH; return { x: (a + b) / 2, y: (b - a) / 2 }; };
function libre(x, y) { const i = y * N + x; return x >= 0 && y >= 0 && x < N && y < N && !bloq[i] && expl[i] && !us.some((u) => (u.x | 0) == x && (u.y | 0) == y); }
cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); arrastre = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, mov: false }; });
cv.addEventListener("pointermove", (e) => {
  const r = cv.getBoundingClientRect(), w = aMundo(e.clientX - r.left, e.clientY - r.top); tileMouse = { x: Math.floor(w.x), y: Math.floor(w.y) };
  if (!arrastre) return; const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
  if (arrastre.mov || Math.hypot(dx, dy) > 8) { arrastre.mov = true; cam.x = arrastre.cx + dx; cam.y = arrastre.cy + dy; }
});
cv.addEventListener("pointerup", (e) => { if (arrastre && !arrastre.mov) { const r = cv.getBoundingClientRect(); toque(aMundo(e.clientX - r.left, e.clientY - r.top)); } arrastre = null; });
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : .9); }, { passive: false });
function zoom(f) { const nz = Math.min(2, Math.max(.5, cam.z * f)), k = nz / cam.z, mx = W / 2, my = H / 2; cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz; }
function toque(w) {
  if (fin) return; const tx = Math.floor(w.x), ty = Math.floor(w.y), i = ty * N + tx;
  if (colocar && colocar.startsWith("cajon") && sel && sel.k == "h") {
    if (!libre(tx, ty) || Math.hypot(tx + .5 - sel.x, ty + .5 - sel.y) > 6) return aviso("Ahí no se puede: elige una casilla libre y cerca");
    quitar(sel.inv, "tablon", 4); const b = ponerEdificio(colocar, tx, ty, true); b.inv = []; colocar = null; return panel();
  }
  if (colocar && sel && sel.k == "c") {
    if (!libre(tx, ty)) return aviso("Ahí no se puede construir");
    if (dinero < ED[colocar].costo) return aviso("No alcanza el dinero");
    dinero -= ED[colocar].costo; const b = ponerEdificio(colocar, tx, ty, false); sel.o = { t: "con", b }; sel.p = []; colocar = null; return panel();
  }
  const u = us.filter((u) => Math.hypot(u.x - w.x, u.y - w.y - .3) < .8)[0];
  if (u) { sel = u; return panel(); }
  const b = eds.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.w);
  if (!sel || !us.includes(sel)) { sel = b || null; return panel(); }
  const en = enem.concat(anim).find((e) => Math.hypot(e.x - w.x, e.y - w.y - .3) < .9 && vis[(e.y | 0) * N + (e.x | 0)]);
  if (en) { sel.o = { t: "atk", e: en }; }
  else if (b && (b.prog < 1 || b.hp < b.mh)) { if (sel.k == "c") { sel.o = { t: "con", b }; sel.p = []; } else aviso("Solo los constructores construyen y reparan"); }
  else if (b) { sel = b; }
  else if (res[i] && expl[i]) { if (sel.k == "r") sel.o = { t: "rec", i, tipo: res[i].t, f: "ir" }; else if (sel.k == "h") sel.o = { t: "pic", i }; else aviso("Solo los recolectores juntan recursos"); sel.p = []; }
  else if (tx >= 0 && ty >= 0 && tx < N && ty < N && expl[i] && !bloq[i]) { sel.p = ruta(sel, tx, ty, 0); sel.o = { t: "mov" }; }
  panel();
}
// ----- Interfaz -----
let tAviso = 0;
function aviso(t) { $("aviso").textContent = t; $("aviso").hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => ($("aviso").hidden = true), 2500); }
function panel(soloTexto) {
  const z = $("acciones"); if (!soloTexto) z.innerHTML = "";
  const boton = (t, f, off) => { const b = document.createElement("button"); b.className = "btn"; b.textContent = t; b.disabled = !!off; b.addEventListener("click", f); z.appendChild(b); };
  if (!soloTexto) ["r", "c", "g"].forEach((k) => boton("+ " + UN[k].nom + " $" + UN[k].costo, () => { if (dinero < UN[k].costo) return aviso("No alcanza el dinero"); dinero -= UN[k].costo; sel = crearUnidad(k); colocar = null; panel(); }));
  if (!soloTexto) boton("Siguiente libre", () => { const l = us.filter((u) => !u.o); if (!l.length) return aviso("Todos están ocupados"); const j = l.indexOf(sel); sel = l[(j + 1) % l.length]; const c = P(sel.x, sel.y); cam.x += W / 2 - c[0]; cam.y += H / 2 - c[1]; panel(); });
  if (!soloTexto && sel && sel.k == "c") ["almacen", "torre"].forEach((k) => boton((colocar == k ? "Toca el mapa: " : "") + ED[k].nom + " $" + ED[k].costo, () => { colocar = colocar == k ? null : k; panel(); }));
  if (!soloTexto && sel && sel.k == "h") {
    boton("Hacer 2 tablones (1 tronco)", () => { const v = sel.inv; if (!cuenta(v, "tronco")) return aviso("Necesitas 1 tronco"); quitar(v, "tronco", 1); if (espacio(v, "tablon") < 2) { anadir(v, "tronco", 1); return aviso("Inventario lleno"); } anadir(v, "tablon", 2); invHud(); });
    [["cajonM", "Cajón de madera"], ["cajonN", "Cajón de minerales"]].forEach(([k, n]) => boton((colocar == k ? "Toca el mapa: " : "") + n + " (4 tablones)", () => { if (cuenta(sel.inv, "tablon") < 4) return aviso("Necesitas 4 tablones"); colocar = colocar == k ? null : k; panel(); }));
  }
  if (!soloTexto && sel && sel.inv && sel.w) {
    const acepta = (t) => (sel.k == "cajonM") == MADERA.includes(t), cerca = () => { const h = heroe(); return h && Math.hypot(h.x - sel.x - .5, h.y - sel.y - .5) < 2.5; };
    boton("Guardar", () => { if (!cerca()) return aviso("Acércate al cajón"); pasar(heroe().inv, sel.inv, acepta); invHud(); panel(); });
    boton("Sacar todo", () => { if (!cerca()) return aviso("Acércate al cajón"); pasar(sel.inv, heroe().inv, () => true); invHud(); panel(); });
  }
  const s = $("seleccion");
  if (!sel) s.textContent = us.length ? "Toca una unidad para elegirla y luego toca el mapa para darle una orden." : "Compra tu primer soldado con los botones de abajo: cuestan $10 cada uno.";
  else if (sel.inv) s.textContent = ED[sel.k].nom + " · " + (sel.inv.length ? sel.inv.map((x) => ITEM[x.t] + " ×" + x.n).join(", ") : "vacío") + " · " + sel.inv.length + "/" + RANURAS + " ranuras (hasta " + STACK + " por ranura)";
  else if (sel.w) s.textContent = ED[sel.k].nom + " · vida " + Math.ceil(sel.hp) + "/" + sel.mh + (sel.prog < 1 ? " · en obra" : "");
  else s.textContent = UN[sel.k].nom + " · vida " + Math.ceil(sel.hp) + "/" + sel.mh + " · golpe " + UN[sel.k].dmg + " · " + ({ r: "toca un recurso para juntarlo", c: "toca una obra o edificio dañado; o elige qué construir", g: "toca el mapa para explorar o un animal para atacar", h: "toca el mapa para moverte, un árbol o roca para picarlo (10 golpes) o un animal para atacar" })[sel.k];
}
function invHud() {
  const h = heroe(), z = $("inv"); z.innerHTML = ""; if (!h) return;
  for (let i = 0; i < RANURAS; i++) { const s = h.inv[i], d = document.createElement("span"); d.className = "ranura" + (s ? " llena" : ""); d.textContent = s ? ITEM[s.t] + " ×" + s.n : ""; z.appendChild(d); }
}
function hud() {
  $("dinero").textContent = "$" + Math.floor(dinero); invHud();
  $("pobl").textContent = us.length + " unidades"; $("botin").textContent = "🥩 " + stock.carne + " · Piel " + stock.piel + " · Cuero " + stock.cuero;
}
function ajustar() { const d = devicePixelRatio || 1, r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener("resize", ajustar);
// ----- Reino: lista de soldados -----
const ESTADO = (u) => !u.o ? "libre" : u.o.t == "mov" ? "caminando" : u.o.t == "atk" ? "atacando" : u.o.t == "con" ? "construyendo" : u.o.t == "pic" ? "picando" : u.o.f == "cav" ? "juntando" : u.o.f == "vol" ? "llevando carga" : "yendo al recurso";
let sigReino = "";
function reino(forzar) {
  const z = $("reino"); if (z.hidden) return;
  const sig = us.map((u) => u.k + Math.ceil(u.hp) + ESTADO(u)).join("|") + (sel ? us.indexOf(sel) : "");
  if (!forzar && sig == sigReino) return; sigReino = sig; z.innerHTML = "";
  const cuenta = (k) => us.filter((u) => u.k == k).length, t = document.createElement("div"); t.className = "resumen";
  t.textContent = "Soldados: " + us.length + "  ·  🔨 " + cuenta("c") + "  ⚔️ " + cuenta("g") + "  ⛏️ " + cuenta("r"); z.appendChild(t);
  if (!us.length) { const p = document.createElement("p"); p.textContent = "Todavía no tienes soldados. Compra el primero con los botones de abajo."; z.appendChild(p); }
  us.forEach((u) => {
    const b = document.createElement("button"); b.className = "soldado" + (u === sel ? " activo" : "");
    b.textContent = UN[u.k].ico + " " + UN[u.k].nom + " · vida " + Math.ceil(u.hp) + "/" + u.mh + " · " + ESTADO(u);
    b.addEventListener("click", () => { sel = u; colocar = null; const c = P(u.x, u.y); cam.x += W / 2 - c[0]; cam.y += H / 2 - c[1]; z.hidden = true; panel(); });
    z.appendChild(b);
  });
}
$("bReino").addEventListener("click", () => { $("reino").hidden = !$("reino").hidden; reino(true); });
$("zmas").addEventListener("click", () => zoom(1.2)); $("zmenos").addEventListener("click", () => zoom(.83));
$("otra").addEventListener("click", () => { nuevo(); guardar(); entrar(); });
let ult = performance.now(), th = 0, ta = 0;
// ----- Partidas guardadas (varias, en este dispositivo) y menú -----
const CLAVE = "imperio:partidas";
let slot = null, jugando = false;
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; } };
const escribir = (l) => { try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (e) { aviso("No se pudo guardar la partida"); return false; } };
function estado() {
  return { dinero, oleada, tReloj, tOleada, muertes, cam, expl: Array.from(expl).join(""), bio: Array.from(bio).join(""),
    res: res.map((r, i) => r && [i, r.t, r.n, r.g || 0]).filter(Boolean),
    us: us.map((u) => [u.k, u.x, u.y, u.hp, u.carry.t, u.carry.n, u.o && u.o.t == "rec" ? [u.o.i, u.o.tipo] : 0, u.inv || 0]),
    anim: anim.map((a) => [a.k, a.x, a.y, a.hp, a.g || 0]), stock, eds: eds.map((b) => [b.k, b.x, b.y, b.hp, b.prog, b.inv || 0]), enem: enem.map((e) => [e.x, e.y, e.hp, e.mh]) };
}
function cargar(s) {
  res = new Array(N * N).fill(null); bloq = new Uint8Array(N * N); vis = new Uint8Array(N * N); expl = Uint8Array.from(s.expl.split(""), Number);
  bio = s.bio ? Uint8Array.from(s.bio.split(""), Number) : new Uint8Array(N * N); bio.forEach((v, i) => v == 3 && (bloq[i] = 1)); // partidas viejas: todo llanura
  s.res.forEach(([i, t, n, g]) => { res[i] = { t, n, g: g || 0 }; bloq[i] = 1; });
  eds = []; s.eds.forEach(([k, x, y, hp, prog, inv]) => { const b = ponerEdificio(k, x, y, true); b.hp = hp; b.prog = prog; if (inv) b.inv = inv; });
  us = s.us.map(([k, x, y, hp, ct, cn, o, inv]) => ({ k, x, y, hp, mh: UN[k].hp, p: [], cd: 0, inv: inv || (k == "h" ? [] : null), carry: { t: ct, n: cn }, o: o ? { t: "rec", i: o[0], tipo: o[1], f: cn >= 5 ? "vol" : "ir" } : null }));
  enem = s.enem.map(([x, y, hp, mh]) => ({ k: "e", x, y, hp, mh, cd: 0 }));
  ({ dinero, oleada, tReloj, tOleada, muertes, cam } = s); anim = (s.anim || []).map(([k, x, y, hp, g]) => ({ ...nuevoAnimal(k, x, y), hp, g })); stock = s.stock || { carne: 0, piel: 0, cuero: 0 };
  if (!us.some((u) => u.k == "h")) crearUnidad("h"); sel = heroe(); // partidas viejas: se agrega el personaje fx = []; sel = null; colocar = null; fin = false; pend = 0;
}
function guardar() {
  if (!slot) return; const l = leer(), i = l.findIndex((p) => p.id == slot.id), p = { id: slot.id, nombre: slot.nombre, fecha: Date.now(), estado: estado() };
  if (i < 0) l.push(p); else l[i] = p; escribir(l);
}
function pantalla(id) { $("menu").hidden = !id; ["mPrincipal", "mPers", "mNiv"].forEach((m) => ($(m).hidden = m != id)); $("datos").hidden = !!id; $("bMenu").hidden = !!id; $("bReino").hidden = !!id; if (id) $("reino").hidden = true; if (id == "mPers") listar(); }
function entrar() { $("fin").hidden = true; jugando = true; pantalla(null); ult = performance.now(); panel(); }
function listar() {
  const z = $("partidas"), l = leer().sort((a, b) => b.fecha - a.fecha); z.innerHTML = "";
  if (!l.length) z.textContent = "Todavía no tienes partidas. Crea la primera.";
  l.forEach((p) => {
    const f = document.createElement("div"), t = document.createElement("span"), j = document.createElement("button"), d = document.createElement("button");
    f.className = "fila"; t.innerHTML = "<b></b><small></small>"; t.firstChild.textContent = p.nombre;
    t.lastChild.textContent = "$" + Math.floor(p.estado.dinero) + " · " + new Date(p.fecha).toLocaleDateString();
    j.className = "btn"; j.textContent = "Jugar"; j.addEventListener("click", () => { slot = { id: p.id, nombre: p.nombre }; cargar(p.estado); entrar(); });
    d.className = "btn sec"; d.textContent = "Borrar"; d.addEventListener("click", () => { if (confirm("¿Borrar «" + p.nombre + "»?")) { escribir(leer().filter((x) => x.id != p.id)); listar(); } });
    f.append(t, j, d); z.appendChild(f);
  });
}
$("bPers").addEventListener("click", () => pantalla("mPers")); $("bNiv").addEventListener("click", () => pantalla("mNiv"));
$("vPers").addEventListener("click", () => pantalla("mPrincipal")); $("vNiv").addEventListener("click", () => pantalla("mPrincipal"));
$("crear").addEventListener("click", () => {
  const nombre = $("nombre").value.trim() || "Partida " + (leer().length + 1); $("nombre").value = "";
  slot = { id: Date.now().toString(36), nombre }; nuevo(); guardar(); entrar();
});
$("bMenu").addEventListener("click", () => { guardar(); jugando = false; pantalla("mPrincipal"); });
addEventListener("pagehide", () => jugando && !fin && guardar());
document.addEventListener("visibilitychange", () => document.hidden && jugando && !fin && guardar());
ajustar(); pantalla("mPrincipal");
(function bucle(n) {
  const dt = Math.min(.05, (n - ult) / 1000); ult = n;
  if (jugando) {
    tick(dt); dibujar();
    if ((th += dt) > .25) { th = 0; hud(); if (sel) panel(true); reino(); }
    if ((ta += dt) > 5) { ta = 0; if (!fin) guardar(); }
  }
  requestAnimationFrame(bucle);
})(ult);
