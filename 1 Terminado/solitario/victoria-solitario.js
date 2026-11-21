// Ruta: solitario/victoria-solitario.js
// Animación al ganar (como el solitario clásico de Windows): las cartas salen de las bases, caen,
// rebotan en el piso y dejan estela. Se salta tocando la pantalla.

// ---- Ajustes ----
const PASOS_ENTRE_CARTAS = 14; // pasos (1/60 s) entre una carta lanzada y la siguiente: más bajo = más rápido
const GRAVEDAD = 0.45;         // caída (en múltiplos del ancho de carta / 60)
const REBOTE = 0.82;           // fuerza del rebote (1 = rebota igual de alto)
const ROJO = "#d02a3c", NEGRO = "#1c1c1f";
const PASO = 1000 / 60;
const ACIERTO_MIN_MS = 300;    // ignora toques durante los primeros 300 ms (el del último movimiento)
const RESPETAR_MOVIMIENTO_REDUCIDO = false; // true = no mostrar la animación si el sistema pide «reducir movimiento» (en algunos celulares viene activado y la animación nunca salía)
const CAMBIO_ANCHO_PARA_CERRAR = 60;        // la animación solo se cierra si el ANCHO cambia más de esto (girar el celular); la barra del navegador solo cambia el alto

function rectRedondo(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Dibuja una carta con el mismo estilo del juego (blanca, esquinas, símbolo central, sombra suave)
function crearSprite(c, w, h, relleno, dpr, VALS, PALOS) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil((w + relleno * 2) * dpr);
  cv.height = Math.ceil((h + relleno * 2) * dpr);
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  g.translate(relleno, relleno);
  g.shadowColor = "rgba(40, 18, 4, 0.45)"; g.shadowBlur = 3; g.shadowOffsetX = 1; g.shadowOffsetY = 2;
  g.fillStyle = "#fdfcf9";
  rectRedondo(g, 0, 0, w, h, w * 0.09);
  g.fill();
  g.shadowColor = "transparent";
  g.strokeStyle = "rgba(0, 0, 0, 0.14)"; g.lineWidth = 1;
  g.stroke();
  g.fillStyle = c.s === 1 || c.s === 2 ? ROJO : NEGRO;
  g.textAlign = "center";
  const indice = (cx, cy, girar) => {
    g.save();
    g.translate(cx, cy);
    if (girar) g.rotate(Math.PI);
    g.textBaseline = "top";
    g.font = "700 " + w * 0.26 + "px Georgia, 'Times New Roman', serif";
    g.fillText(VALS[c.v], 0, 0);
    g.font = w * 0.22 + "px system-ui, sans-serif";
    g.fillText(PALOS[c.s], 0, w * 0.26);
    g.restore();
  };
  indice(w * 0.19, w * 0.03, false);
  indice(w - w * 0.19, h - w * 0.03, true);
  g.textBaseline = "middle";
  g.font = w * 0.5 + "px system-ui, sans-serif";
  g.fillText(PALOS[c.s], w / 2, h / 2);
  return cv;
}

// base: las 4 bases (cada una con sus 13 cartas, de A a K)
// pintarBase(i, carta | null): vuelve a dibujar la base i mostrando esa carta (null = vacía)
// alTerminar(): se llama al cerrar la animación (aquí se redibuja el tablero normal)
export function animarVictoria({ base, VALS, PALOS, pintarBase, alTerminar }) {
  const pilas = [0, 1, 2, 3].map((i) => document.querySelector('.pila[data-t="base"][data-i="' + i + '"]'));
  const reducir = RESPETAR_MOVIMIENTO_REDUCIDO && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducir || pilas.some((p) => !p) || base.length !== 4) { alTerminar(); return; }

  const rects = pilas.map((p) => p.getBoundingClientRect());
  const w = rects[0].width, h = w * 1.4, relleno = 6;
  const W = innerWidth, H = innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const escala = w / 60; // las velocidades se ajustan al tamaño de las cartas

  const cv = document.createElement("canvas");
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147482000;touch-action:none;cursor:pointer;";
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  const aviso = document.createElement("div");
  aviso.style.cssText =
    "position:fixed;left:50%;transform:translateX(-50%);z-index:2147482001;pointer-events:none;" +
    "bottom:calc(18px + env(safe-area-inset-bottom,0px));padding:8px 16px;border-radius:999px;" +
    "background:rgba(28,16,8,.72);color:#fff6e6;font:700 14px system-ui,sans-serif;text-align:center;";
  aviso.textContent = "Toca la pantalla para saltar la animación";
  document.body.append(cv, aviso);

  // Orden de lanzamiento: los reyes primero y bajando hasta los ases (una carta de cada base por turno)
  const orden = [];
  for (let k = 12; k >= 0; k--) for (let i = 0; i < 4; i++) orden.push({ i, k });
  const quedan = base.map((p) => p.length);
  const sprites = new Map();
  const volando = [];
  let lanzadas = 0, pasos = 0, acum = 0, ultimo = 0, cerrado = false, terminada = false, raf = 0;
  const inicio = performance.now();

  function lanzar() {
    const { i, k } = orden[lanzadas++];
    const c = base[i][k];
    if (!c) return;
    const clave = c.v + c.s * 16;
    if (!sprites.has(clave)) sprites.set(clave, crearSprite(c, w, h, relleno, dpr, VALS, PALOS));
    quedan[i]--;
    pintarBase(i, quedan[i] > 0 ? base[i][quedan[i] - 1] : null); // se ve la carta de abajo, como en el clásico
    volando.push({
      sprite: sprites.get(clave), x: rects[i].left, y: rects[i].top,
      vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4) * escala,
      vy: -Math.random() * 4 * escala,
    });
  }
  function paso() {
    if (lanzadas < orden.length && pasos % PASOS_ENTRE_CARTAS === 0) lanzar();
    pasos++;
    for (let n = volando.length - 1; n >= 0; n--) {
      const c = volando[n];
      c.vy += GRAVEDAD * escala;
      c.x += c.vx; c.y += c.vy;
      if (c.y + h > H) { c.y = H - h; c.vy = -Math.max(Math.abs(c.vy) * REBOTE, 4 * escala); } // rebote en el piso
      g.drawImage(c.sprite, c.x - relleno, c.y - relleno, w + relleno * 2, h + relleno * 2); // sin borrar: deja estela
      if (c.x + w < 0 || c.x > W) volando.splice(n, 1);
    }
    if (lanzadas >= orden.length && !volando.length) {
      terminada = true;
      aviso.textContent = "🎉 Toca la pantalla para continuar";
    }
  }
  function cuadro(t) {
    if (cerrado) return;
    acum += Math.min(100, t - (ultimo || t));
    ultimo = t;
    while (acum >= PASO && !terminada) { paso(); acum -= PASO; }
    if (!terminada) raf = requestAnimationFrame(cuadro);
  }
  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", alRedimensionar);
    removeEventListener("keydown", alTeclado);
    cv.remove(); aviso.remove();
    alTerminar();
  }
  function alRedimensionar() { if (Math.abs(innerWidth - W) > CAMBIO_ANCHO_PARA_CERRAR) cerrar(); }
  function alTeclado(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") cerrar(); }
  cv.addEventListener("click", () => { if (performance.now() - inicio > ACIERTO_MIN_MS) cerrar(); });
  addEventListener("resize", alRedimensionar);
  addEventListener("keydown", alTeclado);
  raf = requestAnimationFrame(cuadro);
}
