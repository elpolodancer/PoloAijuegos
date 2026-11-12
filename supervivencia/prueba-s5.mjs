import * as D from "./datos-supervivencia.js";
import * as M from "./mochila-supervivencia.js";
import assert from "node:assert/strict";
assert.deepEqual(D.validar(), [], "ids inconsistentes");
console.log("items:", D.ITEMS.length, "| por tipo:", Object.fromEntries(D.TIPOS.map(t=>[t,D.itemsDe(t).length])));
// armaduras: 4 ranuras en básica y resistente
for (const n of ["basica","resistente"]) assert.deepEqual(D.ITEMS.filter(x=>x.nivelArmadura===n).map(x=>x.ranura).sort(), ["cabeza","piernas","pies","torso"]);
// mochila
const m = M.crearMochila(2);
assert.equal(M.agregar(m,"caliza",60), 0); assert.equal(M.cuenta(m,"caliza"),60);   // 50 + 10
assert.equal(M.agregar(m,"caliza",100), 60);
assert.equal(M.cuenta(m,"caliza"),100);
assert.equal(M.agregar(m,"nada",1),1);
assert.equal(M.quitar(m,"caliza",500), false); assert.equal(M.cuenta(m,"caliza"),100);
assert.equal(M.quitar(m,"caliza",55), true);  assert.equal(M.cuenta(m,"caliza"),45);
// convertir: refinar cuerda 3 fibra → 1 cuerda; y todo-o-nada
const b = M.crearMochila(); M.agregar(b,"fibra",7);
const r = D.REFINAR.find(x=>x.da[0]==="cuerda");
assert.ok(M.convertir(b,r.costo,r.da)); assert.ok(M.convertir(b,r.costo,r.da));
assert.equal(M.convertir(b,r.costo,r.da), false);  // quedaba 1 fibra
assert.equal(M.cuenta(b,"cuerda"),2); assert.equal(M.cuenta(b,"fibra"),1);
// convertir sin espacio no pierde nada
const l = M.crearMochila(3); M.agregar(l,"cuerda",50); M.agregar(l,"fibra",55);   // cuerda llena + 2 ranuras de fibra
assert.equal(M.convertir(l,r.costo,r.da), false); assert.equal(M.cuenta(l,"fibra"),55); assert.equal(M.cuenta(l,"cuerda"),50);
const l2 = M.crearMochila(1); M.agregar(l2,"fibra",3);                              // al pagar se libera la ranura: sí cabe
assert.equal(M.convertir(l2,r.costo,r.da), true);
// migración v2→v3, con las dos formas de inv/herr
const v2a = { v:2, n:35, piso:[1], obj:[2], dano:[0], inv:{madera:12,piedra:7,fibra:5,bayas:3}, herr:{hacha:true,pico:false}, x:17.5, y:17.5, t:5 };
const v2b = { ...v2a, inv:[12,7,5,3], herr:["hacha"] };
for (const v2 of [v2a, v2b]) {
  const v3 = M.migrarV2aV3(v2);
  assert.equal(v3.v,3); assert.equal(v3.inv,undefined); assert.equal(v3.herr,undefined);
  assert.equal(M.cuenta(v3.mochila,"leno-pino"),12); assert.equal(M.cuenta(v3.mochila,"caliza"),7);
  assert.equal(M.cuenta(v3.mochila,"fibra"),5); assert.equal(M.cuenta(v3.mochila,"bayas"),3);
  assert.equal(M.cuenta(v3.mochila,"hacha"),1); assert.equal(M.cuenta(v3.mochila,"pico"),0);
  assert.equal(v3.x,17.5); assert.deepEqual(v3.piso,[1]);
  assert.equal(M.migrarV2aV3(v3), v3);   // idempotente
}
assert.equal(M.migrarV2aV3(null), null);
assert.equal(M.migrarV2aV3({v:2,inv:{},herr:{}}).mochila.ranuras.every(r=>r===null), true);
assert.equal(M.fusionarV3({t:1,a:1},{t:2,a:2}).a,2);
console.log("TODAS LAS PRUEBAS PASARON");
