// Ruta: guerrerodepuntos/juego.js
// Devorador: saltas de zona en zona; vences enemigos de nivel menor al tuyo y te quedas con su nivel.
import { NIVELES, NIVEL_INICIAL } from "./niveles.js";

// true: atacar a un enemigo igual o más fuerte te hace perder. false: solo te avisa y no te mueves.
const MUERTE_AL_ATACAR_FUERTE = true;

const W = 360, H = 600, RADIO = 32, DURACION_SALTO = 300;
const cv = document.getElementById("lienzo");
const ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);
const EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

let idx = 0, zonas, enlaces, salida, jug, estado, anim, flotantes, aviso, avisoHasta, sumar = null;

function cargar(i) {
  idx = i;
  const n = NIVELES[i];
  zonas = n.zonas.map((z) => ({ ...z }));
  enlaces = n.enlaces;
  salida = n.salida;
  jug = { zona: 0, nivel: NIVEL_INICIAL, x: zonas[0].x, y: zonas[0].y, salto: 0 };
  estado = "jugando";
  anim = null;
  flotantes = [];
  aviso = n.pista || "";
  avisoHasta = performance.now() + 5000;
  $("accion").hidden = true;
  actualizarEstado();
}

function actualizarEstado() {
  const n = NIVELES[idx];
  $("estado").textContent = "Nivel " + (idx + 1) + ": " + n.nombre + " · Tu nivel: " + jug.nivel;
}

const unidas = (a, b) => enlaces.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
function decir(t, ms = 2200) { aviso = t; avisoHasta = performance.now() + ms; }

function zonaEn(px, py) {
  let mejor = -1, dmin = RADIO + 10;
  zonas.forEach((z, i) => {
    const d = Math.hypot(z.x - px, z.y - py);
    if (d < dmin) { dmin = d; mejor = i; }
  });
  return mejor;
}

function tocar(e) {
  if (estado !== "jugando" || anim) return;
  const r = cv.getBoundingClientRect();
  const i = zonaEn((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
  if (i < 0 || i === jug.zona) return;
  if (!unidas(jug.zona, i)) return decir("Solo puedes saltar a zonas unidas por un puente.");
  const e2 = zonas[i].enemigo;
  if (e2 != null && jug.nivel <= e2 && !MUERTE_AL_ATACAR_FUERTE) return decir("¡Ese enemigo es demasiado fuerte para ti!");
  anim = { de: { x: jug.x, y: jug.y }, a: i, t0: performance.now() };
}

function llegar(i) {
  jug.zona = i;
  const z = zonas[i];
  if (z.enemigo != null) {
    if (jug.nivel > z.enemigo) {
      flotantes.push({ x: z.x, y: z.y - 40, texto: "+" + z.enemigo, t0: performance.now() });
      jug.nivel += z.enemigo;
      delete z.enemigo;
      actualizarEstado();
    } else {
      estado = "perdido";
      decir("Te venció un enemigo de nivel " + z.enemigo + ".", 99999);
      $("accion").textContent = "Reintentar";
      $("accion").hidden = false;
      return;
    }
  }
  if (i === salida) {
    estado = "ganado";
    const hay = idx + 1 < NIVELES.length;
    decir(hay ? "¡Nivel superado con nivel " + jug.nivel + "!" : "¡Completaste todos los niveles!", 99999);
    $("accion").textContent = hay ? "Siguiente nivel" : "Jugar de nuevo";
    $("accion").hidden = false;
    if (sumar) sumar("guerrerodepuntos", jug.nivel).catch(() => {});
  }
}

$("accion").addEventListener("click", () => {
  if (estado === "ganado") cargar(idx + 1 < NIVELES.length ? idx + 1 : 0);
  else cargar(idx);
});
$("reiniciar").addEventListener("click", () => cargar(idx));
cv.addEventListener("pointerdown", tocar);

// ----- Dibujo -----
function texto(t, x, y, tam, color, peso = "700") {
  ctx.font = peso + " " + tam + "px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}
function emoji(e, x, y, tam) {
  ctx.font = tam + "px " + EMOJI;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(e, x, y);
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

function dibujar(ahora) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0e1a33");
  g.addColorStop(1, "#1d3b55");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Puentes (los que salen de tu zona se resaltan)
  enlaces.forEach(([a, b]) => {
    const za = zonas[a], zb = zonas[b];
    const activo = estado === "jugando" && (a === jug.zona || b === jug.zona);
    ctx.lineCap = "round";
    ctx.strokeStyle = activo ? "#d9b26b" : "#6b5a3c";
    ctx.lineWidth = activo ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(za.x, za.y); ctx.lineTo(zb.x, zb.y); ctx.stroke();
  });

  // Zonas
  zonas.forEach((z, i) => {
    const esSalida = i === salida;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(z.x, z.y + 10, RADIO + 4, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esSalida ? "#f2c94c" : i === 0 ? "#5aa9e6" : "#4f9d5d";
    ctx.beginPath(); ctx.ellipse(z.x, z.y + 4, RADIO, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esSalida ? "#fbe69a" : i === 0 ? "#8cc7f0" : "#7bc48a";
    ctx.beginPath(); ctx.ellipse(z.x, z.y, RADIO, RADIO * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    if (esSalida) emoji("🏁", z.x, z.y - 6, 30);
  });

  // Enemigos
  zonas.forEach((z, i) => {
    if (z.enemigo == null) return;
    const mas = jug.nivel > z.enemigo;
    const tam = 26 + Math.min(z.enemigo, 40) * 0.6;
    const bob = Math.sin(ahora / 350 + i) * 3;
    emoji("👾", z.x, z.y - 18 + bob, tam);
    insignia(String(z.enemigo), z.x, z.y + 8, mas ? "#2e9e55" : "#c9373f");
  });

  // Jugador
  const salto = Math.sin(jug.salto * Math.PI) * 34;
  emoji("🐲", jug.x, jug.y - 20 - salto, 34);
  insignia(String(jug.nivel), jug.x, jug.y + 8 - salto * 0.2, "#3b6fe0");

  // Textos flotantes (+N)
  flotantes = flotantes.filter((f) => ahora - f.t0 < 900);
  flotantes.forEach((f) => {
    const p = (ahora - f.t0) / 900;
    ctx.globalAlpha = 1 - p;
    texto(f.texto, f.x, f.y - p * 40, 28, "#ffe066");
    ctx.globalAlpha = 1;
  });

  // Aviso
  if (aviso && ahora < avisoHasta) {
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.roundRect(20, H - 56, W - 40, 40, 12); ctx.fill();
    texto(aviso, W / 2, H - 36, 13, "#fff", "600");
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
  dibujar(ahora);
  requestAnimationFrame(cuadro);
}

// ----- Sesión con Google (opcional): al ganar se suma tu nivel final como puntos -----
(async () => {
  try {
    const m = await import("../compartido/jugador.js");
    sumar = m.sumarPuntos;
    const zona = $("sesion");
    m.alCambiarSesion((u) => {
      zona.innerHTML = "";
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = u ? "Salir" : "Entrar con Google";
      b.addEventListener("click", () => (u ? m.salir() : m.entrar().catch((e) => alert(e.message))));
      zona.appendChild(b);
    });
  } catch (e) {
    $("sesion").textContent = "Sin sesión";
  }
})();

cargar(0);
requestAnimationFrame(cuadro);
