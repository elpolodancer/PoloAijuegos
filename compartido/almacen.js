// Ruta: compartido/almacen.js   (PROYECTO: Portal Juegos)
// Protege el progreso guardado EN EL DISPOSITIVO (localStorage) y avisa con suavidad a quien juega sin sesión.
// No importa Firebase: funciona sin internet. Solo depende de compartido/cola-puntos.js (que tampoco usa Firebase).
// Trae sus PROPIOS estilos (los inyecta al abrir el panel), así que no hace falta tocar ningún .css.
//
//   pedirPersistencia()      pide al navegador que NO borre estos datos por falta de espacio. Devuelve true / false / null (no disponible).
//                            No impide que la persona borre «datos del sitio» a mano; solo evita la limpieza automática.
//   abrirPanelCopias()       ventana con «Guardar copia» (descarga un .json) y «Cargar copia» (lo restaura).
//   exportarCopia()          descarga la copia directamente. Devuelve cuántas claves guardó.
//   leerCopia(archivo)       lee y valida un .json (sin tocar nada todavía). aplicarCopia(datos, modo) lo restaura.
//   invitarASesion({ alAceptar })   aviso pequeño «inicia sesión para no perder tus puntos»: solo si hay puntos pendientes de enviar,
//                            máx. 1 vez por semana (2 semanas si dice «Ahora no»). cerrarInvitacion() lo quita.
//
// Uso en un juego (por ejemplo dentro de crearMenuPausa → extras):
//   { icono: "💾", texto: "Copia de seguridad", alElegir: () => import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()) }
//
// Qué se copia: SOLO las claves de progreso de los juegos, que por convención terminan en _v1, _v2…
// (por ejemplo «rubik_progreso_v1», «puntos_pendientes_v1») más «fondo_madera». Si un juego guarda con otro nombre de clave,
// agrégalo a CLAVES_EXTRA. Para ver qué claves hay: consola del navegador → Object.keys(localStorage).
// OJO: si el portal vive en elpologr.github.io/..., TODOS tus sitios de ese dominio comparten localStorage; por eso se filtra por nombre.

const PATRON_CLAVES = /_v\d+$/;
const CLAVES_EXTRA = ["fondo_madera"];
const EXCLUIR = ["almacen_estado_v1"];          // lo que guarda este mismo módulo (fechas de última copia y de la invitación)
const APP = "poloaijuegos";
const MAX_BYTES = 5 * 1024 * 1024;              // tamaño máximo del archivo de copia
const MAX_VALOR = 2 * 1024 * 1024;              // tamaño máximo de cada clave
const UMBRAL_PUNTOS = 200;                      // puntos pendientes a partir de los cuales se invita a iniciar sesión
const DIAS = 24 * 60 * 60 * 1000;

import { leerCola } from "./cola-puntos.js";

// ----- Estado propio (fechas) -----
const CLAVE_ESTADO = "almacen_estado_v1";
function leerEstado() { try { return JSON.parse(localStorage.getItem(CLAVE_ESTADO)) || {}; } catch (e) { return {}; } }
function guardarEstado(cambios) { try { localStorage.setItem(CLAVE_ESTADO, JSON.stringify({ ...leerEstado(), ...cambios })); } catch (e) {} }

// ----- Claves que entran en la copia -----
const esClaveDeJuego = (k) => typeof k === "string" && !EXCLUIR.includes(k) && (PATRON_CLAVES.test(k) || CLAVES_EXTRA.includes(k));
function claves() {
  const r = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (esClaveDeJuego(k)) r.push(k); } } catch (e) {}
  return r;
}

// ----- Persistencia -----
export async function pedirPersistencia() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch (e) { return null; }
}

// ----- Guardar copia -----
export function exportarCopia() {
  const datos = {};
  for (const k of claves()) { const v = localStorage.getItem(k); if (typeof v === "string") datos[k] = v; }
  const contenido = JSON.stringify({ app: APP, version: 1, fecha: new Date().toISOString(), datos });
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "copia-juegos-" + new Date().toLocaleDateString("sv-SE") + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  guardarEstado({ copia: Date.now() });
  return Object.keys(datos).length;
}

// ----- Cargar copia (dos pasos: leer y validar, luego aplicar) -----
// El archivo es lo que la persona subió: se trata como DATOS NO CONFIABLES. Solo se aceptan texto y claves de juego; nunca se ejecuta nada.
export async function leerCopia(archivo) {
  if (!archivo || archivo.size > MAX_BYTES) throw new Error("El archivo es muy grande o no es válido.");
  let obj;
  try { obj = JSON.parse(await archivo.text()); } catch (e) { throw new Error("El archivo no es una copia válida."); }
  if (!obj || obj.app !== APP || !obj.datos || typeof obj.datos !== "object" || Array.isArray(obj.datos)) {
    throw new Error("Este archivo no es una copia de estos juegos.");
  }
  const datos = {};
  for (const [k, v] of Object.entries(obj.datos)) {
    if (esClaveDeJuego(k) && typeof v === "string" && v.length <= MAX_VALOR) datos[k] = v;
  }
  if (!Object.keys(datos).length) throw new Error("La copia no tiene progreso que restaurar.");
  return datos;
}

const tiempoDe = (texto) => { try { const o = JSON.parse(texto); return o && typeof o.t === "number" ? o.t : null; } catch (e) { return null; } };

// modo "faltantes" (seguro): agrega lo que no existe aquí y, en partidas con «t», se queda con la más reciente. Nunca pisa progreso más nuevo.
// modo "reemplazar": lo de la copia sustituye lo de este dispositivo.
// Devuelve cuántas claves se escribieron. (Al iniciar sesión, cada juego vuelve a unir su progreso con la nube con sus propias reglas.)
export function aplicarCopia(datos, modo = "faltantes") {
  let n = 0;
  for (const [k, v] of Object.entries(datos)) {
    if (!esClaveDeJuego(k)) continue;
    let local = null;
    try { local = localStorage.getItem(k); } catch (e) { continue; }
    let poner = modo === "reemplazar" || local === null;
    if (!poner && modo === "faltantes") {
      const tl = tiempoDe(local), tv = tiempoDe(v);
      poner = tl !== null && tv !== null && tv > tl;
    }
    if (!poner) continue;
    try { localStorage.setItem(k, v); n++; } catch (e) {}
  }
  return n;
}

// ----- Estilos y ventana -----
function inyectarEstilos() {
  if (document.getElementById("alm-estilos")) return;
  const e = document.createElement("style");
  e.id = "alm-estilos";
  e.textContent =
    ".alm-fondo{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);font-family:system-ui,sans-serif}" +
    ".alm-fondo[hidden]{display:none}" +
    ".alm-panel{width:min(420px,100%);max-height:100%;overflow:auto;padding:18px;border-radius:18px;background:#1e2025;color:#f1f2f4;border:1px solid #3b3e46;box-shadow:0 12px 40px rgba(0,0,0,.5)}" +
    ".alm-panel h2{margin:0 0 6px;font-size:1.15rem}" +
    ".alm-panel p{margin:6px 0;color:#b0b4bd;font-size:.9rem;line-height:1.35}" +
    ".alm-panel .alm-fila{display:flex;flex-direction:column;gap:8px;margin-top:12px}" +
    ".alm-btn{padding:11px 14px;font:inherit;font-weight:700;color:#fff;background:#7c5cff;border:0;border-radius:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".alm-btn.sec{background:#3b3e46}.alm-btn.ok{background:#2f9e5f}.alm-btn.peligro{background:#c0392b}" +
    ".alm-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
    ".alm-msg{min-height:1.2em;margin-top:10px;font-size:.9rem;color:#f1f2f4}" +
    ".alm-aviso{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:2147481000;width:min(440px,calc(100% - 100px));padding:12px 14px;border-radius:14px;background:#1e2025;color:#f1f2f4;border:1px solid #7c5cff;box-shadow:0 8px 28px rgba(0,0,0,.45);font-family:system-ui,sans-serif;font-size:.9rem;line-height:1.35}" +
    ".alm-aviso .alm-fila{display:flex;gap:8px;margin-top:10px}.alm-aviso .alm-btn{flex:1;padding:9px 10px}" +
    "@media (max-width:520px){.alm-aviso{width:calc(100% - 100px)}}";
  document.head.appendChild(e);
}
const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };

let panelAbierto = null;
export function abrirPanelCopias() {
  if (panelAbierto) return;
  inyectarEstilos();
  const previo = document.activeElement;

  const fondo = el("div", "alm-fondo");
  fondo.setAttribute("role", "dialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.setAttribute("aria-label", "Copia de seguridad");
  const panel = el("div", "alm-panel");
  const msg = el("div", "alm-msg");
  msg.setAttribute("role", "status");
  const fila = el("div", "alm-fila");
  const entrada = el("input");
  entrada.type = "file";
  entrada.accept = "application/json,.json";
  entrada.hidden = true;

  const cerrar = () => {
    fondo.remove();
    removeEventListener("keydown", tecla, true);
    panelAbierto = null;
    try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
  };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });

  const boton = (texto, clase, fn) => { const b = el("button", "alm-btn " + (clase || ""), texto); b.type = "button"; b.addEventListener("click", fn); return b; };

  function pantallaInicial() {
    fila.replaceChildren(
      boton("💾 Guardar copia en mi dispositivo", "ok", () => {
        const n = exportarCopia();
        msg.textContent = n ? "Listo: se descargó un archivo con tu progreso (" + n + " partidas/ajustes). Guárdalo en un lugar seguro." : "No hay progreso guardado todavía.";
      }),
      boton("📂 Cargar una copia", "", () => entrada.click()),
      boton("Cerrar", "sec", cerrar)
    );
  }
  entrada.addEventListener("change", async () => {
    const archivo = entrada.files && entrada.files[0];
    entrada.value = "";
    if (!archivo) return;
    try {
      const datos = await leerCopia(archivo);
      msg.textContent = "La copia trae " + Object.keys(datos).length + " partidas/ajustes. ¿Cómo la quieres cargar?";
      const hecho = (n) => { msg.textContent = "Listo: se restauraron " + n + ". Recargando…"; fila.replaceChildren(); setTimeout(() => location.reload(), 1200); };
      fila.replaceChildren(
        boton("➕ Agregar solo lo que me falta (recomendado)", "ok", () => hecho(aplicarCopia(datos, "faltantes"))),
        boton("♻️ Reemplazar todo con la copia", "peligro", () => hecho(aplicarCopia(datos, "reemplazar"))),
        boton("Cancelar", "sec", () => { msg.textContent = ""; pantallaInicial(); })
      );
    } catch (e) {
      msg.textContent = e.message || "No se pudo leer el archivo.";
    }
  });

  const ult = leerEstado().copia;
  panel.append(
    el("h2", "", "💾 Copia de seguridad"),
    el("p", "", "Tu progreso se guarda en este dispositivo. Si borras los datos del navegador o cambias de celular se pierde. Con una copia puedes recuperarlo."),
    el("p", "", "La copia es un archivo que se queda en tu dispositivo: no se envía a ningún servidor."),
    el("p", "", ult ? "Última copia: " + new Date(ult).toLocaleString() : "Todavía no has guardado ninguna copia."),
    fila, msg, entrada
  );
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  panelAbierto = fondo;
  pantallaInicial();

  pedirPersistencia().then((p) => {
    if (!panelAbierto) return;
    const t = el("p", "", p === true ? "🛡️ El navegador protege estos datos contra la limpieza automática." : p === false ? "⚠️ El navegador no prometió proteger estos datos: guarda una copia de vez en cuando." : "ℹ️ Este navegador no permite proteger los datos: guarda una copia de vez en cuando.");
    panel.insertBefore(t, fila);
  });
  try { fila.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

// ----- Invitación suave a iniciar sesión -----
let aviso = null;
export function cerrarInvitacion() { if (aviso) { aviso.remove(); aviso = null; } }
export function invitarASesion({ alAceptar } = {}) {
  if (aviso) return;
  const pendientes = leerCola().reduce((s, e) => s + (Number(e.p) || 0), 0);
  if (pendientes < UMBRAL_PUNTOS) return;
  const hasta = Number(leerEstado().invitarDespuesDe) || 0;
  if (Date.now() < hasta) return;
  inyectarEstilos();
  aviso = el("div", "alm-aviso");
  aviso.setAttribute("role", "status");
  const silenciar = (dias) => { guardarEstado({ invitarDespuesDe: Date.now() + dias * DIAS }); cerrarInvitacion(); };
  const si = el("button", "alm-btn ok", "Iniciar sesión"); si.type = "button";
  const no = el("button", "alm-btn sec", "Ahora no"); no.type = "button";
  si.addEventListener("click", () => { silenciar(7); if (alAceptar) alAceptar(); });
  no.addEventListener("click", () => silenciar(14));
  const fila = el("div", "alm-fila"); fila.append(si, no);
  aviso.append(el("div", "", "Tienes " + pendientes + " puntos guardados solo en este dispositivo. Inicia sesión con Google para no perderlos."), fila);
  document.body.appendChild(aviso);
  guardarEstado({ invitarDespuesDe: Date.now() + 7 * DIAS }); // aunque lo ignore, no vuelve a salir en una semana
}
