// Ruta: 1slither/instalar-1slither.js
// Instalar SOLO Slither como app (manifest-1slither.webmanifest + sw-1slither.js; no baja ningún otro juego del portal). Estándar 13.9 de ESTANDARES-juegos.md.
// - Registra el service worker propio (alcance: esta carpeta).
// - ES_APP_SOLA = abierto desde SU PROPIO icono instalado (start_url trae «?app=1»): ahí el portal no existe, así que se oculta «🎮 Portal de Juegos».
// - Agrega «📲 Instalar solo este juego» al menú principal (no sale si ya está instalada ni dentro de una app instalada).
// No toca el juego: si este archivo falla, Slither funciona igual.
const $ = (id) => document.getElementById(id);
const instalada = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;

const ES_APP_SOLA = (() => {
  try { if (new URLSearchParams(location.search).has("app")) sessionStorage.setItem("slither_app", "1"); } catch (e) {}
  let marca = false; try { marca = sessionStorage.getItem("slither_app") === "1"; } catch (e) {}
  return marca && instalada();
})();
if (ES_APP_SOLA && $("btn-portal")) $("btn-portal").hidden = true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-1slither.js", { scope: "./" }).catch(() => {});

let evento = (window.__pwa && window.__pwa.evento) || null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); evento = e; });

const columna = document.querySelector("#menu .menu-columna");
if (columna && !instalada()) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt b-azulmarino";
  b.id = "m-instalar";
  const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = "📲";
  b.append(ico, document.createTextNode("\u00a0Instalar solo este juego"));
  const nota = document.createElement("p");
  nota.className = "nota"; nota.setAttribute("role", "status"); nota.hidden = true;
  const decir = (m) => { nota.textContent = m; nota.hidden = !m; };
  columna.append(b, nota);

  addEventListener("appinstalled", () => { evento = null; b.hidden = true; decir("✅ Listo: busca «Slither» en tu pantalla de inicio."); });
  b.addEventListener("click", async () => {
    if (evento) { const e = evento; evento = null; e.prompt(); await e.userChoice.catch(() => {}); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
    decir(ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
      : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
      : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.");
  });
}
