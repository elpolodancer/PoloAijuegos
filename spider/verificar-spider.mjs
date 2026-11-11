// Ruta: spider/verificar-spider.mjs
// Comprobador de niveles por consola:  node spider/verificar-spider.mjs [cuantas=20] [semillaInicial=1] [maxMs=4000] [maxNodos=300000]
// Para cada dificultad prueba «cuantas» semillas y cuenta cuántas tienen solución comprobada.
import { verificar } from "./ia-spider.js";
import { DIFICULTADES } from "./logica-spider.js";
const [cuantas = 20, ini = 1, maxMs = 4000, maxNodos = 300000] = process.argv.slice(2).map(Number);
for (const d of DIFICULTADES) {
  let ok = 0, nodos = 0, ms = 0, mal = [];
  for (let s = ini; s < ini + cuantas; s++) {
    const r = verificar(d.id, s, { maxMs, maxNodos });
    if (r.resuelto) { ok++; nodos += r.nodos; ms += r.ms; } else mal.push(s);
  }
  console.log(`${d.ico} ${d.nombre.padEnd(8)} (${d.palos} palo${d.palos > 1 ? "s" : ""}): ${ok}/${cuantas} con solución` + (ok ? `, ~${Math.round(nodos / ok)} nodos y ${Math.round(ms / ok)} ms por nivel` : "") + (mal.length ? `  · sin resolver: ${mal.slice(0, 12).join(",")}${mal.length > 12 ? "…" : ""}` : ""));
}
