// Ruta: zuma/bot-zuma.mjs
// Jugadores simulados para probar los niveles con la física real del juego (logica-zuma.js).
// Tres perfiles: «perfecto» (casi imposible de igualar para una persona), «humano» y «novato» (más lento, más errores,
// no siempre elige la mejor jugada y a veces dispara sin pensar).
import { crearPartida, avanzar, insertar, buscarImpacto, colorDisparo, coloresDisponibles, largoSi } from "./logica-zuma.js";
import { CENTRO } from "./niveles-zuma.js";

export const PERFILES = {
  perfecto: { recarga: 0.45, torpeza: 0, top: 1, paciencia: 1 },
  humano: { recarga: 0.9, torpeza: 0.2, top: 2, paciencia: 0.5 },
  novato: { recarga: 1.1, torpeza: 0.35, top: 4, paciencia: 0.4 },
};
const DT = 1 / 30, TOPE_S = 600, MAX_CAND = 16;

function impactoApuntando(p, ang) {
  let x = CENTRO.x + Math.cos(ang) * 40, y = CENTRO.y + Math.sin(ang) * 40;
  for (let k = 0; k < 120; k++) {
    const imp = buscarImpacto(p, x, y);
    if (imp) return imp;
    x += Math.cos(ang) * 6; y += Math.sin(ang) * 6;
  }
  return null;
}

// Juega una ronda completa. azar: función 0..1 del bot. Devuelve la partida (estado "gano" o "perdio", t en segundos)
export function jugar(ronda, perfil, azar) {
  const p = crearPartida(ronda);
  let carga = colorDisparo(p), sig = colorDisparo(p), espera = 1;
  while (p.estado === "jugando" && p.t < TOPE_S) {
    avanzar(p, DT, [carga, sig]);
    espera -= DT;
    if (espera > 0) continue;
    const hay = coloresDisponibles(p);
    if (!hay.has(carga)) carga = colorDisparo(p);
    if (!hay.has(sig)) sig = colorDisparo(p);
    const vis = p.cad.filter((b) => {
      const q = p.tr.pos(b.s + b.d);
      return q.x > 0 && q.x < 640 && q.y > 0 && q.y < 480;
    });
    if (!vis.length) { espera = 0.1; continue; }
    const paso = Math.max(1, Math.ceil(vis.length / MAX_CAND));
    const cands = [];
    for (let k = 0; k < vis.length; k += paso) {
      const q = p.tr.pos(vis[k].s + vis[k].d);
      const imp = impactoApuntando(p, Math.atan2(q.y - CENTRO.y, q.x - CENTRO.x));
      if (!imp) continue;
      for (const [c, esSig] of [[carga, false], [sig, true]]) {
        const n = largoSi(p.cad, imp.i, imp.delante, c);
        cands.push({ imp, esSig, sc: (n >= 3 ? 100 + n : n === 2 ? 10 : 0) + p.cad[imp.i].s / 1000 });
      }
    }
    if (!cands.length) { espera = 0.1; continue; }
    cands.sort((a, b) => b.sc - a.sc);
    let elegido = cands[Math.min(cands.length - 1, (azar() * perfil.top) | 0)];
    if (elegido.sc < 10 && azar() > perfil.paciencia) { espera = 0.15; continue; } // sin buena jugada: espera (o no)
    if (azar() < perfil.torpeza) elegido = cands[(azar() * cands.length) | 0];     // tiro torpe
    const i = elegido.imp.i;
    if (elegido.esSig) [carga, sig] = [sig, carga];
    insertar(p, i, elegido.imp.delante, carga);
    carga = sig; sig = colorDisparo(p);
    espera = perfil.recarga;
  }
  return p;
}

export function generadorAzar(semilla) {
  let a = (semilla * 7919) | 0;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Juega N partidas con semillas de bot distintas: { ganadas, n, tiempos[] (de las ganadas, ordenados), mediana }
export function evaluar(ronda, nombrePerfil, n = 20) {
  const perfil = PERFILES[nombrePerfil], tiempos = [];
  let ganadas = 0;
  for (let s = 1; s <= n; s++) {
    const p = jugar(ronda, perfil, generadorAzar(s));
    if (p.estado === "gano") { ganadas++; tiempos.push(p.t); }
  }
  tiempos.sort((a, b) => a - b);
  return { ganadas, n, tiempos, mediana: tiempos.length ? tiempos[tiempos.length >> 1] : 0 };
}
