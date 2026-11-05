// Apps Script: intermediario seguro entre el juego y imgbb.
// Las claves viven en Propiedades del script (Configuración del proyecto → Propiedades del script), NUNCA en el código:
//   IMGBB_KEY         → tu API key de imgbb (genera una NUEVA)
//   FIREBASE_API_KEY  → la apiKey de tu proyecto Firebase (la de compartido/firebase.js)
//   CORREOS_PERMITIDOS (opcional) → correos separados por coma; si existe, solo ellos pueden subir
//
// Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo   |   Quién tiene acceso: Cualquier persona
// (el acceso es público, pero el código exige un token de sesión de Google/Firebase válido)

const MAX_BASE64 = 6 * 1024 * 1024; // ~4.5 MB de imagen
const MAX_POR_HORA = 10;            // subidas por usuario por hora

function doGet() {
  return salida({ ok: true, mensaje: "Servicio activo" });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const usuario = verificarToken(d.token);
    limitar(usuario.uid);

    const img = d.imagen;
    if (typeof img !== "string" || img.length < 100 || img.length > MAX_BASE64) throw new Error("Imagen inválida o muy grande");
    if (!esJpegOWebp(img)) throw new Error("Solo se aceptan imágenes JPEG o WebP");

    const r = UrlFetchApp.fetch("https://api.imgbb.com/1/upload", {
      method: "post",
      payload: { key: prop("IMGBB_KEY"), image: img },
      muteHttpExceptions: true,
    });
    const j = JSON.parse(r.getContentText());
    if (r.getResponseCode() !== 200 || !j.success) throw new Error("imgbb rechazó la imagen");

    return salida({ ok: true, url: j.data.url });
  } catch (err) {
    return salida({ ok: false, error: String(err.message || err) });
  }
}

// JPEG empieza con FF D8 FF; WebP con "RIFF" + 4 bytes de tamaño + "WEBP"
function esJpegOWebp(b64) {
  if (b64.startsWith("/9j/")) return true;
  if (!b64.startsWith("UklGR")) return false;
  const b = Utilities.base64Decode(b64.substring(0, 16));
  return String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP";
}

function verificarToken(token) {
  if (!token || typeof token !== "string") throw new Error("Falta iniciar sesión");
  const r = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + prop("FIREBASE_API_KEY"),
    { method: "post", contentType: "application/json", payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true }
  );
  if (r.getResponseCode() !== 200) throw new Error("Sesión no válida");
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  if (!u) throw new Error("Sesión no válida");

  const permitidos = PropertiesService.getScriptProperties().getProperty("CORREOS_PERMITIDOS");
  if (permitidos) {
    const lista = permitidos.split(",").map((s) => s.trim().toLowerCase());
    if (!u.email || lista.indexOf(u.email.toLowerCase()) === -1) throw new Error("No tienes permiso para subir imágenes");
  }
  return { uid: u.localId, email: u.email };
}

function limitar(uid) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const cache = CacheService.getScriptCache();
    const k = "subidas_" + uid;
    const n = Number(cache.get(k) || 0);
    if (n >= MAX_POR_HORA) throw new Error("Demasiadas subidas, intenta más tarde");
    cache.put(k, String(n + 1), 3600);
  } finally {
    lock.releaseLock();
  }
}

function prop(nombre) {
  const v = PropertiesService.getScriptProperties().getProperty(nombre);
  if (!v) throw new Error("Falta configurar " + nombre);
  return v;
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
