// Ruta: granjafeliz/prueba-edificios-granjafeliz.mjs   (node prueba-edificios-granjafeliz.mjs)
// Comprueba los datos del modelo de edificios de Farm Frenzy 1 (un ciclo a la vez, tiempo por nivel de mejora, lotes 1 a 5, costos de la guía). Sin DOM ni Firebase.
import * as D from "./datos-granjafeliz.js";
let bien = 0, mal = 0;
const ok = (n, c) => { if (c) bien++; else { mal++; console.log("FALLA:", n); } };
const J = (x) => JSON.stringify(x);

ok("ya no existe la cola (MAX_COLA_EDIF)", D.MAX_COLA_EDIF === undefined);
for (const f of ["fabrica1", "fabrica2"]) {
  ok(f + ": tiempos 25/22/20/17/15", J(D.MEJORAS[f].seg) === "[25,22,20,17,15]");
  ok(f + ": lotes 1 a 5", J(D.MEJORAS[f].lote) === "[1,2,3,4,5]");
  ok(f + ": un tiempo por cada lote", D.MEJORAS[f].seg.length === D.MEJORAS[f].lote.length);
}
const COSTOS = {
  panaderia: [200, 300, 400, 500, 600], horno: [400, 600, 800, 1000, 1200], hilanderia: [2000, 3000, 4000, 5000, 6000],
  tejeduria: [4000, 6000, 8000, 10000, 12000], batidora: [20000, 30000, 40000, 50000, 60000], queseria: [40000, 60000, 80000, 100000, 120000],
};
for (const id in COSTOS) {
  const E = D.EDIFICIOS[id];
  ok(id + ": costos de la guía", !!E && J(E.costos) === J(COSTOS[id]));
  ok(id + ": costo = costos[0]", E.costo === E.costos[0]);
  ok(id + ": sin tiempo propio (lo da el nivel)", E.seg === undefined);
  ok(id + ": usa una fila de mejoras que existe", !!D.MEJORAS[E.fabrica] && D.MEJORAS[E.fabrica].seg.length === E.costos.length);
  ok(id + ": entra y sale son productos", !!D.PRODUCTOS[E.entra] && !!D.PRODUCTOS[E.sale]);
}
ok("cadenas: huevo→polvo→pan, lana→hilo→tela, leche→mantequilla→queso",
  D.EDIFICIOS.panaderia.sale === D.EDIFICIOS.horno.entra && D.EDIFICIOS.hilanderia.sale === D.EDIFICIOS.tejeduria.entra && D.EDIFICIOS.batidora.sale === D.EDIFICIOS.queseria.entra);
console.log(mal ? "✗ " + mal + " fallas" : "✓ " + bien + " comprobaciones bien");
process.exit(mal ? 1 : 0);
