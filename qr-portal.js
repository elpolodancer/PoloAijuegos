// PROYECTO: Portal Juegos · Ruta: compartido/qr-portal.js
// Dibuja el QR del portal con el logo en el centro (canvas, sin internet y sin servicios externos) y lo descarga como PNG.
// Usa compartido/qr-generador.js (librería «qrcode-generator» de Kazuhiko Arase, licencia MIT, incluida tal cual).
//
//   dibujarQR(canvas, { url, logo, tam })   pinta el QR en un <canvas>. Devuelve la URL codificada.
//   descargarQR()                           baja un PNG grande (1024 px) listo para imprimir o compartir.
//   copiarEnlace()                          copia la dirección del portal. Devuelve true / false.
//   urlPortal()                             la dirección que lleva el QR.
//
// El QR es FIJO: lleva siempre la misma dirección. Si dejas URL_PORTAL vacío usa la dirección desde la que se abre el portal
// (sin «?…» ni «#…» ni «index.html»), que mientras el portal viva en el mismo sitio es siempre la misma. Si algún día cambia
// de dirección, escríbela aquí (y vuelve a descargar el PNG si lo habías impreso).
import qrcode from "./qr-generador.js";

// ----- Ajustes -----
const URL_PORTAL = "";                 // p. ej. "https://elpologr.github.io/NOMBRE-DEL-REPO/"  (con la barra final)
const COLOR = "#0b0d3d";               // azul oscuro del logo (se lee mejor que el negro puro sobre el logo)
const FRACCION_LOGO = 0.22;            // ancho del logo / ancho del QR. Con corrección «H» el QR se lee aunque se tape hasta ~30 %
const LOGO = new URL("../imagenes/logo-portal.webp", import.meta.url).href;
// -------------------

export function urlPortal() {
  if (URL_PORTAL) return URL_PORTAL;
  return location.origin + location.pathname.replace(/index\.html$/, "");
}

function cargarImagen(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("logo"));
    i.src = src;
  });
}

export async function dibujarQR(canvas, { url = urlPortal(), logo = LOGO, tam = 512 } = {}) {
  const qr = qrcode(0, "H"); // tipo automático, corrección de errores alta
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount(), borde = 4;
  const celda = Math.max(2, Math.floor(tam / (n + borde * 2))); // casillas enteras: bordes nítidos
  const lado = celda * (n + borde * 2);
  canvas.width = canvas.height = lado;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, lado, lado);
  g.fillStyle = COLOR;
  for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) g.fillRect((c + borde) * celda, (f + borde) * celda, celda, celda);
  try { // el logo es un adorno: si no carga, el QR queda igual de válido
    const img = await cargarImagen(logo);
    const w = Math.round(lado * FRACCION_LOGO), cx = lado / 2;
    g.beginPath(); g.arc(cx, cx, w / 2 + celda, 0, Math.PI * 2);
    g.fillStyle = "#fff"; g.fill();
    g.drawImage(img, cx - w / 2, cx - w / 2, w, w);
  } catch (e) {}
  return url;
}

export async function descargarQR() {
  const c = document.createElement("canvas");
  await dibujarQR(c, { tam: 1024 });
  const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
  if (!blob) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "qr-portal-juegos-el-polo.png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return true;
}

export async function copiarEnlace() {
  try { await navigator.clipboard.writeText(urlPortal()); return true; } catch (e) { return false; }
}
