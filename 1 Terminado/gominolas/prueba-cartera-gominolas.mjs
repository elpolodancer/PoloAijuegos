// Ruta: gominolas/prueba-cartera-gominolas.mjs
// Comprueba las estrellas, la recompensa y la cartera (módulo cartera-gominolas.js). Se corre con Node:  node gominolas/prueba-cartera-gominolas.mjs
import {
  PRECIOS, MONEDAS, estrellasDe, estrellasDeNivel, ponerEstrellas, unirEstrellas, totalEstrellas, recompensa,
  carteraVacia, saldo, ganarMonedas, gastarMonedas, unirCarteras, unirProgresoGominolas,
} from "./cartera-gominolas.js";
import { nivelDe, TOTAL_NIVELES } from "./catalogo-gominolas.js";

const fallos = [];
const exige = (ok, t) => { if (!ok) fallos.push(t); };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Estrellas
exige(estrellasDe(0, 20) === 1 && estrellasDe(8, 20) === 1 && estrellasDe(9, 20) === 2 && estrellasDe(12, 20) === 2 && estrellasDe(13, 20) === 3 && estrellasDe(20, 20) === 3, "umbrales de estrellas");
exige(estrellasDe(-3, 20) === 1 && estrellasDe(5, 0) === 1, "estrellas con valores raros");
let t = ponerEstrellas("", 5, 2);
exige(t === "00002" && estrellasDeNivel(t, 5) === 2 && estrellasDeNivel(t, 4) === 0 && estrellasDeNivel(t, 99) === 0, "ponerEstrellas");
exige(ponerEstrellas(t, 5, 1) === t, "las estrellas no bajan");
exige(ponerEstrellas(t, 5, 3) === "00003", "las estrellas suben");
exige(unirEstrellas("0102", "0030") === "0132" && unirEstrellas("", "") === "" && unirEstrellas("1", "0000") === "1", "unirEstrellas");
exige(igual(unirEstrellas("123", "31"), unirEstrellas("31", "123")), "unirEstrellas conmutativa");
exige(totalEstrellas("0132") === 6, "totalEstrellas");
const grande = ponerEstrellas("", TOTAL_NIVELES, 3);
exige(grande.length === TOTAL_NIVELES && grande.length <= 22600, "texto de estrellas de todos los niveles");

// Recompensa (usa niveles reales del catálogo)
const facil = { dificultad: "facil", tipo: "clasico" }, jefe = { dificultad: "dificil", tipo: "jefe" };
exige(recompensa(facil, 1, 0) === MONEDAS.base.facil + MONEDAS.porEstrella, "primera vez con 1★");
exige(recompensa(facil, 3, 0) === MONEDAS.base.facil + 3 * MONEDAS.porEstrella, "primera vez con 3★");
exige(recompensa(facil, 3, 1) === 2 * MONEDAS.porEstrella, "mejorar de 1★ a 3★ paga solo 2 estrellas");
exige(recompensa(facil, 2, 2) === 0 && recompensa(facil, 1, 3) === 0, "repetir sin mejorar no da nada");
exige(recompensa(jefe, 3, 0) === (MONEDAS.base.dificil + 3 * MONEDAS.porEstrella) * MONEDAS.jefe, "el jefe paga ×3");
let jefes = 0;
for (let n = 1; n <= 300; n++) { const nv = nivelDe(n); exige(recompensa(nv, 3, 0) > 0, "nivel " + n + " no paga"); if (nv.tipo === "jefe") jefes++; }
exige(jefes === 3, "debería haber 3 jefes en los primeros 300 niveles");

// Cartera
let c = carteraVacia();
exige(saldo(c) === 0 && gastarMonedas(c, "A", 50) === false && saldo(c) === 0, "cartera vacía no gasta");
ganarMonedas(c, "A", 120);
exige(saldo(c) === 120 && gastarMonedas(c, "A", PRECIOS.quitar) && saldo(c) === 70, "ganar y gastar");
exige(!gastarMonedas(c, "A", 71) && saldo(c) === 70, "no gasta de más");
ganarMonedas(c, "A", -5); ganarMonedas(c, "A", NaN); ganarMonedas(c, "A", 2.9);
exige(saldo(c) === 72, "valores raros al ganar (−5 y NaN no cuentan, 2.9 → 2)");
// Dos dispositivos que juegan sin conexión y luego se unen
const base = carteraVacia(); ganarMonedas(base, "A", 100);
const celular = unirCarteras(base, null), compu = unirCarteras(base, null);
ganarMonedas(celular, "cel", 30); gastarMonedas(celular, "cel", 50);   // el celular gana 30 y gasta 50
ganarMonedas(compu, "pc", 20);                                          // la compu gana 20
const u1 = unirCarteras(celular, compu), u2 = unirCarteras(compu, celular);
exige(saldo(u1) === 100 + 30 + 20 - 50, "unión de dos dispositivos: saldo " + saldo(u1));
exige(igual(u1, u2), "unirCarteras conmutativa");
exige(igual(unirCarteras(u1, u1), u1), "unirCarteras idempotente");
exige(igual(unirCarteras(unirCarteras(celular, compu), base), u1), "unir otra vez una copia vieja no devuelve monedas gastadas");
exige(saldo({ d: { x: { g: "a", s: null } } }) === 0 && saldo(null) === 0 && saldo("raro") === 0, "datos malos de la nube no rompen");

// Progreso completo
const a = { mejor: 500, nivel: 12, l_6x8_facil: 3, est: "0123", cartera: celular };
const b = { mejor: 800, nivel: 9, l_6x8_facil: 5, l_8x10_medio: 2, est: "3", cartera: compu };
const p1 = unirProgresoGominolas(a, b), p2 = unirProgresoGominolas(b, a);
exige(p1.mejor === 800 && p1.nivel === 12 && p1.l_6x8_facil === 5 && p1.l_8x10_medio === 2 && p1.est === "3123", "unirProgresoGominolas: números y estrellas");
exige(saldo(p1.cartera) === saldo(u1), "unirProgresoGominolas: cartera");
exige(igual(p1, p2), "unirProgresoGominolas conmutativa");
exige(igual(unirProgresoGominolas(p1, p1), p1), "unirProgresoGominolas idempotente");
exige(unirProgresoGominolas(null, null) === null && igual(unirProgresoGominolas({ mejor: 1 }, null), { mejor: 1 }), "unirProgresoGominolas con null");
exige(igual(unirProgresoGominolas({ mejor: 5, nivel: 3 }, null), { mejor: 5, nivel: 3 }), "progreso viejo (sin est ni cartera) se conserva");

if (fallos.length) { console.log("❌ " + fallos.length + " problema(s):"); fallos.forEach((f) => console.log("  - " + f)); process.exit(1); }
console.log("✅ Estrellas, recompensas y cartera en orden (" + "precios: " + JSON.stringify(PRECIOS) + ").");
