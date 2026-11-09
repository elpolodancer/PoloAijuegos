// Ruta: compartido/menu-pausa.js
// MENÚ DE PAUSA ESTÁNDAR de todos los juegos. El botón ☰ (arriba a la izquierda, bajo «🎮 Juegos») abre una ventana con:
//     ▶ Continuar          (siempre primero)
//     … opciones propias del juego (por ejemplo «💾 Guardar progreso de este nivel y salir»)
//     🚪 Salir             (siempre al final)
// No importa Firebase ni nada más: funciona sin internet. Necesita compartido/inmersivo.css (botones .b3d y estilos .pausa-*).
//
// Uso en un juego:
//   import { crearMenuPausa } from "../compartido/menu-pausa.js";
//   const pausa = crearMenuPausa({
//     boton: document.getElementById("btn-menu"),   // opcional: el ☰; al pulsarlo se abre la pausa
//     puedeAbrir: () => estoyJugando,               // opcional: si devuelve false ni el botón ni la tecla Esc abren la pausa
//     alAbrir:     () => { /* congela el reloj, la física y las animaciones */ },
//     alContinuar: () => { /* los reanuda */ },
//     extras: () => [                               // opcional: opciones entre «Continuar» y «Salir» (se recalculan cada vez que se abre)
//       { icono: "💾", texto: "Guardar progreso y salir", clase: "b-oro", ayuda: "texto pequeño debajo", deshabilitado: false, alElegir: guardarYSalir },
//     ],
//     alSalir: () => { /* vuelve al menú principal del juego */ },
//     // más opciones: titulo ("Pausa"), textoContinuar ("Continuar"), textoSalir ("Salir"),
//     //               ayudaSalir (texto o función que lo devuelve: aviso de lo que se pierde), tecla (false = sin Esc)
//   });
//   pausa.abrir();  pausa.cerrar();  pausa.abierto();
//
// Reglas:
// - «alContinuar» solo se llama si la persona elige Continuar, toca fuera de la ventana o pulsa Esc. Si elige «Salir» o una opción
//   extra, el juego decide qué hacer en «alSalir» / «alElegir» (y ahí mismo debe soltar la pausa que puso en «alAbrir»).
// - Dentro de una partida el botón ☰ se rotula «☰ Pausa»; en las pantallas sin partida (menús, listas de niveles) no hay nada que
//   pausar, así que el ☰ ahí vuelve directo al menú principal y no usa este módulo. En el menú principal del juego el ☰ no se muestra.
// - Teclado: Esc abre y cierra; Tab se queda dentro de la ventana. No usa confirm(): todo ocurre dentro de la página.

export function crearMenuPausa(o = {}) {
  const puedeAbrir = () => (o.puedeAbrir ? !!o.puedeAbrir() : true);

  const fondo = document.createElement("div");
  fondo.className = "pausa-fondo";
  fondo.hidden = true;
  fondo.setAttribute("role", "dialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.setAttribute("aria-label", o.titulo || "Pausa");
  const panel = document.createElement("div");
  panel.className = "pausa-panel";
  const h = document.createElement("h2");
  h.textContent = "⏸️ " + (o.titulo || "Pausa");
  const lista = document.createElement("div");
  lista.className = "pausa-opciones";
  panel.append(h, lista);
  fondo.appendChild(panel);
  (document.body || document.documentElement).appendChild(fondo);

  let previo = null; // lo que tenía el foco antes de abrir

  function opcion(icono, texto, clase, fn, { deshabilitado = false, ayuda = "" } = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + clase;
    b.disabled = !!deshabilitado;
    const i = document.createElement("span"); i.className = "b-ico"; i.textContent = icono;
    const t = document.createElement("span"); t.textContent = texto;
    b.append(i, t);
    b.addEventListener("click", fn);
    lista.appendChild(b);
    if (ayuda) {
      const p = document.createElement("small");
      p.className = "pausa-ayuda";
      p.textContent = ayuda;
      lista.appendChild(p);
    }
    return b;
  }

  function construir() {
    lista.replaceChildren();
    const primero = opcion("▶", o.textoContinuar || "Continuar", "b-verde", () => cerrar(true));
    for (const x of (o.extras ? o.extras() : [])) {
      if (!x) continue;
      opcion(x.icono || "•", x.texto, x.clase || "b-azul", () => { cerrar(false); if (x.alElegir) x.alElegir(); }, x);
    }
    const ay = typeof o.ayudaSalir === "function" ? o.ayudaSalir() : o.ayudaSalir || "";
    opcion("🚪", o.textoSalir || "Salir", "b-rojo", () => { cerrar(false); if (o.alSalir) o.alSalir(); }, { ayuda: ay });
    return primero;
  }

  function abrir() {
    if (!fondo.hidden || !puedeAbrir()) return;
    if (o.alAbrir) o.alAbrir();
    previo = document.activeElement;
    const primero = construir();
    fondo.hidden = false;
    try { primero.focus({ preventScroll: true }); } catch (e) {}
  }
  function cerrar(reanudar) {
    if (fondo.hidden) return;
    fondo.hidden = true;
    try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
    if (reanudar && o.alContinuar) o.alContinuar();
  }

  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(true); });
  fondo.addEventListener("keydown", (e) => { // Tab no se sale de la ventana
    if (e.key !== "Tab") return;
    const bs = [...fondo.querySelectorAll("button:not(:disabled)")];
    if (!bs.length) return;
    const i = bs.indexOf(document.activeElement);
    const sig = e.shiftKey ? (i <= 0 ? bs.length - 1 : i - 1) : (i < 0 || i === bs.length - 1 ? 0 : i + 1);
    e.preventDefault();
    bs[sig].focus();
  });
  if (o.tecla !== false) {
    addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || e.repeat) return;
      if (!fondo.hidden) { e.preventDefault(); cerrar(true); }
      else if (puedeAbrir()) { e.preventDefault(); abrir(); }
    });
  }
  if (o.boton) o.boton.addEventListener("click", abrir);

  return { abrir, cerrar: () => cerrar(true), abierto: () => !fondo.hidden };
}
