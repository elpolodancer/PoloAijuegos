// Ruta: supervivencia/dibujo-mapa-mundo.js
// Dibuja el MAPA GENERAL en un <canvas> (le pasas el contexto 2D). No usa document ni Firebase.
// Estilo Last Day on Earth: vista desde arriba, la base en el centro con caminos de tierra hacia cada zona; cada zona es un
// círculo del color de su dificultad (🟢 🟠 🔴) con su energía; pinos al este, caliza al oeste, búnker al norte.
//   const hits = dibujarMapaMundo(ctx, w, h, { estado, seleccion });   // w, h en píxeles de CSS (usa ctx.setTransform si hay devicePixelRatio)
//   const id = zonaEn(hits, x, y);                                       // qué zona tocó (o null); "base" si tocó la base
import { BASE, ZONAS, DIFICULTADES, zona, costoEnergia } from "./zonas-supervivencia.js";
import { puedeViajar } from "./mapa-general-supervivencia.js";

// Color del aro de las zonas SIN dificultad (las de pino y caliza usan 🟢🟠🔴)
const COLOR_TIPO = { bunker: "#9aa0ab", granja: "#e0b53a", policia: "#4f86e8", atalaya: "#c98b4a" };

function azar(semilla) {          // mismo dibujo siempre (nada de parpadeos)
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function rectRedondo(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function texto(c, s, x, y, tam, color = "#fff", ancla = "center") {
  c.font = "700 " + tam + "px system-ui, sans-serif"; c.textAlign = ancla; c.textBaseline = "middle";
  const ancho = c.measureText(s).width + tam * 0.9;                       // pastilla oscura detrás: se lee sobre caminos y árboles
  c.fillStyle = "rgba(24,16,6,.62)"; rectRedondo(c, x - ancho / 2, y - tam * 0.8, ancho, tam * 1.6, tam * 0.8); c.fill();
  c.fillStyle = color; c.fillText(s, x, y);
}
function mancha(c, cx, cy, rx, ry, c0, c1) {
  c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, c0); g.addColorStop(1, c1);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
}

export function dibujarMapaMundo(c, w, h, { estado = { energia: 100, nivel: 0 }, seleccion = null } = {}) {
  const P = (p) => ({ x: p.x * w, y: p.y * h });
  const u = Math.min(w, h), R = Math.max(16, Math.min(38, u * 0.062));
  c.save();
  rectRedondo(c, 0, 0, w, h, Math.min(24, u * 0.04)); c.clip();

  // --- terreno ---
  c.fillStyle = "#a7bb78"; c.fillRect(0, 0, w, h);
  mancha(c, w * 0.5, h * 0.62, w * 0.55, h * 0.5, "rgba(214,196,130,.55)", "rgba(214,196,130,0)");   // claro central
  mancha(c, w * 0.21, h * 0.56, w * 0.30, h * 0.46, "rgba(139,133,122,.95)", "rgba(139,133,122,0)");  // roca (oeste)
  mancha(c, w * 0.79, h * 0.56, w * 0.30, h * 0.46, "rgba(52,104,56,.95)", "rgba(52,104,56,0)");      // bosque (este)
  mancha(c, w * 0.50, h * 0.10, w * 0.26, h * 0.20, "rgba(62,66,74,.95)", "rgba(62,66,74,0)");        // búnker Bravo (norte)
  mancha(c, w * 0.30, h * 0.12, w * 0.18, h * 0.17, "rgba(62,66,74,.9)", "rgba(62,66,74,0)");         // búnker Alfa

  const rnd = azar(2611);
  for (let k = 0; k < 90; k++) {          // rocas del oeste
    const x = w * (0.04 + rnd() * 0.36), y = h * (0.12 + rnd() * 0.58), s = u * (0.010 + rnd() * 0.014);
    if (Math.hypot((x - w * 0.5) / w, (y - h * 0.56) / h) < 0.12) continue;
    c.fillStyle = rnd() > 0.5 ? "#b9b5ab" : "#8d8a82"; c.beginPath();
    c.moveTo(x - s, y + s * 0.6); c.lineTo(x - s * 0.5, y - s * 0.7); c.lineTo(x + s * 0.6, y - s * 0.5); c.lineTo(x + s, y + s * 0.6); c.closePath(); c.fill();
  }
  for (let k = 0; k < 110; k++) {         // árboles del este
    const x = w * (0.60 + rnd() * 0.37), y = h * (0.10 + rnd() * 0.60), s = u * (0.012 + rnd() * 0.014);
    if (Math.hypot((x - w * 0.5) / w, (y - h * 0.56) / h) < 0.12) continue;
    c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(x + s * 0.3, y + s * 0.8, s, s * 0.45, 0, 0, 7); c.fill();
    c.fillStyle = rnd() > 0.5 ? "#2f6b34" : "#3f8443"; c.beginPath(); c.moveTo(x, y - s * 1.6); c.lineTo(x - s, y + s * 0.6); c.lineTo(x + s, y + s * 0.6); c.closePath(); c.fill();
  }
  // sur: ciudad (comisaría) y campos (granja)
  const pol = P(zona("comisaria-blackport").pos), gra = P(zona("granja-crooked-creek").pos);
  mancha(c, pol.x - w * 0.04, pol.y, w * 0.20, h * 0.20, "rgba(98,102,112,.95)", "rgba(98,102,112,0)");
  mancha(c, gra.x + w * 0.04, gra.y, w * 0.20, h * 0.20, "rgba(206,170,70,.9)", "rgba(206,170,70,0)");
  for (let k = 0; k < 22; k++) {           // manzanas de la ciudad
    const x = pol.x - w * 0.18 + rnd() * w * 0.30, y = pol.y - h * 0.14 + rnd() * h * 0.26, a = u * (0.025 + rnd() * 0.03), b2 = u * (0.02 + rnd() * 0.03);
    if (Math.hypot(x - pol.x, y - pol.y) < R * 1.5) continue;
    c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(x + 3, y + 3, a, b2); c.fillStyle = rnd() > 0.5 ? "#7d818c" : "#9ea2ad"; c.fillRect(x, y, a, b2);
  }
  for (let k = 0; k < 9; k++) {            // surcos de los campos
    const y = gra.y - h * 0.15 + k * h * 0.034, x0 = gra.x - w * 0.02, x1 = gra.x + w * 0.24;
    if (y > h - 6) continue;
    c.fillStyle = k % 2 ? "rgba(122,150,52,.65)" : "rgba(176,132,48,.65)"; c.fillRect(x0, y, x1 - x0, h * 0.02);
  }

  // franja de peligro alrededor de cada búnker
  for (const bz of ZONAS.filter((q) => q.tipo === "bunker")) {
    const bnk = P(bz.pos);
    c.save(); c.translate(bnk.x, bnk.y); c.rotate(-0.5);
    c.fillStyle = "rgba(240,200,40,.35)";
    for (let k = -5; k <= 5; k++) c.fillRect(k * R * 0.9 - R * 0.25, -R * 2.4, R * 0.45, R * 4.8);
    c.restore();
  }

  // --- caminos de tierra: de la base a cada zona ---
  const b = P(BASE.pos);
  c.lineCap = "round";
  for (const z of ZONAS) {
    const p = P(z.pos), mx = (b.x + p.x) / 2, my = (b.y + p.y) / 2 + (p.y < b.y ? -1 : 1) * u * 0.04;
    c.setLineDash([]); c.strokeStyle = "rgba(95,66,30,.55)"; c.lineWidth = R * 0.5;
    c.beginPath(); c.moveTo(b.x, b.y); c.quadraticCurveTo(mx, my, p.x, p.y); c.stroke();
    c.setLineDash([R * 0.5, R * 0.45]); c.strokeStyle = "#e6cd96"; c.lineWidth = R * 0.18;
    c.beginPath(); c.moveTo(b.x, b.y); c.quadraticCurveTo(mx, my, p.x, p.y); c.stroke();
  }
  c.setLineDash([]);

  // --- base ---
  const hits = [];
  c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(b.x, b.y + R * 0.8, R * 1.5, R * 0.6, 0, 0, 7); c.fill();
  c.fillStyle = "#d9b87a"; c.strokeStyle = "#5a3d18"; c.lineWidth = 4; c.beginPath(); c.arc(b.x, b.y, R * 1.25, 0, 7); c.fill(); c.stroke();
  c.font = Math.round(R * 1.3) + "px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000"; c.fillText(BASE.ico, b.x, b.y + 2);
  texto(c, BASE.nombre, b.x, b.y + R * 1.95, Math.max(11, R * 0.5));
  hits.push({ id: "base", x: b.x, y: b.y, r: R * 1.25 });

  // --- zonas ---
  for (const z of ZONAS) {
    const p = P(z.pos), v = puedeViajar(estado, z.id), bloqueada = v.razon === "nivel", sinEnergia = v.razon === "energia";
    const col = z.dificultad ? DIFICULTADES[z.dificultad].color : COLOR_TIPO[z.tipo] || "#9aa0ab";
    c.save(); c.globalAlpha = bloqueada ? 0.6 : 1;
    if (seleccion === z.id) { c.strokeStyle = "#fff"; c.lineWidth = 5; c.beginPath(); c.arc(p.x, p.y, R + 8, 0, 7); c.stroke(); }
    c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(p.x, p.y + R * 0.9, R * 1.05, R * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = z.vacio ? "#4a4e57" : "#2b2d33"; c.strokeStyle = col; c.lineWidth = 6;
    if (z.vacio) c.setLineDash([R * 0.4, R * 0.3]);
    c.beginPath(); c.arc(p.x, p.y, R, 0, 7); c.fill(); c.stroke(); c.setLineDash([]);
    c.font = Math.round(R * 1.05) + "px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText(z.ico, p.x, p.y + 1);
    c.restore();
    const chico = Math.max(10, R * 0.44);
    texto(c, z.nombre, p.x, p.y + R + chico * 1.2, chico);
    if (bloqueada) texto(c, "🔒 Nivel " + z.nivelJugador, p.x, p.y + R + chico * 2.5, chico * 0.95, "#ffd27a");
    else if (z.vacio) texto(c, "Vacío por ahora", p.x, p.y + R + chico * 2.5, chico * 0.95, "#cfd3dc");
    else texto(c, z.energia == null ? "⚡ ?" : "⚡ " + costoEnergia(z), p.x, p.y + R + chico * 2.5, chico * 0.95, sinEnergia ? "#ff9d90" : "#fff0a8");
    hits.push({ id: z.id, x: p.x, y: p.y, r: R * 1.15 });
  }

  // --- placa de la zona elegida ---
  const sel = seleccion && seleccion !== "base" ? zona(seleccion) : null;
  if (sel) {
    const alto = Math.max(34, R * 1.2), ancho = Math.min(w - 16, Math.max(260, w * 0.6)), x0 = (w - ancho) / 2, y0 = h - alto - 10;
    c.fillStyle = "rgba(16,17,20,.88)"; rectRedondo(c, x0, y0, ancho, alto, 12); c.fill();
    const dif = sel.dificultad ? DIFICULTADES[sel.dificultad].nombre : ({ bunker: "Búnker", granja: "Granja", policia: "Policía", atalaya: "Atalaya" }[sel.tipo] || "Sin definir");
    const tam = Math.max(11, alto * 0.34), v = puedeViajar(estado, sel.id);
    texto(c, sel.nombre + " · " + dif + (sel.minutos ? " · ~" + sel.minutos + " min" : ""), w / 2, y0 + alto * 0.33, tam);
    texto(c, v.razon === "nivel" ? "🔒 Necesitas el nivel " + sel.nivelJugador : sel.vacio ? "Todavía no tiene nada" : "⚡ " + costoEnergia(sel) + " de energía  (tienes " + Math.floor(estado.energia) + ")", w / 2, y0 + alto * 0.7, tam * 0.9, v.ok ? "#fff0a8" : "#ffb4a8");
  }
  c.restore();
  return hits;
}

// Qué tocó el jugador (la zona más cercana dentro de su círculo, con un poco de margen para el dedo)
export function zonaEn(hits, x, y, margen = 6) {
  let mejor = null, d0 = Infinity;
  for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d <= h.r + margen && d < d0) { mejor = h.id; d0 = d; } }
  return mejor;
}
