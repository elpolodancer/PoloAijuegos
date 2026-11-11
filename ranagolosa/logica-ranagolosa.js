// Ruta: ranagolosa/logica-ranagolosa.js
// Lógica pura de «Rana golosa» (sin document): cuerdas con integración de Verlet, dulce, estrellas y rana.
// Mundo de 800×450. Un nivel es { dulce:[x,y], cuerdas:[{x,y,len}], rana:[x,y], estrellas:[[x,y],…] }
//   crearMundo(nivel) · paso(m, dt) · cortarSeg(m, i, seg) · cortarLinea(m, x1,y1,x2,y2)
// m.estado: "juega" | "gana" (el dulce llegó a la boca) | "pierde" (el dulce salió de la pantalla)
export const W = 800, H = 450, G = 900, SEG = 14, R_DULCE = 14, R_ESTRELLA = 26, R_BOCA = 34, ITER = 30, PESO_DULCE = 0.4;

export function crearMundo(n) {
  const dulce = { x: n.dulce[0], y: n.dulce[1], px: n.dulce[0], py: n.dulce[1], w: PESO_DULCE, dulce: true };
  const cuerdas = n.cuerdas.map((c, id) => {
    const k = Math.max(2, Math.ceil(c.len / SEG)), pts = [{ x: c.x, y: c.y, px: c.x, py: c.y, w: 0 }];
    for (let i = 1; i < k; i++) {
      const t = i / k, x = c.x + (n.dulce[0] - c.x) * t, y = c.y + (n.dulce[1] - c.y) * t;
      pts.push({ x, y, px: x, py: y, w: 1 });
    }
    pts.push(dulce);
    return { id, pts, rest: c.len / k, suelta: false, edad: 0 };
  });
  return { n, dulce, cuerdas, rana: { x: n.rana[0], y: n.rana[1] }, estrellas: (n.estrellas || []).map((s) => ({ x: s[0], y: s[1], tomada: false })), t: 0, estado: "juega", tomadas: 0 };
}

function atar(a, b, rest) { // la cuerda solo jala cuando se estira (si sobra, cuelga)
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d <= rest || d === 0) return;
  const wt = a.w + b.w; if (!wt) return;
  const k = (d - rest) / d / wt;
  a.x += dx * k * a.w; a.y += dy * k * a.w; b.x -= dx * k * b.w; b.y -= dy * k * b.w;
}

export function paso(m, dt = 1 / 60) {
  if (m.estado !== "juega") return;
  m.t += dt;
  const g = G * dt * dt;
  const mover = (p) => { if (p.w === 0) return; const vx = (p.x - p.px) * 0.998, vy = (p.y - p.py) * 0.998; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g; };
  for (const c of m.cuerdas) for (const p of c.pts) if (!p.dulce) mover(p);
  mover(m.dulce);
  for (let it = 0; it < ITER; it++) for (const c of m.cuerdas) for (let i = 0; i < c.pts.length - 1; i++) atar(c.pts[i], c.pts[i + 1], c.rest);
  for (const c of m.cuerdas) if (c.suelta) c.edad += dt;
  m.cuerdas = m.cuerdas.filter((c) => c.edad < 1.2);
  const d = m.dulce;
  for (const s of m.estrellas) if (!s.tomada && Math.hypot(d.x - s.x, d.y - s.y) < R_ESTRELLA) { s.tomada = true; m.tomadas++; }
  if (Math.hypot(d.x - m.rana.x, d.y - m.rana.y) < R_BOCA) m.estado = "gana";
  else if (d.y > H + 60 || d.x < -60 || d.x > W + 60 || d.y < -300) m.estado = "pierde";
}

// Corta la cuerda i por el segmento seg (entre pts[seg] y pts[seg+1])
export function cortarSeg(m, i, seg) {
  const c = m.cuerdas[i], partes = [];
  const arriba = c.pts.slice(0, seg + 1), abajo = c.pts.slice(seg + 1);
  if (arriba.length > 1) partes.push({ id: c.id, pts: arriba, rest: c.rest, suelta: true, edad: 0 });
  if (abajo.length > 1) partes.push({ id: c.id, pts: abajo, rest: c.rest, suelta: true, edad: 0 });
  m.cuerdas.splice(i, 1, ...partes);
}
function cruza(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
// Corta toda cuerda sana que cruce la línea que dibujó el dedo. Devuelve cuántas cortó.
export function cortarLinea(m, x1, y1, x2, y2) {
  let n = 0;
  for (let i = 0; i < m.cuerdas.length; i++) {
    const c = m.cuerdas[i]; if (c.suelta) continue;
    for (let s = 0; s < c.pts.length - 1; s++) {
      if (cruza(x1, y1, x2, y2, c.pts[s].x, c.pts[s].y, c.pts[s + 1].x, c.pts[s + 1].y)) { cortarSeg(m, i, s); n++; break; }
    }
  }
  return n;
}
