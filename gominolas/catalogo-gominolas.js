// Ruta: gominolas/catalogo-gominolas.js
// CATÁLOGO de los 22 600 niveles de la campaña de «Conecta gominolas»: dice de cada nivel qué TABLERO, qué DIFICULTAD y qué TIPO es.
// Módulo puro: no usa document, ni Firebase, ni nada del navegador. Lo importarán el juego, el bot y el script de pruebas.
//   import { nivelDe, TOTAL_NIVELES } from "./catalogo-gominolas.js";
//   nivelDe(250)  →  { n, bloque, k, zona, etapa, tablero, dificultad, tipo, patron, semilla }
//
// «Fijo» = el nivel n SIEMPRE es el mismo (misma función de n con semilla). No se guarda nada: se calcula al pedirlo.
// Cada bloque de 100 niveles (un estado o un país) se sortea con CUENTAS EXACTAS (no «al azar puro»):
//   • niveles 1–100 (primer estado)      tableros 6×8 50 · 8×10 30 · 10×12 20      dificultad fácil 50 · normal 40 · difícil 10
//   • niveles 101–3 200 (estados 2 al 32) tableros 6×8 · 8×10 · 10×12 · 12×14: 25 c/u   dificultad 34/33/33 (el 34 va rotando)
//   • niveles 3 201–22 600 (194 países)   tableros 25 c/u                                dificultad fácil 10 · normal 30 · difícil 60
// Tablero y dificultad se sortean POR SEPARADO (los difíciles se reparten al azar entre todos los tamaños).
// Tipos de nivel en cada bloque de 100: 5 «capas», 5 «contrarreloj», 5 «puntos», 5 «monedas», 5 «lluvia» (sin negras: bajan solo gominolas de colores y hay que juntar ~2000 puntos),
// el nivel 100 es «jefe», el resto «clásico» (74 clásicos por bloque).
// Patrón inicial de las negras: en cada bloque, 10 niveles CLÁSICOS (fuera del tutorial) empiezan con FILAS COMPLETAS de negras («filas»); el resto, negras al azar («azar»).
// Si cambias CUALQUIER número de este archivo, el nivel n cambia para todos los jugadores: no lo hagas después de publicar.
// Para comprobar que todo salió bien: node gominolas/prueba-catalogo-gominolas.mjs
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { TABLEROS, crearRng } from "./logica-gominolas.js";

export const NIVELES_POR_ETAPA = 100;
const ETAPAS = crearEtapas({ porEtapa: NIVELES_POR_ETAPA });
export const TOTAL_NIVELES = ETAPAS.total;                 // 22 600
export const NUM_BLOQUES = TOTAL_NIVELES / NIVELES_POR_ETAPA; // 226 (32 estados + 194 países)
export const BLOQUES_ESTADOS = ETAPAS.numEstados;           // 32: del bloque 0 al 31 son estados de México

// ---------- Reglas del reparto (aquí se cambian los porcentajes) ----------
// Cuántos niveles de cada tablero hay en un bloque de 100 (la suma debe dar 100)
const TABLEROS_PRIMER_BLOQUE = { "6x8": 50, "8x10": 30, "10x12": 20 };
const TABLEROS_RESTO = { "6x8": 25, "8x10": 25, "10x12": 25, "12x14": 25 };
// Dificultad: «medio» es el «Normal» (se conserva el id que ya usa el modo libre)
const DIF_PRIMER_BLOQUE = { facil: 50, medio: 40, dificil: 10 };
const DIF_PAISES = { facil: 10, medio: 30, dificil: 60 };
const DIF_ESTADOS_REPARTO = ["facil", "medio", "dificil"]; // 34/33/33: el que lleva el 34 rota según el bloque

// Tipos especiales por bloque (el resto son «clasico»; el nivel 100 de cada bloque es «jefe»)
export const ESPECIALES = { capas: 5, contrarreloj: 5, puntos: 5, monedas: 5, lluvia: 5 };
export const TUTORIAL = 10;       // niveles 1 a 10 del juego: siempre 6×8, fácil, clásico
const SEPARACION_MIN = 2;         // dos niveles especiales nunca van seguidos (ni dentro de un bloque ni entre dos tipos iguales seguidos)

export const NIVELES_CON_FILAS = 10; // por bloque de 100
export const TIPOS = ["clasico", "capas", "contrarreloj", "puntos", "monedas", "lluvia", "jefe"];

// ---------- Utilidades ----------
const TABLERO_POR_ID = Object.fromEntries(TABLEROS.map((t) => [t.id, t]));
const mezclar = (a, rng) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const expandir = (cuentas) => Object.entries(cuentas).flatMap(([id, n]) => Array(n).fill(id));
const semillaPatron = (b) => (Math.imul(b + 1, 0x7f4a7c15) ^ 0x2c1b3c6d) >>> 0; // aparte de la del plan: elegir los niveles con filas no cambia nada de lo ya sorteado
const semillaDeBloque = (b) => (Math.imul(b + 1, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
// Semilla propia de cada nivel (para generar después su patrón inicial, sus negras, etc.)
export const semillaDeNivel = (n) => (Math.imul(n, 0x2545f491) ^ Math.imul(n >>> 3, 0x27d4eb2f) ^ 0x165667b1) >>> 0;

// Cuentas de dificultad del bloque b
function cuentasDificultad(b) {
  if (b === 0) return DIF_PRIMER_BLOQUE;
  if (b < BLOQUES_ESTADOS) {
    const c = { facil: 33, medio: 33, dificil: 33 };
    c[DIF_ESTADOS_REPARTO[(b - 1) % 3]] = 34;
    return c;
  }
  return DIF_PAISES;
}

// Posiciones (0..97) de los niveles especiales: una por «casilla» del rango permitido, nunca seguidas
function posicionesEspeciales(b, cuantas, rng) {
  // índices 0..99 = niveles 1..100. Desde el índice 1 (el 0 queda normal: así no hay un especial pegado al jefe del bloque anterior) hasta el 97; el 98 queda normal y el 99 es el jefe.
  const desde = b === 0 ? TUTORIAL : 1, hasta = NIVELES_POR_ETAPA - 3;
  const libres = hasta - desde + 1;
  const pos = [];
  for (let i = 0; i < cuantas; i++) {
    const a = desde + Math.floor((libres * i) / cuantas), z = desde + Math.floor((libres * (i + 1)) / cuantas) - 1;
    const minimo = pos.length ? Math.max(a, pos[pos.length - 1] + SEPARACION_MIN) : a;
    pos.push(minimo + Math.floor(rng() * (z - minimo + 1)));
  }
  return pos;
}

// Reparte los tipos entre esas posiciones: los de un mismo tipo nunca quedan uno tras otro (entre especiales consecutivos)
function repartirTipos(cuantas, rng) {
  const tipos = expandir(ESPECIALES);
  for (let intento = 0; intento < 1000; intento++) {
    mezclar(tipos, rng);
    if (tipos.every((t, i) => !i || t !== tipos[i - 1])) return tipos;
  }
  return tipos; // no debería pasar; el script de pruebas lo detectaría
}

// Intercambia dos entradas de una lista para que la posición «i» cumpla algo, sin cambiar las cuentas (se busca fuera de «protegidas»)
function forzar(lista, i, quiere, protegidas, rng) {
  if (quiere(lista[i])) return;
  const opciones = [];
  for (let j = 0; j < lista.length; j++) if (j !== i && !protegidas.has(j) && quiere(lista[j])) opciones.push(j);
  const j = opciones[Math.floor(rng() * opciones.length)];
  [lista[i], lista[j]] = [lista[j], lista[i]];
}

// Plan completo de un bloque de 100 niveles: lista de { tablero, dificultad, tipo }. Se calcula una vez y se guarda.
const planes = new Map();
function planDeBloque(b) {
  if (planes.has(b)) return planes.get(b);
  const rng = crearRng(semillaDeBloque(b));
  const tableros = mezclar(expandir(b === 0 ? TABLEROS_PRIMER_BLOQUE : TABLEROS_RESTO), rng);
  const difs = mezclar(expandir(cuentasDificultad(b)), rng);
  const tipos = Array(NIVELES_POR_ETAPA).fill("clasico");

  // Especiales: posiciones y tipos
  const total = Object.values(ESPECIALES).reduce((a, x) => a + x, 0);
  const pos = posicionesEspeciales(b, total, rng);
  repartirTipos(total, rng).forEach((t, i) => { tipos[pos[i]] = t; });
  const jefe = NIVELES_POR_ETAPA - 1;
  tipos[jefe] = "jefe";

  // Excepciones, siempre por intercambio para no alterar las cuentas exactas
  const grande = b === 0 ? "10x12" : "12x14";
  const protegidas = new Set();
  if (b === 0) { // tutorial: niveles 1–10 del juego en 6×8 y fácil
    for (let i = 0; i < TUTORIAL; i++) { forzar(tableros, i, (t) => t === "6x8", protegidas, rng); protegidas.add(i); }
    protegidas.clear();
    for (let i = 0; i < TUTORIAL; i++) { forzar(difs, i, (d) => d === "facil", protegidas, rng); protegidas.add(i); }
  }
  // jefe: tablero más grande de la zona y dificultad difícil
  const prot = new Set(b === 0 ? Array.from({ length: TUTORIAL }, (_, i) => i) : []);
  forzar(tableros, jefe, (t) => t === grande, prot, rng);
  forzar(difs, jefe, (d) => d === "dificil", prot, rng);

  const plan = tableros.map((t, i) => ({ tablero: TABLERO_POR_ID[t], dificultad: difs[i], tipo: tipos[i], patron: "azar" }));
  // Patrón «filas»: exactamente NIVELES_CON_FILAS niveles clásicos del bloque (nunca el tutorial)
  const elegibles = plan.map((_, i) => i).filter((i) => plan[i].tipo === "clasico" && !(b === 0 && i < TUTORIAL));
  mezclar(elegibles, crearRng(semillaPatron(b))).slice(0, NIVELES_CON_FILAS).forEach((i) => { plan[i].patron = "filas"; });
  planes.set(b, plan);
  return plan;
}

// ---------- Lo que usa el resto del juego ----------
// n = número de nivel (1 … TOTAL_NIVELES). Devuelve siempre lo mismo para el mismo n.
export function nivelDe(n) {
  n = Math.max(1, Math.min(TOTAL_NIVELES, Math.floor(Number(n)) || 1));
  const bloque = Math.floor((n - 1) / NIVELES_POR_ETAPA), k = ((n - 1) % NIVELES_POR_ETAPA) + 1; // k = 1..100 dentro de su estado o país
  const e = ETAPAS.etapaDe(n);
  const d = planDeBloque(bloque)[k - 1];
  return {
    n, bloque, k,
    zona: e.zona,             // "mexico" | "mundo" (igual que el mapa)
    etapa: e.indice,          // índice del estado (en ETAPAS.estados) o del país (en ETAPAS.paises)
    tablero: d.tablero,       // { id, cols, filas }
    dificultad: d.dificultad, // "facil" | "medio" | "dificil"
    tipo: d.tipo,             // "clasico" | "capas" | "contrarreloj" | "puntos" | "monedas" | "lluvia" | "jefe"
    patron: d.patron,         // "azar" (negras al azar) | "filas" (filas completas de negras)
    semilla: semillaDeNivel(n),
  };
}
