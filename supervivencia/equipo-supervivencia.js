// Ruta: supervivencia/equipo-supervivencia.js
// LÓGICA (sin document, sin Firebase) del ALMACENAMIENTO estilo Last Day on Earth: lo que llevas PUESTO o en la mano
// y cómo se mueve entre la mochila y el cuerpo. La pantalla vive en panel-mochila-supervivencia.js.
//
// Un «lugar» se escribe { z, i }:
//   z: "grid" (ranura i de la mochila) · "cabeza" · "torso" · "piernas" · "pies" · "espalda" (la mochila puesta)
//      · "manos" (ranura i) · "bolsillos" (ranura i).      En los lugares de una sola ranura no hace falta `i`.
// Cada ranura guarda { id, n } o null, igual que la mochila (mochila-supervivencia.js).
//
// REGLAS (de la wiki de Last Day on Earth; lo que no se pudo confirmar está marcado 💡):
//  - Ropa: cuatro ranuras (cabeza, torso, piernas, pies). Cada prenda va en la suya. Las de «cuerpo» completo (Kevlar, NRBQ)
//    van en el torso y ocupan también cabeza, piernas y pies: mientras las llevas esas tres ranuras quedan tapadas.
//  - Manos (armas y herramientas): las herramientas NO hace falta tenerlas en la mano para usarlas (el hacha y el pico
//    funcionan desde la mochila, las manos o los bolsillos); las armas sí irán en la mano cuando haya combate.
//  - Bolsillo: acepta comida, bebida, medicinas, armas y herramientas (y nada más). Es para tener a mano lo que usas seguido.
//  - 💡 Cuántas ranuras de mano y de bolsillo hay en el original NO está confirmado: cámbialo aquí (SLOTS_MANO, SLOTS_BOLSILLO).
import { item } from "./datos-supervivencia.js";
import { agregar, cuenta, crearMochila, RANURAS_INICIALES, RANURAS_MAX } from "./mochila-supervivencia.js";

export const SLOTS_MANO = 2;        // 💡 est
export const SLOTS_BOLSILLO = 2;    // 💡 est
export const ROPA = ["cabeza", "torso", "piernas", "pies"];

// ---------- Capacidad de la mochila: 10 ranuras + lo que suma la mochila que llevas en la espalda ----------
export const RANURAS_BASE = RANURAS_INICIALES;                       // 10
export const espacioExtra = (id) => { const it = item(id); return it && it.tipo === "mochila" ? Math.max(0, Math.floor(Number(it.espacio)) || 0) : 0; };
export const capacidad = (e) => Math.min(RANURAS_MAX, RANURAS_BASE + (e && e.espalda ? espacioExtra(e.espalda.id) : 0));
// Pone la mochila al tamaño que toca. Si hay que achicarla, lo que estaba en las ranuras que desaparecen se pasa a las que quedan.
// Devuelve false si no cabe todo (el que llama debe deshacer; ver moverItem y guardarEnMochila).
export function ajustarCapacidad(m, e) {
  const n = capacidad(e);
  while (m.ranuras.length < n) m.ranuras.push(null);
  if (m.ranuras.length === n) return true;
  const sobran = m.ranuras.slice(n).filter(Boolean);
  m.ranuras.length = n;
  for (const x of sobran) if (agregar(m, x.id, x.n) > 0) return false;
  return true;
}
export const NOMBRE_LUGAR = { cabeza: "Cabeza", torso: "Torso", piernas: "Piernas", pies: "Pies", espalda: "Mochila", manos: "Mano", bolsillos: "Bolsillo", grid: "Mochila" };

export const crearEquipo = () => ({
  cabeza: null, torso: null, piernas: null, pies: null, espalda: null,
  manos: Array.from({ length: SLOTS_MANO }, () => null),
  bolsillos: Array.from({ length: SLOTS_BOLSILLO }, () => null),
});

const copia = (x) => JSON.parse(JSON.stringify(x));
const fallo = (razon) => ({ ok: false, razon });
const bien = () => ({ ok: true, razon: null });
const esMulti = (z) => z === "grid" || z === "manos" || z === "bolsillos";
export const mismoLugar = (a, b) => !!a && !!b && a.z === b.z && (a.i | 0) === (b.i | 0);
const mismo = mismoLugar;

export function existe(m, e, r) {
  if (!r) return false;
  if (r.z === "grid") return Number.isInteger(r.i) && r.i >= 0 && r.i < m.ranuras.length;
  if (r.z === "manos" || r.z === "bolsillos") return Number.isInteger(r.i) && r.i >= 0 && r.i < e[r.z].length;
  return r.z in e && !Array.isArray(e[r.z]);
}
export function leer(m, e, r) {
  if (!existe(m, e, r)) return null;
  if (r.z === "grid") return m.ranuras[r.i] || null;
  if (r.z === "manos" || r.z === "bolsillos") return e[r.z][r.i] || null;
  return e[r.z] || null;
}
function poner(m, e, r, v) {
  if (r.z === "grid") m.ranuras[r.i] = v;
  else if (r.z === "manos" || r.z === "bolsillos") e[r.z][r.i] = v;
  else e[r.z] = v;
}
function restaurar(m, e, antes) {
  m.ranuras = antes.m.ranuras;
  for (const k of Object.keys(e)) delete e[k];
  Object.assign(e, antes.e);
}

// ¿Este objeto puede ir en ese lugar? (solo mira el TIPO de objeto, no si está ocupado)
export function acepta(r, id) {
  const it = item(id);
  if (!it) return false;
  switch (r.z) {
    case "grid": return true;
    case "cabeza": case "torso": case "piernas": case "pies":
      return it.tipo === "armadura" && (it.ranura === r.z || (r.z === "torso" && it.ranura === "cuerpo"));
    case "espalda": return it.tipo === "mochila";
    case "manos": return it.tipo === "arma" || it.tipo === "herramienta";
    case "bolsillos": return it.tipo === "comida" || it.tipo === "medicina" || it.tipo === "arma" || it.tipo === "herramienta";
    default: return false;
  }
}
const esCuerpo = (id) => { const it = item(id); return !!it && it.tipo === "armadura" && it.ranura === "cuerpo"; };
// Con un traje de cuerpo completo puesto, cabeza, piernas y pies quedan tapados
export const bloqueada = (e, r) => (r.z === "cabeza" || r.z === "piernas" || r.z === "pies") && !!e.torso && esCuerpo(e.torso.id);

// Mueve (o intercambia, o junta) lo que hay en `de` hacia `a`. Todo o nada: si algo falla, queda como estaba.
// razon: "vacio" | "igual" | "no-existe" | "bloqueado" | "no-acepta" | "lleno" | "mochila-llena"
export function moverItem(m, e, de, a) {
  const A = leer(m, e, de);
  if (!A) return fallo("vacio");
  if (!existe(m, e, a)) return fallo("no-existe");
  if (mismo(de, a)) return fallo("igual");
  const antes = copia({ m, e });
  let r = intentar(m, e, de, a, { ...A });
  if (r.ok && !ajustarCapacidad(m, e)) r = fallo("mochila-llena");   // cambiaste de mochila y lo que llevas ya no cabe en la más chica
  if (!r.ok) restaurar(m, e, antes);
  return r;
}
function intentar(m, e, de, a, A) {
  if (bloqueada(e, a)) return fallo("bloqueado");
  if (!acepta(a, A.id)) return fallo("no-acepta");
  const B = leer(m, e, a);
  const it = item(A.id);
  poner(m, e, de, null);                                   // lo que se mueve sale de su sitio
  if (!B) poner(m, e, a, A);
  else if (B.id === A.id && esMulti(a.z) && it.apila > 1) {   // mismo objeto apilable: se juntan hasta el tope
    const k = Math.min(A.n, it.apila - B.n);
    if (k <= 0) return fallo("lleno");
    B.n += k; A.n -= k;
    if (A.n > 0) poner(m, e, de, A);
  } else {                                                 // intercambio: lo que había en `a` se va al sitio de origen
    if (bloqueada(e, de) || !acepta(de, B.id)) return fallo("no-acepta");
    poner(m, e, a, A); poner(m, e, de, B);
  }
  if (a.z === "torso" && esCuerpo(A.id)) {                 // traje de cuerpo completo: la ropa de cabeza, piernas y pies vuelve a la mochila
    for (const z of ["cabeza", "piernas", "pies"]) {
      const x = e[z];
      if (!x) continue;
      e[z] = null;
      if (agregar(m, x.id, x.n) > 0) return fallo("mochila-llena");
    }
  }
  return bien();
}

// Saca lo que hay en un lugar del cuerpo y lo guarda en la mochila (donde quepa). Todo o nada.
export function guardarEnMochila(m, e, r) {
  const A = leer(m, e, r);
  if (!A) return fallo("vacio");
  if (r.z === "grid") return fallo("igual");
  const antes = copia({ m, e });
  poner(m, e, r, null);
  // Si lo que sale es la mochila de la espalda, primero se achica la mochila y luego se guarda
  if (!ajustarCapacidad(m, e) || agregar(m, A.id, A.n) > 0) { restaurar(m, e, antes); return fallo("mochila-llena"); }
  return bien();
}

// A dónde iría un objeto si lo «equipas» con un toque: lista de lugares en orden de preferencia
export function destinos(id) {
  const it = item(id);
  if (!it) return [];
  const manos = Array.from({ length: SLOTS_MANO }, (_, i) => ({ z: "manos", i }));
  const bols = Array.from({ length: SLOTS_BOLSILLO }, (_, i) => ({ z: "bolsillos", i }));
  switch (it.tipo) {
    case "armadura": return [{ z: it.ranura === "cuerpo" ? "torso" : it.ranura }];
    case "mochila": return [{ z: "espalda" }];
    case "arma": case "herramienta": return [...manos, ...bols];
    case "comida": case "medicina": return bols;
    default: return [];
  }
}
// Un toque: si está en la mochila lo pone donde corresponde (primero un lugar vacío o donde se junte; si no, cambia por lo que haya);
// si ya está puesto, lo guarda en la mochila.
export function alternarItem(m, e, de) {
  const A = leer(m, e, de);
  if (!A) return fallo("vacio");
  if (de.z !== "grid") return guardarEnMochila(m, e, de);
  const it = item(A.id);
  const lista = destinos(A.id).filter((r) => !bloqueada(e, r));
  if (!lista.length) return fallo(destinos(A.id).length ? "bloqueado" : "no-acepta");
  const libre = lista.find((r) => {
    const B = leer(m, e, r);
    return !B || (B.id === A.id && esMulti(r.z) && it.apila > 1 && B.n < it.apila);
  });
  return moverItem(m, e, de, libre || lista[0]);
}

// ---------- Consultas ----------
// Cuántos tienes EN TODO: mochila + puestos/en manos/en bolsillos (para saber si «tienes el hacha»)
export function cuentaTodo(m, e, id) {
  let t = cuenta(m, id);
  for (const k of Object.keys(e)) {
    for (const x of Array.isArray(e[k]) ? e[k] : [e[k]]) if (x && x.id === id) t += x.n;
  }
  return t;
}
// ¿Cabe `n` de este objeto en la mochila? (sin tocar nada)
export const hayEspacio = (m, id, n = 1) => agregar(copia(m), id, n) === 0;

// ---------- Guardado: leer lo que viene de localStorage sin fiarse de nada ----------
export function sanearMochila(raw, ranuras = RANURAS_MAX) {   // se lee con el tamaño máximo; sanearEquipo la deja del tamaño que toca
  const m = crearMochila(ranuras);
  const lista = raw && Array.isArray(raw.ranuras) ? raw.ranuras : [];
  for (let i = 0; i < Math.min(lista.length, ranuras); i++) {
    const r = lista[i], it = r && typeof r === "object" ? item(r.id) : null, n = Math.floor(Number(r && r.n)) || 0;
    if (it && n > 0) m.ranuras[i] = { id: it.id, n: Math.min(n, it.apila) };
  }
  return m;
}
// Lo que no cabe en su lugar (dato dañado, o una regla que cambió) vuelve a la mochila; si tampoco cabe ahí, se pierde.
export function sanearEquipo(raw, m) {
  const e = crearEquipo();
  const lee = (x) => {
    const it = x && typeof x === "object" ? item(x.id) : null, n = Math.floor(Number(x && x.n)) || 0;
    return it && n > 0 ? { id: it.id, n: Math.min(n, it.apila) } : null;
  };
  const devolver = (x) => { if (x) agregar(m, x.id, x.n); };
  const r = raw && typeof raw === "object" ? raw : {};
  for (const z of [...ROPA, "espalda"]) {
    const x = lee(r[z]);
    if (x && acepta({ z }, x.id)) e[z] = { id: x.id, n: 1 }; else devolver(x);
  }
  for (const z of ["manos", "bolsillos"]) {
    const lista = Array.isArray(r[z]) ? r[z] : [];
    for (let i = 0; i < lista.length; i++) {
      const x = lee(lista[i]);
      if (!x) continue;
      if (i < e[z].length && acepta({ z, i }, x.id)) e[z][i] = x; else devolver(x);
    }
  }
  if (e.torso && esCuerpo(e.torso.id)) for (const z of ["cabeza", "piernas", "pies"]) { devolver(e[z]); e[z] = null; }
  ajustarCapacidad(m, e);   // 10 + lo que suma la mochila puesta (si un guardado viejo trae más de lo que cabe, lo que sobre se pierde)
  return e;
}
