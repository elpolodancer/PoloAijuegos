// Ruta: agua/verificar-agua.mjs  (solo para consola: node agua/verificar-agua.mjs; no se guarda sin internet)
// Comprueba el reparto de dificultades de los 3 900 niveles y las reglas de monedas/estrellas.
import { dificultadNivel, distribucionTramo, resumenTotal, NUM_ETAPAS, NUM_TRAMOS, POR_TRAMO } from "./dificultad-agua.js";
import * as E from "./economia-agua.js";
const ok = (c, m) => { if (!c) throw new Error("FALLA: " + m); };

// --- Dificultad ---
ok(NUM_ETAPAS === 195 && E.POR_ETAPA === 20 && E.TOTAL === 3900 && NUM_TRAMOS === 39, "195 países, 20 niveles por país, 3 900 niveles y 39 tramos");
const d0 = distribucionTramo(0), dN = distribucionTramo(NUM_TRAMOS - 1);
ok(d0.facil === 50 && d0.medio === 40 && d0.dificil === 10, "primeros 100: 50/40/10");
ok(dN.facil === 25 && dN.medio === 40 && dN.dificil === 35, "últimos 100: 25/40/35");
let prev = 50, rachaMax = 0;
for (let k = 0; k < NUM_TRAMOS; k++) {
  const d = distribucionTramo(k), cuenta = { facil: 0, medio: 0, dificil: 0 };
  ok(d.facil + d.medio + d.dificil === 100 && d.medio === 40, "tramo " + k + " suma 100");
  ok(d.facil <= prev && prev - d.facil <= 1, "los fáciles bajan de a poco (tramo " + k + ")");
  prev = d.facil;
  let racha = 0;
  for (let j = 1; j <= POR_TRAMO; j++) {
    const t = dificultadNivel(k * POR_TRAMO + j); cuenta[t]++;
    racha = t === "dificil" ? racha + 1 : 0; rachaMax = Math.max(rachaMax, racha);
  }
  ok(cuenta.facil === d.facil && cuenta.medio === d.medio && cuenta.dificil === d.dificil, "conteo real = reparto, tramo " + k);
}
for (let p = 0; p < E.TOTAL; p += E.POR_ETAPA) ok(dificultadNivel(p + 1) === "facil", "primer nivel fácil, país " + p / E.POR_ETAPA);
ok(dificultadNivel(777) === dificultadNivel(777), "estable");
const T = resumenTotal();
console.log("Total en 3 900:", T, "· racha más larga de difíciles seguidos:", rachaMax);

// --- Estrellas y monedas ---
let d = E.normalizar(null), r = E.registrarNivel(d, 1, 3); d = r.datos;
ok(r.monedas === 50 && d.hecho === 1 && d.max === 2, "nivel 1 con 3★ paga 50");
ok(E.registrarNivel(d, 1, 3).monedas === 0, "repetir no paga");
for (let n = 2; n <= E.POR_ETAPA - 1; n++) d = E.registrarNivel(d, n, 3).datos;
r = E.registrarNivel(d, E.POR_ETAPA, 3); d = r.datos;
ok(r.monedas === 750 && r.bonos.length === 2, "bonos de país perfecto (20 niveles)");
const A = E.comprar(d, "verde").datos, B = E.registrarNivel(d, E.POR_ETAPA + 1, 2).datos; A.t = 5; B.t = 9;
const M = E.fusionar(A, B);
ok(JSON.stringify(M) === JSON.stringify(E.fusionar(B, A)) && E.saldo(M) === B.ganadas - 200, "fusión sin perder ni duplicar monedas");
console.log("todo bien");
