// Ruta: compartido/pantalla-completa.js
// Pantalla completa para cualquier página, en PC y en Android (en iPhone/iPad no existe, así que no se muestra nada).
// Uso: añade esta línea al final del <body> de cada index:
//   <script type="module" src="../compartido/pantalla-completa.js"></script>      (juegos)
//   <script type="module" src="compartido/pantalla-completa.js"></script>         (portal, en la raíz)
// Opcional en <body>:
//   data-pantalla-auto            → entra a pantalla completa solo con el primer toque/clic o tecla (el navegador exige un gesto)
//   data-pantalla-auto="horizontal" → además intenta poner la pantalla en horizontal (solo Android)
// Aparece un botón ⛶/✕ pequeño abajo a la derecha para entrar o salir cuando quieras.

// ----- Ajustes -----
const POSICION = { abajo: 14, derecha: 10 }; // distancia en px desde la esquina
const TAMANO = 40;                            // tamaño del botón en px

const raiz = document.documentElement;
const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
const salirFn = document.exitFullscreen || document.webkitExitFullscreen;
const activa = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

const instalada = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;

// Solo si el navegador lo permite (iOS no) y la app no está ya instalada (ahí ya va a pantalla completa)
if (pedir && !instalada) {
  const auto = document.body.dataset.pantallaAuto;
  const horizontal = async () => {
    if (auto !== "horizontal" || !(screen.orientation && screen.orientation.lock)) return;
    try { await screen.orientation.lock("landscape"); } catch (e) {} // solo funciona en Android y ya en pantalla completa
  };

  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", "Pantalla completa");
  b.style.cssText =
    "position:fixed;z-index:2147483000;display:flex;align-items:center;justify-content:center;" +
    "width:" + TAMANO + "px;height:" + TAMANO + "px;border-radius:13px;border:2px solid #4f5662;" +
    "background:linear-gradient(180deg,#d5d9e0,#8b93a0 60%,#4f5662 140%);color:#fff;font-size:20px;line-height:1;padding:0;cursor:pointer;" +
    "box-shadow:0 4px 0 #4f5662,0 6px 8px rgba(0,0,0,.4),inset 0 2px 0 rgba(255,255,255,.6);text-shadow:0 2px 0 rgba(0,0,0,.35);" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "bottom:calc(" + POSICION.abajo + "px + env(safe-area-inset-bottom,0px));" +
    "right:calc(" + POSICION.derecha + "px + env(safe-area-inset-right,0px));";

  const icono = () => (b.textContent = activa() ? "✕" : "⛶");
  icono();

  const entrar = async () => {
    try { await pedir.call(raiz); await horizontal(); } catch (err) {}
    icono();
  };

  b.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      if (activa()) await salirFn.call(document);
      else await entrar();
    } catch (err) {}
    icono();
  });
  document.addEventListener("fullscreenchange", icono);
  document.addEventListener("webkitfullscreenchange", icono);
  document.body.appendChild(b);

  // Entrada automática: una sola vez, así quien salga a propósito no es devuelto a la fuerza
  if (auto !== undefined) {
    const primera = () => {
      removeEventListener("click", primera, true);
      removeEventListener("keydown", primera, true);
      if (!activa()) entrar();
    };
    addEventListener("click", primera, true);
    addEventListener("keydown", primera, true);
  }
}
