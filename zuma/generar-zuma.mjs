// Ruta: zuma/generar-zuma.mjs
// Generador de niveles. Uso: node zuma/generar-zuma.mjs [cuántos=10] [partidas por prueba=20]
// REESCRIBE niveles-zuma.js. Todo es determinista (semillas fijas, bots con semilla): correrlo dos veces da el mismo archivo,
// y el archivo generado es el que se sube al repo: así todos los jugadores, en cualquier celular, ven los mismos niveles.
// Cada ronda se genera probando combinaciones (colores, bolas, velocidad) de más a menos difícil y se queda con la primera
// que cumple las metas de metas-zuma.mjs jugada por los bots con la física real (logica-zuma.js).
import { writeFileSync } from "node:fs";
import { evaluar } from "./bot-zuma.mjs";
import { META } from "./metas-zuma.mjs";
import { azarSemilla } from "./logica-zuma.js";

const CUANTOS = Number(process.argv[2]) || 10;
const PARTIDAS = Number(process.argv[3]) || 20;

const LUGAR = { id: "mx-aguascalientes", nombre: "Aguascalientes" }; // por ahora un solo lugar; los demás estados irán igual
const TRAYECTOS = [
  { cx: 320, cy: 240, rx: [285, 110], ry: [205, 85], vueltas: 2.5 },
  { cx: 320, cy: 240, rx: [290, 105], ry: [208, 82], vueltas: 2.75 },
  { cx: 320, cy: 240, rx: [292, 100], ry: [210, 80], vueltas: 3 },
];
const RUSH = [140, 150, 160];
const BOLAS = [100, 85, 70, 55, 40]; // de la cadena más larga (dura más) a la más corta
const VELOCIDADES = [9, 6, 4];       // px/s de la cabeza, de más a menos rápida

function cumple(r, ri) {
  const m = META[ri], res = {};
  for (const perfil of ["novato", "humano", "perfecto"]) {
    const min = m.minimos[perfil];
    if (min === undefined && perfil !== m.referencia) continue;
    const e = evaluar(r, perfil, PARTIDAS);
    res[perfil] = e;
    if (min !== undefined && e.ganadas / PARTIDAS < min) return null;
  }
  const med = res[m.referencia].mediana;
  if (med < m.duracion[0] || med > m.duracion[1]) return null;
  return res;
}

function generarRonda(n, ri) {
  let colores = Math.min(6, 3 + ri + Math.floor((n - 1) / 3));
  for (; colores >= 3; colores--) {
    for (const bolas of BOLAS) for (const velocidad of VELOCIDADES) {
      const r = { colores, bolas, velocidad, rush: RUSH[ri], semilla: n * 100 + ri + 1, trayecto: TRAYECTOS[ri] };
      const res = cumple(r, ri);
      if (res) return { r, res };
    }
  }
  return null;
}

const niveles = [];
for (let n = 1; n <= CUANTOS; n++) {
  const azar = azarSemilla(n * 7919 + 13);
  const monedas = [15 + ((azar() * 6) | 0), 25 + ((azar() * 6) | 0), 35 + ((azar() * 6) | 0)];
  const rondas = [];
  for (let ri = 0; ri < 3; ri++) {
    const g = generarRonda(n, ri);
    if (!g) { console.error("No se pudo generar nivel", n, "ronda", ri + 1); process.exit(1); }
    rondas.push(g.r);
    const t = (p) => (g.res[p] ? g.res[p].ganadas + "/" + PARTIDAS : "-");
    console.log("nivel", n, "ronda", ri + 1, "· colores", g.r.colores, "bolas", g.r.bolas, "vel", g.r.velocidad,
      "· novato", t("novato"), "humano", t("humano"), "perfecto", t("perfecto"), "· mediana " + g.res[META[ri].referencia].mediana.toFixed(0) + " s");
  }
  niveles.push({ id: LUGAR.id + "-" + String(n).padStart(3, "0"), nombre: LUGAR.nombre + " · Nivel " + n, monedas, rondas });
}

const fila = (r) => "      { colores: " + r.colores + ", bolas: " + r.bolas + ", velocidad: " + r.velocidad + ", rush: " + r.rush + ", semilla: " + r.semilla +
  ", trayecto: { cx: " + r.trayecto.cx + ", cy: " + r.trayecto.cy + ", rx: [" + r.trayecto.rx + "], ry: [" + r.trayecto.ry + "], vueltas: " + r.trayecto.vueltas + " } },";
const texto = niveles.map((v) =>
  "  {\n    id: \"" + v.id + "\",\n    nombre: \"" + v.nombre + "\",\n    monedas: [" + v.monedas.join(", ") + "],\n    rondas: [\n" + v.rondas.map(fila).join("\n") + "\n    ],\n  },").join("\n");

const cabecera = `// Ruta: zuma/niveles-zuma.js
// ARCHIVO GENERADO por generar-zuma.mjs: no se edita a mano (si lo cambias, vuelve a correr node validar-zuma.mjs).
// Los niveles son datos fijos: salieron del generador con semillas y se comprobaron con los bots, así que son
// idénticos para todos los jugadores y en todos los dispositivos. Cada nivel tiene 3 rondas, cada una más difícil.
// Pasar la ronda 1 = 1 estrella (y se desbloquea el nivel siguiente), la ronda 2 = 2 estrellas y la ronda 3 = 3 estrellas.
// Las monedas dependen de las estrellas:
//   monedas: [con 1 estrella (15–20), con 2 (25–30), con 3 (35–40)]   (total que se lleva el jugador por ese nivel)
//
// Cada ronda:
//   colores    cuántos colores distintos hay (máx. = PALETA.length)
//   bolas      cuántas bolas trae la cadena en total
//   velocidad  px/s de la cabeza de la cadena
//   rush       px/s de la entrada rápida de los primeros 2.5 s (y cuando limpias casi toda la pantalla)
//   semilla    mismo número = misma cadena siempre
//   trayecto   forma del camino (ver crearTrayecto en logica-zuma.js)
// validar-zuma.mjs comprueba que cada ronda cumple las metas de metas-zuma.mjs y que las monedas están en su rango.

export const ANCHO = 640;
export const ALTO = 480;
export const CENTRO = { x: 320, y: 240 }; // donde está la rana
export const COSTE_BOOST = 30;            // monedas que cuesta cada boost

// Colores de piedras preciosas; cada uno lleva además una marca distinta (ver dibujarBola) para distinguirlos sin color
export const PALETA = ["#2fbf5b", "#3b82f6", "#e5484d", "#f5c518", "#a855f7", "#e8e4d8"];

export const NIVELES = [
`;
writeFileSync(new URL("./niveles-zuma.js", import.meta.url), cabecera + texto + "\n];\n");
console.log("Escrito niveles-zuma.js con", niveles.length, "niveles");
