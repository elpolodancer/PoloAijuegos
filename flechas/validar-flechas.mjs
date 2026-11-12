// Ruta: flechas/validar-flechas.mjs
// Genera niveles de cada dificultad, comprueba que se puedan resolver y muestra estadísticas para compararlas con las capturas.
// Uso:  node flechas/validar-flechas.mjs [niveles por dificultad = 5]
// (Los .js del juego usan «import»: si tu Node no los detecta como módulos, pon un package.json con {"type":"module"} en esta carpeta.)
import { generar, DIFICULTADES, ORDEN } from "./generador-flechas.js";
import { crearEstado, analizar } from "./logica-flechas.js";

const N = Number(process.argv[2]) || 5;
let mal = 0;
for (const dif of ORDEN) {
  const d = DIFICULTADES[dif];
  console.log(`\n${d.nombre}${d.estimado ? " (ESTIMADO)" : ""}`);
  for (let n = 1; n <= (dif === "facil" ? N + 15 : N); n++) { // en Fácil los niveles 1 a 15 son fijos: se prueban N más
    const t0 = Date.now();
    const g = generar(dif, n);
    const ms = Date.now() - t0;
    const a = analizar(crearEstado(g.cols, g.filas, g.flechas));
    const largos = g.flechas.map((f) => f.celdas.length);
    const prom = largos.reduce((s, x) => s + x, 0) / largos.length;
    if (!a.resuelto) mal++;
    console.log(
      `  nivel ${n}: ${a.resuelto ? "OK " : "SIN SOLUCIÓN"}${g.fijo ? " FIJO" : ""} ${g.cols}x${g.filas} flechas=${g.flechas.length} largo(prom/máx)=${prom.toFixed(1)}/${Math.max(...largos)} ` +
      `relleno=${(g.relleno * 100).toFixed(0)}% rondas=${g.profundidad} libresAlInicio=${g.libresAlInicio} ${ms} ms`
    );
  }
}
console.log(mal ? `\n${mal} niveles sin solución` : "\nTodos los niveles tienen solución");
process.exit(mal ? 1 : 0);
