// Ruta: cortafrutas/motor-cortafrutas.js
// Motor de la partida en tiempo real de «Corta Frutas» SIN pantalla (no usa document): lo usa juego-cortafrutas.js y se puede probar en Node.
// Mundo: la altura de la pantalla mide 1 y el ancho mide «ancho» (= ancho/alto de la ventana). x crece a la derecha, y hacia ABAJO (0 = arriba).
// REGLAS
//  • Frutas de 1, 2 o 3 puntos (las de más puntos son más chicas). Bombas: si un tajo las toca explotan y quitas 1 vida.
//  • 3 VIDAS: se pierde una por cada fruta que se escapa (cae sin cortar) y por cada bomba que explota. Sin vidas se acaba la partida.
//  • FRUTA FINAL: sale a mitad de pantalla y dura 5 segundos. Cada tajo que la toca suma 1 punto. Si la cortas en cada uno de los 5 segundos
//    (sin dejar ninguno en blanco), todos sus puntos se TRIPLICAN. Si se va sin cortarla bien, no quita vida.
//  • Modo «libre»: 60 s de reloj y al terminar sale la fruta final (es el final de la partida). Modo «sin»: sin reloj; la fruta final sale cada vez
//    que juntas cierta cantidad de puntos y después sigues jugando hasta que se acaben las vidas.
export const VIDAS = 3, SEGUNDOS_JEFE = 5, TRIPLE = 3, DURACION_LIBRE = 60;
const G = 1.25;                              // gravedad (alturas de pantalla por segundo²)
const RADIO = [0, 0.075, 0.062, 0.05];       // radio según los puntos de la fruta
const RADIO_BOMBA = 0.06, RADIO_JEFE = 0.2;
const JEFE_PRIMERO = 50, JEFE_CADA = 60;     // modo «sin»: primera fruta final a los 50 puntos, luego cada 60 más

// Dificultades: cada cuántos segundos sale una oleada, cuántos objetos por oleada, probabilidad de bomba, rapidez
export const AJUSTES = [
  { cada: 1.7,  min: 1, max: 2, bomba: 0.05, bombasMax: 1, vel: 0.9 },
  { cada: 1.45, min: 1, max: 3, bomba: 0.09, bombasMax: 1, vel: 0.95 },
  { cada: 1.2,  min: 2, max: 3, bomba: 0.13, bombasMax: 1, vel: 1 },
  { cada: 1.0,  min: 2, max: 4, bomba: 0.17, bombasMax: 2, vel: 1.08 },
  { cada: 0.85, min: 3, max: 5, bomba: 0.21, bombasMax: 2, vel: 1.15 },
];

// Distancia de un punto al segmento (x0,y0)-(x1,y1)
function distSegmento(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  const u = l2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
  return Math.hypot(px - (x0 + u * dx), py - (y0 + u * dy));
}

export function crearMotor({ dif = 1, modo = "libre", ancho = 1.6, rng = Math.random } = {}) {
  const A = AJUSTES[Math.max(0, Math.min(AJUSTES.length - 1, dif))], g = G * A.vel * A.vel;
  const m = {
    ancho, modo, dif, t: 0, puntos: 0, vidas: VIDAS, fase: "normal", motivo: "",
    items: [], pedazos: [], jefe: null, jefesHechos: 0, proximoJefe: JEFE_PRIMERO,
  };
  let tOla = 0.6, ids = 0;
  const entero = (n) => Math.floor(rng() * n);

  function lanzar(tipo, v, x) {
    const r = tipo === "bomba" ? RADIO_BOMBA : RADIO[v], y = 1 + r + 0.02, apice = 0.16 + 0.42 * rng();
    return {
      id: ++ids, tipo, v, k: entero(3), x, y, r, rot: rng() * 6.28, vr: (rng() - 0.5) * 6,
      vx: (m.ancho / 2 - x) * (0.12 + 0.3 * rng()) + (rng() - 0.5) * 0.12, vy: -Math.sqrt(2 * g * (y - apice)),
    };
  }
  function ola() {
    const k = A.min + entero(A.max - A.min + 1);
    let bombas = 0;
    const orden = Array.from({ length: k }, (_, i) => i).sort(() => rng() - 0.5);
    for (let i = 0; i < k; i++) {
      const x = m.ancho * (0.12 + 0.76 * ((orden[i] + rng()) / k));
      const bomba = k > 1 && i < k - 1 && bombas < A.bombasMax && rng() < A.bomba * 1.6; // el último de la oleada siempre es fruta
      if (bomba) { bombas++; m.items.push(lanzar("bomba", 0, x)); }
      else { const u = rng(); m.items.push(lanzar("fruta", u < 0.55 ? 1 : u < 0.85 ? 2 : 3, x)); }
    }
  }
  function iniciarJefe(ev) {
    m.fase = "jefe";
    m.jefe = { t: 0, x: m.ancho / 2, y: 0.5, r: RADIO_JEFE, golpes: 0, segs: new Array(SEGUNDOS_JEFE).fill(false), ultimo: -1 };
    ev.push({ e: "jefe-ini" });
  }
  function terminar(motivo, ev) { m.fase = "fin"; m.motivo = motivo; ev.push({ e: "fin", motivo }); }
  function perder(ev, x, y, causa) {
    m.vidas--;
    ev.push({ e: causa, x, y, vidas: m.vidas });
    if (m.vidas <= 0) terminar("vidas", ev);
  }
  function pedazosDe(it) {
    for (const lado of [-1, 1]) m.pedazos.push({ tipo: it.tipo, v: it.v, k: it.k, x: it.x, y: it.y, r: it.r, rot: it.rot, vr: lado * (2 + 3 * rng()), vx: it.vx * 0.5 + lado * 0.25, vy: it.vy * 0.4 - 0.15, lado, edad: 0 });
  }

  // Avanza dt segundos. Devuelve la lista de sucesos (corte, perdida, bomba, jefe-ini, jefe-fin, golpe, fin).
  m.paso = (dt) => {
    const ev = [];
    if (m.fase === "fin") return ev;
    m.t += dt;
    if (m.fase === "normal") {
      if (modo === "libre" && m.t >= DURACION_LIBRE) iniciarJefe(ev);
      else if (modo === "sin" && m.puntos >= m.proximoJefe) iniciarJefe(ev);
    }
    // oleadas (en «sin» salen un poco más seguidas conforme subes de puntos)
    tOla -= dt;
    if (tOla <= 0) { ola(); tOla += A.cada * (modo === "sin" ? Math.max(0.6, 1 - m.puntos / 500) : 1); }
    for (const it of m.items) { it.vy += g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; }
    for (const p of m.pedazos) { p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.edad += dt; }
    m.pedazos = m.pedazos.filter((p) => p.y < 1.4);
    // fruta que se escapa (cae por debajo de la pantalla sin cortar) = −1 vida; bomba que cae = nada
    const quedan = [];
    for (const it of m.items) {
      if (it.vy > 0 && it.y > 1 + it.r) { if (it.tipo === "fruta" && m.fase !== "fin") perder(ev, Math.max(0.03, Math.min(m.ancho - 0.03, it.x)), 1, "perdida"); }
      else quedan.push(it);
    }
    m.items = quedan;
    if (m.jefe && m.fase !== "fin") {
      const j = m.jefe;
      j.t += dt;
      j.x = m.ancho / 2 + 0.22 * m.ancho * Math.sin(j.t * 1.1);
      j.y = 0.5 + 0.08 * Math.sin(j.t * 2.3);
      if (j.t >= SEGUNDOS_JEFE) {
        const triple = j.segs.every(Boolean), bono = triple ? j.golpes * (TRIPLE - 1) : 0;
        m.puntos += bono;
        ev.push({ e: "jefe-fin", golpes: j.golpes, triple, bono, x: j.x, y: j.y });
        m.jefe = null; m.jefesHechos++;
        if (modo === "libre") terminar("completo", ev);
        else { m.fase = "normal"; m.proximoJefe = m.puntos + JEFE_CADA; }
      }
    }
    return ev;
  };

  // Un tajo recto de (x0,y0) a (x1,y1). Corta las frutas que toca, hace explotar las bombas y golpea la fruta final.
  m.corte = (x0, y0, x1, y1) => {
    const ev = [];
    if (m.fase === "fin") return ev;
    const quedan = [];
    for (const it of m.items) {
      if (m.fase === "fin" || distSegmento(it.x, it.y, x0, y0, x1, y1) > it.r) { quedan.push(it); continue; }
      if (it.tipo === "fruta") { m.puntos += it.v; ev.push({ e: "corte", x: it.x, y: it.y, v: it.v }); pedazosDe(it); }
      else perder(ev, it.x, it.y, "bomba");
    }
    m.items = quedan;
    const j = m.jefe;
    if (j && m.fase !== "fin" && j.t - j.ultimo >= 0.12 && distSegmento(j.x, j.y, x0, y0, x1, y1) <= j.r) {
      j.ultimo = j.t; j.golpes++; m.puntos++;
      j.segs[Math.min(SEGUNDOS_JEFE - 1, Math.floor(j.t))] = true;
      ev.push({ e: "golpe", x: j.x, y: j.y, n: j.golpes });
    }
    return ev;
  };
  return m;
}
