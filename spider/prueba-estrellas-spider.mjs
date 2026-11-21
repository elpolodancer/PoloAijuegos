// Ruta: spider/prueba-estrellas-spider.mjs  (solo consola: node spider/prueba-estrellas-spider.mjs)
import assert from "node:assert/strict";
import { parDe, retoDe, metasDe, evaluar, contar, textoEstrellas, empaquetar, desempaquetar, registrar, unirRec, TIPOS_RETO, formatoTiempo } from "./estrellas-spider.js";

// Par de tiempo: crece con los palos y con la dificultad
assert.equal(parDe(1, 1), 360); assert.ok(parDe(2, 1) > parDe(1, 1)); assert.ok(parDe(1, 5) > parDe(1, 1)); assert.equal(parDe(9, 9), 360);
// El reto de un nivel es siempre el mismo, sale de la lista, y en Maestro nunca es «sin deshacer»; hay variedad
const vistos = new Set();
for (let n = 1; n <= 2000; n++) { const r = retoDe(n, 1); assert.ok(TIPOS_RETO.includes(r)); assert.equal(r, retoDe(n, 1)); vistos.add(r); assert.notEqual(retoDe(n, 5), "sin_deshacer"); }
assert.equal(vistos.size, 4);
const cuenta = {}; for (let n = 1; n <= 4000; n++) { const r = retoDe(n, 2); cuenta[r] = (cuenta[r] || 0) + 1; }
for (const r of TIPOS_RETO) assert.ok(cuenta[r] > 800 && cuenta[r] < 1200, "reparto parejo de retos: " + JSON.stringify(cuenta));
// Evaluar: ★ siempre; ★★ por tiempo; ★★★ por reto
let n1 = 1; while (retoDe(n1, 1) !== "rapido") n1++;
let e = evaluar({ nivel: n1, palos: 1, dif: 1, segundos: 200 });       // 200 s ≤ 360 y ≤ 216 → 3 estrellas
assert.equal(e.mask, 7); assert.equal(e.estrellas, 3);
e = evaluar({ nivel: n1, palos: 1, dif: 1, segundos: 300 });           // ≤ par pero no rapidísimo
assert.equal(e.mask, 3); assert.equal(textoEstrellas(e.mask), "★★☆");
e = evaluar({ nivel: n1, palos: 1, dif: 1, segundos: 400 });
assert.equal(e.mask, 1); assert.equal(textoEstrellas(e.mask), "★☆☆");
let n2 = 1; while (retoDe(n2, 1) !== "sin_ayudas") n2++;
assert.equal(evaluar({ nivel: n2, palos: 1, dif: 1, segundos: 999, retros: 0, pistas: 0 }).mask, 5);   // ★ y ★★★, sin ★★
assert.equal(evaluar({ nivel: n2, palos: 1, dif: 1, segundos: 999, retros: 1, pistas: 0 }).mask, 1);
let n3 = 1; while (retoDe(n3, 1) !== "sin_pista") n3++;
assert.equal(evaluar({ nivel: n3, palos: 1, dif: 1, segundos: 10, retros: 5, pistas: 0 }).mask, 7);  // usar Deshacer no importa en «sin pista»
assert.equal(evaluar({ nivel: n3, palos: 1, dif: 1, segundos: 10, retros: 0, pistas: 1 }).mask, 3);
let n4 = 1; while (retoDe(n4, 1) !== "sin_deshacer") n4++;
assert.equal(evaluar({ nivel: n4, palos: 1, dif: 1, segundos: 10, retros: 1, pistas: 3 }).mask, 3);
assert.equal(contar(7), 3); assert.equal(contar(0), 0);
const mt = metasDe(n1, 2, 3); assert.equal(mt.textos.length, 3); assert.ok(mt.textos[1].includes(formatoTiempo(parDe(2, 3))));
// Empaquetar / desempaquetar
assert.deepEqual(desempaquetar(empaquetar(215, 5)), { t: 215, mask: 5 });
assert.deepEqual(desempaquetar(undefined), { t: 0, mask: 0 }); assert.deepEqual(desempaquetar("x"), { t: 0, mask: 0 }); assert.deepEqual(desempaquetar(3), { t: 0, mask: 0 });
// Registrar: primer récord, mejora de tiempo, peor tiempo (no cambia el récord) y estrellas que se acumulan
const rec = {};
let r = registrar(rec, 7, 300, 1);
assert.deepEqual([r.previo, r.nuevoRecord, r.mask, r.nuevas], [0, true, 1, 1]);
r = registrar(rec, 7, 250, 3);
assert.deepEqual([r.previo, r.nuevoRecord, r.mask, r.nuevas], [300, true, 3, 2]);
r = registrar(rec, 7, 400, 5);                                             // más lento, pero gana el reto
assert.deepEqual([r.previo, r.nuevoRecord, r.mask, r.nuevas], [250, false, 7, 4]);
assert.deepEqual(desempaquetar(rec[7]), { t: 250, mask: 7 });
// Unir dos dispositivos: menor tiempo y todas las estrellas; mismo texto en cualquier orden; idempotente; acepta basura
const A = { 3: empaquetar(100, 3), 9: empaquetar(500, 1) }, B = { 3: empaquetar(150, 5), 12: empaquetar(80, 7), "x": 5, 99999999: 40, 5: "z" };
const U = unirRec(A, B);
assert.deepEqual(desempaquetar(U[3]), { t: 100, mask: 7 }); assert.deepEqual(desempaquetar(U[12]), { t: 80, mask: 7 }); assert.deepEqual(Object.keys(U), ["3", "9", "12"]);
assert.equal(JSON.stringify(unirRec(A, B)), JSON.stringify(unirRec(B, A)));
assert.equal(JSON.stringify(unirRec(U, null)), JSON.stringify(U)); assert.equal(JSON.stringify(unirRec(U, U)), JSON.stringify(U));
assert.equal(unirRec(null, null), null); assert.equal(unirRec({}, "basura"), null);
console.log("estrellas de Spider: todo bien");
