// Ruta: granjafeliz/salida-granjafeliz.js
// CONDICIÓN DE DERROTA de Granja feliz. Función pura (sin document, sin Firebase, sin el estado del juego): se prueba en Node y la puede usar también el bot de pruebas.
//
// El nivel NUNCA se pierde por tiempo. Se pierde solo si el jugador ya no tiene ninguna forma de avanzar, es decir, cuando se cumplen TODAS estas tres cosas:
//   1. No hay ingreso en camino: nada vendible en el almacén, en el suelo, en los edificios en proceso ni en el camión de viaje (el pago pendiente cuenta como ingreso).
//   2. No queda ningún animal vivo (cualquiera produce algo que vale dinero, así que mientras viva uno no se ha perdido).
//   3. El dinero no alcanza para el mínimo indispensable: la compra más barata que vuelve a abrir un camino (el animal más barato que se pueda comprar en el nivel,
//      más lo que cueste regar el pasto si no queda agua ni pasto). Si las metas que faltan son solo animales/edificios y el dinero alcanza para pagarlas directo, tampoco se pierde.
// Es una COTA INFERIOR a propósito: ante la duda NO declara derrota (perder por error es peor que tardar unos segundos en perder).
//
// El juego la revisa cada SEG_REVISAR segundos y exige SEG_CONFIRMAR segundos seguidos de «sin salida» antes de mostrar la pantalla (así un producto que acaba de desaparecer o un oso que acaba de
// caer no producen una derrota de un instante).
import * as D from "./datos-granjafeliz.js";

export const SEG_REVISAR = 1;
export const SEG_CONFIRMAR = 3;
// Osos: un oso suelto en el campo se puede enjaular con tres toques y su jaula vale dinero, así que mientras haya uno SIN capturar no se pierde. Los osos que todavía no caen (calendario o «cada»)
// NO cuentan: si no te queda nada, no se espera a un oso que quizá llegue. Cambiar a true si se prefiere esperar a los osos futuros (entonces ningún nivel con osos se perdería nunca).
export const OSOS_SUELTOS_CUENTAN = true;
export const OSOS_FUTUROS_CUENTAN = false;

const fmt = (n) => Number(n).toLocaleString("es-MX");

// Estado que recibe (todo lo calcula el juego, ver estadoSalida() en juego-granjafeliz.js):
//   dinero, animales (cuántos viven), comprables (tipos que se pueden comprar; por defecto ["gallina"]),
//   almacen { producto: cantidad }, pesoCam(producto) y capCamion (para saber si lo del almacén cabe en el camión), costoMejoraCamion (null = ya al máximo),
//   suelo (cuántos productos/jaulas hay en el suelo), edificiosActivos (algún edificio trabajando), camionViaje (el camión está en camino),
//   ososSueltos (osos sin capturar), ososFuturos (el nivel todavía traerá osos), extraPasto ($ que costaría regar si no hay agua ni pasto; 0 si ya hay),
//   pendientes [{ tipo, id, faltan }] (las metas que faltan), libre (Modo libre: no tiene metas).
// Devuelve { perdido, motivo, razon?, minimo?, animal? }. «motivo» dice por qué NO está perdido (útil para probar); «razon» es el texto para el jugador.
export function sinSalida(e) {
  const no = (motivo) => ({ perdido: false, motivo });
  const pend = e.pendientes || [];
  if (!e.libre && !pend.length) return no("sin-metas-pendientes");   // el nivel ya está cumplido: lo cierra terminar(), no esto

  // 1) ¿Hay ingreso en camino?
  if (e.camionViaje) return no("camion-en-camino");
  if (e.suelo > 0) return no("hay-cosas-en-el-suelo");
  if (e.edificiosActivos) return no("edificio-trabajando");
  if (OSOS_SUELTOS_CUENTAN && e.ososSueltos > 0) return no("oso-suelto");
  if (OSOS_FUTUROS_CUENTAN && e.ososFuturos) return no("osos-futuros");
  if (hayVendible(e)) return no("hay-algo-vendible");

  // 2) ¿Queda algún animal vivo?
  if (e.animales > 0) return no("hay-animales");

  // 3) ¿Alcanza el dinero para volver a empezar?
  const tipos = (e.comprables && e.comprables.length ? e.comprables : ["gallina"]).filter((t) => D.ANIMALES[t]);
  if (!tipos.length) return no("nada-que-comprar");   // dato raro del nivel: no se declara derrota
  const animal = tipos.reduce((m, t) => (D.ANIMALES[t].precio < D.ANIMALES[m].precio ? t : m));
  const precio = D.ANIMALES[animal].precio, extra = Math.max(0, Number(e.extraPasto) || 0), minimo = precio + extra;
  if (e.dinero >= minimo) return no("alcanza-para-un-animal");
  if (pend.length && pend.every((m) => m.tipo === "animal" || m.tipo === "edificio")) {   // metas que se pagan directo (sin producir nada)
    const costo = pend.reduce((t, m) => t + (m.tipo === "animal" ? (D.ANIMALES[m.id] ? D.ANIMALES[m.id].precio * m.faltan : Infinity) : (D.EDIFICIOS[m.id] ? D.EDIFICIOS[m.id].costo : Infinity)), 0);
    if (e.dinero >= costo) return no("las-metas-se-pagan-directo");
  }
  const que = "una " + D.ANIMALES[animal].nombre.toLowerCase() + " ($" + fmt(precio) + (extra ? " más $" + fmt(extra) + " de agua para el pasto" : "") + ")";
  return { perdido: true, minimo, animal, razon: "Ya no te quedan animales ni nada que vender, y con $" + fmt(e.dinero) + " no alcanza para comprar " + que + "." };
}

// ¿Hay algo en el almacén que el camión pueda vender? Un producto más pesado que el camión no cuenta (a menos que alcance para mejorar el camión).
function hayVendible(e) {
  const cap = e.capCamion == null ? Infinity : e.capCamion;
  for (const k in e.almacen || {}) {
    if (!(e.almacen[k] > 0)) continue;
    const P = D.PRODUCTOS[k]; if (!P) continue;
    const peso = e.pesoCam ? e.pesoCam(k) : P.peso;
    if (peso <= cap) return true;
    if (e.costoMejoraCamion != null && e.dinero >= e.costoMejoraCamion) return true;
  }
  return false;
}
