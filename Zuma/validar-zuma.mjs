// Ruta: zuma/validar-zuma.mjs
// Comprueba que los niveles se pueden pasar: un bot juega cada nivel con la física real del juego
// (misma lógica que juego-zuma.js), apuntando como un jugador (el disparo pega en la primera bola que toca).
// Uso: node zuma/validar-zuma.mjs [semillas=20]
import { crearPartida, avanzar, insertar, buscarImpacto, colorDisparo, largoSi, D } from "./logica-zuma.js";
import { NIVELES, CENTRO } from "./niveles-zuma.js";

const SEMILLAS = Number(process.argv[2]) || 20;
const DT = 1 / 30, RECARGA = Number(process.env.RECARGA ?? 0.6), TOPE_S = 600;
const TORPEZA = Number(process.env.TORPEZA ?? 0.12); // probabilidad de un tiro torpe (un jugador real también falla)

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

let fallos = 0;
for (const n of NIVELES) {
  let gana = 0, tMin = 1e9, tMax = 0;
  for (let s = 1; s <= SEMILLAS; s++) {
    let a = s * 7919;
    const azarBot = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const p = jugar({ ...n, semilla: s === 1 ? n.semilla : s }, azarBot);
    if (p.estado !== "gano" && process.env.DEPURAR) console.log("  semilla", s, p.estado, "t=" + p.t.toFixed(0), "en cadena", p.cad.length, "en cola", p.cola.length, "cabeza s=", p.cad.length ? p.cad[p.cad.length-1].s.toFixed(0) : "-", "largo", p.tr.largo.toFixed(0));
    if (p.estado === "gano") { gana++; tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); }
  }
  const ok = gana === SEMILLAS;
  if (!ok) fallos++;
  console.log((ok ? "OK   " : "FALLA"), n.id, gana + "/" + SEMILLAS, "ganadas", gana ? "· " + tMin.toFixed(0) + "–" + tMax.toFixed(0) + " s" : "");
}
process.exit(fallos ? 1 : 0);
