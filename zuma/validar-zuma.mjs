// Ruta: zuma/validar-zuma.mjs
// Comprueba que los niveles se pueden pasar: un bot juega cada nivel con la física real del juego
// (misma lógica que juego-zuma.js), apuntando como un jugador (el disparo pega en la primera bola que toca).
// Uso: node zuma/validar-zuma.mjs [semillas=20]
import { crearPartida, avanzar, insertar, buscarImpacto, colorDisparo, largoSi, D } from "./logica-zuma.js";
import { NIVELES, CENTRO } from "./niveles-zuma.js";

const SEMILLAS = Number(process.argv[2]) || 20;
const DT = 1 / 30, RECARGA = Number(process.env.RECARGA ?? 0.6), TOPE_S = 600;
const TORPEZA = Number(process.env.TORPEZA ?? 0); // prob. de tiro torpe: 0 = comprueba que el nivel es POSIBLE; prueba 0.12 para ver cuánto cuesta a un jugador normal

function impactoApuntando(p, ang) {
  let x = CENTRO.x + Math.cos(ang) * 40, y = CENTRO.y + Math.sin(ang) * 40;
  for (let k = 0; k < 120; k++) {
    const imp = buscarImpacto(p, x, y);
    if (imp) return imp;
    x += Math.cos(ang) * 6; y += Math.sin(ang) * 6;
  }
  return null;
}

function jugar(nivel, azarBot) {
  const p = crearPartida(nivel);
  let carga = colorDisparo(p), sig = colorDisparo(p), espera = 0;
  while (p.estado === "jugando" && p.t < TOPE_S) {
    avanzar(p, DT);
    espera -= DT;
    if (espera > 0 || !p.cad.length) continue;
    const hay = new Set([...p.cad.map((b) => b.c), ...p.cola.slice(0, 6)]);
    if (!hay.has(carga)) carga = colorDisparo(p);
    if (!hay.has(sig)) sig = colorDisparo(p);
    let mejor = null, ms = -1, usaSig = false;
    for (const b of p.cad) {
      const q = p.tr.pos(b.s + b.d);
      if (q.x < 0 || q.x > 640 || q.y < 0 || q.y > 480) continue;
      const imp = impactoApuntando(p, Math.atan2(q.y - CENTRO.y, q.x - CENTRO.x));
      if (!imp) continue;
      for (const [c, esSig] of [[carga, false], [sig, true]]) {
        const n = largoSi(p.cad, imp.i, imp.delante, c);
        const sc = (n >= 3 ? 100 + n : n === 2 ? 10 : 0) + p.cad[imp.i].s / 1000;
        if (sc > ms) { ms = sc; mejor = imp; usaSig = esSig; }
      }
    }
    if (!mejor) continue;
    if (ms < 10) continue; // sin buena jugada: espera (como un jugador atento)
    if (azarBot() < TORPEZA) mejor = { i: (azarBot() * p.cad.length) | 0, delante: azarBot() < 0.5 };
    if (usaSig) [carga, sig] = [sig, carga];
    insertar(p, mejor.i, mejor.delante, carga);
    carga = sig; sig = colorDisparo(p);
    espera = RECARGA;
  }
  return p;
}

// Mínimo de partidas ganadas por el bot (con su nivel de torpeza) para dar la ronda por pasable
const MINIMO = [Number(process.env.MIN1 ?? 0.9), Number(process.env.MIN2 ?? 0.9), Number(process.env.MIN3 ?? 0.7)];
let fallos = 0;
for (const n of NIVELES) {
  // monedas: 1 estrella 15–20, 2 estrellas 25–30, 3 estrellas 35–40
  const rangos = [[15, 20], [25, 30], [35, 40]];
  const monOk = n.monedas?.length === 3 && n.monedas.every((m, i) => m >= rangos[i][0] && m <= rangos[i][1]);
  if (!monOk) { fallos++; console.log("FALLA", n.id, "monedas fuera de rango:", n.monedas); }
  if (n.rondas?.length !== 3) { fallos++; console.log("FALLA", n.id, "debe tener 3 rondas"); continue; }
  n.rondas.forEach((ronda, ri) => {
    let gana = 0, tMin = 1e9, tMax = 0;
    for (let s = 1; s <= SEMILLAS; s++) {
      let a = s * 7919;
      const azarBot = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
      const p = jugar({ ...ronda, semilla: s === 1 ? ronda.semilla : s * 10 + ri }, azarBot);
      if (p.estado !== "gano" && process.env.DEPURAR) console.log("  semilla", s, p.estado, "t=" + p.t.toFixed(0), "en cadena", p.cad.length, "en cola", p.cola.length);
      if (p.estado === "gano") { gana++; tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); }
    }
    const ok = gana / SEMILLAS >= MINIMO[ri];
    if (!ok) fallos++;
    console.log(ok ? "OK   " : "FALLA", n.id, "ronda " + (ri + 1), gana + "/" + SEMILLAS, "ganadas", gana ? "· " + tMin.toFixed(0) + "–" + tMax.toFixed(0) + " s" : "");
  });
}
process.exit(fallos ? 1 : 0);
