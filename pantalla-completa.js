// Ruta: compartido/pantalla-completa.js
// Botón flotante ⛶ para ver cualquier página en pantalla completa (solo en dispositivos táctiles).
// Uso: añade esta línea al final del <body> de cada index.html:
//   <script type="module" src="../compartido/pantalla-completa.js"></script>      (juegos)
//   <script type="module" src="compartido/pantalla-completa.js"></script>         (portal, en la raíz)

// ----- Ajustes -----
const POSICION = { abajo: 10, derecha: 10 }; // distancia en px desde la esquina (cámbiala si tapa algo de un juego)
const TAMANO = 38;                            // tamaño del botón en px

const raiz = document.documentElement;
const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
const salirFn = document.exitFullscreen || document.webkitExitFullscreen;
const activa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

const tactil = matchMedia("(pointer: coarse)").matches;
const instalada = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
const esIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Solo en móvil/tablet y si la app no está ya instalada (ahí ya va a pantalla completa)
if (tactil && !instalada && (pedir || esIos)) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", "Pantalla completa");
  b.style.cssText =
    "position:fixed;z-index:2147483000;display:flex;align-items:center;justify-content:center;" +
    "width:" + TAMANO + "px;height:" + TAMANO + "px;border-radius:50%;border:1px solid rgba(255,255,255,.35);" +
    "background:rgba(27,35,48,.65);color:#fff;font-size:20px;line-height:1;padding:0;cursor:pointer;opacity:.7;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "bottom:calc(" + POSICION.abajo + "px + env(safe-area-inset-bottom,0px));" +
    "right:calc(" + POSICION.derecha + "px + env(safe-area-inset-right,0px));";

  const icono = () => (b.textContent = activa() ? "✕" : "⛶");
  icono();

  b.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (!pedir) {
        // iPhone: Safari no permite pantalla completa en páginas; solo instalada en la pantalla de inicio
        alert("En iPhone: toca Compartir y luego «Agregar a pantalla de inicio». Al abrirla desde ahí se ve a pantalla completa.");
        return;
      }
      if (activa()) await salirFn.call(document);
      else await pedir.call(raiz);
    } catch (err) {}
    icono();
  });
  document.addEventListener("fullscreenchange", icono);
  document.addEventListener("webkitfullscreenchange", icono);
  document.body.appendChild(b);
}
