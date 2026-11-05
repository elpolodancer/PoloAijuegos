// Ruta: paperio/juego.js
// «Paperio» (estilo Paper.io): sales de tu territorio dejando una estela y, al volver, te quedas con todo lo que encerraste.
// - Si alguien toca tu estela (o tú la tuya), pierdes todo; si tú tocas la estela de otro, pierde él.
// - Si te quedas sin territorio, pierdes. Los bots reaparecen solos; tú no (se acaba la partida).
// - Todo vive en dos rejillas planas (dueno / rastro); el dibujo solo pinta lo que se ve.
const ID = "paperio";

// ----- Ajustes -----
const ANCHO = 90, ALTO = 90;          // tamaño del mapa en casillas
const PASO = 0.12;                    // segundos por casilla (todos van igual de rápido)
const NUM_BOTS = 7;                   // máximo 7 (hay 8 colores/nombres)
const CELDAS_VISTA = 22;              // casillas que caben en el lado corto de la pantalla
const REAPARECE_BOT = [2, 4];         // segundos que tarda un bot en volver
const UMBRAL_GIRO = 18;               // píxeles de deslizamiento para girar
const PUNTOS_POR_PCT = 10;            // puntos por cada 1 % de mapa (el máximo que lograste)
const PUNTOS_POR_BAJA = 25;           // puntos por cada bot eliminado
const NOMBRES = ["Tú", "Lola", "Pepe", "Nico", "Rosa", "Toño", "Mara", "Beto"];
const TONOS = [255, 5, 38, 135, 178, 300, 340, 55]; // color de cada uno (el primero es el jugador)

// ----- Estado -----
const N = ANCHO * ALTO;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const dueno = new Uint8Array(N);    // id del dueño de cada casilla (0 = nadie)
const rastro = new Uint8Array(N);   // id de quien dejó estela en la casilla (0 = ninguna)
const cuenta = new Int32Array(NUM_BOTS + 2);
let ents = [], yo = null;
let estado = "demo";                // demo | jugando | fin
let sucio = true, bajas = 0, maxPct = 0, tiempo = 0, mejorPct = 0;
let ordenes = [];
let fx = [];
const cam = { x: ANCHO / 2, y: ALTO / 2 };

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), ctx = cv.getContext("2d");
let vw = 300, vh = 300, cs = 14;

try { mejorPct = Number(localStorage.getItem("paperio_mejor")) || 0; } catch (e) {}

// ----- Sesión y puntos (opcional: sin conexión el juego funciona igual) -----
let J = null, usuario = null;
import("../compartido/jugador.js")
  .then((m) => { J = m; m.alCambiarSesion((u) => { usuario = u; marcarEntrar(); }); })
  .catch(() => {});

// ----- Entidades -----
function crear(id) {
  const tono = TONOS[id - 1];
  return {
    id, jugador: id === 1, nombre: NOMBRES[id - 1], tono,
    cT: "hsl(" + tono + ",62%,58%)", cB: "hsl(" + tono + ",62%,40%)",
    cR: "hsl(" + tono + ",80%,78%)", cC: "hsl(" + tono + ",72%,42%)",
    x: 0, y: 0, px: 0, py: 0, dir: 0, cola: [], vivo: false, espera: 0,
    fase: 0, rest: 0, lado: 1, largo: 0,
  };
}

function libre5(cx, cy) {
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const i = (cy + dy) * ANCHO + cx + dx;
      if (dueno[i] || rastro[i]) return false;
    }
  return true;
}
function lejos(cx, cy, r) {
  for (const o of ents) if (o.vivo && Math.abs(o.x - cx) + Math.abs(o.y - cy) < r) return false;
  return true;
}
function aparecer(e) {
  let cx = 0, cy = 0, ok = false;
  for (let k = 0; k < 400 && !ok; k++) {
    cx = 3 + Math.floor(Math.random() * (ANCHO - 6));
    cy = 3 + Math.floor(Math.random() * (ALTO - 6));
    ok = libre5(cx, cy) && lejos(cx, cy, 9);
  }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dueno[(cy + dy) * ANCHO + cx + dx] = e.id;
  e.x = e.px = cx; e.y = e.py = cy;
  // mira hacia el centro del mapa para no chocar con la pared enseguida
  const mx = cx - ANCHO / 2, my = cy - ALTO / 2;
  e.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 1 : 3) : (my < 0 ? 2 : 0);
  e.cola = []; e.fase = 0; e.vivo = true;
  sucio = true;
}

function recontar() {
  cuenta.fill(0);
  for (let i = 0; i < N; i++) { const o = dueno[i]; if (o) cuenta[o]++; }
  sucio = false;
  if (estado === "jugando" && yo.vivo) { const p = cuenta[1] * 100 / N; if (p > maxPct) maxPct = p; }
}

function matar(v, por) {
  if (!v.vivo) return;
  v.vivo = false;
  for (const i of v.cola) if (rastro[i] === v.id) rastro[i] = 0;
  v.cola = [];
  for (let i = 0; i < N; i++) if (dueno[i] === v.id) dueno[i] = 0;
  fx.push({ x: v.x, y: v.y, t: 0, tono: v.tono });
  sucio = true;
  if (por && por.jugador && por !== v && estado === "jugando") bajas++;
  if (v.jugador) { if (estado === "jugando") terminar(); }
  else v.espera = REAPARECE_BOT[0] + Math.random() * (REAPARECE_BOT[1] - REAPARECE_BOT[0]);
}

// Cierra el bucle: la estela pasa a ser territorio y todo lo que no se alcanza desde el borde también
function cerrar(e) {
  for (const i of e.cola) { dueno[i] = e.id; rastro[i] = 0; }
  e.cola = [];
  const vis = new Uint8Array(N), q = new Int32Array(N);
  let h = 0, t = 0;
  const meter = (i) => { if (!vis[i] && dueno[i] !== e.id) { vis[i] = 1; q[t++] = i; } };
  for (let x = 0; x < ANCHO; x++) { meter(x); meter((ALTO - 1) * ANCHO + x); }
  for (let y = 0; y < ALTO; y++) { meter(y * ANCHO); meter(y * ANCHO + ANCHO - 1); }
  while (h < t) {
    const i = q[h++], x = i % ANCHO, y = (i / ANCHO) | 0;
    if (x > 0) meter(i - 1);
    if (x < ANCHO - 1) meter(i + 1);
    if (y > 0) meter(i - ANCHO);
    if (y < ALTO - 1) meter(i + ANCHO);
  }
  for (let i = 0; i < N; i++) if (!vis[i] && dueno[i] !== e.id) dueno[i] = e.id;
  recontar();
  for (const o of ents) if (o !== e && o.vivo && cuenta[o.id] === 0) matar(o, e); // sin territorio = fuera
}

// ----- Bots -----
function fuera(x, y) { return x < 0 || y < 0 || x >= ANCHO || y >= ALTO; }
function seguro(e, d) {
  const nx = e.x + DX[d], ny = e.y + DY[d];
  return !fuera(nx, ny) && rastro[ny * ANCHO + nx] !== e.id;
}
function propioCercano(e) {
  let mejor = 1e9, mx = e.x, my = e.y;
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++)
      if (dueno[y * ANCHO + x] === e.id) {
        const d = Math.abs(x - e.x) + Math.abs(y - e.y);
        if (d < mejor) { mejor = d; mx = x; my = y; }
      }
  return { x: mx, y: my };
}
function decidirBot(e) {
  const opts = [e.dir, (e.dir + 1) % 4, (e.dir + 3) % 4];
  const ok = opts.filter((d) => seguro(e, d));
  if (!ok.length) return e.dir;
  // si justo adelante hay estela de otro, se la come
  for (const d of ok) {
    const t = rastro[(e.y + DY[d]) * ANCHO + e.x + DX[d]];
    if (t && t !== e.id && Math.random() < 0.9) return d;
  }
  if (e.cola.length === 0) { // en casa: pasea y, al salir, planea un rectángulo
    e.fase = 0;
    const d = ok.includes(e.dir) && Math.random() < 0.8 ? e.dir : ok[Math.floor(Math.random() * ok.length)];
    if (dueno[(e.y + DY[d]) * ANCHO + e.x + DX[d]] !== e.id) {
      e.fase = 1;
      e.rest = 3 + Math.floor(Math.random() * 9);
      e.largo = 3 + Math.floor(Math.random() * 9);
      e.lado = Math.random() < 0.5 ? 1 : 3;
    }
    return d;
  }
  if (e.fase === 1) {
    if (e.rest > 0) { e.rest--; if (ok.includes(e.dir)) return e.dir; }
    else { const d = (e.dir + e.lado) % 4; e.fase = 2; e.rest = e.largo; if (ok.includes(d)) return d; }
  } else if (e.fase === 2) {
    if (e.rest > 0) { e.rest--; if (ok.includes(e.dir)) return e.dir; }
    else e.fase = 3;
  }
  e.fase = 3; // volver al territorio propio por el camino más corto
  const m = propioCercano(e);
  let mejor = ok[0], md = 1e9;
  for (const d of ok) {
    const dd = Math.abs(e.x + DX[d] - m.x) + Math.abs(e.y + DY[d] - m.y) - (d === e.dir ? 0.1 : 0);
    if (dd < md) { md = dd; mejor = d; }
  }
  return mejor;
}

// ----- Un paso de juego -----
function paso() {
  const mv = [];
  for (const e of ents) {
    if (!e.vivo) continue;
    if (e.jugador) {
      while (ordenes.length) {
        const d = ordenes.shift();
        if (d !== e.dir && d !== (e.dir + 2) % 4) { e.dir = d; break; }
      }
    } else e.dir = decidirBot(e);
    mv.push({ e, nx: e.x + DX[e.dir], ny: e.y + DY[e.dir], ox: e.x, oy: e.y, choque: false });
  }
  // choques de frente (misma casilla o cruzándose): mueren los dos
  for (let a = 0; a < mv.length; a++)
    for (let b = a + 1; b < mv.length; b++) {
      const A = mv[a], B = mv[b];
      if ((A.nx === B.nx && A.ny === B.ny) || (A.nx === B.ox && A.ny === B.oy && B.nx === A.ox && B.ny === A.oy)) A.choque = B.choque = true;
    }
  for (const m of mv) if (m.choque) matar(m.e, null);
  for (const m of mv) {
    const e = m.e;
    if (!e.vivo || m.choque) continue;
    e.px = m.ox; e.py = m.oy;
    if (fuera(m.nx, m.ny)) { matar(e, null); continue; }
    e.x = m.nx; e.y = m.ny;
    const i = e.y * ANCHO + e.x, t = rastro[i];
    if (t) {
      const v = ents[t - 1];
      if (v === e) { matar(e, null); continue; }
      matar(v, e);
    }
    if (dueno[i] === e.id) { if (e.cola.length) cerrar(e); }
    else { rastro[i] = e.id; e.cola.push(i); }
  }
  if (sucio) recontar();
}

// ----- Partida -----
function iniciar(demo) {
  dueno.fill(0); rastro.fill(0); fx = []; ordenes = [];
  ents = [];
  for (let id = 1; id <= NUM_BOTS + 1; id++) ents.push(crear(id));
  yo = ents[0];
  bajas = 0; maxPct = 0; tiempo = 0;
  estado = demo ? "demo" : "jugando";
  for (const e of ents) if (!(demo && e.jugador)) aparecer(e);
  recontar();
  if (!demo) { cam.x = yo.x + 0.5; cam.y = yo.y + 0.5; }
}

function fmtTiempo(s) { s = Math.floor(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

async function terminar() {
  estado = "fin";
  const pct = Math.max(maxPct, 0);
  const puntos = Math.round(pct * PUNTOS_POR_PCT) + bajas * PUNTOS_POR_BAJA;
  if (pct > mejorPct) {
    mejorPct = pct;
    try { localStorage.setItem("paperio_mejor", String(pct)); } catch (e) {}
  }
  let guardado = "";
  if (puntos > 0 && J && usuario) {
    try { guardado = (await J.sumarPuntos(ID, puntos)) ? "guardados en tu perfil" : ""; } catch (e) { guardado = "no se pudieron guardar"; }
  } else if (puntos > 0 && !usuario) guardado = "entra con Google para guardarlos";
  setTimeout(() => {
    if (estado !== "fin") return;
    mostrarVelo("Te eliminaron", "", [
      ["Territorio máximo", pct.toFixed(1) + " %"],
      ["Bajas", String(bajas)],
      ["Tiempo", fmtTiempo(tiempo)],
      ["Puntos", "+" + puntos + (guardado ? " (" + guardado + ")" : "")],
    ]);
    cargarRanking();
  }, 700);
}

function mostrarVelo(titulo, texto, datos) {
  $("velTitulo").textContent = titulo;
  $("velTexto").textContent = texto;
  $("velTexto").hidden = !texto;
  const ul = $("velDatos");
  ul.innerHTML = "";
  for (const [k, v] of datos) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = v;
    li.append(k + ": ", b);
    ul.appendChild(li);
  }
  $("jugar").textContent = estado === "fin" ? "Jugar otra vez" : "Jugar";
  marcarEntrar();
  $("velo").hidden = false;
}

function marcarEntrar() { $("entrar").hidden = !J || !!usuario; }
$("entrar").addEventListener("click", () => { if (J) J.entrar().catch((e) => alert(e.message)); });
$("jugar").addEventListener("click", () => { $("velo").hidden = true; iniciar(false); });

async function cargarRanking() {
  const caja = $("ranking");
  if (!J) return;
  try {
    const lista = await J.mejores(ID, 5);
    if (!lista.length) return;
    caja.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = "Mejores jugadores";
    const ol = document.createElement("ol");
    for (const j of lista) {
      const li = document.createElement("li");
      li.textContent = (j.nombre || "Jugador") + " · " + (j.mejor || 0) + " pts";
      ol.appendChild(li);
    }
    caja.append(h, ol);
    caja.hidden = false;
  } catch (e) {}
}

// ----- Controles -----
function ordenar(d) {
  if (estado !== "jugando" || !yo || !yo.vivo) return;
  const ult = ordenes.length ? ordenes[ordenes.length - 1] : yo.dir;
  if (d === ult || d === (ult + 2) % 4) return;
  if (ordenes.length < 3) ordenes.push(d);
}
const TECLAS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
addEventListener("keydown", (ev) => {
  if (ev.key in TECLAS) { ev.preventDefault(); ordenar(TECLAS[ev.key]); }
});
let arrastra = false, ox = 0, oy = 0;
cv.addEventListener("pointerdown", (ev) => {
  arrastra = true; ox = ev.clientX; oy = ev.clientY;
  try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
});
cv.addEventListener("pointermove", (ev) => {
  if (!arrastra) return;
  const dx = ev.clientX - ox, dy = ev.clientY - oy;
  if (Math.hypot(dx, dy) < UMBRAL_GIRO) return;
  ordenar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  ox = ev.clientX; oy = ev.clientY;
});
const soltar = () => { arrastra = false; };
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);

// ----- Dibujo -----
function ajustar() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = Math.max(1, r.width); vh = Math.max(1, r.height);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cs = Math.max(10, Math.min(vw, vh) / CELDAS_VISTA);
}
addEventListener("resize", ajustar);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(ajustar).observe($("escena"));

const SX = (x) => (x - cam.x) * cs + vw / 2;
const SY = (y) => (y - cam.y) * cs + vh / 2;

function dibujar(k) {
  ctx.fillStyle = "#141a2e";
  ctx.fillRect(0, 0, vw, vh);
  const x0 = SX(0), y0 = SY(0);
  ctx.fillStyle = "#f1f4fb";
  ctx.fillRect(x0, y0, ANCHO * cs, ALTO * cs);

  const ix0 = Math.max(0, Math.floor(cam.x - vw / 2 / cs) - 1), ix1 = Math.min(ANCHO - 1, Math.ceil(cam.x + vw / 2 / cs) + 1);
  const iy0 = Math.max(0, Math.floor(cam.y - vh / 2 / cs) - 1), iy1 = Math.min(ALTO - 1, Math.ceil(cam.y + vh / 2 / cs) + 1);

  ctx.strokeStyle = "#e1e6f2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ix0; x <= ix1 + 1; x++) { const X = Math.round(SX(x)) + 0.5; ctx.moveTo(X, SY(iy0)); ctx.lineTo(X, SY(iy1 + 1)); }
  for (let y = iy0; y <= iy1 + 1; y++) { const Y = Math.round(SY(y)) + 0.5; ctx.moveTo(SX(ix0), Y); ctx.lineTo(SX(ix1 + 1), Y); }
  ctx.stroke();

  const franja = Math.max(2, Math.round(cs * 0.16));
  for (let y = iy0; y <= iy1; y++) {
    const Y = Math.floor(SY(y)), H = Math.floor(SY(y + 1)) - Y;
    for (let x = ix0; x <= ix1; x++) {
      const i = y * ANCHO + x, o = dueno[i], r = rastro[i];
      if (!o && !r) continue;
      const X = Math.floor(SX(x)), W = Math.floor(SX(x + 1)) - X;
      if (o) {
        const e = ents[o - 1];
        ctx.fillStyle = e.cT;
        ctx.fillRect(X, Y, W, H);
        if (y + 1 >= ALTO || dueno[i + ANCHO] !== o) { ctx.fillStyle = e.cB; ctx.fillRect(X, Y + H - franja, W, franja); }
      }
      if (r) { ctx.fillStyle = ents[r - 1].cR; ctx.fillRect(X, Y, W, H); }
    }
  }

  // cabezas, con ojos que miran hacia donde van
  ctx.textAlign = "center";
  ctx.font = "700 " + Math.round(cs * 0.55) + "px system-ui, sans-serif";
  for (const e of ents) {
    if (!e.vivo) continue;
    const hx = e.px + (e.x - e.px) * k, hy = e.py + (e.y - e.py) * k;
    const X = SX(hx), Y = SY(hy);
    if (X < -cs * 2 || Y < -cs * 2 || X > vw + cs * 2 || Y > vh + cs * 2) continue;
    ctx.fillStyle = e.cC;
    ctx.fillRect(X + cs * 0.04, Y + cs * 0.04, cs * 0.92, cs * 0.92);
    const fx0 = DX[e.dir], fy0 = DY[e.dir], sx0 = -fy0, sy0 = fx0;
    const cx = X + cs / 2 + fx0 * cs * 0.1, cy = Y + cs / 2 + fy0 * cs * 0.1;
    for (const s of [-1, 1]) {
      const ex = cx + sx0 * s * cs * 0.2, ey = cy + sy0 * s * cs * 0.2;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex, ey, cs * 0.14, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(ex + fx0 * cs * 0.06, ey + fy0 * cs * 0.06, cs * 0.07, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = "rgba(20,26,46,.85)";
    ctx.fillText(e.nombre, X + cs / 2, Y - cs * 0.18);
  }

  // aros al morir
  for (const f of fx) {
    ctx.strokeStyle = "hsla(" + f.tono + ",80%,50%," + Math.max(0, 1 - f.t / 0.6) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SX(f.x + 0.5), SY(f.y + 0.5), cs * (0.5 + f.t * 5), 0, 6.2832);
    ctx.stroke();
  }

  // marcador de los primeros lugares
  const top = ents.filter((e) => e.vivo && cuenta[e.id] > 0).sort((a, b) => cuenta[b.id] - cuenta[a.id]).slice(0, 5);
  if (top.length) {
    const ancho = 128, alto = 10 + top.length * 17, bx = vw - ancho - 8, by = 8;
    ctx.fillStyle = "rgba(20,26,46,.6)";
    ctx.fillRect(bx, by, ancho, alto);
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    top.forEach((e, n) => {
      const yy = by + 8 + n * 17;
      ctx.fillStyle = e.cT; ctx.fillRect(bx + 6, yy, 10, 10);
      ctx.fillStyle = e.jugador ? "#fff" : "#c9d0ee";
      ctx.fillText(e.nombre, bx + 22, yy + 9);
      ctx.textAlign = "right";
      ctx.fillText((cuenta[e.id] * 100 / N).toFixed(1) + "%", bx + ancho - 6, yy + 9);
      ctx.textAlign = "left";
    });
  }
}

// ----- Ciclo principal -----
let ultimo = 0, acum = 0, hud = "";
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, Math.max(0, (ts - ultimo) / 1000));
  ultimo = ts;
  acum += dt;
  while (acum >= PASO) { paso(); acum -= PASO; }
  if (estado === "jugando" && yo.vivo) tiempo += dt;
  for (const e of ents) if (!e.vivo && !e.jugador) { e.espera -= dt; if (e.espera <= 0) aparecer(e); }
  if (sucio) recontar();
  for (const f of fx) f.t += dt;
  fx = fx.filter((f) => f.t < 0.6);

  // la cámara sigue al jugador (o, mientras no juegas, al bot más grande)
  const k = acum / PASO;
  let seg = yo && yo.vivo ? yo : null;
  if (!seg) for (const e of ents) if (e.vivo && (!seg || cuenta[e.id] > cuenta[seg.id])) seg = e;
  if (seg) {
    const tx = seg.px + (seg.x - seg.px) * k + 0.5, ty = seg.py + (seg.y - seg.py) * k + 0.5;
    const a = Math.min(1, dt * 8);
    cam.x += (tx - cam.x) * a; cam.y += (ty - cam.y) * a;
  }
  dibujar(k);

  const pct = (yo ? cuenta[1] * 100 / N : 0);
  const txt = [pct.toFixed(1), bajas, Math.max(mejorPct, maxPct).toFixed(1)].join("|");
  if (txt !== hud) {
    hud = txt;
    $("stTerr").textContent = "▦ " + pct.toFixed(1) + " %";
    $("stBajas").textContent = "☠ " + bajas;
    $("stMejor").textContent = "🏆 " + Math.max(mejorPct, maxPct).toFixed(1) + " %";
  }
}

ajustar();
iniciar(true);
mostrarVelo("Paperio", "Sal de tu territorio y regresa para quedarte con todo lo que encierres. Si alguien toca tu estela, pierdes; si tú tocas la suya, pierde él. Desliza el dedo o usa las flechas / WASD.", []);
cargarRanking();
requestAnimationFrame((ts) => { ultimo = ts; bucle(ts); });
