// Ruta: ciudadzombi/prueba-ciudadzombi.mjs   (SOLO para consola: node prueba-ciudadzombi.mjs; no se guarda sin internet)
import * as L from "./logica-ciudadzombi.js";
const { TIPO } = L;
let fallos = 0;
const ok = (c, t) => { if (!c) { fallos++; console.log("✗", t); } else console.log("✓", t); };
const ms = (f) => { const t = performance.now(); f(); return performance.now() - t; };

// --- Reglas del límite ---
{
  const m = L.crearMundo(15, 1000);
  for (let i = 0; i < 900; i++) L.agregar(m, TIPO.HUMANO, 10 + i % 300, 10 + (i / 3 | 0) % 300);
  ok(m.vivos === 900 && m.cuenta[TIPO.HUMANO] === 900, "alta de 900 humanos");
  for (let i = 0; i < 150; i++) L.agregar(m, TIPO.ZOMBI, 50, 50);
  ok(m.vivos === 1000 && L.agregar(m, TIPO.ZOMBI, 5, 5) === -1 && !L.hayLugar(m), "al llegar al límite no entran más mobs");
  ok(L.infectar(m, 0) && m.vivos === 1000 && m.cuenta[TIPO.ZOMBI] === 101 && m.cuenta[TIPO.HUMANO] === 899, "infectar convierte sin usar lugar nuevo");
  L.construirCuadricula(m);
  const antes = m.vivos, n = L.bomba(m, 50, 50, 5);
  ok(n >= 100 && m.vivos === antes - n && L.hayLugar(m, n), "la bomba mata zombis y libera lugares (" + n + ")");
  const j = L.agregar(m, TIPO.SOLDADO, 20, 20);
  ok(j >= 0 && m.vida[j] === 15 && m.armado[j] === 1, "tras la bomba vuelve a haber lugar (soldado: 15 golpes, armado)");
  const h = L.agregar(m, TIPO.HUMANO, 30, 30); // 5 golpes
  let golpes = 0; while (!L.golpear(m, h)) golpes++;
  ok(golpes === 4 && m.tipo[h] === 0, "un humano muere al 5.º golpe");
  const a = L.agregar(m, TIPO.HUMANO, 40, 40, 1); let d = 0, rec = 0;
  for (let k = 0; k < 24; k++) { if (L.disparar(m, a)) d++; else rec++; if (k === 11) ok(L.recargando(m, a), "tras 12 disparos recarga"); }
  ok(d === 12 && rec === 12, "12 disparos y luego espera la recarga (2 s)");
}

// --- Rendimiento: ciudad grande, 100 000 ciudadanos + 50 000 zombis = 150 000 ---
for (const [lado, hum, zom] of [[100, 100000, 50000], [15, 100000, 50000]]) {
  const m = L.crearMundo(lado);
  for (let i = 0; i < hum; i++) L.agregar(m, i % 40 === 0 ? TIPO.POLICIA : TIPO.HUMANO, L.azar(m) * m.ancho, L.azar(m) * m.ancho);
  for (let i = 0; i < zom; i++) L.agregar(m, TIPO.ZOMBI, L.azar(m) * m.ancho, L.azar(m) * m.ancho);
  ok(m.vivos === 150000, "ciudad " + lado + "×" + lado + ": 150 000 mobs vivos");
  for (let p = 0; p < 20; p++) L.paso(m, 1 / 30, p); // calentar
  const N = 120, tp = [];
  for (let p = 0; p < N; p++) tp.push(ms(() => L.paso(m, 1 / 30, p)));
  tp.sort((a, b) => a - b);
  const W = 1280, H = 720, buf = new Uint32Array(W * H);
  const tc = ms(() => L.construirCuadricula(m));
  const tpint = [];
  for (let p = 0; p < 30; p++) { buf.fill(0); tpint.push(ms(() => L.pintarMobs(m, buf, W, H, 0, 0, W / m.ancho))); }
  tpint.sort((a, b) => a - b);
  console.log(`   ${lado}×${lado}: paso mediana ${tp[N >> 1].toFixed(1)} ms · peor ${tp[N - 1].toFixed(1)} ms · cuadrícula ${tc.toFixed(1)} ms · dibujo (toda la ciudad en 1280×720) ${tpint[15].toFixed(1)} ms · humanos ${m.cuenta[1] + m.cuenta[4]} · zombis ${m.cuenta[3]}`);
}
console.log(fallos ? "FALLÓ " + fallos : "TODO BIEN");
process.exit(fallos ? 1 : 0);
