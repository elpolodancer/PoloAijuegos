// Ruta: 1slither/instalar-1slither.js
// Instalar SOLO Slither como app (manifest-1slither.webmanifest + sw-1slither.js; no baja ningún otro juego del portal). Estándar 13.9 de ESTANDARES-juegos.md.
// - Registra el service worker propio (alcance: esta carpeta).
// - ES_APP_SOLA = abierto desde SU PROPIO icono instalado (start_url trae «?app=1»): ahí el portal no existe, así que se oculta «🎮 Portal de Juegos».
// - Ya NO crea un botón en un menú principal (ya no existe): exporta puedeInstalar() e instalar(), y juego-1slither.js agrega «📲 Instalar solo este juego» a ☰ Pausa.
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
let yaInstalada = false;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); evento = e; });
addEventListener("appinstalled", () => { evento = null; yaInstalada = true; });

// ¿Tiene sentido ofrecer «Instalar»? No dentro de una app ya instalada ni después de instalarla
export const puedeInstalar = () => !instalada() && !yaInstalada;

// Intenta instalar y devuelve el mensaje que se le muestra a la persona («» = no hay nada que decir)
export async function instalar() {
  if (evento) {
    const e = evento; evento = null;
    e.prompt();
    const r = await e.userChoice.catch(() => null);
    return r && r.outcome === "accepted" ? "✅ Listo: busca «Slither» en tu pantalla de inicio." : "";
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
  return ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
    : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
    : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.";
}
