// Prueba del panel 🎒 con un DOM de mentira (no hay navegador aquí): node prueba-panel.mjs
// Comprueba que la pantalla se construye sin errores y que los toques mueven los objetos. NO prueba el aspecto visual.
import assert from "node:assert/strict";

class Nodo {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ""; this.dataset = {}; this.attrs = {}; this.oyentes = {}; this._t = ""; this.hidden = false; this.disabled = false; this.id = ""; this.scrollTop = 0; this.type = "";
    this.classList = { add: (c) => { this.className += " " + c; }, contains: (c) => this.className.split(/\s+/).includes(c) }; }
  get textContent() { return this._t + this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join(""); }
  set textContent(v) { this._t = String(v); this.children = []; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { for (const c of cs) this.children.push(c); }
  replaceChildren(...cs) { this._t = ""; this.children = [...cs]; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, f) { (this.oyentes[t] ||= []).push(f); }
  click() { if (this.disabled) return; for (const f of this.oyentes.click || []) f({ target: this }); }
  focus() {}
  todos() { return this.children.flatMap((c) => (typeof c === "string" ? [] : [c, ...c.todos()])); }
}
const raiz = new Nodo("body"), cabeza = new Nodo("head");
globalThis.document = { createElement: (t) => new Nodo(t), getElementById: (id) => cabeza.todos().find((x) => x.id === id) || null, head: cabeza, body: raiz, documentElement: raiz, activeElement: null };
const teclas = [];
globalThis.addEventListener = (t, f) => { if (t === "keydown") teclas.push(f); };
globalThis.removeEventListener = (t, f) => { const i = teclas.indexOf(f); if (i >= 0) teclas.splice(i, 1); };

const M = await import("./mochila-supervivencia.js");
const E = await import("./equipo-supervivencia.js");
const { crearPanelMochila } = await import("./panel-mochila-supervivencia.js");

const mochila = M.crearMochila(), equipo = E.crearEquipo();
let abierto = 0, cerrado = 0, cambios = 0;
const p = crearPanelMochila({ mochila, equipo, pruebas: true, alAbrir: () => abierto++, alCerrar: () => cerrado++, alCambiar: () => cambios++ });
const fondo = raiz.children[0];
const slots = () => fondo.todos().filter((x) => x.className.includes("mo-slot"));
const slot = (z, i) => slots().find((x) => x.dataset.z === z && (i == null || x.dataset.i === String(i)));
const boton = (txt) => fondo.todos().find((x) => x.tag === "button" && !x.className.includes("mo-slot") && x.textContent.includes(txt));

assert.equal(fondo.hidden, true);
p.abrir();
assert.equal(p.abierto(), true); assert.equal(abierto, 1);
assert.equal(slots().length, 4 + 1 + E.SLOTS_MANO + E.SLOTS_BOLSILLO + E.RANURAS_BASE);   // ropa + espalda + manos + bolsillos + mochila
assert.ok(cabeza.todos().some((x) => x.id === "mo-estilos"), "debe inyectar sus estilos");
assert.ok(fondo.textContent.includes("Toca un objeto"), "ayuda inicial");

// objetos de prueba
equipo.espalda = { id: "mochila-nivel-3", n: 1 }; E.ajustarCapacidad(mochila, equipo);   // con 10 ranuras no caben los 14 objetos de prueba
assert.equal(mochila.ranuras.length, 25);
boton("Objetos de prueba").click();
assert.equal(cambios, 1);
assert.equal(M.cuenta(mochila, "kevlar"), 1); assert.equal(M.cuenta(mochila, "bayas"), 8);
const gi = (id) => mochila.ranuras.findIndex((r) => r && r.id === id);

// toque 1: elegir la camisa → se resalta el torso; toque 2: el torso → puesta
slot("grid", gi("camisa")).click();
assert.ok(slot("grid", gi("camisa")).className.includes("mo-sel"));
assert.ok(slot("torso").className.includes("mo-dest"), "el torso debe iluminarse");
assert.ok(!slot("cabeza").className.includes("mo-dest"), "la cabeza no acepta camisa");
assert.ok(fondo.textContent.includes("Camisa"));
slot("torso").click();
assert.equal(equipo.torso.id, "camisa"); assert.equal(cambios, 2);
assert.ok(slot("torso").textContent.includes("👕"));

// elegir y cancelar tocando de nuevo
slot("grid", gi("gorro")).click(); slot("grid", gi("gorro")).click();
assert.ok(!slots().some((x) => x.className.includes("mo-sel")));

// destino que no acepta: aviso y no se pierde nada
slot("grid", gi("zapatillas")).click(); slot("cabeza").click();
assert.equal(equipo.cabeza, null); assert.ok(fondo.textContent.includes("Eso no va ahí"));
// botón Equipar
boton("Equipar").click();
assert.equal(equipo.pies.id, "zapatillas");
// hacha: no hay; palanca → mano; bayas → bolsillo con «Equipar»
slot("grid", gi("palanca")).click(); boton("Equipar").click();
assert.equal(equipo.manos[0].id, "palanca");
slot("grid", gi("bayas")).click(); boton("Equipar").click();
assert.equal(equipo.bolsillos[0].id, "bayas"); assert.equal(equipo.bolsillos[0].n, 8);
assert.ok(slot("bolsillos", 0).textContent.includes("8"));
// bayas a la mano: no
M.agregar(mochila, "bayas", 2);
slot("grid", gi("bayas")).click(); slot("manos", 1).click();
assert.equal(equipo.manos[1], null);
boton("Cancelar").click();
// quitar la camisa con «A la mochila»
slot("torso").click(); boton("A la mochila").click();
assert.equal(equipo.torso, null); assert.equal(M.cuenta(mochila, "camisa"), 1);
// traje de cuerpo completo: tapa la cabeza
slot("grid", gi("gorro")).click(); boton("Equipar").click(); assert.equal(equipo.cabeza.id, "gorro");
slot("grid", gi("kevlar")).click(); boton("Equipar").click();
assert.equal(equipo.torso.id, "kevlar"); assert.equal(equipo.cabeza, null);
assert.ok(slot("cabeza").className.includes("mo-bloq")); assert.ok(slot("cabeza").textContent.includes("Tapado"));
slot("cabeza").click(); assert.ok(fondo.textContent.includes("tapado") || fondo.textContent.includes("Tapado"));

// cerrar con Esc, y reabrir con el mismo estado
teclas.forEach((f) => f({ key: "Escape", repeat: false, preventDefault() {} }));
assert.equal(p.abierto(), false); assert.equal(cerrado, 1); assert.equal(teclas.length, 0, "debe quitar su oyente de teclado");
p.abrir(); assert.equal(abierto, 2); assert.ok(slot("torso").textContent.includes("🛡️"));
teclas.forEach((f) => f({ key: "i", repeat: false, preventDefault() {} }));
assert.equal(p.abierto(), false);

// sin modo pruebas no hay botón de prueba
raiz.children.length = 0;
const q = crearPanelMochila({ mochila: M.crearMochila(), equipo: E.crearEquipo() });
q.abrir();
assert.equal(raiz.children[0].todos().some((x) => x.tag === "button" && x.textContent.includes("Objetos de prueba")), false);
console.log("PRUEBAS DEL PANEL PASARON");
