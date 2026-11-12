// Ruta: torrepasteles/juego-torrepasteles.js
// TORRE DE PASTELES (estilo «apilar pasteles» de Talking Angela): un pastel se acerca a una torre cuadrada en el centro,
// hay que detenerlo lo más centrado posible y lo que sobresale se corta, así que el pastel de arriba queda más chico.
//
// POR AHORA SOLO ESTÁ EL MENÚ PRINCIPAL (estándar del portal):
//   • Mapa de México y del mundo con agua (compartido/mapa-niveles.js): 22 600 niveles (100 por estado y por país), todavía sin niveles.
//   • «♾️ Partida libre» (primer botón) → elegir entre 5 dificultades. La partida en sí se programa en el siguiente paso:
//     ver iniciarPartida() más abajo.
// No usa Firebase ni red: funciona sin internet. Todavía no da puntos ni monedas.

import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const ID = "torrepasteles";                 // id del juego (el mismo de juegos.js)
const CLAVE_PROGRESO = ID + "_progreso_v1"; // { max, hecho }: nivel más alto abierto y más alto terminado
const CLAVE_MARCAS = ID + "_marcas_v1";     // { "1": pisos, … "5": pisos }: récord de la partida libre por dificultad
const CLAVE_DIF = ID + "_dificultad";       // última dificultad elegida

// 100 niveles por estado de México y por país = 226 × 100 = 22 600 niveles
const ETAPAS = crearEtapas({ porEtapa: 100 });

// Dificultades de la partida libre (de menor a mayor: el color sigue el estándar de los botones)
export const DIFICULTADES = [
  { id: 1, nombre: "Muy fácil", icono: "🍰", clase: "b-verde", texto: "Pastel lento" },
  { id: 2, nombre: "Fácil", icono: "🧁", clase: "b-azul", texto: "Pastel tranquilo" },
  { id: 3, nombre: "Normal", icono: "🎂", clase: "b-morado", texto: "Velocidad media" },
  { id: 4, nombre: "Difícil", icono: "🔥", clase: "b-oro", texto: "Pastel rápido" },
  { id: 5, nombre: "Experto", icono: "👑", clase: "b-rojo", texto: "Pastel veloz" },
];

// ---------- Utilidades ----------
const h = (tag, clase, texto) => {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
};
const leerJSON = (clave) => { try { const v = JSON.parse(localStorage.getItem(clave)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
const guardar = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (e) {} };

function progreso() {
  const p = leerJSON(CLAVE_PROGRESO);
  return { max: Math.max(1, Math.floor(Number(p.max)) || 1), hecho: Math.max(0, Math.floor(Number(p.hecho)) || 0) };
}
const record = (dif) => Math.max(0, Math.floor(Number(leerJSON(CLAVE_MARCAS)[dif.id])) || 0);

// ---------- Estilos propios del menú (los del mapa y los botones vienen de compartido/) ----------
const estilo = h("style");
estilo.textContent = `
.td-sel{position:fixed;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;gap:8px;overflow-y:auto;-webkit-overflow-scrolling:touch;
  color:var(--txt-fondo,#4a2a10);font-family:system-ui,sans-serif;text-align:center;
  padding:max(10px,env(safe-area-inset-top)) max(160px,env(safe-area-inset-right)) 14px max(160px,env(safe-area-inset-left))}
.td-sel[hidden]{display:none}
@media (max-aspect-ratio:1/1){.td-sel{padding:calc(104px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) calc(66px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}}
.td-sel h2{margin:0;font-size:1.4rem;text-shadow:var(--sombra-txt,none)}
.td-sel p{margin:0 0 4px;font-size:.85rem;color:var(--txt-fondo-suave,#6b4423);text-shadow:var(--sombra-txt,none)}
.td-lista{display:flex;flex-direction:column;gap:10px;width:100%;max-width:420px;margin:auto 0;padding:4px 4px 8px}
.td-dif.b3d{width:100%;height:auto;min-height:68px;padding:8px 16px;justify-content:flex-start;gap:14px;text-align:left;white-space:normal;line-height:1.2}
.td-dif .b-ico{font-size:1.6rem}
.td-dif .td-t{position:relative;display:flex;flex-direction:column;gap:1px;min-width:0}
.td-dif b{font-size:17px}
.td-dif small{font-size:12px;font-weight:600;opacity:.95}
.td-aviso{position:fixed;z-index:8;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:calc(100% - 150px);padding:8px 16px;
  text-align:center;font-size:.9rem;color:#f1f2f4;background:rgba(10,10,12,.85);border:2px solid #121316;border-radius:16px;box-shadow:0 4px 0 #0c0d0f,0 8px 16px rgba(0,0,0,.4)}
.td-aviso[hidden]{display:none}
.td-info p{margin:0 0 10px;text-align:left;font-size:.92rem;line-height:1.35;color:#d7dae0}
.td-info .b3d{width:100%;margin-top:6px}
`;
document.head.appendChild(estilo);

// ---------- Aviso breve (en lugar de alert) ----------
const aviso = h("div", "td-aviso");
aviso.hidden = true;
aviso.setAttribute("role", "status");
document.body.appendChild(aviso);
let tAviso = 0;
function avisar(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { aviso.hidden = true; }, 3800);
}

// ---------- Ventana «Info» (usa los estilos .pausa-* de inmersivo.css) ----------
function abrirInfo() {
  const fondo = h("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.setAttribute("aria-label", "Cómo se juega");
  const panel = h("div", "pausa-panel td-info");
  const ok = h("button", "b3d txt b-verde");
  ok.type = "button";
  ok.append(h("span", "b-ico", "👍"), document.createTextNode(" Entendido"));
  panel.append(
    h("h2", "", "ℹ️ Cómo se juega"),
    h("p", "", "Un pastel se acerca por un lado hacia la torre cuadrada del centro."),
    h("p", "", "Toca la pantalla para detenerlo justo encima: cuanto más centrado, mejor."),
    h("p", "", "Lo que sobresale de la torre se corta y se pierde, y el pastel queda del tamaño de lo que sí se apoyó."),
    h("p", "", "Por ahora solo está el menú: la partida se está programando."),
    ok
  );
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  const cerrar = () => { removeEventListener("keydown", tecla, true); fondo.remove(); };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  addEventListener("keydown", tecla, true); // en captura: Esc cierra solo la ventana y no vuelve también al menú
  ok.addEventListener("click", cerrar);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  try { ok.focus({ preventScroll: true }); } catch (e) {}
}

// ---------- Partida libre: elegir dificultad ----------
const btnMenu = document.getElementById("btn-menu");
const sel = h("section", "td-sel");
sel.hidden = true;
sel.setAttribute("aria-label", "Partida libre: elige la dificultad");
document.body.appendChild(sel);
let enSeleccion = false;

// AQUÍ ENTRA LA PARTIDA (siguiente paso). dif = una de DIFICULTADES.
function iniciarPartida(dif) {
  guardar(CLAVE_DIF, String(dif.id));
  avisar("Dificultad «" + dif.nombre + "» elegida. La partida llega en el siguiente paso.");
}

function pintarSeleccion() {
  const lista = h("div", "td-lista");
  for (const d of DIFICULTADES) {
    const r = record(d);
    const b = h("button", "b3d txt grande td-dif " + d.clase);
    b.type = "button";
    const t = h("span", "td-t");
    t.append(h("b", "", d.id + " · " + d.nombre), h("small", "", d.texto + " · " + (r ? "Récord: " + r + (r === 1 ? " piso" : " pisos") : "Sin récord")));
    b.append(h("span", "b-ico", d.icono), t);
    b.setAttribute("aria-label", "Dificultad " + d.id + ": " + d.nombre + ". " + d.texto + ". " + (r ? "Récord " + r + " pisos" : "Sin récord"));
    b.addEventListener("click", () => iniciarPartida(d));
    lista.appendChild(b);
  }
  sel.replaceChildren(h("h2", "", "♾️ Partida libre"), h("p", "", "Elige la dificultad · apila pisos sin fin"), lista);
}

function abrirSeleccion() {
  mapa.cerrar();
  pintarSeleccion();
  sel.hidden = false;
  enSeleccion = true;
  btnMenu.hidden = false; // fuera del menú principal el ☰ dice «Menú principal»
  const primero = sel.querySelector("button");
  if (primero) try { primero.focus({ preventScroll: true }); } catch (e) {}
}
function volverAlMapa() {
  sel.hidden = true;
  enSeleccion = false;
  mapa.abrir(); // alCambiarVista(true) vuelve a ocultar el ☰
}

btnMenu.addEventListener("click", () => { if (enSeleccion) volverAlMapa(); else mapa.principal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && enSeleccion) { e.preventDefault(); volverAlMapa(); } });

// ---------- Mapa de niveles (menú principal) ----------
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso,
  jugarNivel: (n) => avisar("El nivel " + n + " todavía no está listo: los niveles se crean en un paso siguiente."),
  botonesAntes: [{ icono: "♾️", texto: "Partida libre", clase: "b-oro", fn: abrirSeleccion }], // primer botón del menú
  alInfo: abrirInfo,
  avisoPrincipal: () => "22 600 niveles por crear · 100 por estado y por país",
  alCambiarVista: (esPrincipal) => { btnMenu.hidden = esPrincipal; },
});
mapa.abrir();
