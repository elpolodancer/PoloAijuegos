// Ejecutar:  node prueba-mapa-general.mjs   (sin navegador)
import assert from "node:assert/strict";
import * as G from "./mapa-general-supervivencia.js";
import * as Z from "./zonas-supervivencia.js";
const N = 35, B = G.BORDE;

// ---- zonas ----
assert.deepEqual(Z.validarZonas(), []);
assert.equal(Z.ZONAS.length, 12);                                             // 3 pino + 3 caliza + 2 búnkeres + granja + comisaría + 2 atalayas
assert.equal(Z.zonasDe("pino").length, 3); assert.equal(Z.zonasDe("caliza").length, 3);
assert.deepEqual(Z.zonasDe("pino").map(z => z.energia), [15, 22, 33]);
assert.ok(Z.zonasDe("caliza").every(z => z.rumbo === "oeste")); assert.ok(Z.zonasDe("pino").every(z => z.rumbo === "este"));
assert.deepEqual(Z.zonasDe("caliza").map(z => z.recursos.hierro), [5, 30, 50]);   // «mucho hierro» y creciente
assert.ok(Z.zonasDe("pino").every(z => z.recursos.hierro === 0));
const bk = Z.zona("bunker-bravo"); assert.ok(bk.vacio && bk.enemigos.length === 0 && Object.keys(bk.recursos).length === 0 && bk.botin === null);
const d = (z) => Math.hypot(z.pos.x - Z.BASE.pos.x, z.pos.y - Z.BASE.pos.y);
for (const t of ["pino", "caliza"]) { const x = Z.zonasDe(t).map(d); assert.ok(x[0] < x[1] && x[1] < x[2], t); }

// nuevas ubicaciones especiales: existen, están VACÍAS y sus enemigos previstos tienen ficha
for (const [id, tipo] of [["bunker-alfa","bunker"],["granja-crooked-creek","granja"],["comisaria-blackport","policia"],["atalaya-1","atalaya"],["atalaya-2","atalaya"]]) {
  const z = Z.zona(id); assert.ok(z, id); assert.equal(z.tipo, tipo); assert.ok(z.vacio); assert.equal(z.enemigos.length, 0); assert.equal(z.botin, null);
  for (const e of z.enemigosPrevistos) assert.ok(Z.ENEMIGOS_ESPECIALES[e], e);
}
assert.equal(Z.zonasDe("atalaya").length, 2);
assert.deepEqual(Z.zona("granja-crooked-creek").enemigosPrevistos.sort(), ["infected-bull","lobo-enfermo","ravager","rotten-yokel","savage-giant"]);
assert.equal(Z.zona("granja-crooked-creek").jefe, "ravager"); assert.equal(Z.ENEMIGOS_ESPECIALES.ravager.vida, 2000);
assert.deepEqual(Z.zona("comisaria-blackport").enemigosPrevistos.sort(), ["brawler","explosive-zombie","hungry-chomper","riot-zombie"]);
assert.deepEqual(Z.zona("bunker-alfa").previsto.canje.map(c => c.cuesta), [20, 25, 30]);
assert.equal(Z.zona("atalaya-1").enemigosPrevistos.length, 0);                  // el README no dice nada de las atalayas
// ninguna zona se encima con otra en el mapa (distancia mínima entre centros)
for (const a of Z.ZONAS) for (const b of Z.ZONAS) if (a.id < b.id) assert.ok(Math.hypot((a.pos.x - b.pos.x) * 900, (a.pos.y - b.pos.y) * 680) > 90, a.id + " / " + b.id);
// las nuevas se pueden visitar sin gastar energía (costo ❓ = null) y sin nivel
{ const e = G.crearEstadoViaje(); for (const id of ["bunker-alfa","granja-crooked-creek","comisaria-blackport","atalaya-1","atalaya-2"]) { const r = G.viajar(e, id); assert.ok(r.ok && r.costo === 0 && r.destino.vacio, id); } assert.equal(e.energia, 100); }

// ---- franja exterior ----
assert.equal(G.tamExt(N), 39);
assert.equal(G.casillasAnillo(N).length, 39 * 39 - 35 * 35);                  // 296
assert.ok(G.casillasAnillo(N).every(([i, j]) => G.esAnillo(i, j, N) && !G.dentro(i, j, N)));
for (const [i, j] of G.casillasAnillo(N)) { assert.equal(G.puedeConstruir(i, j, N), false); assert.equal(G.puedeHaberObjeto(i, j, N), false); }
assert.ok(G.puedeConstruir(0, 0, N) && G.puedeConstruir(34, 34, N));
const bloquea = () => true;                                                   // aunque TODO el mapa estuviera bloqueado, el anillo se pisa
assert.ok(G.casillaLibre(-1, 5, N, bloquea)); assert.ok(G.casillaLibre(36, 5, N, bloquea)); assert.ok(G.casillaLibre(-2, -2, N, bloquea));
assert.equal(G.casillaLibre(5, 5, N, bloquea), false); assert.equal(G.casillaLibre(-3, 5, N, bloquea), false); assert.equal(G.casillaLibre(37, 5, N, bloquea), false);
const vistos = new Set(); for (let j = -B; j < N + B; j++) for (let i = -B; i < N + B; i++) { const k = G.indiceExt(i, j, N); assert.ok(k >= 0 && k < 1521); vistos.add(k); }
assert.equal(vistos.size, 1521);
const obj = new Uint8Array(1521); assert.ok(G.anilloLimpio(obj, N)); obj[G.indiceExt(-1, 3, N)] = 2; assert.equal(G.anilloLimpio(obj, N), false);
obj[G.indiceExt(-1, 3, N)] = 0; obj[G.indiceExt(10, 10, N)] = 2; assert.ok(G.anilloLimpio(obj, N));   // objetos DENTRO del mapa no cuentan

// ---- salida ----
assert.equal(G.salida(17, 17, N), null); assert.equal(G.salida(-1.5, 17, N), null);   // en el anillo todavía no sale
assert.equal(G.salida(-1.9, 17, N), "oeste"); assert.equal(G.salida(36.9, 17, N), "este");
assert.equal(G.salida(17, -1.9, N), "norte"); assert.equal(G.salida(17, 36.9, N), "sur");
const dv = G.devolverAdentro(-1.95, 40, N); assert.equal(G.salida(dv.x, dv.y, N), null);   // devuelto: no vuelve a disparar
for (const r of ["oeste", "este", "norte", "sur"]) { const e = G.entrada(r, N); assert.ok(G.esAnillo(Math.floor(e.x), Math.floor(e.y), N) && G.salida(e.x, e.y, N) === null, r); }

// ---- viaje ----
let est = G.crearEstadoViaje();
let r = G.viajar(est, "pino-verde"); assert.ok(r.ok); assert.equal(est.energia, 85); assert.equal(r.costo, 15);
r = G.viajar(est, "pino-naranja"); assert.equal(r.ok, false); assert.equal(r.razon, "nivel"); assert.equal(r.nivelNecesario, 10); assert.equal(est.energia, 85);   // no cobra
est.nivel = 10; r = G.viajar(est, "pino-naranja"); assert.ok(r.ok); assert.equal(est.energia, 63);
r = G.viajar(est, "caliza-roja"); assert.ok(r.ok); assert.equal(est.energia, 30);
r = G.viajar(est, "caliza-roja"); assert.equal(r.ok, false); assert.equal(r.razon, "energia"); assert.equal(r.falta, 3); assert.equal(est.energia, 30);
assert.equal(G.textoRazon(r), "Te faltan 3 de energía");
G.recargar(est, 10); assert.equal(est.energia, 40);
G.recargar(est, 1e6); assert.equal(est.energia, 100);                         // tope
r = G.viajar(est, "bunker-bravo"); assert.ok(r.ok); assert.equal(r.costo, 0); assert.ok(r.destino.vacio); assert.equal(est.energia, 100);
assert.equal(G.puedeViajar(est, "base").ok, false); assert.equal(G.puedeViajar(est, "xyz").razon, "no-existe");
console.log("TODAS LAS PRUEBAS DEL MAPA GENERAL PASARON");
