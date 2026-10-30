// Ruta: compartido/configs.js
// Enlaces y ajustes comunes de los juegos. Aquí NUNCA van claves secretas (la key de imgbb vive en el Apps Script).

// Apps Script que sube imágenes a imgbb (verifica la sesión de Google antes de subir). Lo usa «rompecabezas».
export const URL_SUBIDA_IMAGENES =
  "https://script.google.com/macros/s/AKfycbxeGwMruHkLgUh7GZilmYGLw4VxholicNVXcnyvnn7NV8F_U10kNeK2AqLqJmEBehU/exec";

// Hoja de Google Sheets «Polo Ai Juegos». Todavía no la usa ningún juego; queda disponible por si hace falta
// (por ejemplo, registrar subidas o guardar ligas desde un Apps Script). Si se usa, anotarlo en el README.
export const HOJA_JUEGOS =
  "https://docs.google.com/spreadsheets/d/1Mnj5F1thkBRwR2wOsqBX8qwsaD8SX6DrX7hhG2zu9Lg/edit";
