// Ruta: estacionamiento/etapas-estacionamiento.js
// Orden de las 132 etapas del Estacionamiento (32 estados de México + 194 países) y cuentas de progreso. No usa document.
// Etapa = 100 niveles seguidos. Niveles 1–3200 = estados (en este orden); 3201–22600 = países (en este orden).
// Para cambiar el orden de desbloqueo basta con reordenar las listas de abajo (cuidado: si ya hay jugadores con progreso,
// cambiar el orden cambia qué estado/país corresponde a cada nivel; los niveles en sí no cambian).
import { NIVELES_MEXICO, NIVELES_POR_ETAPA, TOTAL_NIVELES } from "./niveles-estacionamiento.js";

// ----- Estados: empiezan por el sureste (abajo a la derecha del mapa: Quintana Roo, Yucatán, Campeche, Tabasco, Chiapas, Oaxaca, Guerrero,
// Estado de México, CDMX, Puebla, Tlaxcala) y siguen de SUR a NORTE (por la latitud de su capital) hasta Baja California, para que el agua que sube
// por México coincida más o menos con los estados que el jugador ya terminó. lon/lat = capital (puntos del mapa). -----
export const ESTADOS_ORDEN = [
  { id: "qroo", nombre: "Quintana Roo", lon: -88.30, lat: 18.50 },
  { id: "yuc", nombre: "Yucatán", lon: -89.62, lat: 20.97 },
  { id: "camp", nombre: "Campeche", lon: -90.53, lat: 19.85 },
  { id: "tab", nombre: "Tabasco", lon: -92.93, lat: 17.99 },
  { id: "chis", nombre: "Chiapas", lon: -93.11, lat: 16.75 },
  { id: "oax", nombre: "Oaxaca", lon: -96.73, lat: 17.07 },
  { id: "gro", nombre: "Guerrero", lon: -99.50, lat: 17.55 },
  { id: "mex", nombre: "Estado de México", lon: -99.66, lat: 19.29 },
  { id: "cdmx", nombre: "Ciudad de México", lon: -99.13, lat: 19.43 },
  { id: "pue", nombre: "Puebla", lon: -98.20, lat: 19.04 },
  { id: "tlax", nombre: "Tlaxcala", lon: -98.24, lat: 19.32 },
  { id: "mor", nombre: "Morelos", lon: -99.23, lat: 18.92 },
  { id: "col", nombre: "Colima", lon: -103.72, lat: 19.24 },
  { id: "ver", nombre: "Veracruz", lon: -96.92, lat: 19.54 },
  { id: "mich", nombre: "Michoacán", lon: -101.19, lat: 19.70 },
  { id: "hgo", nombre: "Hidalgo", lon: -98.74, lat: 20.12 },
  { id: "qro", nombre: "Querétaro", lon: -100.39, lat: 20.59 },
  { id: "jal", nombre: "Jalisco", lon: -103.35, lat: 20.67 },
  { id: "gto", nombre: "Guanajuato", lon: -101.26, lat: 21.02 },
  { id: "nay", nombre: "Nayarit", lon: -104.89, lat: 21.51 },
  { id: "ags", nombre: "Aguascalientes", lon: -102.30, lat: 21.88 },
  { id: "slp", nombre: "San Luis Potosí", lon: -100.98, lat: 22.15 },
  { id: "zac", nombre: "Zacatecas", lon: -102.57, lat: 22.77 },
  { id: "tamps", nombre: "Tamaulipas", lon: -99.14, lat: 23.74 },
  { id: "dgo", nombre: "Durango", lon: -104.67, lat: 24.02 },
  { id: "bcs", nombre: "Baja California Sur", lon: -110.31, lat: 24.14 },
  { id: "sin", nombre: "Sinaloa", lon: -107.39, lat: 24.80 },
  { id: "coah", nombre: "Coahuila", lon: -101.00, lat: 25.42 },
  { id: "nl", nombre: "Nuevo León", lon: -100.31, lat: 25.67 },
  { id: "chih", nombre: "Chihuahua", lon: -106.09, lat: 28.63 },
  { id: "son", nombre: "Sonora", lon: -110.96, lat: 29.07 },
  { id: "bc", nombre: "Baja California", lon: -115.47, lat: 32.62 },
];

// ----- Países: 194 = los 195 países reconocidos (193 de la ONU + Vaticano + Palestina) menos México.
// Van por regiones, empezando por los vecinos de México. Se anotan con su código ISO (el nombre y la bandera salen de él). -----
export const PAISES_ORDEN = (
  // Norteamérica, Centroamérica y Caribe
  "US CA GT BZ SV HN NI CR PA CU JM HT DO BS BB AG DM GD KN LC VC TT " +
  // Sudamérica
  "CO VE GY SR EC PE BR BO PY CL AR UY " +
  // Europa
  "ES PT FR AD MC IT SM VA MT DE AT CH LI BE NL LU GB IE IS NO SE FI DK EE LV LT PL CZ SK HU SI HR BA RS ME MK AL GR CY BG RO MD UA BY RU " +
  // África
  "MA DZ TN LY EG SD SS ER DJ ET SO KE UG TZ RW BI CD CG GA GQ CM CF TD NE NG BJ TG GH CI BF ML MR SN GM GW GN SL LR CV ST AO ZM MW MZ ZW BW NA ZA LS SZ MG MU SC KM " +
  // Asia
  "TR GE AM AZ KZ UZ TM KG TJ AF PK IN NP BT BD LK MV CN MN KP KR JP VN LA KH TH MM MY SG BN ID TL PH IR IQ SY LB IL PS JO SA YE OM AE QA BH KW " +
  // Oceanía
  "AU NZ PG FJ SB VU WS TO TV KI NR MH FM PW"
).split(" ");

export const NUM_ESTADOS = ESTADOS_ORDEN.length;   // 32
export const NUM_PAISES = PAISES_ORDEN.length;     // 194

let nombres = null;
export function nombrePais(codigo) {
  try { nombres ||= new Intl.DisplayNames(["es"], { type: "region" }); return nombres.of(codigo) || codigo; }
  catch (e) { return codigo; }
}
// Bandera como emoji (letras regionales). En algunos sistemas (Windows) se ven como las dos letras del código.
export const banderaPais = (codigo) => String.fromCodePoint(...[...codigo].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

// A qué etapa pertenece un nivel: { zona: "mexico"|"mundo", indice: 0..31 | 0..193, k: 1..100 }
export function etapaDe(n) {
  n = acotar(Math.floor(Number(n)) || 1, 1, TOTAL_NIVELES);
  if (n <= NIVELES_MEXICO) return { zona: "mexico", indice: Math.floor((n - 1) / NIVELES_POR_ETAPA), k: ((n - 1) % NIVELES_POR_ETAPA) + 1 };
  const m = n - NIVELES_MEXICO - 1;
  return { zona: "mundo", indice: Math.floor(m / NIVELES_POR_ETAPA), k: (m % NIVELES_POR_ETAPA) + 1 };
}
export function nombreEtapa(n) {
  const e = etapaDe(n);
  return e.zona === "mexico" ? ESTADOS_ORDEN[e.indice].nombre : nombrePais(PAISES_ORDEN[e.indice]);
}
// Primer nivel (menos uno) de una etapa: el nivel número k de la etapa es  base + k
export const baseEstado = (i) => i * NIVELES_POR_ETAPA;
export const basePais = (i) => NIVELES_MEXICO + i * NIVELES_POR_ETAPA;

// Cuentas de progreso a partir de prog = { max: nivel más alto desbloqueado, hecho: nivel más alto terminado }
export function resumen(prog) {
  const hecho = acotar(Math.floor(Number(prog && prog.hecho)) || 0, 0, TOTAL_NIVELES);
  const max = acotar(Math.floor(Number(prog && prog.max)) || 1, 1, TOTAL_NIVELES);
  return {
    hecho, max,
    estadosHechos: Math.min(NUM_ESTADOS, Math.floor(Math.min(hecho, NIVELES_MEXICO) / NIVELES_POR_ETAPA)),
    mexicoCompleto: hecho >= NIVELES_MEXICO,   // al terminar los 3200 se desbloquea el mundo
    paisesHechos: acotar(Math.floor((hecho - NIVELES_MEXICO) / NIVELES_POR_ETAPA), 0, NUM_PAISES),
    estadoActual: acotar(Math.floor((Math.min(max, NIVELES_MEXICO) - 1) / NIVELES_POR_ETAPA), 0, NUM_ESTADOS - 1),
    paisActual: max > NIVELES_MEXICO ? acotar(Math.floor((max - NIVELES_MEXICO - 1) / NIVELES_POR_ETAPA), 0, NUM_PAISES - 1) : 0,
  };
}
