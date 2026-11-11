// Ruta: flechas/campana-flechas.js
// Campaña de Flechas: 32 estados de México + 194 países, 100 niveles cada uno (3 200 + 19 400 = 22 600 niveles).
// Este módulo SOLO hace las cuentas (sin pantalla, sin Firebase): para cada estado o país calcula cuántos niveles de cada dificultad
// lleva, en qué orden van y qué nivel del generador le toca a cada número de nivel. Se prueba con `node flechas/calcular-campana.mjs`.
//
// ===== La mezcla de dificultades (porcentaje de cada 100 niveles) =====
//   Primer estado de México ......... 40 % fáciles · 40 % medios · 20 % difíciles   (OJO: se pidió «40/30/20», que suma 90; se tomó 40 medios para sumar 100)
//   Último estado de México ......... 25 % fáciles · 40 % medios · 35 % difíciles
//   Primer país (justo al salir) .... igual que el último estado de México
//   Último país del mundo ........... 10 % fáciles · 30 % medios · 60 % difíciles
// Entre un extremo y otro la mezcla cambia en línea recta, estado por estado y país por país (interpolación lineal):
//     porcentaje = inicio + (fin − inicio) × (posición ÷ (cuántos − 1))
// y se redondea a enteros que suman exactamente 100 (método del mayor resto).
// Para cambiar la dificultad de la campaña basta con tocar las tres tablas de abajo.
import { azarSemilla } from "./logica-flechas.js";

export const MEXICO_INICIO = { facil: 40, medio: 40, dificil: 20 };
export const MEXICO_FIN    = { facil: 25, medio: 40, dificil: 35 };
export const MUNDO_FIN     = { facil: 10, medio: 30, dificil: 60 };
export const TIERS = ["facil", "medio", "dificil"];

// Cuánto se mezclan los niveles dentro de cada estado: 0 = todos los fáciles primero, luego medios, luego difíciles; 1 = muy revueltos.
// Con 0.45 cada estado sube de dificultad poco a poco, pero de vez en cuando aparece uno más fácil o más difícil que sus vecinos.
export const REVOLVER = 0.45;

const lerp = (a, b, t) => a + (b - a) * t;

// Convierte porcentajes (que suman 100) en cantidades enteras que suman exactamente «total» (mayor resto)
function redondear(p, total) {
  const exactos = TIERS.map((t) => (p[t] * total) / 100);
  const base = exactos.map(Math.floor);
  let faltan = total - base.reduce((s, x) => s + x, 0);
  const orden = exactos.map((x, i) => [x - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < faltan; k++) base[orden[k][1]]++;
  return { facil: base[0], medio: base[1], dificil: base[2] };
}

// numEstados = 32 y numPaises = 194 vienen de compartido/etapas-mapa.js (crearEtapas); porEtapa = niveles de cada estado o país (100)
export function crearCampana({ numEstados = 32, numPaises = 194, porEtapa = 100 } = {}) {
  const numEtapas = numEstados + numPaises;
  const total = numEtapas * porEtapa;

  // Porcentaje (no redondeado) de la etapa e (0 = primer estado; numEstados = primer país)
  function porcentajes(e) {
    let desde, hasta, t;
    if (e < numEstados) { desde = MEXICO_INICIO; hasta = MEXICO_FIN; t = numEstados > 1 ? e / (numEstados - 1) : 0; }
    else { desde = MEXICO_FIN; hasta = MUNDO_FIN; t = numPaises > 1 ? (e - numEstados) / (numPaises - 1) : 0; }
    return { facil: lerp(desde.facil, hasta.facil, t), medio: lerp(desde.medio, hasta.medio, t), dificil: lerp(desde.dificil, hasta.dificil, t) };
  }
  const conteosCache = [];
  const conteos = (e) => (conteosCache[e] ||= redondear(porcentajes(e), porEtapa));

  // Cuántos niveles de cada dificultad hay ANTES de la etapa e (para dar a cada nivel un número propio dentro de su dificultad)
  const antesCache = [{ facil: 0, medio: 0, dificil: 0 }];
  function antes(e) {
    while (antesCache.length <= e) {
      const p = antesCache[antesCache.length - 1], c = conteos(antesCache.length - 1);
      antesCache.push({ facil: p.facil + c.facil, medio: p.medio + c.medio, dificil: p.dificil + c.dificil });
    }
    return antesCache[e];
  }

  // Orden de las dificultades dentro de la etapa e: sube poco a poco (primero fáciles, al final difíciles) con algo de revoltura.
  // El nivel 1 siempre es fácil y el último es el más difícil que tenga esa etapa.
  const ordenCache = [];
  function orden(e) {
    if (ordenCache[e]) return ordenCache[e];
    const c = conteos(e), base = [];
    for (const t of TIERS) for (let i = 0; i < c[t]; i++) base.push(t);
    const r = azarSemilla(Math.imul(e + 1, 2654435761) >>> 0);
    const claves = base.map((t, i) => [i + (r() - 0.5) * REVOLVER * porEtapa, t]);
    claves.sort((a, b) => a[0] - b[0]);
    const res = claves.map((x) => x[1]);
    const cambiar = (i, j) => { const x = res[i]; res[i] = res[j]; res[j] = x; };
    if (c.facil > 0 && res[0] !== "facil") cambiar(0, res.indexOf("facil"));
    const dura = c.dificil > 0 ? "dificil" : c.medio > 0 ? "medio" : "facil";
    if (res[res.length - 1] !== dura) cambiar(res.length - 1, res.lastIndexOf(dura));
    return (ordenCache[e] = res);
  }

  // Todo lo que hay que saber del nivel número n (1 a total): { n, etapa, k, dif, idx }
  //   etapa = número de estado o país (0 a numEtapas − 1), k = nivel dentro de la etapa (1 a porEtapa),
  //   dif = "facil" | "medio" | "dificil", idx = número del nivel dentro de su dificultad en TODA la campaña (1, 2, 3…):
  //   es lo que se le pasa al generador:  generar(dif, idx)  (en Fácil, idx 1 a 15 son los niveles fijos de las capturas).
  function nivel(n) {
    n = Math.max(1, Math.min(total, Math.floor(Number(n)) || 1));
    const e = Math.floor((n - 1) / porEtapa), k = ((n - 1) % porEtapa) + 1;
    const o = orden(e), dif = o[k - 1];
    let delante = 0;
    for (let i = 0; i < k; i++) if (o[i] === dif) delante++;
    return { n, etapa: e, k, dif, idx: antes(e)[dif] + delante };
  }

  // Totales de toda la campaña por dificultad (cuántos niveles distintos tiene que generar el bot de cada una)
  function totales() {
    const t = { facil: 0, medio: 0, dificil: 0 };
    for (let e = 0; e < numEtapas; e++) { const c = conteos(e); for (const x of TIERS) t[x] += c[x]; }
    return t;
  }
  return { numEstados, numPaises, numEtapas, porEtapa, total, porcentajes, conteos, orden, nivel, totales };
}
