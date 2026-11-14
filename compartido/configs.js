// Ruta: compartido/configs.js
// Enlaces y ajustes comunes de los juegos. Aquí NUNCA van claves secretas (la key de imgbb vive en el Apps Script).

// Apps Script que sube imágenes a imgbb (verifica la sesión de Google antes de subir). Lo usa «rompecabezas».
export const URL_SUBIDA_IMAGENES =
  "https://script.google.com/macros/s/AKfycbxeGwMruHkLgUh7GZilmYGLw4VxholicNVXcnyvnn7NV8F_U10kNeK2AqLqJmEBehU/exec";

// Hoja de Google Sheets «Polo Ai Juegos». Todavía no la usa ningún juego; queda disponible por si hace falta
// (por ejemplo, registrar subidas o guardar ligas desde un Apps Script). Si se usa, anotarlo en el README.
export const HOJA_JUEGOS =
  "https://docs.google.com/spreadsheets/d/1Mnj5F1thkBRwR2wOsqBX8qwsaD8SX6DrX7hhG2zu9Lg/edit";

// ----- Administrador del portal -----
// Únicos correos con permisos de administrador. También están escritos en firestore-unificado.rules (función esAdmin):
// si cambias uno aquí, cámbialo allá. Un correo NO es un secreto; lo que protege es que Google verifica que la sesión es de ese correo.
export const ADMINISTRADORES = ["dulceprincesa086@gmail.com"];

// ¿Esta sesión es de un administrador? (usuario = el de alCambiarSesion / auth.currentUser)
export function esAdmin(usuario) {
  const c = usuario && typeof usuario.email === "string" ? usuario.email.toLowerCase() : "";
  return !!c && usuario.emailVerified !== false && ADMINISTRADORES.includes(c);
}

// ¿Mostrar los botones de trampas (+1000 puntos, etc.)? Sí si eres administrador con sesión, o si en ESTE dispositivo activaste el
// «modo pruebas» (para probar sin internet cuando la sesión se cerró): en la consola del navegador, una sola vez:
//     localStorage.setItem("modo_pruebas", "1")        (para quitarlo: localStorage.removeItem("modo_pruebas"))
// Esto solo decide si se VEN los botones. La protección real está en el servidor: los puntos de juegos en desarrollo nunca
// suman al total de nadie, y solo el administrador puede escribir en «totalPrueba» (ver jugador.js y las reglas).
export function modoPruebas(usuario) {
  try { if (localStorage.getItem("modo_pruebas") === "1") return true; } catch (e) {}
  return esAdmin(usuario);
}
