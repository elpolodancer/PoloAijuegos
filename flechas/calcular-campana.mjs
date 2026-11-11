// Ruta: flechas/calcular-campana.mjs
// Imprime cómo queda la mezcla de dificultades en cada estado y país y comprueba que las cuentas estén bien.
// Uso:  node flechas/calcular-campana.mjs        (muestra todos los estados; con «todo» muestra también los 194 países)
import { crearCampana, TIERS } from "./campana-flechas.js";

const C = crearCampana({ numEstados: 32, numPaises: 194, porEtapa: 100 });
const todo = process.argv[2] === "todo";
const L = { facil: "F", medio: "M", dificil: "D" };
let mal = 0;
const verifica = (ok, texto) => { if (!ok) { mal++; console.log("  ✗ " + texto); } };

console.log(`Etapas: ${C.numEstados} estados + ${C.numPaises} países = ${C.numEtapas} · niveles: ${C.numEstados * C.porEtapa} en México + ${C.numPaises * C.porEtapa} en el mundo = ${C.total}\n`);
console.log("Etapa            fácil medio difícil   (orden de los 100 niveles: F fácil, M medio, D difícil)");
const fila = (e, nombre) => {
  const c = C.conteos(e);
  console.log(`${nombre.padEnd(16)} ${String(c.facil).padStart(4)}% ${String(c.medio).padStart(4)}% ${String(c.dificil).padStart(5)}%   ${C.orden(e).map((t) => L[t]).join("")}`);
};
for (let e = 0; e < C.numEstados; e++) fila(e, "Estado " + (e + 1));
const pasoPais = todo ? 1 : Math.floor(C.numPaises / 8);
for (let j = 0; j < C.numPaises; j += pasoPais) fila(C.numEstados + j, "País " + (j + 1));
if ((C.numPaises - 1) % pasoPais) fila(C.numEtapas - 1, "País " + C.numPaises);

// ----- comprobaciones -----
console.log("\nComprobaciones:");
let prev = null;
for (let e = 0; e < C.numEtapas; e++) {
  const c = C.conteos(e), s = c.facil + c.medio + c.dificil;
  verifica(s === C.porEtapa, `etapa ${e + 1} suma ${s}`);
  const o = C.orden(e);
  verifica(o.length === C.porEtapa, `etapa ${e + 1}: el orden no tiene ${C.porEtapa} niveles`);
  verifica(o[0] === "facil", `etapa ${e + 1} no empieza en fácil`);
  for (const t of TIERS) verifica(o.filter((x) => x === t).length === c[t], `etapa ${e + 1}: el orden no respeta la cuenta de ${t}`);
  if (prev) { // la dificultad nunca baja de una etapa a la siguiente
    verifica(c.facil <= prev.facil, `etapa ${e + 1}: los fáciles suben (${prev.facil} → ${c.facil})`);
    verifica(c.dificil >= prev.dificil, `etapa ${e + 1}: los difíciles bajan (${prev.dificil} → ${c.dificil})`);
  }
  prev = c;
}
const p0 = C.conteos(0), pm = C.conteos(C.numEstados - 1), pp = C.conteos(C.numEstados), pf = C.conteos(C.numEtapas - 1);
verifica(JSON.stringify(p0) === JSON.stringify({ facil: 40, medio: 40, dificil: 20 }), "primer estado distinto de 40/40/20");
verifica(JSON.stringify(pm) === JSON.stringify({ facil: 25, medio: 40, dificil: 35 }), "último estado distinto de 25/40/35");
verifica(JSON.stringify(pp) === JSON.stringify(pm), "el primer país no sigue igual que el último estado");
verifica(JSON.stringify(pf) === JSON.stringify({ facil: 10, medio: 30, dificil: 60 }), "último país distinto de 10/30/60");

// cada nivel tiene un número propio dentro de su dificultad, sin huecos ni repetidos
const vistos = { facil: new Set(), medio: new Set(), dificil: new Set() };
for (let n = 1; n <= C.total; n++) {
  const x = C.nivel(n);
  verifica(!vistos[x.dif].has(x.idx), `nivel ${n}: ${x.dif} ${x.idx} repetido`);
  vistos[x.dif].add(x.idx);
}
const tot = C.totales();
for (const t of TIERS) verifica(vistos[t].size === tot[t] && Math.max(...vistos[t]) === tot[t], `${t}: numeración con huecos`);

console.log(mal ? `\n${mal} problemas` : "  todo bien");
console.log(`\nTotales de la campaña: fáciles ${tot.facil} · medios ${tot.medio} · difíciles ${tot.dificil} (suman ${tot.facil + tot.medio + tot.dificil})`);
const ej = [1, 100, 101, 3200, 3201, C.total].map((n) => C.nivel(n));
console.log("Ejemplos (nivel → etapa, nivel dentro de la etapa, dificultad, número en esa dificultad):");
for (const x of ej) console.log(`  ${String(x.n).padStart(5)} → etapa ${x.etapa + 1}, nivel ${x.k}, ${x.dif} #${x.idx}`);
process.exit(mal ? 1 : 0);
