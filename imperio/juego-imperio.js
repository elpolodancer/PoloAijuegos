// Ruta: imperio/juego-imperio.js
// Imperio: estrategia isométrica. Recolectores juntan y venden recursos, constructores levantan y reparan,
// guerreros exploran y atacan; el personaje principal pica, fabrica tablones y construye cajones.
import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
const VEL = .23; // casillas por segundo por cada punto de velocidad (humano = 10 → 2.3 casillas/s)
const N_ORIGINAL = 44, AREA_X = 5; // las partidas viejas son de 44×44; el mapa nuevo tiene 5 veces esa área (ponle 25 para un lado 5 veces mayor)
const N_NUEVO = Math.round(N_ORIGINAL * Math.sqrt(AREA_X)); // 98×98
let N = N_NUEVO; // lado del mapa de la partida en curso (al cargar una partida vieja vuelve a 44)
const TW = 32, TH = 16, $ = (id) => document.getElementById(id);
const RES = {
  arbol: { nom: "Madera", v: 1, n: 6, c: "#2e7d32" }, roca: { nom: "Piedra", v: 1, n: 8, c: "#9aa0a6" },
  carbon: { nom: "Carbón", v: 2, n: 8, c: "#2b2b2b" }, cobre: { nom: "Cobre", v: 3, n: 8, c: "#d2793a" },
  hierro: { nom: "Hierro", v: 4, n: 8, c: "#c9d3e6" }, oro: { nom: "Oro", v: 8, n: 8, c: "#ffd23f" },
  diamante: { nom: "Diamante", v: 20, n: 6, c: "#4de1ff" }, plata: { nom: "Plata", v: 5, n: 8, c: "#cfd8e3" },
  mina: { nom: "Mina", v: 0, n: 500, c: "#6b7080" }, // mina: 500 de material repartido (ver MINA_REPARTO)
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
// ----- Minas -----
// Cada mina guarda 500 de material: 10 % oro, 20 % plata, 30 % cobre y 40 % carbón. Al picarla sale un material al azar
// en proporción a lo que le queda, así que al agotarla siempre entregó exactamente 50 / 100 / 150 / 200.
const MINA_TOTAL = 500, MINA_REPARTO = { oro: .1, plata: .2, cobre: .3, carbon: .4 }, MATS_MINA = ["oro", "plata", "cobre", "carbon"];
// Cuántas minas hacen falta: el oro manda (cada castillo pide 500 de oro y cada mina solo da 50 → 10 minas por castillo).
// Se piensa en 5 castillos (el tuyo + 4 enemigos) y se deja 50 % de margen por minas lejanas, enemigos que las vacían, etc.
const CASTILLOS = 5, ORO_CASTILLO = 500, MARGEN_MINAS = 1.5;
const NUM_MINAS = Math.ceil(CASTILLOS * ORO_CASTILLO / (MINA_TOTAL * MINA_REPARTO.oro) * MARGEN_MINAS); // 75
const SEPARACION_MINAS = 6; // casillas mínimas entre una mina y otra (si no caben, baja a 5 y luego a 4)
const SIN_MOBS = 15;        // radio (casillas) alrededor de donde aparece el jugador sin animales hostiles
// Sitios de las bases: la tuya (arriba a la izquierda) y hasta 4 enemigas. Ahí no hay agua y siempre hay llanura.
const basesMapa = () => [[9, 9], [N - 10, N - 10], [N - 10, 9], [9, N - 10], [N >> 1, N >> 1]];
const nuevaMina = () => { const m = { t: "mina", n: MINA_TOTAL }; let resto = MINA_TOTAL; for (const k of MATS_MINA.slice(0, -1)) { m[k] = Math.round(MINA_TOTAL * MINA_REPARTO[k]); resto -= m[k]; } m[MATS_MINA[MATS_MINA.length - 1]] = resto; return m; };
function materialMina(r) { // material al azar según lo que le queda a la mina
  let x = Math.random() * MATS_MINA.reduce((a, m) => a + (r[m] || 0), 0);
  for (const m of MATS_MINA) if (r[m] > 0 && (x -= r[m]) < 0) return m;
  return MATS_MINA.find((m) => r[m] > 0);
}
function sacar(u, r) { // qué material saca la unidad en este golpe (null = primero debe ir a dejar lo que lleva)
  if (r.t != "mina") return r.t;
  if (u.carry.n) return MATS_MINA.includes(u.carry.t) && r[u.carry.t] > 0 ? u.carry.t : null; // cada viaje lleva un solo material
  return materialMina(r);
}
const mismoRecurso = (carga, r) => (r.t == "mina" ? MATS_MINA.includes(carga) : carga == r.t);
function gastar(i, r, it, k = 1) { if (r.t == "mina") r[it] -= k; r.n -= k; if (r.n <= 0) { res[i] = null; bloq[i] = 0; } } // la mina o el recurso desaparece al agotarse
// Sin hostiles cerca de donde aparece el jugador (por si un lobo del borde de la manada quedó dentro del radio)
function quitarHostilesCerca(h) { if (h) anim = anim.filter((a) => !(ANI[a.k].dmg > 0 && Math.hypot(a.x - h.x, a.y - h.y) < SIN_MOBS)); }
const ITEM = { tronco: "Tronco", tablon: "Tablón", roca: "Piedra", carbon: "Carbón", cobre: "Cobre", hierro: "Hierro", oro: "Oro", diamante: "Diamante", plata: "Plata" };
const MADERA = ["tronco", "tablon"], STACK = 20, RANURAS = 10; // cada ranura guarda un solo material, hasta 20 (el personaje tiene 10 ranuras; el baúl, 20)
const COSTO_FAB = { poste: 2, baul: 4, cajonM: 4, cajonN: 4 }; // tablones que cuesta cada cosa que fabrica el personaje
const ES_CONT = ["baul", "cajonM", "cajonN"]; // las que guardan objetos
const espacio = (inv, t, r = RANURAS) => inv.filter((s) => s.t == t).reduce((a, s) => a + STACK - s.n, 0) + (r - inv.length) * STACK;
const cuenta = (inv, t) => inv.filter((s) => s.t == t).reduce((a, s) => a + s.n, 0);
function anadir(inv, t, n) { for (const s of inv) if (s.t == t && n > 0) { const k = Math.min(n, STACK - s.n); s.n += k; n -= k; } while (n > 0) { const k = Math.min(n, STACK); inv.push({ t, n: k }); n -= k; } }
function quitar(inv, t, n) { for (let i = inv.length - 1; i >= 0 && n > 0; i--) { const s = inv[i]; if (s.t != t) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) inv.splice(i, 1); } }
function pasar(de, a, ok, r = RANURAS) { de.slice().forEach((s) => { if (!ok(s.t)) return; const k = Math.min(cuenta(de, s.t), espacio(a, s.t, r)); if (k > 0) { quitar(de, s.t, k); anadir(a, s.t, k); } }); }
const heroe = () => us.find((u) => u.k == "h");
const ED = {
  poste: { nom: "Poste de imperio", w: 1, hp: 120, c: "#c0392b" }, baul: { nom: "Baúl", w: 1, hp: 80, c: "#8b5a2b", ran: 20 }, cajonM: { nom: "Cajón de madera", w: 1, hp: 60, c: "#a1763f" }, cajonN: { nom: "Cajón de minerales", w: 1, hp: 60, c: "#6b7280" }, centro: { nom: "Castillo destruido", w: 2, hp: 400, c: "#9e9588" }, refugio: { nom: "Refugio", w: 2, hp: 200, c: "#8d6e63" }, almacen: { nom: "Almacén", costo: 60, w: 1, hp: 150, c: "#a47148" }, torre: { nom: "Torre", costo: 120, w: 1, hp: 200, c: "#8a8fa3" } };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const capac = (b) => ED[b.k].ran || RANURAS; // ranuras de un contenedor
const cv = $("lienzo"), cx = cv.getContext("2d");
let W, H, cam, anim, stock, bio, res, bloq, vis, expl, us, eds, enem, fx, dinero, oleada, tReloj, tOleada, sel, colocar, fin, muertes, pend;
let zona = new Uint8Array(N * N), grupos = [], nPostes = 0, grSel = null, moverGrupo = null; // zona del imperio, grupos de tropas y estado de los paneles

function nuevo() {
  N = N_NUEVO; // partida nueva: mapa grande (aunque antes se haya abierto una vieja de 44×44)
  res = new Array(N * N).fill(null); bloq = new Uint8Array(N * N); expl = new Uint8Array(N * N); vis = new Uint8Array(N * N);
  us = []; eds = []; anim = []; stock = { carne: 0, piel: 0, cuero: 0, fibra: 0 }; enem = []; fx = []; dinero = 250; oleada = 0; tReloj = 0; tOleada = 70; sel = null; colocar = null; fin = false; muertes = 0; pend = 0;
  grupos = []; grSel = null; moverGrupo = null; nPostes = 0; zona = new Uint8Array(N * N);
  generarMapa();
  ponerEdificio("centro", 8, 8, true); ponerRefugio(); sel = crearUnidad("h"); quitarHostilesCerca(sel);
  cam = { x: W / 2 - 0 * TW, y: H / 3, z: 1 };
  cam.x = W / 2; cam.y = H / 3 - 17 * TH;
}
// Biomas: 0 llanura, 1 bosque, 2 rocoso, 3 agua, 4 playa
function generarMapa() {
  bio = new Uint8Array(N * N);
  const BASES = basesMapa(), esc = (N * N) / (N_ORIGINAL * N_ORIGINAL); // esc = cuántas veces más grande es el área que la del mapa original
  const cercaDeBase = (x, y, r) => BASES.some(([bx, by]) => Math.hypot(x - bx, y - by) < r);
  const sem = [{ x: 9, y: 9, t: 0 }]; // zonas de tierra: semillas aleatorias (la más cercana manda), más semillas mientras más grande el mapa
  const TIPOS = [0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 2];
  for (let k = 0, n = Math.round(11 * esc); k < n; k++) sem.push({ x: Math.random() * N, y: Math.random() * N, t: TIPOS[k % TIPOS.length] });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let m = 1e9, t = 0; for (const q of sem) { const d = Math.hypot(q.x - x, q.y - y) + Math.random() * 1.5; if (d < m) { m = d; t = q.t; } }
    bio[y * N + x] = cercaDeBase(x, y, 6) ? 0 : t; // alrededor de cada base siempre hay llanura
  }
  const agua = (x, y) => { if (x >= 0 && y >= 0 && x < N && y < N && !cercaDeBase(x, y, 8)) bio[y * N + x] = 3; };
  const borde = (Math.random() * 4) | 0, a = Math.random() * 6, b = Math.random() * 6; // el mar siempre toca un borde
  for (let i = 0; i < N; i++) {
    const prof = Math.round(4 + 2 * Math.sin(i * .22 + a) + 1.5 * Math.sin(i * .5 + b));
    for (let k = 0; k < prof; k++) borde == 0 ? agua(i, k) : borde == 1 ? agua(i, N - 1 - k) : borde == 2 ? agua(k, i) : agua(N - 1 - k, i);
  }
  for (let l = Math.round((Math.random() < .6 ? 2 : 1) * esc); l > 0; l--) { // lagos tierra adentro (más mientras más grande el mapa)
    const lx = 10 + Math.random() * (N - 20), ly = 10 + Math.random() * (N - 20), r = 2.5 + Math.random() * 2;
    for (let y = Math.max(0, (ly - r - 2) | 0); y < Math.min(N, ly + r + 2); y++) for (let x = Math.max(0, (lx - r - 2) | 0); x < Math.min(N, lx + r + 2); x++) if (Math.hypot(x - lx, y - ly) < r + Math.random() * .8) agua(x, y);
  }
  // Tierra firme: lo que se puede recorrer a pie desde tu base sin cruzar agua (los árboles se pueden talar, así que no cuentan)
  const alcance = () => { const v = new Uint8Array(N * N), q = [9 * N + 9]; v[9 * N + 9] = 1; for (let i = 0; i < q.length; i++) { const c = q[i]; for (const [dx, dy] of D4) { const a = (c % N) + dx, b = ((c / N) | 0) + dy, j = b * N + a; if (a >= 0 && b >= 0 && a < N && b < N && !v[j] && bio[j] != 3) { v[j] = 1; q.push(j); } } } return v; };
  let alc = alcance();
  for (const [bx, by] of BASES.slice(1)) if (!alc[by * N + bx]) { // una base enemiga quedó en una isla: se le tiende un puente de tierra hasta tu base
    let x = bx, y = by;
    while (x != 9 || y != 9) {
      if (x != 9 && (y == 9 || Math.random() < .5)) x += x > 9 ? -1 : 1; else y += y > 9 ? -1 : 1;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < N && b < N && bio[b * N + a] == 3) bio[b * N + a] = 0; }
    }
    alc = alcance();
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

  // ----- Minas: NUM_MINAS en todo el mapa, separadas entre sí (nada de racimos) -----
  const minas = [];
  const aptaMina = (x, y) => { const i = y * N + x; return alc[i] && x >= 2 && y >= 2 && x < N - 2 && y < N - 2 && !res[i] && !bloq[i] && (bio[i] == 0 || bio[i] == 1 || bio[i] == 2) && !cercaDeBase(x, y, 5); };
  const lejos = (x, y, d) => minas.every(([a, b]) => Math.hypot(a - x, b - y) >= d);
  const candidatas = (f) => { // casillas que cumplen f, en orden aleatorio
    const l = []; for (let i = 0; i < N * N; i++) if (f(i % N, (i / N) | 0)) l.push(i);
    for (let k = l.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [l[k], l[j]] = [l[j], l[k]]; }
    return l;
  };
  const ponerMina = (x, y) => { res[y * N + x] = nuevaMina(); bloq[y * N + x] = 1; minas.push([x, y]); };
  for (const [bx, by] of BASES) { // 2 minas a 9–18 casillas de cada base, para que nadie empiece sin minerales cerca
    let n = 0;
    for (const i of candidatas((x, y) => aptaMina(x, y) && Math.hypot(x - bx, y - by) >= 9 && Math.hypot(x - bx, y - by) <= 18)) {
      if (n >= 2) break; const x = i % N, y = (i / N) | 0;
      if (lejos(x, y, SEPARACION_MINAS)) { ponerMina(x, y); n++; }
    }
  }
  for (const [d, zona] of [[SEPARACION_MINAS, [2]], [SEPARACION_MINAS, [0, 1, 2]], [SEPARACION_MINAS - 1, [0, 1, 2]], [SEPARACION_MINAS - 2, [0, 1, 2]]]) { // primero zonas rocosas; si no alcanzan, cualquier tierra
    if (minas.length >= NUM_MINAS) break;
    for (const i of candidatas((x, y) => aptaMina(x, y) && zona.includes(bio[y * N + x]))) {
      if (minas.length >= NUM_MINAS) break; const x = i % N, y = (i / N) | 0;
      if (lejos(x, y, d)) ponerMina(x, y);
    }
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
  // animales por zona: [animal, probabilidad por casilla]. Los hostiles (oso, lobo, guepardo) no aparecen a menos de SIN_MOBS casillas de donde empieza el jugador; los demás, a menos de 12.
  const SP = [[["conejo", .012], ["gallina", .008], ["guepardo", .004]], [["conejo", .008], ["lobo", .003], ["oso", .005]], [["lagartija", .01], ["lobo", .0012], ["oso", .003]], null, [["lagartija", .01]]];
  for (let i = 0; i < N * N; i++) {
    const x = i % N, y = (i / N) | 0; if (bloq[i] || !SP[bio[i]]) continue;
    const d = Math.hypot(x - 9.5, y - 9.5);
    for (const [k, p] of SP[bio[i]]) { if (d < (ANI[k].dmg > 0 ? SIN_MOBS : 12)) continue; if (Math.random() < p) { k == "lobo" ? manada(x, y) : anim.push(nuevoAnimal(k, x + .5, y + .5)); break; } }
  }
  if (!anim.some((a) => a.k == "lobo")) { // siempre hay al menos una manada
    const c = []; bio.forEach((v, i) => (v == 1 || v == 2) && !bloq[i] && Math.hypot(i % N - 9.5, ((i / N) | 0) - 9.5) >= SIN_MOBS + 3 && c.push(i));
    if (c.length) { const i = c[(Math.random() * c.length) | 0]; manada(i % N, (i / N) | 0); }
  }
}
function ponerEdificio(k, x, y, listo) {
  const w = ED[k].w, b = { k, x, y, w, mh: ED[k].hp, hp: listo ? ED[k].hp : ED[k].hp * .1, prog: listo ? 1 : 0, cd: 0 };
  for (let i = 0; i < w; i++) for (let j = 0; j < w; j++) bloq[(y + j) * N + x + i] = 1;
  eds.push(b); return b;
}
// Refugio: estructura inicial donde se crean las tropas, pegada al castillo destruido (8,8; 2×2).
// En partidas viejas que no lo tienen se agrega al cargar; si el sitio ideal está ocupado, busca el hueco libre más cercano.
function ponerRefugio() {
  if (eds.some((b) => b.k == "refugio")) return;
  const w = ED.refugio.w;
  const ok = (x, y) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const a = x + i, b = y + j; if (a < 0 || b < 0 || a >= N || b >= N || bloq[b * N + a] || bio[b * N + a] == 3) return false; } return true; };
  for (const [x, y] of [[11, 8], [11, 10], [6, 8], [8, 11], [8, 6]]) if (ok(x, y)) return ponerEdificio("refugio", x, y, true);
  for (let r = 3; r < 10; r++) for (let y = 8 - r; y <= 8 + r; y++) for (let x = 8 - r; x <= 8 + r; x++) if (ok(x, y)) return ponerEdificio("refugio", x, y, true);
}
function crearUnidad(k) { // el personaje aparece junto a la base; las tropas, en el punto de reunión de su grupo
  let bx = 9, by = 9, gr = null;
  if (k != "h") { // las tropas salen por el lado sur del refugio y de ahí caminan a su punto de reunión
    gr = asignarGrupo(); const rf = eds.find((b) => b.k == "refugio" && b.hp > 0);
    if (rf) { bx = rf.x; by = rf.y + rf.w; } else { bx = grupos[gr].x | 0; by = grupos[gr].y | 0; }
  }
  for (let r = k == "h" ? 2 : 1; r < 6; r++) for (let a = 0; a < 40; a++) {
    const x = bx + ((Math.random() * (2 * r + 1)) | 0) - r, y = by + ((Math.random() * (2 * r + 1)) | 0) - r;
    if (x >= 0 && y >= 0 && x < N && y < N && !bloq[y * N + x]) { const u = { k, x: x + .5, y: y + .5, hp: UN[k].hp, mh: UN[k].hp, p: [], o: null, cd: 0, carry: { t: null, n: 0 }, inv: k == "h" ? [] : null, gr, reu: true }; us.push(u); return u; }
  }
}
// ----- Ruta (BFS por casillas) -----
function ruta(u, tx, ty, cerca) {
  const s = (u.y | 0) * N + (u.x | 0), prev = new Int32Array(N * N).fill(-2), q = [s]; prev[s] = -1; let f = -1;
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
  const o = u.o; if (o) { if (u.pr && u.pr.length) u.pr = []; if (o.t != "tar") u.reu = false; } // una orden manual deja a la unidad «suelta» (ya no vuelve sola al grupo)
  if (!o) { if (u.k != "h" && u.reu) inactivo(u, dt); return; } // sin órdenes se queda quieta (las del grupo se juntan en su punto de reunión)
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
      if (o.t0 >= 1) { o.t0 = 0; if (!golpeRes(u, i)) u.o = null; }
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
  if (o.t == "tar") { // tarea de grupo: junta madera o minerales y los guarda en un cofre dentro de la zona del imperio
    const g = grupos[u.gr];
    if (!g || g.tarea != o.cat) { u.o = null; return; } // la tarea cambió o se detuvo
    const r = res[o.i], rx = o.i % N, ry = (o.i / N) | 0;
    if (o.f == "ir") {
      if (o.i < 0 || !r) { const j = buscarCat(u, CAT[o.cat]); if (j < 0) { if (u.carry.n) o.f = "vol"; else { u.o = null; u.rt2 = 5; } } else { o.i = j; u.p = []; } return; }
      if (distRect(u, rx, ry, 1) < 1.6) { o.f = "cav"; o.t0 = 0; } else if (!paso(u, dt)) { u.p = ruta(u, rx, ry, 1); if (!u.p.length) { u.o = null; u.rt2 = 5; } }
    } else if (o.f == "cav") {
      if (!r) { o.f = u.carry.n ? "vol" : "ir"; o.i = -1; return; }
      if (u.carry.n && !mismoRecurso(u.carry.t, r)) { o.f = "vol"; return; } // primero deja lo que lleva
      o.t0 += dt;
      if (o.t0 >= 1) { o.t0 = 0; const it = sacar(u, r); if (!it) { o.f = "vol"; return; } u.carry.t = it; u.carry.n++; gastar(o.i, r, it); if (u.carry.n >= 5) o.f = "vol"; }
    } else {
      if (!u.carry.n) { o.f = "ir"; o.i = -1; return; }
      const item = itemDe(u.carry.t), c = cofreDestino(u, item);
      if (!c) { g.tarea = null; u.o = null; aviso("Grupo " + (u.gr + 1) + ": no hay cofre con espacio, tarea detenida"); return; }
      if (distRect(u, c.x, c.y, c.w) < 1.6) { const k = Math.min(u.carry.n, espacio(c.inv, item, capac(c))); anadir(c.inv, item, k); u.carry.n -= k; if (!u.carry.n) { o.f = "ir"; o.i = -1; } }
      else if (!paso(u, dt)) { u.p = ruta(u, c.x, c.y, c.w); if (!u.p.length) { u.o = null; u.rt2 = 5; } }
    }
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
        o.t0 = 0; const it = sacar(u, r); if (!it) { o.f = "vol"; return; } if (u.carry.t != it) u.carry = { t: it, n: 0 };
        u.carry.n++; gastar(i, r, it);
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
// Puntos al perfil: se juntan en «pend» y se anotan en la cola local (compartido/cola-puntos.js); progreso.js los envía si hay sesión e internet
function enviarPuntos() {
  const p = Math.floor(pend) || 0; pend = (pend || 0) - p; // «pend» aún no existe si todavía no se empezó ninguna partida
  if (p > 0) encolarPuntos("imperio", p);
  import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
}
function puntos(n) { pend += n; if (pend >= 10 || (fin && pend > 0)) enviarPuntos(); }
// ----- Zona del imperio (postes), grupos de tropas y tareas -----
const MAX_GRUPO = 10, RADIO_ZONA = 6; // tropas por grupo; radio (en casillas) que marca cada poste de imperio
const CAT = { madera: ["arbol"], mineral: ["roca", "mina", "carbon", "cobre", "plata", "hierro", "oro", "diamante"] };
const itemDe = (t) => (t == "arbol" ? "tronco" : t);
const aceptaCont = (b, t) => b.k == "baul" || (b.k == "cajonM") == MADERA.includes(t);
const zonaOk = (i, k) => (k == "poste" ? !nPostes || zona[i] : k in COSTO_FAB ? zona[i] : true); // poste: el primero va libre, los demás dentro de la zona; cofres: siempre dentro de la zona
function recalcZona() {
  zona = new Uint8Array(N * N);
  eds.forEach((b) => {
    if (b.k != "poste" || b.prog < 1) return;
    for (let y = Math.max(0, b.y - RADIO_ZONA); y <= Math.min(N - 1, b.y + RADIO_ZONA); y++) for (let x = Math.max(0, b.x - RADIO_ZONA); x <= Math.min(N - 1, b.x + RADIO_ZONA); x++) if (Math.hypot(x - b.x, y - b.y) <= RADIO_ZONA) zona[y * N + x] = 1;
  });
}
const contenedores = () => eds.filter((b) => ES_CONT.includes(b.k) && b.prog >= 1 && b.hp > 0 && b.inv && zona[b.y * N + b.x]); // solo cuentan los cofres dentro de la zona
const cofreDestino = (u, item) => contenedores().filter((b) => aceptaCont(b, item) && espacio(b.inv, item, capac(b)) >= 1).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
const cofreListo = (tarea) => { const it = tarea == "madera" ? "tronco" : "roca"; return contenedores().some((b) => aceptaCont(b, it) && espacio(b.inv, it, capac(b)) >= 1); };
function buscarCat(u, lista) { let m = -1, md = 1e9; res.forEach((r, i) => { if (r && lista.includes(r.t) && expl[i]) { const d = Math.hypot(i % N - u.x, ((i / N) | 0) - u.y); if (d < md) { md = d; m = i; } } }); return m; }
function libreCerca(x, y) { // centro de la casilla libre más cercana
  let m = null, md = 1e9;
  for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) { const a = (x | 0) + i, b = (y | 0) + j; if (a < 0 || b < 0 || a >= N || b >= N || bloq[b * N + a]) continue; const d = Math.hypot(a + .5 - x, b + .5 - y); if (d < md) { md = d; m = { x: a + .5, y: b + .5 }; } }
  return m || { x: 10.5, y: 10.5 };
}
function nuevoRally(id) { const p = eds.find((b) => b.k == "refugio") || eds.find((b) => b.k == "poste"), bx = p ? p.x + p.w / 2 : 10, by = p ? p.y + p.w + .5 : 11, a = id * 2.1, r = Math.min(5, 2.5 + (id >> 1) * 1.5); return libreCerca(bx + Math.cos(a) * r, by + Math.sin(a) * r); }
function asignarGrupo() { // el primer grupo con menos de 10 tropas; si todos están llenos, uno nuevo
  for (let id = 0; id < grupos.length; id++) if (us.filter((u) => u.gr === id).length < MAX_GRUPO) return id;
  const id = grupos.length, q = nuevoRally(id); grupos.push({ id, x: q.x, y: q.y, tarea: null }); return id;
}
function hueco(u) { // lugar de la unidad alrededor del punto de reunión de su grupo
  const g = grupos[u.gr]; if (!g) return null;
  if (bloq[(g.y | 0) * N + (g.x | 0)]) { const q = libreCerca(g.x, g.y); g.x = q.x; g.y = q.y; }
  let s = 0; for (const o of us) { if (o === u) break; if (o.gr === u.gr) s++; }
  const a = s * 2.4, r = s ? .45 + .3 * Math.sqrt(s) : 0, x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r;
  return x < 0 || y < 0 || x >= N || y >= N || bloq[(y | 0) * N + (x | 0)] ? { x: g.x, y: g.y } : { x, y };
}
function reunir(u, dt) {
  const h = hueco(u); if (!h) return;
  const d = Math.hypot(h.x - u.x, h.y - u.y), enRuta = u.pr && u.pr.length;
  if (d < .1) { u.pr = []; return; }
  if (enRuta) { if (mover(u, u.pr[0].x, u.pr[0].y, dt)) u.pr.shift(); return; }
  if (d < 1.5) { mover(u, h.x, h.y, dt); return; }
  u.rt = (u.rt || 0) - dt; if (u.rt > 0) return; u.rt = 1;
  u.pr = ruta(u, h.x | 0, h.y | 0, 0);
}
function inactivo(u, dt) { // unidad del grupo sin órdenes: empieza la tarea del grupo (si hay cofre) o se reúne con los demás
  const g = grupos[u.gr];
  if (g && g.tarea) {
    u.rt2 = (u.rt2 || 0) - dt;
    if (u.rt2 <= 0) {
      u.rt2 = 2;
      if (!cofreListo(g.tarea)) { g.tarea = null; aviso("Grupo " + (u.gr + 1) + ": falta un cofre con espacio dentro de la zona; tarea detenida"); }
      else if (u.carry.n) { u.o = { t: "tar", cat: g.tarea, i: -1, f: "vol" }; u.p = []; return; }
      else { const j = buscarCat(u, CAT[g.tarea]); if (j >= 0) { u.o = { t: "tar", cat: g.tarea, i: j, f: "ir" }; u.p = []; return; } }
    }
  }
  reunir(u, dt);
}
function asignarTarea(id, tarea) { // tarea: "madera", "mineral" o null (detener y reunir)
  const g = grupos[id]; if (!g) return;
  if (tarea) {
    if (!nPostes) return aviso("Necesitas un poste de imperio");
    if (!cofreListo(tarea)) return aviso("Falta un cofre con espacio dentro de la zona del imperio (" + (tarea == "madera" ? "baúl o cajón de madera" : "baúl o cajón de minerales") + ")");
  }
  g.tarea = tarea;
  us.forEach((u) => { if (u.gr === id) { u.o = null; u.p = []; u.pr = []; u.reu = true; u.rt2 = 0; } });
  aviso("Grupo " + (id + 1) + ": " + (tarea == "madera" ? "recoge madera" : tarea ? "recoge minerales y piedra" : "reunido"));
}
// ----- Control directo del personaje: flechas / WASD para moverse, barra espaciadora o clic para atacar -----
// Un golpe del personaje a un árbol, roca o mineral: a los 10 golpes se rompe y da 4 unidades. Devuelve false si ya no hay nada que picar.
function golpeRes(u, i) {
  const r = res[i]; if (!r) return false;
  r.g = (r.g || 0) + 1;
  if (r.g < 10) return true;
  if (r.t == "mina") { // 10 golpes = hasta 4 unidades de un material (al azar según lo que le queda); la mina sigue hasta agotarse
    const m = materialMina(r), k = Math.min(4, r[m]);
    if (espacio(u.inv, m) < k) { r.g = 9; aviso("Inventario lleno"); return false; }
    anadir(u.inv, m, k); gastar(i, r, m, k); r.g = 0; aviso("+" + k + " " + ITEM[m] + (res[i] ? " · quedan " + r.n + " en la mina" : " · mina agotada"));
    return !!res[i];
  }
  const it = r.t == "arbol" ? "tronco" : r.t;
  if (espacio(u.inv, it) < 4) { r.g = 9; aviso("Inventario lleno"); return false; }
  anadir(u.inv, it, 4); res[i] = null; bloq[i] = 0; aviso("+4 " + ITEM[it]); return false;
}
// Ataca a lo más cercano al alcance (animal, bandido, árbol, roca o mineral). Con clic (w) elige lo que está junto al clic; con la barra, lo que está hacia donde miras.
function atacar(h, w) {
  if (h.cd > 0) return;
  const ALC = 1.7;
  if (w) { const dx = w.x - h.x, dy = w.y - h.y, d = Math.hypot(dx, dy); if (d > .2) h.dir = { x: dx / d, y: dy / d }; }
  const dir = h.dir || { x: .7, y: .7 };
  const puntaje = (x, y, dist) => {
    if (dist > ALC) return null;
    if (w) { const d = Math.hypot(x - w.x, y - w.y); return d < 1.4 ? d : null; }
    const d = Math.hypot(x - h.x, y - h.y) || 1, dot = ((x - h.x) * dir.x + (y - h.y) * dir.y) / d;
    return dot < -.3 && dist > .7 ? null : dist - dot * .8;
  };
  let mejor = null, ms = 1e9;
  enem.concat(anim).forEach((e) => { // los seres vivos tienen prioridad sobre los recursos
    if (!vis[(e.y | 0) * N + (e.x | 0)]) return;
    const s = puntaje(e.x, e.y, Math.hypot(e.x - h.x, e.y - h.y)); if (s != null && s - 1 < ms) { ms = s - 1; mejor = { e }; }
  });
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
    const x = (h.x | 0) + i, y = (h.y | 0) + j; if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const k = y * N + x; if (!res[k] || !expl[k]) continue;
    const s = puntaje(x + .5, y + .5, distRect(h, x, y, 1)); if (s != null && s < ms) { ms = s; mejor = { k }; }
  }
  if (!mejor) return;
  h.cd = .6;
  if (mejor.e) golpe(h, mejor.e, UN.h.dmg);
  else { fx.push({ x1: h.x, y1: h.y, x2: mejor.k % N + .5, y2: ((mejor.k / N) | 0) + .5, t: .15 }); golpeRes(h, mejor.k); }
}
function controlHeroe(dt) {
  const h = heroe(); if (!h) return;
  const t = (...c) => c.some((k) => teclas.has(k));
  const sx = t("ArrowRight", "KeyD") - t("ArrowLeft", "KeyA"), sy = t("ArrowDown", "KeyS") - t("ArrowUp", "KeyW");
  if (sx || sy) { // la pantalla es isométrica: arriba/abajo/izquierda/derecha de la pantalla equivalen a diagonales del mapa
    let wx = sx + sy, wy = sy - sx; const d = Math.hypot(wx, wy); wx /= d; wy /= d;
    h.o = null; h.p = []; h.dir = { x: wx, y: wy };
    const v = UN.h.vel * VEL * dt, nx = h.x + wx * v, ny = h.y + wy * v;
    if (!bloqueado(h, nx, h.y)) h.x = nx;
    if (!bloqueado(h, h.x, ny)) h.y = ny;
    const c = P(h.x, h.y), k = Math.min(1, dt * 5); cam.x += (W / 2 - c[0]) * k; cam.y += (H / 2 - c[1]) * k; // la cámara te sigue
  }
  if (teclas.has("Space")) atacar(h, null);
}
function tick(dt) {
  if (fin) return;
  tReloj += dt; controlHeroe(dt);
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
  const np = eds.filter((b) => b.k == "poste").length; if (np != nPostes) { nPostes = np; recalcZona(); }
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
    if (zona[i]) poly([a, P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], "rgba(255,215,90,.16)"); // zona del imperio
    if (!vis[i]) poly([a, P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], "rgba(5,7,13,.55)");
  }
  if (colocar) { const t = tileMouse; if (t) { const ok = libre(t.x, t.y) && zonaOk(t.y * N + t.x, colocar); poly([P(t.x, t.y), P(t.x + 1, t.y), P(t.x + 1, t.y + 1), P(t.x, t.y + 1)], ok ? "rgba(80,255,120,.5)" : "rgba(255,70,70,.5)"); } }
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
  if (r.t == "mina") { // roca grande con vetas de los 4 materiales; la barra celeste muestra lo que le queda
    cx.fillStyle = "#555a69"; cx.beginPath(); cx.ellipse(c[0], c[1] - 6 * z, 15 * z, 10 * z, 0, 0, 7); cx.fill();
    cx.fillStyle = "#6b7080"; cx.beginPath(); cx.ellipse(c[0], c[1] - 8 * z, 12 * z, 8 * z, 0, 0, 7); cx.fill();
    [["oro", -6, -10], ["plata", 3, -13], ["cobre", 7, -7], ["carbon", -2, -5]].forEach(([m, a, b]) => { cx.fillStyle = RES[m].c; cx.beginPath(); cx.arc(c[0] + a * z, c[1] + b * z, 3 * z, 0, 7); cx.fill(); });
    if (r.n < MINA_TOTAL) barra(c[0], c[1] - 26 * z, r.n / MINA_TOTAL, "#4de1ff");
    return;
  }
  if (r.t == "arbol") { cx.fillStyle = "#5d4037"; cx.fillRect(c[0] - 2 * z, c[1] - 12 * z, 4 * z, 12 * z); cx.fillStyle = d.c; cx.beginPath(); cx.arc(c[0], c[1] - 18 * z, 10 * z, 0, 7); cx.fill(); return; }
  cx.fillStyle = r.t == "roca" ? d.c : "#7b8294"; cx.beginPath(); cx.ellipse(c[0], c[1] - 5 * z, 12 * z, 8 * z, 0, 0, 7); cx.fill();
  if (r.t != "roca") { cx.fillStyle = d.c; [[-5, -7], [3, -9], [5, -4], [-2, -3]].forEach(([a, b]) => { cx.beginPath(); cx.arc(c[0] + a * z, c[1] + b * z, 2.6 * z, 0, 7); cx.fill(); }); }
}
function dibEd(b) {
  if (b.k == "poste") { // poste con bandera
    const z = cam.z, c = P(b.x + .5, b.y + .5);
    cx.strokeStyle = "#6d4c2f"; cx.lineWidth = 3 * z; cx.beginPath(); cx.moveTo(c[0], c[1]); cx.lineTo(c[0], c[1] - 34 * z); cx.stroke();
    cx.fillStyle = "#e53935"; cx.beginPath(); cx.moveTo(c[0], c[1] - 34 * z); cx.lineTo(c[0] + 16 * z, c[1] - 29 * z); cx.lineTo(c[0], c[1] - 24 * z); cx.closePath(); cx.fill();
    if (b.hp < b.mh) barra(c[0], c[1] - 40 * z, b.hp / b.mh, "#59d96b");
    if (sel === b) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.strokeRect(c[0] - 12 * z, c[1] - 38 * z, 24 * z, 42 * z); }
    return;
  }
  const z = cam.z, d = ED[b.k], h = b.k == "torre" ? 40 : b.k == "centro" ? 26 : 14;
  cx.globalAlpha = b.prog < 1 ? .6 : 1; caja(b.x + .1, b.y + .1, b.w - .2, h * (b.prog < 1 ? .4 + b.prog * .6 : 1), d.c); cx.globalAlpha = 1;
  const c = P(b.x + b.w / 2, b.y + b.w / 2); if (b.hp < b.mh) barra(c[0], c[1] - (h + 14) * z, b.hp / b.mh, "#59d96b");
  if (b.k == "centro" || b.k == "refugio") { cx.font = 24 * z + "px system-ui"; cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.fillText(b.k == "centro" ? "🏚️" : "⛺", c[0], c[1] - (h + 2) * z); }
  if (sel === b) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.strokeRect(c[0] - 20 * z, c[1] - (h + 4) * z, 40 * z, h * z + 10 * z); }
}
function dibA(a) {
  const z = cam.z, c = P(a.x, a.y);
  cx.fillStyle = "#0005"; cx.beginPath(); cx.ellipse(c[0], c[1], 9 * z, 4 * z, 0, 0, 7); cx.fill();
  cx.font = 17 * z + "px system-ui"; cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.fillText(ANI[a.k].ico, c[0], c[1] - 2 * z);
  if (a.hp < a.mh) barra(c[0], c[1] - 22 * z, a.hp / a.mh, "#ff9f43");
}
// Aldeano estilo Age of Empires: piernas que caminan, túnica del color de su oficio, brazos, cabeza y herramienta propia.
// paso (-1..1) = vaivén al caminar. Los pies quedan en (x, y).
function hombre(x, y, z, k, col, paso, bob) {
  const R = (a, b, w, h, c) => { cx.fillStyle = c; cx.fillRect(x + a * z, y + (b - bob) * z, w * z, h * z); };
  const piel = "#f0c08a", pant = "#6b4f33", cuero = "#3e2a17";
  const l1 = 8 - Math.max(0, paso) * 2.5, l2 = 8 - Math.max(0, -paso) * 2.5;
  R(-3.6, -l1 + bob, 3.2, l1, pant); R(.4, -l2 + bob, 3.2, l2, pant);          // piernas
  R(-3.6, -1.5 + bob, 3.2, 1.5, cuero); R(.4, -1.5 + bob, 3.2, 1.5, cuero);    // botas
  R(-6.6, -16 + paso * 1.5, 2.4, 7, piel); R(4.2, -16 - paso * 1.5, 2.4, 7, piel); // brazos
  R(-4.6, -17.5, 9.2, 9.5, col); R(-4.6, -11.5, 9.2, 1.6, cuero);               // túnica y cinturón
  cx.fillStyle = piel; cx.beginPath(); cx.arc(x, y + (-21.5 - bob) * z, 4.2 * z, 0, 7); cx.fill(); // cabeza
  const hy = y + (-21.5 - bob) * z;
  if (k == "g") { // casco con cresta y escudo
    cx.fillStyle = "#aab0bb"; cx.beginPath(); cx.arc(x, hy - .3 * z, 4.6 * z, Math.PI, 0); cx.fill(); R(-.9, -29, 1.8, 3.5, col);
    cx.fillStyle = "#c9ccd3"; cx.strokeStyle = "#4f5662"; cx.lineWidth = Math.max(1, z); cx.beginPath(); cx.arc(x - 6.5 * z, y + (-13 - bob) * z, 4.4 * z, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = col; cx.beginPath(); cx.arc(x - 6.5 * z, y + (-13 - bob) * z, 1.8 * z, 0, 7); cx.fill();
  } else if (k == "e") { // bandido: pañuelo rojo
    cx.fillStyle = "#7f0000"; cx.beginPath(); cx.arc(x, hy - .3 * z, 4.5 * z, Math.PI, 0); cx.fill(); R(-4.5, -22.5, 9, 1.4, "#b71c1c");
  } else { // pelo castaño; el personaje lleva además una diadema dorada
    cx.fillStyle = "#4e342e"; cx.beginPath(); cx.arc(x, hy - .4 * z, 4.5 * z, Math.PI, 0); cx.fill();
    if (k == "h") R(-4.4, -24.6, 8.8, 1.3, "#ffd23f");
  }
  cx.fillStyle = "#222"; cx.fillRect(x - 2 * z, hy, 1.1 * z, 1.1 * z); cx.fillRect(x + .9 * z, hy, 1.1 * z, 1.1 * z); // ojos
  const hx = x + 5.4 * z, hyM = y + (-10 - bob) * z; // mano derecha: herramienta
  cx.lineCap = "round";
  if (k == "g" || k == "e") { // espada
    cx.strokeStyle = k == "e" ? "#9e9e9e" : "#e6e9ef"; cx.lineWidth = 2 * z; cx.beginPath(); cx.moveTo(hx, hyM); cx.lineTo(hx + 1.5 * z, hyM - 14 * z); cx.stroke();
    cx.strokeStyle = "#ffd23f"; cx.lineWidth = 1.6 * z; cx.beginPath(); cx.moveTo(hx - 2 * z, hyM - 2 * z); cx.lineTo(hx + 3 * z, hyM - 2 * z); cx.stroke();
  } else if (k == "c") { // martillo
    cx.strokeStyle = "#6d4c2f"; cx.lineWidth = 1.8 * z; cx.beginPath(); cx.moveTo(hx, hyM); cx.lineTo(hx + 2 * z, hyM - 12 * z); cx.stroke();
    cx.fillStyle = "#8b93a0"; cx.fillRect(hx - 1.5 * z, hyM - 15 * z, 7 * z, 4 * z);
  } else { // pico (recolector y personaje)
    cx.strokeStyle = "#6d4c2f"; cx.lineWidth = 1.8 * z; cx.beginPath(); cx.moveTo(hx, hyM); cx.lineTo(hx + 2 * z, hyM - 13 * z); cx.stroke();
    cx.strokeStyle = "#aab0bb"; cx.lineWidth = 2 * z; cx.beginPath(); cx.moveTo(hx - 3 * z, hyM - 11 * z); cx.quadraticCurveTo(hx + 2 * z, hyM - 16 * z, hx + 7 * z, hyM - 11 * z); cx.stroke();
  }
  cx.lineCap = "butt";
}
function dibU(u) {
  const z = cam.z, c = P(u.x, u.y), d = UN[u.k];
  cx.fillStyle = "#0005"; cx.beginPath(); cx.ellipse(c[0], c[1], 8 * z, 4 * z, 0, 0, 7); cx.fill();
  if (sel === u) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(c[0], c[1], 11 * z, 5.5 * z, 0, 0, 7); cx.stroke(); }
  const mov = !!(u.p && u.p.length), t = performance.now() / 1000;
  hombre(c[0], c[1], z, u.k, d.c, mov ? Math.sin(t * 10) : 0, mov ? Math.abs(Math.sin(t * 10)) * 1.2 : 0);
  if (u.carry && u.carry.n) { cx.fillStyle = RES[u.carry.t].c; cx.fillRect(c[0] + 7 * z, c[1] - 29 * z, 6 * z, 6 * z); }
  if (u.hp < u.mh) barra(c[0], c[1] - 34 * z, u.hp / u.mh, u.k == "e" ? "#ff6b6b" : "#59d96b");
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
cv.addEventListener("pointerup", (e) => { if (arrastre && !arrastre.mov) { const r = cv.getBoundingClientRect(); toque(aMundo(e.clientX - r.left, e.clientY - r.top), e.pointerType != "touch"); } arrastre = null; });
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : .9); }, { passive: false });
// Teclado: flechas / WASD mueven al personaje; barra espaciadora ataca; Esc cancela una colocación
const MOV = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, Space: 1 };
const teclas = new Set(), escribiendo = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
addEventListener("keydown", (e) => {
  if (!jugando || escribiendo(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code == "Escape" && (colocar || moverGrupo != null)) { colocar = null; moverGrupo = null; panel(); return; }
  if (!MOV[e.code]) return;
  e.preventDefault(); teclas.add(e.code);
  if (e.code == "Space" && document.activeElement && document.activeElement.tagName == "BUTTON") document.activeElement.blur(); // que la barra no «pulse» el último botón
});
addEventListener("keyup", (e) => { if (!MOV[e.code]) return; teclas.delete(e.code); if (jugando && !escribiendo(e)) e.preventDefault(); });
addEventListener("blur", () => teclas.clear());
function zoom(f) { const nz = Math.min(2, Math.max(.35, cam.z * f)), k = nz / cam.z, mx = W / 2, my = H / 2; cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz; }
function toque(w, raton) {
  if (fin) return; const tx = Math.floor(w.x), ty = Math.floor(w.y), i = ty * N + tx;
  if (moverGrupo != null) { // nuevo punto de reunión del grupo
    if (tx < 0 || ty < 0 || tx >= N || ty >= N || !expl[i] || bloq[i]) return aviso("Ahí no pueden ir: elige una casilla libre y explorada");
    const id = moverGrupo, g = grupos[id]; moverGrupo = null; g.x = tx + .5; g.y = ty + .5; return asignarTarea(id, null);
  }
  if (colocar && colocar in COSTO_FAB && heroe()) { // poste, baúl o cajón: lo coloca el personaje
    const h = heroe(), costo = COSTO_FAB[colocar], poste = colocar == "poste";
    if (!libre(tx, ty) || Math.hypot(tx + .5 - h.x, ty + .5 - h.y) > 6) return aviso("Ahí no se puede: elige una casilla libre y cerca");
    if (!zonaOk(i, colocar)) return aviso(poste ? "El poste debe ir dentro de la zona del imperio (junto a otro poste)" : "Los cofres solo van dentro de la zona del imperio: pon primero un poste");
    if (cuenta(h.inv, "tablon") < costo) { colocar = null; panel(); return aviso("Necesitas " + costo + " tablones"); }
    quitar(h.inv, "tablon", costo); const b = ponerEdificio(colocar, tx, ty, true);
    if (poste) { nPostes++; recalcZona(); aviso("Zona del imperio ampliada"); } else b.inv = [];
    colocar = null; invHud(); return panel();
  }
  if (colocar && sel && sel.k == "c") {
    if (!libre(tx, ty)) return aviso("Ahí no se puede construir");
    if (dinero < ED[colocar].costo) return aviso("No alcanza el dinero");
    dinero -= ED[colocar].costo; const b = ponerEdificio(colocar, tx, ty, false); sel.o = { t: "con", b }; sel.p = []; colocar = null; return panel();
  }
  const u = us.filter((u) => Math.hypot(u.x - w.x, u.y - w.y - .3) < .8)[0];
  if (u) { sel = u; return panel(); }
  const b = eds.find((b) => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.w);
  const hh = heroe();
  if (raton && hh && (!sel || !us.includes(sel) || sel === hh)) { // con ratón, el clic del personaje es un ataque (los edificios se siguen eligiendo)
    if (b) { sel = b; return panel(); }
    atacar(hh, w); return;
  }
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
// Figura de hombre (SVG) para los botones de comprar unidades: misma idea que hombre() del lienzo
function figuraSVG(k) {
  const col = UN[k].c, piel = "#f0c08a";
  const herr = {
    r: '<path d="M20.5 22 L23.5 8" stroke="#6d4c2f" stroke-width="1.8" stroke-linecap="round"/><path d="M19.5 9 Q23.5 4 27.5 9" fill="none" stroke="#aab0bb" stroke-width="2" stroke-linecap="round"/>',
    c: '<path d="M20.5 22 L23.5 10" stroke="#6d4c2f" stroke-width="1.8" stroke-linecap="round"/><rect x="20" y="5.5" width="7" height="4.5" rx="1" fill="#8b93a0"/>',
    g: '<path d="M22 21 L22.8 4" stroke="#e6e9ef" stroke-width="2.2" stroke-linecap="round"/><path d="M19.5 18.5 L24.5 18.5" stroke="#ffd23f" stroke-width="1.8" stroke-linecap="round"/><circle cx="5.5" cy="18" r="4.6" fill="#c9ccd3" stroke="#4f5662" stroke-width="1.2"/><circle cx="5.5" cy="18" r="1.9" fill="' + col + '"/>',
  }[k] || "";
  const pelo = k == "g" ? '<path d="M9.4 7 A4.6 4.6 0 0 1 18.6 7 Z" fill="#aab0bb"/><rect x="13.1" y="0.5" width="1.8" height="3.6" fill="' + col + '"/>' : '<path d="M9.5 7 A4.5 4.5 0 0 1 18.5 7 Z" fill="#4e342e"/>';
  return '<rect x="10" y="22" width="3.2" height="8" fill="#6b4f33"/><rect x="14.8" y="22" width="3.2" height="8" fill="#6b4f33"/>' +
    '<rect x="10" y="28.5" width="3.2" height="1.5" fill="#3e2a17"/><rect x="14.8" y="28.5" width="3.2" height="1.5" fill="#3e2a17"/>' +
    '<rect x="6.8" y="13" width="2.4" height="7" rx="1.2" fill="' + piel + '"/><rect x="18.8" y="13" width="2.4" height="7" rx="1.2" fill="' + piel + '"/>' +
    '<rect x="9.4" y="11.5" width="9.2" height="9.5" rx="2" fill="' + col + '"/><rect x="9.4" y="17.5" width="9.2" height="1.6" fill="#3e2a17"/>' +
    '<circle cx="14" cy="7.5" r="4.2" fill="' + piel + '"/>' + pelo + '<rect x="12" y="7.5" width="1.1" height="1.1" fill="#222"/><rect x="15" y="7.5" width="1.1" height="1.1" fill="#222"/>' + herr;
}
function panel(soloTexto) {
  const z = $("acciones"); if (!soloTexto) z.innerHTML = "";
  const boton = (t, f, off) => { const b = document.createElement("button"); b.className = "btn"; b.textContent = t; b.disabled = !!off; b.addEventListener("click", f); z.appendChild(b); };
  if (!soloTexto && sel && sel.k == "refugio" && sel.prog >= 1) ["r", "c", "g"].forEach((k) => { // las tropas se crean tocando el refugio
    const b = document.createElement("button"); b.type = "button"; b.className = "b3d fig " + ({ r: "b-azul", c: "b-oro", g: "b-morado" })[k];
    b.title = b.ariaLabel = UN[k].nom + " $" + UN[k].costo;
    b.innerHTML = '<svg viewBox="0 0 28 32" aria-hidden="true">' + figuraSVG(k) + '</svg><span class="b-nom">' + UN[k].nom + '</span><span class="b-info">' + "$" + UN[k].costo + "</span>";
    b.addEventListener("click", () => {
      if (dinero < UN[k].costo) return aviso("No alcanza el dinero");
      const nu = crearUnidad(k); if (!nu) return aviso("No hay espacio libre junto al refugio");
      dinero -= UN[k].costo; colocar = null; aviso(UN[k].nom + " creado en el refugio"); panel(); // el refugio sigue elegido: puedes crear varios
    });
    z.appendChild(b);
  });
  if (!soloTexto) boton("Siguiente libre", () => { const l = us.filter((u) => !u.o); if (!l.length) return aviso("Todos están ocupados"); const j = l.indexOf(sel); sel = l[(j + 1) % l.length]; const c = P(sel.x, sel.y); cam.x += W / 2 - c[0]; cam.y += H / 2 - c[1]; panel(); });
  if (!soloTexto && sel && sel.k == "c") ["almacen", "torre"].forEach((k) => boton((colocar == k ? "Toca el mapa: " : "") + ED[k].nom + " $" + ED[k].costo, () => { colocar = colocar == k ? null : k; panel(); }));
  if (!soloTexto && sel && sel.inv && sel.w) {
    const acepta = (t) => sel.k == "baul" || (sel.k == "cajonM") == MADERA.includes(t), cerca = () => { const h = heroe(); return h && Math.hypot(h.x - sel.x - .5, h.y - sel.y - .5) < 2.5; };
    boton("Guardar", () => { if (!cerca()) return aviso("Acércate (a menos de 2 casillas)"); pasar(heroe().inv, sel.inv, acepta, capac(sel)); invHud(); panel(); });
    boton("Sacar todo", () => { if (!cerca()) return aviso("Acércate (a menos de 2 casillas)"); pasar(sel.inv, heroe().inv, () => true); invHud(); panel(); });
  }
  const s = $("seleccion");
  if (!sel) s.textContent = us.length ? "Toca una unidad para elegirla y luego toca el mapa para darle una orden." : "Toca el refugio para crear tropas ($10 cada una).";
  else if (sel.w && sel.inv) s.textContent = ED[sel.k].nom + " · " + (sel.inv.length ? sel.inv.map((x) => ITEM[x.t] + " ×" + x.n).join(", ") : "vacío") + " · " + sel.inv.length + "/" + capac(sel) + " ranuras (hasta " + STACK + " por ranura)";
  else if (sel.k == "refugio") s.textContent = "Refugio · aquí se crean tus tropas: $" + UN.r.costo + " cada una · vida " + Math.ceil(sel.hp) + "/" + sel.mh;
  else if (sel.w) s.textContent = ED[sel.k].nom + " · vida " + Math.ceil(sel.hp) + "/" + sel.mh + (sel.prog < 1 ? " · en obra" : "");
  else s.textContent = UN[sel.k].nom + " · vida " + Math.ceil(sel.hp) + "/" + sel.mh + " · golpe " + UN[sel.k].dmg + " · " + ({ r: "toca un recurso para juntarlo", c: "toca una obra o edificio dañado; o elige qué construir", g: "toca el mapa para explorar o un animal para atacar", h: "flechas o WASD para moverte · barra espaciadora o clic para atacar y picar (10 golpes por árbol o roca) · en pantalla táctil, toca el mapa" })[sel.k];
  if (colocar && colocar in COSTO_FAB) s.textContent = "Toca una casilla libre y cercana (dentro de la zona del imperio, salvo el primer poste) para colocar: " + ED[colocar].nom + " (Esc para cancelar)";
  if (moverGrupo != null) s.textContent = "Toca el mapa para mandar al grupo " + (moverGrupo + 1) + " (Esc para cancelar)";
}
function invHud() {
  const h = heroe(), z = $("inv"); z.innerHTML = ""; if (!h) return;
  for (let i = 0; i < RANURAS; i++) { const s = h.inv[i], d = document.createElement("span"); d.className = "ranura" + (s ? " llena" : ""); d.textContent = s ? ITEM[s.t] + " ×" + s.n : ""; z.appendChild(d); }
}
// Barra de recursos (4 columnas × 2 filas): [id, emoji, nombre, valor]. Para cambiar un emoji, edítalo aquí.
// Madera/cobre/carbón/plata = lo que lleva el personaje + lo guardado en baúles y cajones; carne, piel y fibra salen de «stock».
// (plata y fibra todavía no se pueden conseguir en el juego: se quedan en 0.)
const totalDe = (...items) => { let n = 0; const h = heroe(); if (h) items.forEach((t) => (n += cuenta(h.inv, t))); eds.forEach((b) => { if (b.inv && b.prog >= 1) items.forEach((t) => (n += cuenta(b.inv, t))); }); return n; };
const corto = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? (n >= 1e5 ? Math.round(n / 1e3) : (n / 1e3).toFixed(1).replace(".0", "")) + "k" : String(n));
const RES_HUD = [
  ["oro", "🪙", "Monedas de oro", () => dinero], ["plata", "🥈", "Plata", () => totalDe("plata")], ["cobre", "🟠", "Cobre", () => totalDe("cobre")], ["carbon", "⚫", "Carbón", () => totalDe("carbon")],
  ["madera", "🪵", "Madera (troncos y tablones)", () => totalDe("tronco", "tablon")], ["fibra", "🧶", "Fibra", () => (stock && stock.fibra) || 0], ["carne", "🥩", "Carne", () => (stock && stock.carne) || 0], ["piel", "🧥", "Piel", () => (stock && stock.piel) || 0],
];
const chipsRec = RES_HUD.map(([, , nom]) => { const c = document.createElement("span"); c.className = "chip"; c.title = nom; $("datos").appendChild(c); return c; });
function hud() {
  RES_HUD.forEach(([, ico, , val], i) => (chipsRec[i].textContent = ico + " " + corto(Math.floor(val())))); invHud();
  $("pobl").textContent = "👥 " + us.length; $("botin").textContent = "Cuero " + stock.cuero;
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
  if (!us.length) { const p = document.createElement("p"); p.textContent = "Todavía no tienes soldados. Créalos tocando el refugio."; z.appendChild(p); }
  us.forEach((u) => {
    const b = document.createElement("button"); b.className = "soldado" + (u === sel ? " activo" : "");
    b.textContent = UN[u.k].ico + " " + UN[u.k].nom + (u.gr != null ? " (G" + (u.gr + 1) + ")" : "") + " · vida " + Math.ceil(u.hp) + "/" + u.mh + " · " + ESTADO(u);
    b.addEventListener("click", () => { sel = u; colocar = null; const c = P(u.x, u.y); cam.x += W / 2 - c[0]; cam.y += H / 2 - c[1]; z.hidden = true; panel(); });
    z.appendChild(b);
  });
}
const alternar = (id) => { const v = $(id).hidden; ["reino", "crea", "tropas"].forEach((p) => ($(p).hidden = true)); $(id).hidden = !v; }; // solo un panel abierto a la vez
$("bReino").addEventListener("click", () => { alternar("reino"); reino(true); });
// ----- Creaciones: fabricar tablones y contenedores con lo que lleva el personaje -----
let sigCrea = "";
function crea(forzar) {
  const z = $("crea"); if (z.hidden) return;
  const h = heroe(), sig = h ? JSON.stringify(h.inv) + colocar + nPostes : "";
  if (!forzar && sig == sigCrea) return; sigCrea = sig; z.innerHTML = ""; if (!h) return;
  const t = document.createElement("div"); t.className = "resumen"; t.textContent = "Troncos: " + cuenta(h.inv, "tronco") + "  ·  Tablones: " + cuenta(h.inv, "tablon") + "  ·  Postes: " + nPostes; z.appendChild(t);
  const boton = (txt, f, off) => { const b = document.createElement("button"); b.className = "soldado"; b.textContent = txt; b.disabled = !!off; b.addEventListener("click", f); z.appendChild(b); };
  boton("🪵 Fabricar 4 tablones (1 tronco)", () => {
    const v = h.inv; if (!cuenta(v, "tronco")) return aviso("Necesitas 1 tronco");
    quitar(v, "tronco", 1); if (espacio(v, "tablon") < 4) { anadir(v, "tronco", 1); return aviso("Inventario lleno"); }
    anadir(v, "tablon", 4); invHud(); crea(true); aviso("+4 Tablones");
  }, !cuenta(h.inv, "tronco"));
  [["poste", "🚩 Poste de imperio · marca la zona (2 tablones)"], ["baul", "📦 Baúl · 20 espacios, cualquier material (4 tablones)"], ["cajonM", "Cajón de madera · 10 espacios (4 tablones)"], ["cajonN", "Cajón de minerales · 10 espacios (4 tablones)"]].forEach(([k, n]) =>
    boton((colocar == k ? "✔ Toca el mapa: " : "") + n, () => {
      if (cuenta(h.inv, "tablon") < COSTO_FAB[k]) return aviso("Necesitas " + COSTO_FAB[k] + " tablones");
      if (k != "poste" && !nPostes) return aviso("Primero pon un poste de imperio: los cofres solo van dentro de su zona");
      colocar = colocar == k ? null : k; if (colocar) { z.hidden = true; aviso("Toca una casilla libre y cercana para colocarlo"); } panel(); crea(true);
    }, cuenta(h.inv, "tablon") < COSTO_FAB[k] && colocar != k));
  const p = document.createElement("p"); p.textContent = "Cada poste marca una zona de " + RADIO_ZONA + " casillas (se ve dorada). Los cofres y los postes nuevos van dentro de la zona: pon más postes para agrandarla. Para guardar objetos, acércate al cofre, tócalo y usa Guardar / Sacar todo."; z.appendChild(p);
}
$("bCrea").addEventListener("click", () => { alternar("crea"); crea(true); });
// ----- Seleccionar tropas: elegir un grupo y darle una tarea -----
let sigTropas = "";
function tropas(forzar) {
  const z = $("tropas"); if (z.hidden) return;
  const cu = (id, k) => us.filter((u) => u.gr === id && (!k || u.k === k)).length, lista = grupos.map((g) => g.id).filter((id) => cu(id) > 0);
  if (grSel == null && lista.length == 1) grSel = lista[0];
  if (grSel != null && !lista.includes(grSel)) grSel = null;
  const sig = lista.map((id) => id + ":" + cu(id) + ":" + grupos[id].tarea).join("|") + "#" + grSel + "#" + nPostes;
  if (!forzar && sig == sigTropas) return; sigTropas = sig; z.innerHTML = "";
  const t = document.createElement("div"); t.className = "resumen"; t.textContent = "Grupos: " + lista.length + "  ·  tropas: " + us.filter((u) => u.gr != null).length + " (máx. " + MAX_GRUPO + " por grupo)"; z.appendChild(t);
  const boton = (txt, f, cls) => { const b = document.createElement("button"); b.className = "soldado" + (cls ? " " + cls : ""); b.textContent = txt; b.addEventListener("click", f); z.appendChild(b); };
  const texto = (txt) => { const p = document.createElement("p"); p.textContent = txt; z.appendChild(p); };
  if (!lista.length) return texto("Todavía no tienes tropas. Pon un poste de imperio y crea soldados o trabajadores con los botones de abajo.");
  lista.forEach((id) => boton("Grupo " + (id + 1) + " · " + cu(id) + "/" + MAX_GRUPO + " · 🔨" + cu(id, "c") + " ⚔️" + cu(id, "g") + " ⛏️" + cu(id, "r") + " · " + ({ madera: "recoge madera", mineral: "recoge minerales" }[grupos[id].tarea] || "en espera"),
    () => { grSel = id; const c = P(grupos[id].x, grupos[id].y); cam.x += W / 2 - c[0]; cam.y += H / 2 - c[1]; tropas(true); }, id === grSel ? "activo" : ""));
  if (grSel == null) return texto("Elige un grupo para darle una tarea.");
  const g = grSel;
  boton("🪵 Recoger madera (guardar en baúl o cajón de madera)", () => { asignarTarea(g, "madera"); tropas(true); });
  boton("⛏️ Recoger minerales y piedra (guardar en baúl o cajón de minerales)", () => { asignarTarea(g, "mineral"); tropas(true); });
  boton("📍 Mover el grupo (toca el mapa)", () => { moverGrupo = g; $("tropas").hidden = true; aviso("Toca el mapa para mandar al grupo " + (g + 1)); panel(); });
  boton("🛑 Detener y reunir", () => { asignarTarea(g, null); tropas(true); });
  texto("La tarea solo empieza si hay un cofre con espacio dentro de la zona del imperio.");
}
$("bTropas").addEventListener("click", () => { alternar("tropas"); tropas(true); });
$("zmas").addEventListener("click", () => zoom(1.2)); $("zmenos").addEventListener("click", () => zoom(.83));
$("otra").addEventListener("click", () => { nuevo(); guardar(); entrar(); });
let ult = performance.now(), th = 0, ta = 0;
// ----- Partidas guardadas (varias, en este dispositivo) y menú -----
const CLAVE = "imperio:partidas";
let slot = null, jugando = false, pausado = false; // pausado: menú de pausa abierto (☰), el juego se congela
// La lista guardada incluye las partidas borradas como «lápidas» { id, borrada: true, fecha }: así, al sincronizar con la cuenta,
// una partida borrada en un dispositivo no «revive» desde otro. leer() devuelve solo las partidas vivas.
let nube = null; // se llena al cargar compartido/progreso.js (abajo del todo)
const leerTodo = () => { try { const l = JSON.parse(localStorage.getItem(CLAVE)); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
const leer = () => leerTodo().filter((p) => !p.borrada);
const escribir = (l) => { try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (e) { aviso("No se pudo guardar la partida"); return false; } };
// Sube a la cuenta (a los 3 s). Se llama al crear, borrar y salir al menú; el autoguardado cada 5 s solo guarda en el dispositivo,
// y progreso.js también sincroniza solo al ocultar la página, al volver la conexión y al iniciar sesión.
const subir = () => { if (nube) nube.guardado(); };
// Mapas grandes: bio y expl se guardan como pares «valor:repeticiones» separados por «;» (el guardado cabe en la nube)
const comprimir = (a) => { const r = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; r.push(a[i] + ":" + (j - i)); i = j; } return r.join(";"); };
const descomprimir = (t, n) => { const a = new Uint8Array(n); let p = 0; if (t) for (const e of t.split(";")) { const [v, c] = e.split(":"); a.fill(+v, p, p + +c); p += +c; } return a; };
function estado() {
  return { n: N, dinero, oleada, tReloj, tOleada, muertes, cam, expl: comprimir(expl), bio: comprimir(bio),
    res: res.map((r, i) => r && (r.t == "mina" ? [i, r.t, r.n, r.g || 0, r.oro, r.plata, r.cobre, r.carbon] : [i, r.t, r.n, r.g || 0])).filter(Boolean),
    us: us.map((u) => [u.k, u.x, u.y, u.hp, u.carry.t, u.carry.n, u.o && u.o.t == "rec" ? [u.o.i, u.o.tipo] : 0, u.inv || 0, u.gr == null ? -1 : u.gr, u.reu ? 1 : 0]),
    anim: anim.map((a) => [a.k, a.x, a.y, a.hp, a.g || 0]), stock, eds: eds.map((b) => [b.k, b.x, b.y, b.hp, b.prog, b.inv || 0]), enem: enem.map((e) => [e.x, e.y, e.hp, e.mh]), grupos: grupos.map((g) => [g.x, g.y, g.tarea || 0]) };
}
function cargar(s) {
  N = s.n || N_ORIGINAL; // las partidas viejas no traen «n» y son de 44×44
  res = new Array(N * N).fill(null); bloq = new Uint8Array(N * N); vis = new Uint8Array(N * N); expl = s.n ? descomprimir(s.expl, N * N) : Uint8Array.from(s.expl.split(""), Number);
  bio = s.bio ? (s.n ? descomprimir(s.bio, N * N) : Uint8Array.from(s.bio.split(""), Number)) : new Uint8Array(N * N); bio.forEach((v, i) => v == 3 && (bloq[i] = 1)); // partidas viejas: todo llanura
  s.res.forEach(([i, t, n, g, o, pl, co, ca]) => { res[i] = { t, n, g: g || 0 }; if (t == "mina") Object.assign(res[i], { oro: o, plata: pl, cobre: co, carbon: ca }); bloq[i] = 1; });
  eds = []; s.eds.forEach(([k, x, y, hp, prog, inv]) => { const b = ponerEdificio(k, x, y, true); b.hp = hp; b.prog = prog; if (inv) b.inv = inv; }); ponerRefugio(); // partidas viejas: se agrega el refugio si falta
  us = s.us.map(([k, x, y, hp, ct, cn, o, inv, gr, reu]) => ({ k, x, y, hp, gr: k == "h" || gr == null || gr < 0 ? null : gr, reu: reu === undefined ? true : !!reu, mh: UN[k].hp, p: [], cd: 0, inv: inv || (k == "h" ? [] : null), carry: { t: ct, n: cn }, o: o ? { t: "rec", i: o[0], tipo: o[1], f: cn >= 5 ? "vol" : "ir" } : null }));
  enem = s.enem.map(([x, y, hp, mh]) => ({ k: "e", x, y, hp, mh, cd: 0 }));
  grupos = (s.grupos || []).map(([x, y, t], id) => ({ id, x, y, tarea: t || null })); grSel = null; moverGrupo = null;
  nPostes = eds.filter((b) => b.k == "poste").length; recalcZona();
  us.forEach((u) => { if (u.k != "h" && (u.gr == null || !grupos[u.gr])) u.gr = asignarGrupo(); }); // partidas viejas: las tropas se reparten en grupos
  ({ dinero, oleada, tReloj, tOleada, muertes, cam } = s); anim = (s.anim || []).map(([k, x, y, hp, g]) => ({ ...nuevoAnimal(k, x, y), hp, g })); stock = s.stock || { carne: 0, piel: 0, cuero: 0 };
  if (!us.some((u) => u.k == "h")) crearUnidad("h"); sel = heroe(); fx = []; colocar = null; fin = false; pend = 0; // partidas viejas: se agrega el personaje
}
function guardar() {
  if (!slot) return; const l = leerTodo(), i = l.findIndex((p) => p.id == slot.id), p = { id: slot.id, nombre: slot.nombre, fecha: Date.now(), estado: estado() };
  if (i < 0) l.push(p); else l[i] = p; escribir(l);
}
function pantalla(id) { $("menu").hidden = !id; ["mPrincipal", "mPers", "mNiv"].forEach((m) => ($(m).hidden = m != id)); $("datos").hidden = !!id; $("sub").hidden = !!id; $("bMenu").hidden = !!id; $("pausa").hidden = true; pausado = false; $("bReino").hidden = !!id; $("bCrea").hidden = !!id; $("bTropas").hidden = !!id; teclas.clear(); if (id) { $("reino").hidden = true; $("crea").hidden = true; $("tropas").hidden = true; } if (id == "mPers") listar(); }
function entrar() { $("fin").hidden = true; jugando = true; pantalla(null); ult = performance.now(); panel(); }
// Sustituye a confirm(): un aviso dentro de la página (confirm() saca al navegador de la pantalla completa)
function preguntar(texto) {
  $("confTxt").textContent = texto; $("confirmar").hidden = false;
  return new Promise((res) => {
    const fin = (r) => { $("confirmar").hidden = true; $("confSi").onclick = $("confNo").onclick = null; res(r); };
    $("confSi").onclick = () => fin(true); $("confNo").onclick = () => fin(false);
  });
}
function listar() {
  const z = $("partidas"), l = leer().sort((a, b) => b.fecha - a.fecha); z.innerHTML = "";
  if (!l.length) z.textContent = "Todavía no tienes partidas. Crea la primera.";
  l.forEach((p) => {
    const f = document.createElement("div"), t = document.createElement("span"), j = document.createElement("button"), d = document.createElement("button");
    f.className = "fila"; t.innerHTML = "<b></b><small></small>"; t.firstChild.textContent = p.nombre;
    t.lastChild.textContent = "$" + Math.floor(p.estado.dinero) + " · " + new Date(p.fecha).toLocaleDateString();
    j.className = "btn"; j.textContent = "Jugar"; j.addEventListener("click", () => { slot = { id: p.id, nombre: p.nombre }; cargar(p.estado); entrar(); });
    d.className = "btn sec"; d.textContent = "Borrar"; d.addEventListener("click", async () => { if (await preguntar("¿Borrar «" + p.nombre + "»?")) { escribir(leerTodo().map((x) => (x.id == p.id ? { id: x.id, borrada: true, fecha: Date.now() } : x))); subir(); listar(); } });
    f.append(t, j, d); z.appendChild(f);
  });
}
$("bPers").addEventListener("click", () => pantalla("mPers")); $("bNiv").addEventListener("click", () => pantalla("mNiv"));
$("vPers").addEventListener("click", () => pantalla("mPrincipal")); $("vNiv").addEventListener("click", () => pantalla("mPrincipal"));
$("crear").addEventListener("click", () => {
  const nombre = $("nombre").value.trim() || "Partida " + (leer().length + 1); $("nombre").value = "";
  slot = { id: Date.now().toString(36), nombre }; nuevo(); guardar(); subir(); entrar();
});
// ☰ abre el menú de pausa (Continuar / Salir); pulsarlo otra vez equivale a Continuar
function pausar(si) {
  if (!jugando) return;
  pausado = si; $("pausa").hidden = !si; teclas.clear();
  if (si) guardar(); else ult = performance.now(); // al pausar se guarda; al continuar no se acumula tiempo
}
$("bMenu").addEventListener("click", () => pausar(!pausado));
$("pContinuar").addEventListener("click", () => pausar(false));
$("pSalir").addEventListener("click", () => { guardar(); enviarPuntos(); subir(); jugando = false; $("fin").hidden = true; pantalla("mPrincipal"); });
addEventListener("pagehide", () => { if (jugando && !fin) guardar(); enviarPuntos(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { if (jugando && !fin) guardar(); enviarPuntos(); } });
ajustar(); pantalla("mPrincipal");
(function bucle(n) {
  const dt = Math.min(.05, (n - ult) / 1000); ult = n;
  if (jugando && !pausado) {
    tick(dt); dibujar();
    if ((th += dt) > .25) { th = 0; hud(); if (sel) panel(true); reino(); crea(); tropas(); }
    if ((ta += dt) > 5) { ta = 0; if (!fin) guardar(); }
  }
  requestAnimationFrame(bucle);
})(ult);

// Sincronizar las partidas con la cuenta (al final, tras cargar lo local).
// Se unen por «id»: de cada partida gana la más reciente (campo «fecha»); las borradas quedan como lápidas.
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar("imperio", {
    clave: CLAVE,
    fusionar: (a, b) => {
      if (!Array.isArray(a) && !Array.isArray(b)) return null;
      const r = new Map();
      for (const p of [...(Array.isArray(b) ? b : []), ...(Array.isArray(a) ? a : [])]) {
        if (!p || !p.id) continue;
        const x = r.get(p.id);
        if (!x || (Number(p.fecha) || 0) > (Number(x.fecha) || 0)) r.set(p.id, p);
      }
      return [...r.values()].sort((x, y) => (x.id < y.id ? -1 : 1)); // orden fijo: así no se reescribe sin necesidad
    },
    alCambiar: () => { if (!$("mPers").hidden) listar(); }, // si la lista de partidas está abierta, se repinta
  });
}).catch(() => {});
