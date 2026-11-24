// Ruta: botellascolores/economia-botellascolores.js
// Monedas y boosts de «Botellas de colores». Sin pantalla ni Firebase (se puede probar en Node).
// Las monedas SOLO existen en los niveles del mapa: el ♾️ Modo libre no da monedas ni tiene boosts (ESTANDARES-juegos.md, 7.2).
//
// Cómo se reparte (los números están en README-botellascolores.md, sección 8):
//   • Ganar: la PRIMERA vez que se pasa un nivel se ganan monedas según su tipo (fácil / normal / difícil, sección 8 de los estándares).
//     Repetir un nivel ya pasado no da monedas. Las monedas ganadas NO se guardan como número: se calculan sumando lo que dio cada nivel
//     pasado. Así dos dispositivos que pasaron niveles distintos se unen sin perder ni duplicar monedas.
//   • Gastar: cada boost cuesta al usarlo (no hay inventario). Lo gastado sí se guarda (un número que solo sube).
//   • Saldo = MONEDAS_INICIALES + lo que dieron los niveles pasados − lo gastado.
// «NO cambiar después de publicar»: cambiar MONEDAS_POR_TIPO cambiaría el saldo de quien ya jugó (los precios sí se pueden ajustar).

export const MONEDAS_INICIALES = 100;                     // regalo de bienvenida: alcanza para 4 pistas
export const MONEDAS_POR_TIPO = { facil: 4, normal: 6, dificil: 10 };

// Boosts del nivel (los 3 botones de abajo). Cada uso se paga al momento.
export const BOOSTS = {
  pista: {
    icono: "💡", clase: "b-verde", precio: 25, nombre: "Pista",
    ayuda: "Te muestra un vertido que sí lleva a la solución. Si ya la estás viendo, no se cobra otra vez.",
  },
  niebla: {
    icono: "👁️", clase: "b-morado", precio: 60, nombre: "Ver niebla",
    ayuda: "Muestra todas las capas de este nivel de niebla. Solo en niveles con niebla.",
  },
  botella: {
    icono: "🍾", clase: "b-azul", precio: 200, nombre: "Botella extra",
    ayuda: "Agrega una botella vacía a este nivel. Una por nivel.",
  },
};

// Monedas que da un nivel de NIVELES (su campo «tipo», que pone el generador). Un nivel sin tipo cuenta como normal.
export function recompensaNivel(n) {
  if (!n) return 0;
  return MONEDAS_POR_TIPO[n.tipo] ?? MONEDAS_POR_TIPO.normal;
}

// Total ganado por los niveles pasados. «hechos» = el nivel más alto pasado (un solo número: los niveles se abren en orden, así que
// todos los anteriores están pasados). Solo cuentan los niveles que ya existen en «niveles».
export function ganadas(hechos, niveles) {
  let t = 0;
  const n = Math.min(Math.max(0, Math.floor(Number(hechos)) || 0), niveles.length);
  for (let i = 0; i < n; i++) t += recompensaNivel(niveles[i]);
  return t;
}
export const saldo = (hechos, niveles, gastado) => Math.max(0, MONEDAS_INICIALES + ganadas(hechos, niveles) - (Number(gastado) || 0));

// Cuántos niveles seguidos desde el 1 están pasados en una lista vieja (v2/v3: [true, null, …])
const prefijo = (lista) => { let s = 0; while (s < lista.length && lista[s]) s++; return s; };

// Lleva cualquier versión guardada del progreso a { n, s, t } (n = nivel más alto pasado, s = monedas gastadas, t = fecha).
//   v4 (actual): { n, s, t }   ·   v3: { h: [true, …], s, t }   ·   v2: [true, …]
export function normalizar(x) {
  if (Array.isArray(x)) return { n: prefijo(x), s: 0, t: 0 };
  if (!x || typeof x !== "object") return { n: 0, s: 0, t: 0 };
  const n = Array.isArray(x.h) ? prefijo(x.h) : Math.max(0, Math.floor(Number(x.n)) || 0);
  return { n, s: Math.max(0, Number(x.s) || 0), t: Number(x.t) || 0 };
}

// Une dos copias del progreso (la local y la de la nube): el nivel más alto pasado y lo gastado más alto. Se usa como «fusionar» de conectar().
// Cualquiera de las dos puede ser null (o venir en una versión vieja).
export function unirProgreso(a, b) {
  if (!a && !b) return null;
  a = normalizar(a); b = normalizar(b);
  return { n: Math.max(a.n, b.n), s: Math.max(a.s, b.s), t: Math.max(a.t, b.t) };
}
