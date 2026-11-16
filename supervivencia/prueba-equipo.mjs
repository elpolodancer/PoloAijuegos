// Pruebas en consola: node prueba-equipo.mjs   (solo lógica; la pantalla no se prueba aquí)
import assert from "node:assert/strict";
import * as D from "./datos-supervivencia.js";
import * as M from "./mochila-supervivencia.js";
import * as E from "./equipo-supervivencia.js";

assert.deepEqual(D.validar(), [], "ids inconsistentes");
const nuevo = () => ({ m: M.crearMochila(), e: E.crearEquipo() });
const total = (m, e, id) => E.cuentaTodo(m, e, id);
const G = (i) => ({ z: "grid", i });

// --- reglas de qué va dónde ---
assert.equal(E.acepta({ z: "torso" }, "camisa"), true);
assert.equal(E.acepta({ z: "cabeza" }, "camisa"), false);
assert.equal(E.acepta({ z: "cabeza" }, "gorro"), true);
assert.equal(E.acepta({ z: "pies" }, "botas-trabajo"), true);
assert.equal(E.acepta({ z: "torso" }, "kevlar"), true);          // cuerpo completo va en el torso
assert.equal(E.acepta({ z: "piernas" }, "kevlar"), false);
assert.equal(E.acepta({ z: "espalda" }, "mochila-basica"), true);
assert.equal(E.acepta({ z: "espalda" }, "camisa"), false);
assert.equal(E.acepta({ z: "manos", i: 0 }, "hacha"), true);
assert.equal(E.acepta({ z: "manos", i: 0 }, "bayas"), false);     // la mano no lleva comida
assert.equal(E.acepta({ z: "bolsillos", i: 0 }, "bayas"), true);
assert.equal(E.acepta({ z: "bolsillos", i: 0 }, "hacha"), true);
assert.equal(E.acepta({ z: "bolsillos", i: 0 }, "caliza"), false); // un bolsillo no lleva piedras
assert.equal(E.acepta({ z: "bolsillos", i: 0 }, "camisa"), false);

// --- poner y quitar ropa ---
{
  const { m, e } = nuevo();
  M.agregar(m, "camisa", 1); M.agregar(m, "zapatillas", 1);
  assert.equal(E.moverItem(m, e, G(0), { z: "torso" }).ok, true);
  assert.equal(e.torso.id, "camisa"); assert.equal(m.ranuras[0], null);
  assert.equal(E.moverItem(m, e, G(1), { z: "torso" }).razon, "no-acepta");   // zapatillas no van en el torso
  assert.equal(m.ranuras[1].id, "zapatillas");                                // y no se perdió nada
  assert.equal(E.alternarItem(m, e, G(1)).ok, true); assert.equal(e.pies.id, "zapatillas");
  assert.equal(E.alternarItem(m, e, { z: "torso" }).ok, true);                // quitar
  assert.equal(e.torso, null); assert.equal(M.cuenta(m, "camisa"), 1);
  assert.equal(E.moverItem(m, e, { z: "torso" }, G(0)).razon, "vacio");
}
// --- cambiar una prenda por otra: la de antes vuelve al sitio de la nueva ---
{
  const { m, e } = nuevo();
  M.agregar(m, "camisa", 1); M.agregar(m, "chaqueta", 1);
  E.alternarItem(m, e, G(0));                                                  // camisa puesta
  assert.equal(E.moverItem(m, e, G(1), { z: "torso" }).ok, true);
  assert.equal(e.torso.id, "chaqueta"); assert.equal(m.ranuras[1].id, "camisa");
}
// --- traje de cuerpo completo ---
{
  const { m, e } = nuevo();
  for (const id of ["gorro", "pantalon-cargo", "zapatillas", "kevlar", "camisa"]) M.agregar(m, id, 1);
  for (const i of [0, 1, 2]) assert.equal(E.alternarItem(m, e, G(i)).ok, true);
  assert.ok(e.cabeza && e.piernas && e.pies);
  assert.equal(E.alternarItem(m, e, G(3)).ok, true);                           // kevlar al torso
  assert.equal(e.torso.id, "kevlar"); assert.equal(e.cabeza, null); assert.equal(e.piernas, null); assert.equal(e.pies, null);
  assert.equal(M.cuenta(m, "gorro"), 1); assert.equal(M.cuenta(m, "pantalon-cargo"), 1); assert.equal(M.cuenta(m, "zapatillas"), 1);
  assert.equal(E.bloqueada(e, { z: "cabeza" }), true);
  const g = m.ranuras.findIndex((r) => r && r.id === "gorro");
  assert.equal(E.moverItem(m, e, G(g), { z: "cabeza" }).razon, "bloqueado");   // tapado mientras llevas el traje
  const ca = m.ranuras.findIndex((r) => r && r.id === "camisa");
  assert.equal(E.moverItem(m, e, G(ca), { z: "torso" }).ok, true);             // cambiar el traje por una camisa lo destapa
  assert.equal(e.torso.id, "camisa"); assert.equal(E.bloqueada(e, { z: "cabeza" }), false);
  assert.equal(M.cuenta(m, "kevlar"), 1);
}
// --- el traje no cabe si la mochila está llena: no se pierde nada ---
{
  const { m, e } = nuevo();
  M.agregar(m, "kevlar", 1);
  e.cabeza = { id: "gorro", n: 1 };
  for (let i = 0; i < m.ranuras.length; i++) if (!m.ranuras[i]) m.ranuras[i] = { id: "caliza", n: 20 };   // todo lleno
  const k = m.ranuras.findIndex((r) => r.id === "kevlar");
  const antes = JSON.stringify({ m, e });
  const r = E.moverItem(m, e, G(k), { z: "torso" });
  // el hueco del kevlar queda libre al ponerlo, así que el gorro cabe: debe salir bien
  assert.equal(r.ok, true); assert.equal(e.cabeza, null); assert.equal(M.cuenta(m, "gorro"), 1);
  // pero con DOS prendas que sacar y un solo hueco, falla y todo queda igual
  const t = nuevo();
  M.agregar(t.m, "kevlar", 1); t.e.cabeza = { id: "gorro", n: 1 }; t.e.pies = { id: "zapatillas", n: 1 };
  for (let i = 0; i < t.m.ranuras.length; i++) if (!t.m.ranuras[i]) t.m.ranuras[i] = { id: "caliza", n: 20 };
  const k2 = t.m.ranuras.findIndex((x) => x.id === "kevlar");
  const a2 = JSON.stringify(t);
  assert.equal(E.moverItem(t.m, t.e, G(k2), { z: "torso" }).razon, "mochila-llena");
  assert.equal(JSON.stringify(t), a2, "tras fallar debe quedar igual");
  void antes;
}
// --- manos y bolsillos ---
{
  const { m, e } = nuevo();
  M.agregar(m, "hacha", 1); M.agregar(m, "pico", 1); M.agregar(m, "palanca", 1); M.agregar(m, "bayas", 12); M.agregar(m, "caliza", 5);
  assert.equal(E.alternarItem(m, e, G(0)).ok, true); assert.equal(e.manos[0].id, "hacha");
  assert.equal(E.alternarItem(m, e, G(1)).ok, true); assert.equal(e.manos[1].id, "pico");
  assert.equal(E.alternarItem(m, e, G(2)).ok, true); assert.equal(e.bolsillos[0].id, "palanca");   // manos llenas → bolsillo
  assert.equal(E.alternarItem(m, e, G(3)).ok, true); assert.equal(e.bolsillos[1].id, "bayas"); assert.equal(e.bolsillos[1].n, 12);
  assert.equal(E.alternarItem(m, e, G(4)).razon, "no-acepta");                                    // las piedras no se equipan
  assert.equal(E.cuentaTodo(m, e, "hacha"), 1);                                                    // «tener el hacha» cuenta lo puesto
  assert.equal(M.cuenta(m, "hacha"), 0);
  // bayas: separar y juntar
  M.agregar(m, "bayas", 3);
  const gi = m.ranuras.findIndex((r) => r && r.id === "bayas");
  assert.equal(E.alternarItem(m, e, G(gi)).ok, true); assert.equal(e.bolsillos[1].n, 15);        // se juntan en el bolsillo
  assert.equal(E.guardarEnMochila(m, e, { z: "manos", i: 0 }).ok, true); assert.equal(M.cuenta(m, "hacha"), 1);
  // la mano no acepta bayas arrastradas
  M.agregar(m, "bayas", 2);
  const gj = m.ranuras.findIndex((r) => r && r.id === "bayas");
  assert.equal(E.moverItem(m, e, G(gj), { z: "manos", i: 1 }).razon, "no-acepta");
}
// --- guardar en la mochila llena no pierde nada ---
{
  const { m, e } = nuevo();
  e.manos[0] = { id: "hacha", n: 1 };
  for (let i = 0; i < m.ranuras.length; i++) m.ranuras[i] = { id: "caliza", n: 20 };
  const a = JSON.stringify({ m, e });
  assert.equal(E.guardarEnMochila(m, e, { z: "manos", i: 0 }).razon, "mochila-llena");
  assert.equal(JSON.stringify({ m, e }), a);
}
// --- espalda ---
{
  const { m, e } = nuevo();
  M.agregar(m, "mochila-basica", 1);
  assert.equal(E.alternarItem(m, e, G(0)).ok, true); assert.equal(e.espalda.id, "mochila-basica");
}
// --- hayEspacio ---
{
  const m = M.crearMochila(1);
  M.agregar(m, "caliza", 15);
  assert.equal(E.hayEspacio(m, "caliza", 5), true);
  assert.equal(E.hayEspacio(m, "caliza", 6), false);
  assert.equal(E.hayEspacio(m, "fibra", 1), false);
  assert.equal(M.cuenta(m, "caliza"), 15);   // no se tocó
}
// --- guardado: datos dañados no rompen nada ---
{
  const m = E.sanearMochila({ ranuras: [{ id: "caliza", n: 9999 }, { id: "inventado", n: 3 }, null, { id: "hacha", n: 0 }, "x", { id: "bayas", n: 2.7 }] });
  assert.equal(m.ranuras.length, 25); assert.equal(m.ranuras[0].n, 20); assert.equal(m.ranuras[1], null);
  assert.equal(m.ranuras[3], null); assert.equal(m.ranuras[5].n, 2);
  assert.equal(E.sanearMochila(null).ranuras.every((r) => r === null), true);
  const e = E.sanearEquipo({
    cabeza: { id: "camisa", n: 1 },                 // camisa en la cabeza: no vale → vuelve a la mochila
    torso: { id: "camisa", n: 5 }, pies: { id: "zapatillas", n: 1 },
    espalda: { id: "hacha", n: 1 },                 // el hacha no es mochila
    manos: [{ id: "hacha", n: 1 }, { id: "bayas", n: 3 }, { id: "pico", n: 1 }],   // bayas en la mano y una mano de más
    bolsillos: [{ id: "bayas", n: 999 }],
  }, m);
  assert.equal(e.cabeza, null); assert.equal(e.torso.n, 1); assert.equal(e.pies.id, "zapatillas");
  assert.equal(e.espalda, null); assert.equal(e.manos[0].id, "hacha"); assert.equal(e.manos[1], null);
  assert.equal(e.bolsillos[0].n, 30);                                             // tope de apilado de las bayas
  assert.equal(e.manos.length, E.SLOTS_MANO);
  assert.ok(M.cuenta(m, "camisa") >= 1 && M.cuenta(m, "hacha") >= 1 && M.cuenta(m, "pico") >= 1);   // lo rechazado volvió a la mochila
  const ez = E.sanearEquipo({ torso: { id: "kevlar", n: 1 }, cabeza: { id: "gorro", n: 1 } }, E.sanearMochila(null));
  assert.equal(ez.cabeza, null);                                                  // con traje puesto no puede haber gorro
  assert.deepEqual(E.sanearEquipo(null, M.crearMochila()), E.crearEquipo());
}
// --- ida y vuelta por JSON ---
{
  const { m, e } = nuevo();
  M.agregar(m, "hacha", 1); M.agregar(m, "camisa", 1); M.agregar(m, "bayas", 4); M.agregar(m, "caliza", 70);
  E.alternarItem(m, e, G(0)); E.alternarItem(m, e, G(1)); E.alternarItem(m, e, G(2));
  const j = JSON.parse(JSON.stringify({ mochila: m, equipo: e }));
  const m2 = E.sanearMochila(j.mochila), e2 = E.sanearEquipo(j.equipo, m2);
  assert.deepEqual(m2, m); assert.deepEqual(e2, e);
}
// --- migración v2 → v3 con la mochila nueva (sigue funcionando) ---
{
  const v3 = M.migrarV2aV3({ v: 2, n: 35, piso: "0", obj: "0", dano: "0", inv: { madera: 12, piedra: 7, fibra: 5, bayas: 3 }, herr: ["hacha"], x: 1, y: 2, t: 3 });
  assert.equal(v3.v, 3); assert.equal(M.cuenta(v3.mochila, "hacha"), 1); assert.equal(M.cuenta(v3.mochila, "leno-pino"), 12);
}
// --- capacidad: 10 ranuras base; mochila nivel 1/2/3 suma 5/10/15; topes de apilado de 20 ---
{
  for (const id of ["leno-pino", "leno-roble", "caliza", "hierro"]) assert.equal(D.item(id).apila, 20, id);
  assert.equal(M.crearMochila().ranuras.length, 10);
  assert.equal(E.capacidad(E.crearEquipo()), 10);
  const m0 = M.crearMochila(); assert.equal(M.agregar(m0, "caliza", 25), 0); assert.equal(m0.ranuras[0].n, 20); assert.equal(m0.ranuras[1].n, 5);
  for (const [id, extra] of [["mochila-basica", 5], ["mochila-nivel-2", 10], ["mochila-nivel-3", 15]]) {
    const { m, e } = nuevo();
    M.agregar(m, id, 1);
    assert.equal(E.alternarItem(m, e, G(0)).ok, true);
    assert.equal(e.espalda.id, id); assert.equal(m.ranuras.length, 10 + extra, id);
    assert.equal(E.guardarEnMochila(m, e, { z: "espalda" }).ok, true);   // se la quita: vuelve a 10 y la mochila queda guardada
    assert.equal(m.ranuras.length, 10); assert.equal(M.cuenta(m, id), 1);
  }
  // quitarse la mochila con cosas en las ranuras extra: se acomodan en las 10 que quedan
  { const { m, e } = nuevo();
    M.agregar(m, "mochila-basica", 1); E.alternarItem(m, e, G(0));
    M.agregar(m, "caliza", 40);                                  // 2 ranuras
    m.ranuras[14] = { id: "hierro", n: 7 };                      // una ranura extra (de la 11 a la 15)
    assert.equal(E.guardarEnMochila(m, e, { z: "espalda" }).ok, true);
    assert.equal(m.ranuras.length, 10); assert.equal(M.cuenta(m, "hierro"), 7); assert.equal(M.cuenta(m, "caliza"), 40);
    assert.equal(E.leer(m, e, { z: "espalda" }), null); }
  // quitarse la mochila con las 15 ranuras llenas: NO se deja, y no se pierde nada
  { const { m, e } = nuevo();
    M.agregar(m, "mochila-basica", 1); E.alternarItem(m, e, G(0));
    for (let i = 0; i < m.ranuras.length; i++) if (!m.ranuras[i]) m.ranuras[i] = { id: "hierro", n: 20 };
    const antes = JSON.stringify({ m, e });
    assert.equal(E.guardarEnMochila(m, e, { z: "espalda" }).razon, "mochila-llena");
    assert.equal(JSON.stringify({ m, e }), antes); }
  // cambiar a una mochila más chica con las ranuras extra llenas: tampoco se deja
  { const { m, e } = nuevo();
    M.agregar(m, "mochila-nivel-3", 1); E.alternarItem(m, e, G(0));                       // 25 ranuras
    M.agregar(m, "mochila-basica", 1);
    for (let i = 0; i < m.ranuras.length; i++) if (!m.ranuras[i]) m.ranuras[i] = { id: "hierro", n: 20 };
    const bi = m.ranuras.findIndex((r) => r && r.id === "mochila-basica");
    const antes = JSON.stringify({ m, e });
    assert.equal(E.moverItem(m, e, G(bi), { z: "espalda" }).ok, false);
    assert.equal(JSON.stringify({ m, e }), antes); }
  // guardado: se lee con hasta 25 ranuras y queda del tamaño de la mochila puesta
  { const { m, e } = nuevo();
    M.agregar(m, "mochila-nivel-2", 1); E.alternarItem(m, e, G(0));
    const raw = JSON.parse(JSON.stringify({ mochila: { ranuras: m.ranuras }, equipo: e }));
    const m2 = E.sanearMochila(raw.mochila), e2 = E.sanearEquipo(raw.equipo, m2);
    assert.equal(e2.espalda.id, "mochila-nivel-2"); assert.equal(m2.ranuras.length, 20);
    // sin mochila puesta, un guardado de 20 ranuras vuelve a 10 (lo que no cabe se pierde)
    const m3 = E.sanearMochila({ ranuras: Array.from({ length: 20 }, () => ({ id: "fibra", n: 50 })) }); E.sanearEquipo({}, m3);
    assert.equal(m3.ranuras.length, 10); }
}
console.log("TODAS LAS PRUEBAS DEL EQUIPO PASARON");
