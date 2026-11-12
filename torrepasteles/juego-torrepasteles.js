// Ruta: torrepasteles/juego-torrepasteles.js
// TORRE DE PASTELES (estilo «apilar pasteles» de Talking Angela): un pastel se acerca a una torre cuadrada en el centro,
// hay que detenerlo lo más centrado posible y lo que sobresale se corta, así que el pastel de arriba queda más chico.
//
// POR AHORA ESTÁ EL MENÚ PRINCIPAL Y EL SISTEMA DE ESTRELLAS, MONEDAS Y BOOSTS (la partida se programa en el siguiente paso):
//   • Mapa de México y del mundo con agua (compartido/mapa-niveles.js): 22 600 niveles (100 por estado y por país), todavía sin niveles.
//   • «♾️ Partida libre» (primer botón) → elegir entre 5 dificultades. Ver iniciarPartida() más abajo. No da estrellas ni monedas.
//   • Estrellas, monedas y boosts: las reglas están en logica-torrepasteles.js. Aquí solo se dibujan: chip de monedas y 🎁 Boosts
//     (arriba a la derecha), estrellas en los botones de nivel y la ventana de resultado (mostrarResultado).
//   • Para ver el sistema sin la partida: abre la página con «?prueba» al final (…/index-torrepasteles.html?prueba) y toca 🧪.
// No usa Firebase ni red: funciona sin internet. Todavía no suma puntos al perfil.

import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import * as L from "./logica-torrepasteles.js";

const ID = "torrepasteles";                 // id del juego (el mismo de juegos.js)
const CLAVE_PROGRESO = ID + "_progreso_v1"; // { max, hecho }: nivel más alto abierto y más alto terminado
const CLAVE_MARCAS = ID + "_marcas_v1";     // { "1": pisos, … "5": pisos }: récord de la partida libre por dificultad
const CLAVE_DIF = ID + "_dificultad";       // última dificultad elegida
// (las estrellas, monedas y boosts se guardan en L.CLAVE_DATOS = «torrepasteles_datos_v1»)

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
const NS = "http://www.w3.org/2000/svg";
const h = (tag, clase, texto) => {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
};
const leerJSON = (clave) => { try { const v = JSON.parse(localStorage.getItem(clave)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
const guardarLS = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (e) {} };
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const plural = (n, uno, varios) => n + " " + (n === 1 ? uno : varios);

function progreso() {
  const p = leerJSON(CLAVE_PROGRESO);
  return { max: Math.max(1, Math.floor(Number(p.max)) || 1), hecho: Math.max(0, Math.floor(Number(p.hecho)) || 0) };
}
const record = (dif) => Math.max(0, Math.floor(Number(leerJSON(CLAVE_MARCAS)[dif.id])) || 0);

// ---------- Estrellas, monedas y boosts guardados ----------
let datos = L.cargar();
function persistir(nuevos) { // cambia los datos, los guarda de una vez y refresca el chip de monedas
  datos = nuevos;
  L.guardar(datos);
  txtMonedas.nodeValue = miles(datos.m);
  chip.setAttribute("aria-label", "Monedas: " + datos.m);
}

// ---------- Estilos propios (los del mapa y los botones vienen de compartido/) ----------
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
/* Monedas y boosts: arriba a la derecha, por encima del mapa (que está en z-index 5) */
.hud.td-hud{z-index:6}
/* Ventanas (Info, Boosts, resultado, prueba) */
.td-vent p{margin:0 0 10px;text-align:left;font-size:.92rem;line-height:1.35;color:#d7dae0}
.td-vent>.b3d{width:100%;margin-top:6px}
.td-vent .td-cen{text-align:center}
.td-boost{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px;margin-bottom:10px;text-align:left;background:rgba(0,0,0,.28);border:2px solid #121316;border-radius:14px}
.td-boost-ico{font-size:1.9rem;line-height:1}
.td-boost-t{flex:1 1 130px;min-width:0;display:flex;flex-direction:column;gap:2px}
.td-boost-t b{font-size:.95rem}
.td-boost-t small{font-size:.75rem;line-height:1.25;color:#b0b4bd}
.td-boost .b3d{--t:40px;flex:none;margin-bottom:5px;font-size:14px}
.td-monedero{display:flex;justify-content:center;margin:0 0 12px}
.td-campo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:.92rem;color:#d7dae0}
.td-campo input{width:110px;padding:8px 10px;font:inherit;color:#f1f2f4;background:#15171a;border:2px solid #3b3e46;border-radius:10px}
.td-filabtn{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.td-filabtn .b3d{width:100%;margin-bottom:5px}
/* Estrellas: 3 doradas siempre; las moradas (4 a 6) solo aparecen cuando se consiguen y sacan brillitos */
.td-estrellas{display:flex;justify-content:center;flex-wrap:wrap;gap:4px;margin:2px 0 12px}
.td-ew{position:relative;display:inline-block;width:46px;height:46px}
.td-ew svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.td-ew path{stroke-width:1.3;stroke-linejoin:round}
.td-oro path{fill:#ffc928;stroke:#a86a00}
.td-gris path{fill:rgba(255,255,255,.1);stroke:#5b5f68}
.td-morada path{fill:#b45cff;stroke:#5a1fa8}
.td-ew-m svg{filter:drop-shadow(0 0 6px #d49bff)}
.td-ew i{position:absolute;font-style:normal;font-size:13px;line-height:1;color:#f6e3ff;text-shadow:0 0 6px #d49bff;pointer-events:none;opacity:0;animation:td-brillo 1.8s ease-in-out infinite}
.td-ew i:nth-of-type(1){top:-5px;right:-3px}
.td-ew i:nth-of-type(2){bottom:3px;left:-5px;font-size:10px;animation-delay:.6s}
.td-ew i:nth-of-type(3){top:14px;right:-7px;font-size:9px;animation-delay:1.2s}
@keyframes td-brillo{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(25deg)}}
@media (prefers-reduced-motion:reduce){.td-ew i{animation:none;opacity:1}}
`;
document.head.appendChild(estilo);

// ---------- Monedas y botones de arriba a la derecha ----------
const chip = h("span", "chip chip-monedas");
const txtMonedas = document.createTextNode("0");
chip.append(h("span", "moneda"), txtMonedas);
const btnBoosts = h("button", "b3d chico b-gris");
btnBoosts.type = "button";
btnBoosts.title = "Boosts";
btnBoosts.setAttribute("aria-label", "Boosts: agrandar pastel y precisión mejorada");
btnBoosts.appendChild(h("span", "b-ico", "🎁"));
const hud = h("div", "hud hud-der td-hud");
hud.append(chip, btnBoosts);
document.body.appendChild(hud);
persistir(datos);

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

// ---------- Ventanas (usan los estilos .pausa-* de inmersivo.css) ----------
// Devuelve { cuerpo, cerrar }: el contenido va en «cuerpo»; abajo siempre hay un botón que la cierra.
function crearVentana(titulo, textoBoton = "Entendido", clase = "b-verde", icono = "👍") {
  const fondo = h("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.setAttribute("aria-label", titulo);
  const panel = h("div", "pausa-panel td-vent");
  const cuerpo = h("div", "td-cuerpo");
  const ok = h("button", "b3d txt " + clase);
  ok.type = "button";
  ok.append(h("span", "b-ico", icono), document.createTextNode(" " + textoBoton));
  panel.append(h("h2", "", titulo), cuerpo, ok);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  const cerrar = () => { removeEventListener("keydown", tecla, true); fondo.remove(); };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } };
  addEventListener("keydown", tecla, true); // en captura: Esc cierra solo la ventana y no vuelve también al menú
  ok.addEventListener("click", cerrar);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  try { ok.focus({ preventScroll: true }); } catch (e) {}
  return { cuerpo, cerrar };
}
const parrafo = (texto, clase) => h("p", clase || "", texto);
function chipMonedas(texto) {
  const c = h("span", "chip chip-monedas");
  c.append(h("span", "moneda"), document.createTextNode(texto));
  return c;
}

function abrirInfo() {
  const v = crearVentana("ℹ️ Cómo se juega");
  v.cuerpo.append(
    parrafo("Un pastel se acerca por un lado hacia la torre cuadrada del centro."),
    parrafo("Toca la pantalla para detenerlo justo encima: cuanto más centrado, mejor."),
    parrafo("Lo que sobresale de la torre se corta y se pierde, y el pastel queda del tamaño de lo que sí se apoyó."),
    parrafo("En cada nivel ganas estrellas según los pisos que apiles (la primera, con " + L.UMBRALES[0] + "). Las monedas solo se cobran la primera vez que pasas un nivel y sirven para comprar boosts 🎁."),
    parrafo("Por ahora solo están el menú y el sistema de estrellas y monedas: la partida se está programando.")
  );
}

// ---------- Estrellas ----------
const FORMA = "M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8z";
function estrella(tipo) { // tipo: "oro" | "gris" | "morada"
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("class", "td-" + tipo);
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", FORMA);
  s.appendChild(p);
  const w = h("span", "td-ew" + (tipo === "morada" ? " td-ew-m" : ""));
  w.appendChild(s);
  if (tipo === "morada") w.append(h("i", "", "✦"), h("i", "", "✦"), h("i", "", "✦"));
  return w;
}
// 3 espacios dorados (llenos o vacíos); las moradas solo se muestran las que se consiguieron
function crearEstrellas(e) {
  const caja = h("div", "td-estrellas");
  caja.setAttribute("role", "img");
  caja.setAttribute("aria-label", plural(e, "estrella", "estrellas") + (e > 3 ? " (" + (e - 3) + " moradas)" : ""));
  for (let i = 0; i < 3; i++) caja.appendChild(estrella(i < e ? "oro" : "gris"));
  for (let i = 3; i < e; i++) caja.appendChild(estrella("morada"));
  return caja;
}

// Ventana de fin de nivel (la partida la llamará con el resultado de L.terminarNivel)
function mostrarResultado(res, nivel, pisos) {
  const v = crearVentana(res.estrellas ? "🎉 ¡Nivel " + nivel + " completado!" : "Nivel " + nivel + ": sin estrellas", "Seguir");
  v.cuerpo.append(crearEstrellas(Math.max(res.estrellas, 0)), parrafo("Pisos apilados: " + pisos, "td-cen"));
  if (!res.estrellas) {
    v.cuerpo.append(parrafo("Apila al menos " + L.UMBRALES[0] + " pisos para conseguir la primera estrella.", "td-cen"));
    return;
  }
  if (res.estrellas < 3) v.cuerpo.append(parrafo("Siguiente estrella: " + L.UMBRALES[res.estrellas] + " pisos.", "td-cen"));
  if (res.cobro) {
    const fila = h("div", "td-monedero");
    fila.append(chipMonedas("+" + res.monedas));
    v.cuerpo.append(fila, parrafo("Monedas ganadas por pasar el nivel.", "td-cen"));
  } else {
    v.cuerpo.append(parrafo(res.mejoro ? "¡Mejoraste tus estrellas! Este nivel ya te dio sus monedas." : "Este nivel ya te dio sus monedas.", "td-cen"));
  }
}

// ---------- Boosts ----------
function abrirBoosts() {
  const v = crearVentana("🎁 Boosts", "Cerrar", "b-gris", "✖");
  const dibujar = () => {
    const monedero = h("div", "td-monedero");
    monedero.append(chipMonedas(miles(datos.m)));
    v.cuerpo.replaceChildren(monedero);
    for (const id of L.IDS_BOOSTS) {
      const b = L.BOOSTS[id];
      const fila = h("div", "td-boost");
      const t = h("div", "td-boost-t");
      t.append(h("b", "", b.nombre), h("small", "", b.texto), h("small", "", "Tienes: " + datos.b[id]));
      const comprar = h("button", "b3d txt b-oro");
      comprar.type = "button";
      comprar.disabled = datos.m < b.precio;
      comprar.append(document.createTextNode("Comprar "), h("span", "moneda"), document.createTextNode(String(b.precio)));
      comprar.setAttribute("aria-label", "Comprar " + b.nombre + " por " + b.precio + " monedas");
      comprar.addEventListener("click", () => {
        const r = L.comprar(datos, id);
        if (r.ok) persistir(r.datos); else avisar("No te alcanzan las monedas.");
        dibujar();
      });
      fila.append(h("span", "td-boost-ico", b.icono), t, comprar);
      v.cuerpo.appendChild(fila);
    }
    v.cuerpo.appendChild(parrafo("Se gastan al usarlos en una partida de niveles. Si usas uno que no tienes, se compra en ese momento.", "td-cen"));
  };
  dibujar();
}
btnBoosts.addEventListener("click", abrirBoosts);

// ---------- Prueba (solo con «?prueba» en la dirección): simula terminar un nivel sin tener la partida ----------
function abrirPrueba() {
  const v = crearVentana("🧪 Prueba", "Cerrar", "b-gris", "✖");
  const campo = (texto, valor, min, max) => {
    const l = h("label", "td-campo", texto);
    const i = h("input");
    i.type = "number"; i.min = min; i.max = max; i.value = valor; i.inputMode = "numeric";
    l.appendChild(i);
    v.cuerpo.appendChild(l);
    return i;
  };
  const nivel = campo("Nivel (1 a " + miles(L.NIVELES_TOTAL) + ")", 1, 1, L.NIVELES_TOTAL);
  const pisos = campo("Pisos apilados", 12, 0, 9999);
  v.cuerpo.appendChild(parrafo("Pisos por estrella (★1 a ★6): " + L.UMBRALES.join(", "), "td-cen"));
  const fila = h("div", "td-filabtn");
  const boton = (icono, texto, clase, fn) => {
    const b = h("button", "b3d txt " + clase);
    b.type = "button";
    b.append(h("span", "b-ico", icono), document.createTextNode(" " + texto));
    b.addEventListener("click", fn);
    fila.appendChild(b);
  };
  boton("🏁", "Terminar nivel", "b-verde", () => {
    const n = Math.max(1, Math.min(L.NIVELES_TOTAL, Math.floor(Number(nivel.value)) || 1));
    const p = Math.max(0, Math.floor(Number(pisos.value)) || 0);
    const res = L.terminarNivel(datos, n, p);
    persistir(res.datos);
    mapa.refrescar();
    v.cerrar();
    mostrarResultado(res, n, p);
  });
  boton("💰", "Dar 500 monedas", "b-oro", () => { persistir({ ...datos, m: datos.m + 500 }); avisar("+500 monedas de prueba."); });
  boton("🗑️", "Borrar estrellas, monedas y boosts", "b-rojo", () => { persistir(L.datosVacios()); mapa.refrescar(); avisar("Datos de prueba borrados."); });
  v.cuerpo.appendChild(fila);
}
if (new URLSearchParams(location.search).has("prueba")) {
  const bp = h("button", "b3d chico b-gris");
  bp.type = "button";
  bp.title = "Prueba";
  bp.setAttribute("aria-label", "Prueba de estrellas y monedas");
  bp.appendChild(h("span", "b-ico", "🧪"));
  bp.addEventListener("click", abrirPrueba);
  hud.appendChild(bp);
}

// ---------- Partida libre: elegir dificultad ----------
const btnMenu = document.getElementById("btn-menu");
const sel = h("section", "td-sel");
sel.hidden = true;
sel.setAttribute("aria-label", "Partida libre: elige la dificultad");
document.body.appendChild(sel);
let enSeleccion = false;

// AQUÍ ENTRA LA PARTIDA (siguiente paso). dif = una de DIFICULTADES.
// La partida libre NO da estrellas ni monedas (así no se repite sin límite). Las partidas de niveles, al terminar, harán:
//   const res = L.terminarNivel(datos, n, pisos); persistir(res.datos); mostrarResultado(res, n, pisos);
// y para un boost: const r = L.usar(datos, "agrandar"); if (r.ok) { persistir(r.datos); … }
function iniciarPartida(dif) {
  guardarLS(CLAVE_DIF, String(dif.id));
  avisar("Dificultad «" + dif.nombre + "» elegida. La partida llega en el siguiente paso.");
}

function pintarSeleccion() {
  const lista = h("div", "td-lista");
  for (const d of DIFICULTADES) {
    const r = record(d);
    const b = h("button", "b3d txt grande td-dif " + d.clase);
    b.type = "button";
    const t = h("span", "td-t");
    t.append(h("b", "", d.id + " · " + d.nombre), h("small", "", d.texto + " · " + (r ? "Récord: " + plural(r, "piso", "pisos") : "Sin récord")));
    b.append(h("span", "b-ico", d.icono), t);
    b.setAttribute("aria-label", "Dificultad " + d.id + ": " + d.nombre + ". " + d.texto + ". " + (r ? "Récord " + plural(r, "piso", "pisos") : "Sin récord"));
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
  // Estrellas bajo el número del nivel: ★ doradas (hasta 3) y, si se consiguieron, ✨ por cada morada (el botón se pone morado)
  infoNivel: (n) => {
    const e = L.estrellasDe(datos, n), oro = Math.min(e, 3);
    return {
      sub: "★".repeat(oro) + "☆".repeat(3 - oro) + "✨".repeat(Math.max(0, e - 3)),
      clase: e > 3 ? "b-morado" : "b-azul",
      aria: e ? plural(e, "estrella", "estrellas") : "sin estrellas",
    };
  },
  botonesAntes: [{ icono: "♾️", texto: "Partida libre", clase: "b-oro", fn: abrirSeleccion }], // primer botón del menú
  alInfo: abrirInfo,
  avisoPrincipal: () => "22 600 niveles por crear · 100 por estado y por país",
  alCambiarVista: (esPrincipal) => { btnMenu.hidden = esPrincipal; },
});
mapa.abrir();
