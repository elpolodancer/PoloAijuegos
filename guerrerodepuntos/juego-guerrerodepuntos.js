// Ruta: guerrerodepuntos/juego-guerrerodepuntos.js
// Devorador: saltas de zona en zona; vences enemigos de nivel menor al tuyo y te quedas con su nivel.
// El mapa es grande: la cámara te sigue, puedes arrastrar para mirar y hay niebla (solo ves las zonas junto a las que has estado).
import { NIVELES, NIVEL_INICIAL } from "./niveles-guerrerodepuntos.js";

// Qué pasa si saltas a un enemigo igual o más fuerte que tú:
//  "inicio"    → te vence y regresas a la zona inicial (conservas tu nivel y el enemigo sigue ahí)
//  "reiniciar" → pierdes y el nivel empieza de cero
const CASTIGO_AL_PERDER = "inicio";
const PERDIDA_VENENO = 0.1; // el hongo venenoso te quita este porcentaje de tu nivel (una sola vez por hongo)

const W = 360, H = 600, RADIO = 30, DURACION_SALTO = 280;
const cv = document.getElementById("lienzo");
const ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);
const EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
const BICHOS = ["🐛", "🐁", "🦇", "🐺", "👹", "🐗", "🦂", "🐉", "💀", "👾"]; // más fuerte = más grande y más feroz

let idx = 0, zonas, ady, enlaces, salida, vis, mundo, jug, estado, anim, flotantes, aviso, avisoHasta;
let pendiente, cam, modoMapa, siguiendo, arrastre, destello, sumar = null;

function cargar(i) {
  idx = i;
  const n = NIVELES[i];
  zonas = n.zonas.map((z) => ({ ...z, visitada: false, revelada: false, usada: false }));
  enlaces = n.enlaces;
  salida = n.salida;
  mundo = { ancho: n.ancho, alto: n.alto };
  ady = zonas.map(() => []);
  enlaces.forEach(([a, b]) => { ady[a].push(b); ady[b].push(a); });
  zonas[0].visitada = true;
  jug = { zona: 0, nivel: NIVEL_INICIAL, x: zonas[0].x, y: zonas[0].y, salto: 0 };
  cam = { x: jug.x, y: jug.y, z: 1 };
  modoMapa = false;
  siguiendo = true;
  arrastre = null;
  pendiente = null;
  destello = 0;
  estado = "jugando";
  anim = null;
  flotantes = [];
  decir(n.pista || "", 6000);
  calcularVisibles();
  $("accion").hidden = true;
  $("mapa").textContent = "🗺️"; $("mapa").title = "Ver mapa";
  actualizarEstado();
}

// Niebla: ves las zonas que has pisado y las que están junto a ellas
function calcularVisibles() {
  vis = zonas.map((z, i) => z.visitada || ady[i].some((j) => zonas[j].visitada));
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
}
function actualizarEstado() {
  const n = NIVELES[idx];
  const v = zonas.filter((z) => z.visitada).length;
  $("estado").textContent = "🐲 " + jug.nivel.toLocaleString("es-MX") + " · 📍 " + v;
  $("estado").title = n.nombre + " · Tu nivel: " + jug.nivel.toLocaleString("es-MX") + " · Zonas exploradas: " + v;
}
function decir(t, ms = 2600) { aviso = t; avisoHasta = performance.now() + ms; }

// ----- Entrada -----
const aMundo = (px, py) => ({ x: (px - W / 2) / cam.z + cam.x, y: (py - H / 2) / cam.z + cam.y });

function zonaEn(wx, wy) {
  let mejor = -1, dmin = Math.max(RADIO + 12, 24 / cam.z);
  zonas.forEach((z, i) => {
    if (!vis[i]) return;
    const d = Math.hypot(z.x - wx, z.y - wy);
    if (d < dmin) { dmin = d; mejor = i; }
  });
  return mejor;
}

function tocar(px, py) {
  if (estado !== "jugando" || anim) return;
  const w = aMundo(px, py);
  const i = zonaEn(w.x, w.y);
  if (i < 0 || i === jug.zona) return;
  if (!ady[jug.zona].includes(i)) return decir("Solo puedes saltar a zonas unidas por un puente.");
  const e = zonas[i].enemigo;
  if (e != null && jug.nivel <= e && pendiente !== i) {
    pendiente = i;
    return decir("¡Es más fuerte que tú! Toca otra vez si quieres arriesgarte.", 3000);
  }
  pendiente = null;
  siguiendo = true;
  anim = { de: { x: jug.x, y: jug.y }, a: i, t0: performance.now() };
}

cv.addEventListener("pointerdown", (e) => {
  cv.setPointerCapture(e.pointerId);
  arrastre = { ix: e.clientX, iy: e.clientY, ux: e.clientX, uy: e.clientY, movido: false };
});
cv.addEventListener("pointermove", (e) => {
  if (!arrastre) return;
  const r = cv.getBoundingClientRect();
  const k = W / r.width;
  if (!arrastre.movido && Math.hypot(e.clientX - arrastre.ix, e.clientY - arrastre.iy) > 8) arrastre.movido = true;
  if (arrastre.movido) {
    cam.x -= ((e.clientX - arrastre.ux) * k) / cam.z;
    cam.y -= ((e.clientY - arrastre.uy) * k) / cam.z;
    siguiendo = false;
  }
  arrastre.ux = e.clientX;
  arrastre.uy = e.clientY;
});
cv.addEventListener("pointerup", (e) => {
  if (arrastre && !arrastre.movido) {
    const r = cv.getBoundingClientRect();
    tocar((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
  }
  arrastre = null;
});
cv.addEventListener("pointercancel", () => (arrastre = null));

$("mapa").addEventListener("click", () => {
  modoMapa = !modoMapa;
  siguiendo = !modoMapa;
  $("mapa").textContent = modoMapa ? "🎯" : "🗺️";
  $("mapa").title = modoMapa ? "Volver a mi dragón" : "Ver mapa";
  $("mapa").setAttribute("aria-label", $("mapa").title);
});
$("accion").addEventListener("click", () => {
  if (estado === "ganado") cargar(idx + 1 < NIVELES.length ? idx + 1 : 0);
  else cargar(idx);
});
$("reiniciar").addEventListener("click", () => { $("confirmar").hidden = false; });
$("confSi").addEventListener("click", () => { $("confirmar").hidden = true; cargar(idx); });
$("confNo").addEventListener("click", () => { $("confirmar").hidden = true; });

// ----- Reglas -----
function volverAlInicio() {
  jug.zona = 0;
  jug.x = zonas[0].x;
  jug.y = zonas[0].y;
  cam.x = jug.x;
  cam.y = jug.y;
  siguiendo = true;
  destello = performance.now();
  calcularVisibles();
}

function llegar(i) {
  const z = zonas[i];
  jug.zona = i;
  z.visitada = true;
  calcularVisibles();
  const ahora = performance.now();

  if (z.enemigo != null) {
    if (jug.nivel > z.enemigo) {
      flotantes.push({ x: z.x, y: z.y - 40, texto: "+" + fmt(z.enemigo), color: "#ffe066", t0: ahora });
      jug.nivel += z.enemigo;
      delete z.enemigo;
    } else if (CASTIGO_AL_PERDER === "reiniciar") {
      estado = "perdido";
      decir("Te venció un enemigo de nivel " + z.enemigo.toLocaleString("es-MX") + ".", 99999);
      $("accion").textContent = "Reintentar";
      $("accion").hidden = false;
      return;
    } else {
      decir("Te venció un enemigo de nivel " + z.enemigo.toLocaleString("es-MX") + ". Volviste al inicio.", 4000);
      volverAlInicio();
      actualizarEstado();
      return;
    }
  } else if (z.trampa === "pozo") {
    z.revelada = true;
    decir("¡Un pozo! Caíste y volviste al inicio.", 4000);
    volverAlInicio();
    actualizarEstado();
    return;
  } else if (z.trampa === "veneno" && !z.usada) {
    z.revelada = true;
    z.usada = true;
    const perdido = Math.max(1, Math.floor(jug.nivel * PERDIDA_VENENO));
    jug.nivel -= perdido;
    flotantes.push({ x: z.x, y: z.y - 40, texto: "-" + fmt(perdido), color: "#ff6b6b", t0: ahora });
    decir("¡Hongo venenoso! Perdiste el 10 % de tu nivel.", 4000);
  }
  actualizarEstado();

  if (i === salida) {
    estado = "ganado";
    const hay = idx + 1 < NIVELES.length;
    decir(hay ? "¡Nivel superado con nivel " + fmt(jug.nivel) + "!" : "¡Llegaste a la salida con nivel " + jug.nivel.toLocaleString("es-MX") + "!", 99999);
    $("accion").textContent = hay ? "Siguiente nivel" : "Jugar de nuevo";
    $("accion").hidden = false;
    // 1 punto por cada 1000 de nivel (el tope por envío es 1000, así que un millón = 1000 puntos)
    const puntos = Math.min(1000, Math.floor(jug.nivel / 1000));
    if (sumar && puntos > 0) sumar("guerrerodepuntos", puntos).catch(() => {});
  }
}

// ----- Dibujo -----
function texto(t, x, y, tam, color, peso = "700", alin = "center") {
  ctx.font = peso + " " + tam + "px system-ui, sans-serif";
  ctx.textAlign = alin;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}
function emoji(e, x, y, tam, alfa = 1) {
  ctx.globalAlpha = alfa;
  ctx.font = tam + "px " + EMOJI;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(e, x, y);
  ctx.globalAlpha = 1;
}
function insignia(t, x, y, color) {
  ctx.font = "700 14px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 11, w, 22, 11);
  ctx.fill();
  texto(t, x, y + 1, 14, "#fff");
}
function lineas(t, max) {
  const out = [];
  let l = "";
  t.split(" ").forEach((p) => {
    if ((l + " " + p).trim().length > max) { out.push(l); l = p; } else l = (l + " " + p).trim();
  });
  if (l) out.push(l);
  return out;
}

function dibujar(ahora) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15171c");
  g.addColorStop(1, "#262b33");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const z = cam.z;
  ctx.setTransform(z, 0, 0, z, W / 2 - cam.x * z, H / 2 - cam.y * z);
  const vx0 = cam.x - W / 2 / z - 70, vx1 = cam.x + W / 2 / z + 70;
  const vy0 = cam.y - H / 2 / z - 70, vy1 = cam.y + H / 2 / z + 70;
  const dentro = (p) => p.x > vx0 && p.x < vx1 && p.y > vy0 && p.y < vy1;

  // Puentes (los que salen de tu zona se resaltan)
  ctx.lineCap = "round";
  enlaces.forEach(([a, b]) => {
    if (!vis[a] || !vis[b] || !(zonas[a].visitada || zonas[b].visitada)) return;
    const za = zonas[a], zb = zonas[b];
    if (!dentro(za) && !dentro(zb)) return;
    const activo = estado === "jugando" && (a === jug.zona || b === jug.zona);
    ctx.strokeStyle = activo ? "#d9b26b" : "#6b5a3c";
    ctx.lineWidth = activo ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(za.x, za.y); ctx.lineTo(zb.x, zb.y); ctx.stroke();
  });

  // Zonas
  zonas.forEach((q, i) => {
    if (!vis[i] || !dentro(q)) return;
    const esSalida = i === salida;
    ctx.globalAlpha = q.visitada ? 1 : 0.8;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(q.x, q.y + 10, RADIO + 4, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esSalida ? "#f2c94c" : i === 0 ? "#5aa9e6" : q.revelada ? "#8a4f4f" : "#4f9d5d";
    ctx.beginPath(); ctx.ellipse(q.x, q.y + 4, RADIO, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esSalida ? "#fbe69a" : i === 0 ? "#8cc7f0" : q.revelada ? "#b98080" : "#7bc48a";
    ctx.beginPath(); ctx.ellipse(q.x, q.y, RADIO, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (esSalida) emoji("🏁", q.x, q.y - 6, 30);
    if (q.revelada) emoji(q.trampa === "pozo" ? "🕳️" : "🍄", q.x, q.y - 4, 26, q.usada ? 0.45 : 1);
  });

  // Enemigos
  zonas.forEach((q, i) => {
    if (!vis[i] || q.enemigo == null || !dentro(q)) return;
    const puedo = jug.nivel > q.enemigo;
    const tier = Math.max(0, Math.min(9, Math.floor(Math.log10(q.enemigo) * 1.6)));
    const tam = 22 + tier * 2.5;
    const bob = Math.sin(ahora / 350 + i) * 3;
    emoji(BICHOS[tier], q.x, q.y - 14 - tier + bob, tam);
    insignia(fmt(q.enemigo), q.x, q.y + 8, puedo ? "#2e9e55" : "#c9373f");
  });

  // Jugador
  const salto = Math.sin(jug.salto * Math.PI) * 34;
  emoji("🐲", jug.x, jug.y - 20 - salto, 34);
  insignia(fmt(jug.nivel), jug.x, jug.y + 8 - salto * 0.2, "#3b6fe0");

  // Textos flotantes (+N / -N)
  flotantes = flotantes.filter((f) => ahora - f.t0 < 1000);
  flotantes.forEach((f) => {
    const p = (ahora - f.t0) / 1000;
    ctx.globalAlpha = 1 - p;
    texto(f.texto, f.x, f.y - p * 40, 28, f.color);
    ctx.globalAlpha = 1;
  });

  // Capa de pantalla: destello al caer en trampas y aviso
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (destello && ahora - destello < 500) {
    ctx.fillStyle = "rgba(255,255,255," + (0.6 * (1 - (ahora - destello) / 500)) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  if (aviso && ahora < avisoHasta) {
    const ls = lineas(aviso, 44);
    const alto = 14 + ls.length * 17;
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.beginPath(); ctx.roundRect(16, H - alto - 12, W - 32, alto, 12); ctx.fill();
    ls.forEach((l, k) => texto(l, W / 2, H - alto - 12 + 15 + k * 17, 13, "#fff", "600"));
  }
}

function cuadro(ahora) {
  if (anim) {
    const p = Math.min(1, (ahora - anim.t0) / DURACION_SALTO);
    const d = zonas[anim.a];
    jug.x = anim.de.x + (d.x - anim.de.x) * p;
    jug.y = anim.de.y + (d.y - anim.de.y) * p;
    jug.salto = p;
    if (p >= 1) {
      jug.salto = 0;
      const dest = anim.a;
      anim = null;
      llegar(dest);
    }
  }
  // Cámara: sigue al dragón, o muestra todo el mapa
  const zMapa = Math.min((W - 16) / mundo.ancho, (H - 16) / mundo.alto);
  cam.z += ((modoMapa ? zMapa : 1) - cam.z) * 0.15;
  if (modoMapa) {
    cam.x += (mundo.ancho / 2 - cam.x) * 0.15;
    cam.y += (mundo.alto / 2 - cam.y) * 0.15;
  } else if (siguiendo) {
    cam.x += (jug.x - cam.x) * 0.12;
    cam.y += (jug.y - cam.y) * 0.12;
  }
  dibujar(ahora);
  requestAnimationFrame(cuadro);
}

// ----- Sesión con Google (opcional): al ganar se suman puntos -----
(async () => {
  try {
    const m = await import("../compartido/jugador.js");
    sumar = m.sumarPuntos;
    const zona = $("sesion");
    m.alCambiarSesion((u) => {
      zona.innerHTML = "";
      const b = document.createElement("button");
      b.className = "b3d chico txt " + (u ? "b-gris" : "b-azul");
      b.textContent = u ? "Salir" : "👤 Entrar con Google";
      b.addEventListener("click", () => (u ? m.salir() : m.entrar().catch((e) => alert(e.message))));
      zona.appendChild(b);
    });
  } catch (e) {
    $("sesion").textContent = "Sin sesión";
  }
})();

cargar(0);
requestAnimationFrame(cuadro);
