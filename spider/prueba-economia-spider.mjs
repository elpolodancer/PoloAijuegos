// Ruta: spider/prueba-economia-spider.mjs  (solo consola: node spider/prueba-economia-spider.mjs)
import assert from "node:assert/strict";
import { RECOMPENSA, AYUDAS, ayudasDe, recompensa, carteraVacia, saldo, ganarMonedas, gastarMonedas, unirCarteras, unirProgresoSpider } from "./economia-spider.js";

// Recompensas y ayudas
assert.deepEqual(Object.keys(RECOMPENSA).map((k) => RECOMPENSA[k]), [10, 20, 40, 70, 120]);
assert.equal(recompensa(3, true), 40); assert.equal(recompensa(3, false), 0); assert.equal(recompensa(9, true), 0);
assert.ok(ayudasDe(1).libre && ayudasDe(2).libre && !ayudasDe(3).libre);
assert.equal(ayudasDe(5).retro, null); assert.equal(ayudasDe(5).pista.tope, 2);
assert.equal(ayudasDe(99), AYUDAS[1]);
// Ganar y gastar sin pasarse de saldo
const c = carteraVacia();
ganarMonedas(c, "A", 50); assert.equal(saldo(c), 50);
assert.equal(gastarMonedas(c, "A", 60), false); assert.equal(saldo(c), 50);
assert.equal(gastarMonedas(c, "A", 20), true); assert.equal(saldo(c), 30);
assert.equal(gastarMonedas(c, "A", 0), false); assert.equal(saldo(carteraVacia()), 0);
assert.equal(saldo("basura"), 0); assert.equal(saldo({ d: { x: { g: -5, s: "z" } } }), 0);
// Dos dispositivos: ganan a la vez y uno gasta; nada se pierde ni se recupera lo gastado
const A = carteraVacia(), B = carteraVacia();
ganarMonedas(A, "A", 100); ganarMonedas(B, "B", 70);
gastarMonedas(A, "A", 40);
const u = unirCarteras(A, B);
assert.equal(saldo(u), 130);                      // 100 − 40 + 70
assert.equal(saldo(unirCarteras(u, A)), 130);     // unir otra vez no cambia nada
assert.equal(JSON.stringify(unirCarteras(A, B)), JSON.stringify(unirCarteras(B, A))); // mismo texto en cualquier orden
const vieja = JSON.parse(JSON.stringify(A)); gastarMonedas(A, "A", 10);
assert.equal(saldo(unirCarteras(vieja, A)), 50);  // la copia vieja no «devuelve» las monedas gastadas
// Progreso completo
const p1 = { niv: { max: 3, hecho: 2 }, mejor: { "1-1": 200, "2-2": 500 }, opc: { palos: 1, dif: 1 }, ganadas: 4, cartera: A, t: 10 };
const p2 = { niv: { max: 5, hecho: 1 }, mejor: { "1-1": 150, "3-3": 900 }, opc: { palos: 2, dif: 3 }, ganadas: 2, cartera: B, t: 20 };
const m = unirProgresoSpider(p1, p2);
assert.deepEqual(m.niv, { max: 5, hecho: 2 }); assert.deepEqual(m.mejor, { "1-1": 150, "2-2": 500, "3-3": 900 });
assert.deepEqual(m.opc, { palos: 2, dif: 3 }); assert.equal(m.ganadas, 4); assert.equal(m.t, 20); assert.equal(saldo(m.cartera), 120);
assert.equal(JSON.stringify(unirProgresoSpider(p1, p2)), JSON.stringify(unirProgresoSpider(p2, p1)));
assert.equal(unirProgresoSpider(null, null), null);
assert.equal(JSON.stringify(unirProgresoSpider(m, null)), JSON.stringify(m)); // idempotente: progreso.js no ve «cambios» donde no los hay
// Una partida vieja (con g/s globales y sin cartera) se une sin romperse
const viejo = unirProgresoSpider({ niv: { max: 2, hecho: 1 }, mejor: {}, ganadas: 1, g: 0, s: 0, t: 5 }, null);
assert.equal(saldo(viejo.cartera), 0); assert.ok(!("g" in viejo));
// Récords y estrellas por nivel dentro del progreso: menor tiempo, estrellas acumuladas, sin «rec» si no hay ninguno
const q1 = { niv: { max: 3, hecho: 2 }, rec: { 1: 100 * 8 + 3, 2: 90 * 8 + 1 }, t: 1 }, q2 = { niv: { max: 3, hecho: 2 }, rec: { 1: 120 * 8 + 5 }, t: 2 };
const mq = unirProgresoSpider(q1, q2);
assert.deepEqual(mq.rec, { 1: 100 * 8 + 7, 2: 90 * 8 + 1 });
assert.equal(JSON.stringify(unirProgresoSpider(q1, q2)), JSON.stringify(unirProgresoSpider(q2, q1)));
assert.equal(JSON.stringify(unirProgresoSpider(mq, null)), JSON.stringify(mq));
assert.ok(!("rec" in unirProgresoSpider(p1, p2)));
console.log("economía de Spider: todo bien");
