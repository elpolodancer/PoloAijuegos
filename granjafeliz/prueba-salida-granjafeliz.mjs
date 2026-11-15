// Ruta: granjafeliz/prueba-salida-granjafeliz.mjs   ·   Uso: node prueba-salida-granjafeliz.mjs   (prueba la condición de derrota, sin navegador)
import { sinSalida, OSOS_SUELTOS_CUENTAN } from "./salida-granjafeliz.js";
import * as D from "./datos-granjafeliz.js";

let bien = 0, mal = 0;
const ok = (nombre, cond, extra = "") => { if (cond) bien++; else { mal++; console.log("✗ " + nombre, extra); } };
// Estado «vacío y sin dinero» que se va modificando
const base = (o = {}) => ({ dinero: 0, animales: 0, comprables: ["gallina"], almacen: {}, pesoCam: (k) => D.PRODUCTOS[k].peso, capCamion: 60, costoMejoraCamion: 300,
  suelo: 0, edificiosActivos: false, camionViaje: false, ososSueltos: 0, ososFuturos: false, extraPasto: 0,
  pendientes: [{ tipo: "producto", id: "huevo", faltan: 4 }], libre: false, ...o });

// --- Ejemplos del README ---
ok("pierde: sin animales, sin nada, $40 y la gallina a $100", sinSalida(base({ dinero: 40 })).perdido === true);
ok("no pierde: sin animales pero con $100", sinSalida(base({ dinero: 100 })).motivo === "alcanza-para-un-animal");
ok("no pierde: sin animales, $0, pero una caja de huevos vendible", sinSalida(base({ almacen: { huevo: 5 } })).motivo === "hay-algo-vendible");
ok("el texto menciona el dinero y el precio", /\$40/.test(sinSalida(base({ dinero: 40 })).razon) && /gallina/.test(sinSalida(base({ dinero: 40 })).razon) && /\$100/.test(sinSalida(base({ dinero: 40 })).razon));

// --- Cada fuente de ingreso evita la derrota ---
ok("camión de viaje", sinSalida(base({ camionViaje: true })).motivo === "camion-en-camino");
ok("producto en el suelo (o jaula)", sinSalida(base({ suelo: 1 })).motivo === "hay-cosas-en-el-suelo");
ok("edificio trabajando", sinSalida(base({ edificiosActivos: true })).motivo === "edificio-trabajando");
ok("un animal vivo", sinSalida(base({ animales: 1 })).motivo === "hay-animales");
ok("oso suelto (se puede enjaular)", sinSalida(base({ ososSueltos: 1 })).motivo === (OSOS_SUELTOS_CUENTAN ? "oso-suelto" : undefined) || !OSOS_SUELTOS_CUENTAN);
ok("osos que todavía no caen NO cuentan", sinSalida(base({ ososFuturos: true })).perdido === true);

// --- Camión y pesos (sesión 11: caja = 30 puntos, camión base 60, leche pesa 15, oso 30) ---
ok("producto más pesado que el camión y sin $ para mejorar: no cuenta → pierde", sinSalida(base({ almacen: { leche: 1 }, capCamion: 10, dinero: 0 })).perdido === true);
ok("producto más pesado que el camión pero alcanza para mejorarlo: no pierde", sinSalida(base({ almacen: { leche: 1 }, capCamion: 10, dinero: 300 })).perdido === false);
ok("producto más pesado que el camión al máximo (sin mejora): pierde", sinSalida(base({ almacen: { leche: 1 }, capCamion: 10, costoMejoraCamion: null, dinero: 0 })).perdido === true);
ok("leche (15) con el camión base (60): cabe", sinSalida(base({ almacen: { leche: 1 } })).perdido === false);
ok("oso enjaulado (30) con el camión base (60): cabe", sinSalida(base({ almacen: { osoEnjaulado: 1 } })).perdido === false);

// --- Agua para el pasto ---
ok("$100 y sin agua ni pasto ($19 de recarga): no alcanza para gallina + agua", sinSalida(base({ dinero: 100, extraPasto: 19 })).perdido === true);
ok("$119 sí alcanza", sinSalida(base({ dinero: 119, extraPasto: 19 })).perdido === false);
ok("el texto menciona el agua", /agua/.test(sinSalida(base({ dinero: 100, extraPasto: 19 })).razon));

// --- Qué se compra ---
ok("compra más barata entre varias: con oveja y gallina usa la gallina", sinSalida(base({ dinero: 50, comprables: ["oveja", "gallina"] })).animal === "gallina");
ok("solo oveja comprable: $500 no alcanza ($1,000)", sinSalida(base({ dinero: 500, comprables: ["oveja"] })).perdido === true);
ok("comprables vacío usa la gallina", sinSalida(base({ dinero: 40, comprables: [] })).animal === "gallina");

// --- Metas que se pagan directo ---
ok("meta: construir planta ($200) con $200 y sin animales: no pierde", sinSalida(base({ dinero: 200, comprables: ["oveja"], pendientes: [{ tipo: "edificio", id: "panaderia", faltan: 1 }] })).motivo === "las-metas-se-pagan-directo");
ok("meta: construir planta con $150 y oveja a $1,000: pierde", sinSalida(base({ dinero: 150, comprables: ["oveja"], pendientes: [{ tipo: "edificio", id: "panaderia", faltan: 1 }] })).perdido === true);
ok("meta animal: 2 gallinas con $200 → alcanza", sinSalida(base({ dinero: 200, pendientes: [{ tipo: "animal", id: "gallina", faltan: 2 }] })).perdido === false);

// --- Nivel ya cumplido / modo libre ---
ok("sin metas pendientes (nivel cumplido): lo cierra terminar(), no esto", sinSalida(base({ pendientes: [] })).perdido === false);
ok("modo libre sin metas: sí puede perder", sinSalida(base({ libre: true, pendientes: [], dinero: 10 })).perdido === true);
ok("modo libre con animales: no pierde", sinSalida(base({ libre: true, pendientes: [], animales: 2 })).perdido === false);

// --- Ningún nivel 1-10 ni dificultad del libre empieza «perdido» ---
const inicio = (N, libre) => base({ dinero: N.dineroInicial, animales: Object.values(N.animales || {}).reduce((a, b) => a + b, 0), comprables: N.comprables || ["gallina"], ososFuturos: !!N.osos, libre,
  pendientes: libre ? [] : N.metas.map((m) => ({ tipo: m.tipo, id: m.id, faltan: m.tipo === "animal" ? Math.max(0, m.n - ((N.animales || {})[m.id] || 0)) : m.n || 1 })) });
for (const n in D.NIVELES) ok("nivel " + n + " no empieza perdido", sinSalida(inicio(D.NIVELES[n], false)).perdido === false, JSON.stringify(sinSalida(inicio(D.NIVELES[n], false))));
for (const id in D.LIBRE) ok("libre «" + id + "» no empieza perdido", sinSalida(inicio(D.LIBRE[id], true)).perdido === false);
ok("nivel 9 empieza sin animales y se salva por el dinero ($220 ≥ $100)", sinSalida(inicio(D.NIVELES[9], false)).motivo === "alcanza-para-un-animal");

console.log(mal ? "FALLARON " + mal + " (bien: " + bien + ")" : "Todo bien: " + bien + " comprobaciones");
process.exit(mal ? 1 : 0);
