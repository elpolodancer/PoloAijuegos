// Ruta: granjafeliz/tiempos-granjafeliz.js
// Tiempos de oro y plata (estrellas) de Granja feliz para CUALQUIER nivel, sin jugador automático. No usa document ni Firebase: se prueba en Node.
// Idea: el tiempo NO es un límite (solo da medalla), así que deben ser holgados para una persona poco hábil, sobre todo al principio.
//   oro   = cargaDeTrabajo(nivel) × holgura(n)          holgura baja poco a poco de HOLGURA_INICIO a HOLGURA_FINAL (tramos de 100 niveles)
//   plata = oro + margen (35 % del oro, entre 60 y 120 s), como en los niveles originales (plata = oro + 60 a 100 s)
// Niveles 1-10: NO se calculan; llevan los tiempos de Farm Frenzy 1 escritos a mano en NIVELES (oroSeg / plataSeg). Esta fórmula es para el 11 en adelante
// y se comprueba contra esos 10 (ver comprobar()). NO CAMBIAR después de publicar: cambiaría las medallas de niveles que ya jugaron.
export const TOTAL_NIVELES = 22600, TRAMO = 100;
export const HOLGURA_INICIO = 1.3, HOLGURA_FINAL = 0.9;   // × la carga de trabajo. INICIO se calibró con los 10 niveles originales (la carga sale ~1.8 veces su oro); FINAL es PROPUESTA mía: ajustar jugando
export const PISO_ORO = 45, TOPE_ORO = 420;              // ningún oro por debajo / por encima de esto (en la versión 1 los niveles avanzados dan oro a 2-4 min)
export const TIPO_FACTOR = { facil: 1.15, normal: 1, dificil: 0.9 }; // opcional: el tipo de nivel mueve un poco los tiempos

// «Segundos de trabajo» de cada cosa que piden las metas (aproximación; el ritmo de una persona normal con camión base)
const S_PRODUCTO = { huevo: 2, polvo: 4, pan: 8, lana: 6, hilo: 8, tela: 14, leche: 20 };
const S_ANIMAL_NUEVO = { gallina: 3, oveja: 25, vaca: 60 };
const S_EDIFICIO = 20, S_BASE = 50;

// nivel = { metas, animales, edificios, construidos }
export function cargaDeTrabajo(nivel) {
  const inicio = nivel.animales || {};
  let w = S_BASE + S_EDIFICIO * (nivel.edificios || []).filter((e) => !(nivel.construidos || []).includes(e)).length;
  for (const m of nivel.metas || []) {
    if (m.tipo === "producto") w += (S_PRODUCTO[m.id] || 10) * m.n;
    else if (m.tipo === "animal") w += (S_ANIMAL_NUEVO[m.id] || 30) * Math.max(0, m.n - (inicio[m.id] || 0));
    else if (m.tipo === "dinero") w += 12 * Math.log2(1 + m.n / 100);
    else if (m.tipo === "edificio") w += S_EDIFICIO;
  }
  return w;
}
export function holgura(n, total = TOTAL_NIVELES) {
  const tramo = Math.floor((Math.max(1, n) - 1) / TRAMO), ultimo = Math.max(1, Math.floor((total - 1) / TRAMO));
  return HOLGURA_INICIO + (HOLGURA_FINAL - HOLGURA_INICIO) * Math.min(1, tramo / ultimo);
}
const redondear5 = (s) => Math.round(s / 5) * 5;
export function tiemposDeNivel(n, nivel, tipo = "normal", total = TOTAL_NIVELES) {
  const oro = Math.min(TOPE_ORO, Math.max(PISO_ORO, redondear5(cargaDeTrabajo(nivel) * holgura(n, total) * (TIPO_FACTOR[tipo] || 1))));
  const plata = oro + redondear5(Math.min(120, Math.max(60, oro * 0.35)));
  return { oroSeg: oro, plataSeg: plata };
}
// Compara la fórmula con los niveles escritos a mano: devuelve [{ n, oro, calculado, razon }] (razon = calculado / oro; cerca de 1 = coincide)
export function comprobar(NIVELES, hasta = 10) {
  const r = [];
  for (let n = 1; n <= hasta; n++) if (NIVELES[n]) { const c = tiemposDeNivel(n, NIVELES[n]).oroSeg; r.push({ n, oro: NIVELES[n].oroSeg, calculado: c, razon: +(c / NIVELES[n].oroSeg).toFixed(2) }); }
  return r;
}
