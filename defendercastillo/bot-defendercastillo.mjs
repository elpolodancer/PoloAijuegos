// Ruta: defendercastillo/bot-defendercastillo.mjs
// Herramienta de Node (no la carga el juego). Un bot juega los niveles de Michoacán con las reglas reales de logica-defendercastillo.js:
//   node bot-defendercastillo.mjs nivel N [vida]      juega el nivel N y cuenta cómo le fue (vida = calibración a probar; si falta, usa la guardada)
//   node bot-defendercastillo.mjs calibrar [desde] [hasta]   busca la «vida calibrada» de cada nivel y la guarda en calibracion-defendercastillo.js
//   node bot-defendercastillo.mjs validar [desde] [hasta]    revisa los niveles: mapa válido, árboles de 20 monedas, el bot bueno gana y el bot de solo arqueros no
// «Bot bueno»: elige la torre y el lugar con más valor por moneda según lo que trae la próxima oleada (voladores, blindados, grupos grandes…),
// mejora, tala árboles si el lugar vale la pena y construye minas al inicio. NO usa el meteoro (ahora es un boost de pago del jugador:
// la calibración no cuenta con él, así que los niveles se ganan sin comprarlo).
// «Bot de arqueros»: solo arqueros y sus mejoras (para comprobar que ninguna torre sola resuelve el nivel).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CELDA, TORRES, ENEMIGOS, nuevaPartida, celdaLibre, datosTorre, colocar, mejorar, talar, iniciarOleada, paso, costeTalar } from "./logica-defendercastillo.js";
import { generarNivel, NIVELES_MICHOACAN, MARGEN_HUMANO } from "./generador-defendercastillo.js";
import { CALIB } from "./calibracion-defendercastillo.js";

const PASO = 1 / 60;
const TOPE_BASE = 26;  // torres (sin contar minas) que construye el bot; sube 1 cada 12 niveles
// Vida del castillo con la que el bot bueno debe ganar SIN usar el meteoro (ahora es un boost de pago; antes se recargaba solo y el bot lo usaba).
// El nivel 1 es muy fácil (~98 %) y la dificultad sube poco a poco hasta ~76 % en el 10; el nivel 10 (jefe) es algo más duro.
// (Versión anterior, con meteoro gratis: 0.95 − 0.23·(n−1)/9: este objetivo es 3 puntos más fácil.)
export const objetivo = (n) => 0.98 - (0.22 * (n - 1)) / 9 - (n % 10 === 0 ? 0.05 : 0);
const ARCHIVO = "./calibracion-defendercastillo.js";

// ---------- Cobertura: cuántos puntos del camino alcanza una torre puesta en cada celda ----------
let PESO_AIRE = 0; // cuánto pesa la ruta de los voladores (línea recta al castillo) según lo que trae la oleada
function muestrasDe(rutas) {
  const pts = [];
  for (const ruta of rutas) for (let d = 0; d < ruta.largo; d += 9) {
    for (const s of ruta.segs) if (d <= s.ini + s.l) { const t = (d - s.ini) / s.l; pts.push([s.a.x + (s.b.x - s.a.x) * t, s.a.y + (s.b.y - s.a.y) * t]); break; }
  }
  return pts;
}
function crearCobertura(p) {
  const tierra = muestrasDe(p.mapa.rutas), aire = muestrasDe(p.mapa.aire), cache = new Map();
  let cT = new Array(tierra.length).fill(0), cA = new Array(aire.length).fill(0);
  const lista = (c, f, alcance, minimo) => {
    const k = alcance + "|" + minimo + "|" + c + "," + f;
    let v = cache.get(k);
    if (!v) {
      const x = (c + 0.5) * CELDA, y = (f + 0.5) * CELDA, r = alcance * CELDA, m = minimo * CELDA;
      const idx = (pts) => { const o = []; pts.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d <= r && d >= m) o.push(i); }); return o; };
      v = [idx(tierra), idx(aire)];
      cache.set(k, v);
    }
    return v;
  };
  // Rendimientos decrecientes: un tramo del camino que ya cubren otras torres vale menos (así el bot reparte las torres por todas las entradas)
  const cob = (c, f, alcance, minimo = 0, usaAire = true, existente = false) => {
    const [it, ia] = lista(c, f, alcance, minimo), suma = existente ? 0 : 1;
    let v = 0;
    for (const i of it) v += 1 / (cT[i] + suma);
    if (usaAire) { let a = 0; for (const i of ia) a += 1 / (cA[i] + suma); v += a * PESO_AIRE; }
    return v;
  };
  const refrescar = () => {
    cT = new Array(tierra.length).fill(0); cA = new Array(aire.length).fill(0);
    for (const t of p.torres) {
      const d = datosTorre(t);
      if (!d.alcance || d.oroOla) continue;
      const [it, ia] = lista(t.c, t.f, d.alcance, d.minimo || 0);
      for (const i of it) cT[i]++;
      if (!TORRES[t.tipo].noAire) for (const i of ia) cA[i]++;
    }
  };
  cob.refrescar = refrescar;
  return cob;
}

// ---------- Qué trae la oleada (para elegir torres) ----------
function mezcla(p) {
  const o = p.nivel.oleadas[Math.min(p.oleada, p.nivel.oleadas.length - 1)];
  let hp = 0, air = 0, arm = 0, ara = 0, golem = 0, cant = 0;
  for (const [t, n] of o.grupos) {
    const d = ENEMIGOS[t], h = n * d.vida;
    hp += h; cant += n;
    if (d.vuela) air += h;
    arm += h * (d.arm || 0);
    if (d.resVen) ara += h;
    if (d.inmCong) golem += h;
  }
  return { air: air / hp, arm: arm / hp, ara: ara / hp, golem: golem / hp, many: Math.min(1, cant / 30) };
}
function efectivo(tipo, d, mix) {
  const base = (d.dano || 0) / (d.cadencia || 1);
  switch (tipo) {
    case "arquero": return base * (1 - mix.arm * 0.6);
    case "canon": return base * (1.8 + mix.many * 1.5) * (1 - mix.air) * (1 - mix.arm * 0.25);
    case "mortero": return base * (1.7 + mix.many * 1.5) * (1 - mix.air) * (1 - mix.arm * 0.25);
    case "mago": return base * 1.4;
    case "ballesta": return base * (1 - mix.many * 0.45); // golpe único: pierde contra enjambres
    case "rayos": return base * (1 + d.cadena * 0.55);
    case "veneno": return d.veneno.dps * (1 - mix.ara * 0.7) + base;
    case "hielo": return 35 * (d.congela / d.cadencia) * (1 - mix.golem) + base * (1 + mix.many);
    case "cuartel": return (d.dano + 25) * d.bloqueo * (1 - mix.air);
    default: return 0;
  }
}

// ---------- El bot ----------
function gastar(p, cob, modo) {
  const tipos = modo === "arqueros" ? ["arquero"] : (p.nivel.torres || Object.keys(TORRES));
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    cob.refrescar();
    const mix = mezcla(p), faltan = p.nivel.oleadas.length - p.oleada;
    PESO_AIRE = mix.air * 2.5;
    const tope = p.torres.filter((t) => t.tipo !== "mina").length >= TOPE_BASE + Math.floor(p.nivel.n / 12); // un humano no llena todo el mapa
    let mejor = null, ms = 0;
    const consider = (score, accion, coste) => { if (score > ms && p.oro >= coste) { ms = score; mejor = accion; } };
    const minas = p.torres.filter((t) => t.tipo === "mina").length;
    // celdas: libres y árboles/rocas (talar cuesta)
    const celdas = [];
    for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) {
      if (p.torres.some((t) => t.c === c && t.f === f)) continue;
      if (celdaLibre(p, c, f)) celdas.push([c, f, 0]);
    }
    if (modo !== "arqueros") for (const o of p.obstaculos) celdas.push([o.c, o.f, costeTalar(o)]);
    for (const tipo of tipos) {
      const def = TORRES[tipo], d0 = def.niveles[0];
      if (tipo === "mina") {
        if (minas < Math.min(4, 1 + Math.floor(p.nivel.n / 20)) && p.oleada < 12 && p.torres.length >= 3 && faltan > 10) {
          let b = null, bc = 1e9;
          for (const [c, f, t] of celdas) if (!t) { const v = cob(c, f, 2.5, 0, false); if (v < bc) { bc = v; b = [c, f]; } }
          if (b) consider(1e6, () => colocar(p, "mina", b[0], b[1]), def.precio);
        }
        continue;
      }
      if (tope) continue;
      const e0 = efectivo(tipo, d0, mix);
      let b = null, bs = 0;
      for (const [c, f, t] of celdas) {
        const s = (e0 * cob(c, f, d0.alcance, d0.minimo || 0, !def.noAire)) / (def.precio + t);
        if (s > bs) { bs = s; b = [c, f, t]; }
      }
      if (b) consider(bs, () => { if (b[2]) talar(p, b[0], b[1]); return colocar(p, tipo, b[0], b[1]); }, def.precio + b[2]);
    }
    for (const t of p.torres) {
      const d = datosTorre(t);
      if (!d.sube) continue;
      if (t.tipo === "mina") { if (faltan > 8) consider(5e5, () => mejorar(p, t), d.sube); continue; }
      const sig = TORRES[t.tipo].niveles[t.nivel + 1];
      const gan = efectivo(t.tipo, sig, mix) - efectivo(t.tipo, d, mix);
      consider((gan * cob(t.c, t.f, sig.alcance, sig.minimo || 0, !TORRES[t.tipo].noAire, true)) / d.sube * 1.15, () => mejorar(p, t), d.sube);
    }
    if (!mejor) return;
    mejor();
  }
}

export function jugarBot(nivel, modo = "bueno") {
  const p = nuevaPartida(nivel), cob = crearCobertura(p);
  let tal4 = 0, pasos = 0;
  while ((p.estado === "preparando" || p.estado === "oleada") && pasos < 60 * 60 * 90) {
    if (p.estado === "preparando") {
      gastar(p, cob, modo);
      if (process.env.DBG) console.log("ola", p.oleada, "vida", Math.ceil(p.vida), "oro", Math.floor(p.oro), p.torres.map((t) => TORRES[t.tipo].icono + (t.nivel + 1) + "@" + t.c + "," + t.f).join(" "));
      if (p.oleada === 3) tal4 = p.talados;
      iniciarOleada(p);
    }
    paso(p, PASO); pasos++;
    p.ev.length = 0;
    if (pasos % 60 === 0 && p.estado === "oleada") gastar(p, cob, modo);
  }
  const nW = nivel.oleadas.length, ganado = p.estado === "ganado";
  return { ganado, vida: Math.ceil(p.vida), vidaFrac: p.vida / nivel.vidaCastillo, oleada: p.oleada, nW, tal4, torres: p.torres.length, talados: p.talados, seg: Math.round(pasos / 60),
    score: ganado ? p.vida / nivel.vidaCastillo : -(1 - p.oleada / nW) };
}

// ---------- Calibrar ----------
function calibrarNivel(n) {
  const T = objetivo(n);
  let lo = Math.log(0.05), hi = Math.log(12); // busca la vida más alta con la que el bot bueno aún termina con ≥ T
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2, r = jugarBot(generarNivel(n, Math.exp(mid)));
    if (r.score >= T) lo = mid; else hi = mid;
  }
  // los resultados no son perfectamente «monótonos»: se ajusta hasta caer cerca del objetivo (T − 0.1 a T + 0.12)
  let c = Math.exp(lo), mejor = c, md = 9;
  for (let i = 0; i < 24; i++) {
    const r = jugarBot(generarNivel(n, c)), d = Math.abs(r.score - T);
    if (d < md) { md = d; mejor = c; }
    if (r.ganado && r.vidaFrac >= T - 0.1 && r.vidaFrac <= T + 0.12) { mejor = c; break; }
    c *= r.score > T ? 1.05 : 0.93;
  }
  return Math.round(mejor * MARGEN_HUMANO * 1000) / 1000; // el bot ganaría con «mejor»; se baja un poco para que un humano tenga holgura
}
function guardarCalib(arr) {
  const filas = [];
  for (let i = 0; i < arr.length; i += 10) filas.push("  " + arr.slice(i, i + 10).map((x) => (x === undefined ? "null" : x)).join(", ") + ",");
  writeFileSync(ARCHIVO, "// Ruta: defendercastillo/calibracion-defendercastillo.js\n// ARCHIVO GENERADO por bot-defendercastillo.mjs (node bot-defendercastillo.mjs calibrar): no se edita a mano.\n" +
    "// Una cifra por nivel de Michoacán (1 a " + arr.length + "): multiplica la vida de los enemigos para que un bot que juega bien gane con ~" + " % de vida del castillo.\nexport const CALIB = [\n" + filas.join("\n") + "\n];\n");
}

// ---------- Validar ----------
function revisarMapa(n) {
  const v = generarNivel(n), errores = [];
  const p = nuevaPartida(v);
  const caminos = v.caminos || [v.camino], k = v.castillo;
  if (k.c < 0 || k.f < 0 || k.c + k.w > v.cols || k.f + k.h > v.filas) errores.push("castillo fuera del mapa");
  for (const cam of caminos) {
    const [fx, fy] = cam[0], [lx, ly] = cam[cam.length - 1];
    if (!(fx < 0 || fx > v.cols || fy < 0 || fy > v.filas)) errores.push("la entrada no está fuera del mapa");
    if (lx < k.c || lx >= k.c + k.w || ly < k.f || ly >= k.f + k.h) errores.push("el camino no termina dentro del castillo");
    for (let i = 0; i < cam.length - 1; i++) if (cam[i][0] !== cam[i + 1][0] && cam[i][1] !== cam[i + 1][1]) errores.push("tramo en diagonal");
  }
  for (const [c, f] of v.obstaculos) {
    if (c < 0 || c >= v.cols || f < 0 || f >= v.filas) errores.push("obstáculo fuera del mapa");
  }
  // un obstáculo no puede estar sobre el camino ni el castillo (se pondría en celda ya bloqueada por el camino)
  const sinObst = nuevaPartida({ ...v, obstaculos: [] }).mapa.bloq;
  for (const [c, f] of v.obstaculos) if (sinObst[f][c]) errores.push("obstáculo sobre camino/castillo " + c + "," + f);
  const arboles = v.obstaculos.filter((o) => o[2] !== "🪨").length;
  const cerca = v.obstaculos.filter((o) => o[2] !== "🪨" && [-1, 0, 1].some((dc) => [-1, 0, 1].some((df) => sinObst[o[1] + df] && sinObst[o[1] + df][o[0] + dc]))).length;
  if (arboles < 2 || cerca < 2) errores.push("faltan árboles de 20 junto al camino");
  const libres = p.mapa.bloq.flat().filter((x) => !x).length;
  if (libres < 40) errores.push("pocos lugares para construir: " + libres);
  if (v.oleadas.length < 12) errores.push("menos de 12 oleadas");
  return { errores, libres, arboles, cerca };
}

const esPrincipal = process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href;
const [, , cmd, a1, a2] = esPrincipal ? process.argv : [0, 0];
if (cmd === "nivel") {
  const n = +a1, r = jugarBot(generarNivel(n, a2 ? +a2 : undefined));
  console.log("nivel", n, "bueno:", JSON.stringify(r));
  console.log("   arqueros:", JSON.stringify(jugarBot(generarNivel(n, a2 ? +a2 : undefined), "arqueros")));
} else if (cmd === "calibrar") {
  const desde = +a1 || 1, hasta = +a2 || NIVELES_MICHOACAN;
  const arr = Array.from({ length: NIVELES_MICHOACAN }, (_, i) => CALIB[i]);
  for (let n = desde; n <= hasta; n++) {
    const t0 = Date.now(); arr[n - 1] = calibrarNivel(n);
    const r = jugarBot(generarNivel(n, arr[n - 1]));
    console.log("nivel", n, "calib", arr[n - 1], "→ gana:", r.ganado, "vida", r.vida, "torres", r.torres, "(" + Math.round((Date.now() - t0) / 1000) + " s)");
    guardarCalib(arr.map((x) => (x === undefined ? 1 : x)));
  }
} else if (cmd === "ajustar") { // node bot-defendercastillo.mjs ajustar 24 45 ...: busca a mano una vida calibrada dentro del rango para esos niveles
  const arr = Array.from({ length: NIVELES_MICHOACAN }, (_, i) => CALIB[i] || 1);
  for (const n of process.argv.slice(3).map(Number)) {
    const T = objetivo(n); let mejor = arr[n - 1], md = 9;
    for (let k = -16; k <= 16; k++) {
      const c = Math.round(arr[n - 1] * Math.pow(1.03, k) * 1000) / 1000, r = jugarBot(generarNivel(n, c)), d = Math.abs(r.score - T);
      if (d < md) { md = d; mejor = c; }
      if (r.ganado && r.vidaFrac >= T - 0.1 && r.vidaFrac <= T + 0.12 && d < 0.06) break;
    }
    console.log("nivel", n, arr[n - 1], "→", mejor); arr[n - 1] = mejor;
  }
  guardarCalib(arr);
} else if (cmd === "validar") {
  const desde = +a1 || 1, hasta = +a2 || NIVELES_MICHOACAN;
  const mal = [], resumen = [];
  let sinTala = 0, arquerosGanan = [];
  for (let n = desde; n <= hasta; n++) {
    const m = revisarMapa(n);
    const b = jugarBot(generarNivel(n)), q = jugarBot(generarNivel(n), "arqueros");
    const prob = [...m.errores];
    if (!b.ganado) prob.push("el bot bueno pierde (oleada " + b.oleada + "/" + b.nW + ")");
    else if (b.vidaFrac < 0.2) prob.push("vida final por debajo de 20 %: " + b.vida);
    const v = generarNivel(n), oro4 = v.oroInicial + v.oleadas.slice(0, 3).reduce((a, o) => a + o.bono, 0);
    if (oro4 < 20 + 4 * TORRES.arquero.precio) sinTala++; // con el oro de las 3 primeras oleadas debe sobrar para talar (20) además de 4 arqueros
    if (q.ganado && n >= 12) arquerosGanan.push(n);
    resumen.push(n + ":" + b.vida + (q.ganado ? "*" : ""));
    if (prob.length) { mal.push(n); console.log("❌ nivel", n, prob.join("; ")); }
  }
  console.log("\nVida final del bot bueno por nivel (un * = el bot de solo arqueros también ganó):\n" + resumen.join("  "));
  console.log("\nNiveles con problemas:", mal.length ? mal.join(", ") : "ninguno ✅");
  console.log("Niveles donde no alcanza el oro para talar un árbol (20) antes de la oleada 4:", sinTala);
  console.log("Niveles (≥12) que ganan solo con arqueros:", arquerosGanan.length ? arquerosGanan.join(", ") : "ninguno ✅");
} else if (esPrincipal) console.log("Uso: node bot-defendercastillo.mjs nivel N [vida] | calibrar [desde] [hasta] | validar [desde] [hasta]");
