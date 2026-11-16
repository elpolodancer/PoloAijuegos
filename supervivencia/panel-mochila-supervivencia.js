// Ruta: supervivencia/panel-mochila-supervivencia.js
// PANTALLA «🎒 Almacenamiento» (estilo Last Day on Earth): lo que llevas puesto (cabeza, torso, piernas, pies), la mochila en la espalda,
// las manos, los bolsillos y la cuadrícula de la mochila. La lógica (qué va dónde) vive en equipo-supervivencia.js; aquí solo se dibuja.
// Trae sus PROPIOS estilos (los inyecta en <head>), así que no hace falta tocar ningún .css. No usa Firebase.
//
// Cómo se usa (dos toques, sirve igual con el dedo y con el ratón):
//   1) toca un objeto: se resalta y se iluminan en verde los lugares donde puede ir;
//   2) toca el lugar. Si ya hay algo ahí, se intercambian. «Equipar» lo pone solo donde corresponde y «Guardar en mochila» lo quita.
//
//   const panel = crearPanelMochila({ mochila, equipo, alAbrir, alCerrar, alCambiar, pruebas });
//   panel.abrir();  panel.cerrar();  panel.abierto();
//     mochila / equipo   los objetos del juego (mochila-supervivencia.js y equipo-supervivencia.js); el panel los modifica directamente
//     alAbrir / alCerrar el juego se pausa y se reanuda
//     alCambiar          se llama tras cada cambio (para guardar y refrescar los chips)
//     pruebas            true = muestra el botón «🧪 Objetos de prueba» (para probar la ropa sin fabricarla; ver modoPruebas en configs.js)
import { item } from "./datos-supervivencia.js";
import { agregar } from "./mochila-supervivencia.js";
import * as EQ from "./equipo-supervivencia.js";

const FANTASMA = { cabeza: "🧢", torso: "👕", piernas: "👖", pies: "👟", espalda: "🎒", manos: "✋", bolsillos: "👝" };   // dibujo tenue de un lugar vacío
const ETIQUETA = { cabeza: "Cabeza", torso: "Torso", piernas: "Piernas", pies: "Pies", espalda: "Mochila", manos: "Mano", bolsillos: "Bolsillo" };
const TIPO = { recurso: "Recurso", refinado: "Material", componente: "Componente", herramienta: "Herramienta", arma: "Arma", armadura: "Ropa", mochila: "Mochila", viejo: "Objeto del viejo mundo", comida: "Comida", medicina: "Medicina" };
const DONDE = { cabeza: "la cabeza", torso: "el torso", piernas: "las piernas", pies: "los pies" };
const RAZON = {
  "no-acepta": "Eso no va ahí.", "bloqueado": "Ese lugar está tapado por tu traje de cuerpo completo.",
  "mochila-llena": "No hay espacio en la mochila.", "lleno": "Ese montón ya está lleno.",
};
// 🧪 Para probar sin fabricar ropa (solo con el modo pruebas)
const PRUEBA = [["mochila-nivel-3", 1], ["mochila-nivel-2", 1], ["mochila-basica", 1], ["gorro", 1], ["camisa", 1], ["pantalon-cargo", 1], ["zapatillas", 1], ["gorro-lana", 1], ["chaqueta", 1], ["jeans", 1], ["botas-trabajo", 1], ["kevlar", 1], ["palanca", 1], ["bayas", 8]];

const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };

function inyectarEstilos() {
  if (document.getElementById("mo-estilos")) return;
  const s = document.createElement("style");
  s.id = "mo-estilos";
  s.textContent = `
.mo-fondo{position:fixed;inset:0;z-index:9;display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;
  padding:max(14px,env(safe-area-inset-top)) 12px 0;color:#fff;background:#101114f2;font-family:system-ui,sans-serif}
.mo-fondo[hidden]{display:none}
.mo-caja{width:min(460px,100%);display:flex;flex-direction:column;gap:10px;min-height:100%}
.mo-caja h2{margin:0;text-align:center;font-size:22px}
.mo-panel{padding:10px;background:linear-gradient(180deg,#3a3d45,#22242a);border:2px solid #121316;border-radius:14px;box-shadow:0 3px 0 #0c0d0f,inset 0 2px 0 rgba(255,255,255,.12)}
.mo-tit{display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 8px;font-size:13px;font-weight:800;color:#d5d9e0}
.mo-tit small{font-weight:600;color:#b0b4bd}
.mo-cuerpo{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;justify-items:center}
.mo-col{display:flex;flex-direction:column;gap:8px}
.mo-figura{font-size:74px;line-height:1;opacity:.85;text-shadow:0 4px 0 rgba(0,0,0,.35)}
.mo-fila{display:flex;gap:8px;justify-content:center}
.mo-slot{position:relative;flex:none;width:58px;height:58px;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;font:inherit;cursor:pointer;
  background:linear-gradient(180deg,#2c2f36,#1b1d22);border:2px solid #121316;border-radius:12px;box-shadow:0 2px 0 #0c0d0f,inset 0 2px 0 rgba(255,255,255,.08);
  touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.mo-slot:focus-visible{outline:3px solid #fff;outline-offset:2px}
.mo-ico{font-size:28px;line-height:1}
.mo-vacio .mo-ico{opacity:.2;filter:grayscale(1);transform:translateY(-6px)}
.mo-et{position:absolute;left:0;right:0;bottom:3px;text-align:center;font-size:9px;font-weight:700;color:#b0b4bd;pointer-events:none}
.mo-n{position:absolute;right:4px;bottom:1px;font-size:12px;font-weight:800;text-shadow:0 1px 0 #000,0 0 3px #000;pointer-events:none}
.mo-sel{border-color:#ffe08a;box-shadow:0 0 0 3px #ffe08a99}
.mo-dest{border-color:#7dff9a;box-shadow:0 0 0 3px #7dff9a66}
.mo-bloq{opacity:.4}
.mo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.mo-grid .mo-slot{width:100%;height:auto;min-height:52px;aspect-ratio:1}
.mo-det{display:flex;align-items:center;gap:10px;min-height:62px}
.mo-det .mo-ico{font-size:34px;opacity:1;filter:none;transform:none}
.mo-det-txt{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13px;line-height:1.3;color:#d5d9e0}
.mo-det-txt b{font-size:16px;color:#fff}
.mo-det-bot{display:flex;flex-direction:column;gap:6px}
.mo-det-bot .b3d{margin-bottom:5px}
.mo-msg{min-height:1.3em;text-align:center;font-size:14px;font-weight:700;color:#ffe08a}
.mo-pie{position:sticky;bottom:0;margin-top:auto;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;padding:10px 0 max(14px,env(safe-area-inset-bottom));background:#101114}
.mo-pie .b3d{--t:48px;font-size:18px}
@media (max-width:380px){.mo-slot{width:52px;height:52px}.mo-figura{font-size:56px}.mo-ico{font-size:25px}}
@media (max-height:420px){.mo-figura{display:none}.mo-cuerpo{grid-template-columns:auto auto}}
`;
  document.head.appendChild(s);
}

export function crearPanelMochila({ mochila, equipo, alAbrir, alCerrar, alCambiar, pruebas = false } = {}) {
  inyectarEstilos();
  let sel = null;   // lugar elegido { z, i }

  const fondo = el("div", "mo-fondo");
  fondo.hidden = true;
  fondo.setAttribute("role", "dialog");
  fondo.setAttribute("aria-modal", "true");
  fondo.setAttribute("aria-label", "Almacenamiento");
  const caja = el("div", "mo-caja");
  const cuerpo = el("div", "mo-panel");
  const bolsillos = el("div", "mo-panel");
  const detalle = el("div", "mo-panel mo-det");
  const rejilla = el("div", "mo-panel");
  const msg = el("div", "mo-msg"); msg.setAttribute("role", "status");
  const pie = el("div", "mo-pie");
  const bCerrar = el("button", "b3d txt b-azul"); bCerrar.type = "button";
  const ic = el("span", "b-ico", "⬅️"); bCerrar.append(ic, " Volver");
  bCerrar.addEventListener("click", cerrar);
  pie.appendChild(bCerrar);
  if (pruebas) {
    const bp = el("button", "b3d txt b-morado"); bp.type = "button";
    bp.append(el("span", "b-ico", "🧪"), " Objetos de prueba");
    bp.addEventListener("click", () => {
      let sobra = 0;
      for (const [id, n] of PRUEBA) sobra += agregar(mochila, id, n);
      avisar(sobra ? "La mochila se llenó: faltaron " + sobra + ". Equipa una mochila (más espacio) y pulsa otra vez." : "Listo: mochilas, ropa, palanca y bayas de prueba.");
      cambio(); pintar();
    });
    pie.appendChild(bp);
  }
  caja.append(el("h2", "", "🎒 Almacenamiento"), cuerpo, bolsillos, detalle, rejilla, msg, pie);
  fondo.appendChild(caja);
  (document.body || document.documentElement).appendChild(fondo);

  const avisar = (t) => { msg.textContent = t || ""; };
  const cambio = () => { if (alCambiar) alCambiar(); };

  // ----- Un lugar (botón) -----
  function lugar(r, nombre) {
    const x = EQ.leer(mochila, equipo, r), it = x ? item(x.id) : null;
    const bloq = EQ.bloqueada(equipo, r);
    const b = el("button", "mo-slot" + (x ? "" : " mo-vacio") + (bloq ? " mo-bloq" : ""));
    b.type = "button";
    b.dataset.z = r.z;
    if (r.i != null) b.dataset.i = String(r.i);
    if (sel && EQ.mismoLugar(sel, r)) b.classList.add("mo-sel");
    else if (sel && r.z !== "grid" && !bloq) {
      const A = EQ.leer(mochila, equipo, sel);
      if (A && EQ.acepta(r, A.id)) b.classList.add("mo-dest");
    }
    b.appendChild(el("span", "mo-ico", it ? it.ico : (r.z === "grid" ? "" : FANTASMA[r.z])));
    if (x && x.n > 1) b.appendChild(el("span", "mo-n", String(x.n)));
    if (!x && r.z !== "grid") b.appendChild(el("small", "mo-et", bloq ? "Tapado" : nombre));
    b.setAttribute("aria-label", (r.z === "grid" ? "Mochila, ranura " + (r.i + 1) : nombre) + ": " + (it ? it.nombre + (x.n > 1 ? " ×" + x.n : "") : "vacío") + (bloq ? " (tapado)" : ""));
    b.addEventListener("click", () => tocar(r));
    return b;
  }

  function tocar(r) {
    avisar("");
    const x = EQ.leer(mochila, equipo, r);
    if (!sel) {
      if (EQ.bloqueada(equipo, r)) { avisar("Tapado por tu traje de cuerpo completo."); return; }
      if (x) sel = { z: r.z, i: r.i };
      pintar();
      return;
    }
    if (EQ.mismoLugar(sel, r)) { sel = null; pintar(); return; }
    resolver(EQ.moverItem(mochila, equipo, sel, r), x, r);
  }
  function resolver(res, ocupado, destino) {
    if (res.ok) { sel = null; cambio(); pintar(); return; }
    if (res.razon === "no-acepta" && ocupado && destino) { sel = { z: destino.z, i: destino.i }; pintar(); return; }   // tocó otro objeto: pasa a ser el elegido
    avisar(RAZON[res.razon] || "No se puede.");
    pintar();
  }

  // ----- Detalle del objeto elegido -----
  function pintarDetalle() {
    detalle.replaceChildren();
    const A = sel ? EQ.leer(mochila, equipo, sel) : null;
    const it = A ? item(A.id) : null;
    if (!it) {
      detalle.appendChild(el("div", "mo-det-txt", "Toca un objeto para elegirlo y luego toca el lugar donde ponerlo. Toca «Equipar» para que se ponga solo."));
      return;
    }
    const txt = el("div", "mo-det-txt");
    txt.appendChild(el("b", "", it.nombre + (A.n > 1 ? " ×" + A.n : "")));
    let donde = "";
    if (it.tipo === "armadura") donde = it.ranura === "cuerpo" ? "Cuerpo completo: ocupa torso, cabeza, piernas y pies." : "Se pone en " + DONDE[it.ranura] + ".";
    else if (it.tipo === "mochila") donde = "Se pone en la espalda: +" + EQ.espacioExtra(it.id) + " espacios.";
    else if (it.tipo === "herramienta") donde = "Funciona desde la mochila, la mano o el bolsillo.";
    else if (it.tipo === "arma") donde = "Va en la mano o en un bolsillo.";
    else if (it.tipo === "comida" || it.tipo === "medicina") donde = "Va en un bolsillo.";
    else donde = "Se queda en la mochila.";
    txt.appendChild(el("span", "", (TIPO[it.tipo] || it.tipo) + " · " + donde));
    const bot = el("div", "mo-det-bot");
    const bA = el("button", "b3d txt chico " + (sel.z === "grid" ? "b-verde" : "b-oro")); bA.type = "button";
    if (sel.z === "grid") {
      bA.append(el("span", "b-ico", "⚡"), " Equipar");
      bA.disabled = !EQ.destinos(A.id).length;
      bA.addEventListener("click", () => { avisar(""); const d = sel; resolver(EQ.alternarItem(mochila, equipo, d), null, null); });
    } else {
      bA.append(el("span", "b-ico", "⬇️"), " A la mochila");
      bA.addEventListener("click", () => { avisar(""); const d = sel; resolver(EQ.guardarEnMochila(mochila, equipo, d), null, null); });
    }
    const bC = el("button", "b3d txt chico b-gris"); bC.type = "button"; bC.textContent = "Cancelar";
    bC.addEventListener("click", () => { sel = null; avisar(""); pintar(); });
    bot.append(bA, bC);
    detalle.append(el("span", "mo-ico", it.ico), txt, bot);
  }

  function pintar() {
    // Cuerpo: ropa a la izquierda, figura al centro, mochila y manos a la derecha
    const izq = el("div", "mo-col"), der = el("div", "mo-col");
    for (const z of EQ.ROPA) izq.appendChild(lugar({ z }, ETIQUETA[z]));
    der.appendChild(lugar({ z: "espalda" }, ETIQUETA.espalda));
    for (let i = 0; i < equipo.manos.length; i++) der.appendChild(lugar({ z: "manos", i }, ETIQUETA.manos + (equipo.manos.length > 1 ? " " + (i + 1) : "")));
    const fig = el("div", "mo-figura", "👤"); fig.setAttribute("aria-hidden", "true");
    const t1 = el("div", "mo-tit"); t1.append("Equipo", el("small", "", "Ropa · Mochila · Manos"));
    const c = el("div", "mo-cuerpo"); c.append(izq, fig, der);
    cuerpo.replaceChildren(t1, c);

    const t2 = el("div", "mo-tit"); t2.append("Bolsillos", el("small", "", "Comida, medicinas, armas y herramientas"));
    const f = el("div", "mo-fila");
    for (let i = 0; i < equipo.bolsillos.length; i++) f.appendChild(lugar({ z: "bolsillos", i }, ETIQUETA.bolsillos + (equipo.bolsillos.length > 1 ? " " + (i + 1) : "")));
    bolsillos.replaceChildren(t2, f);

    pintarDetalle();

    const usadas = mochila.ranuras.filter(Boolean).length;
    const t3 = el("div", "mo-tit"); t3.append("Mochila", el("small", "", usadas + " / " + mochila.ranuras.length + " ranuras"));
    const g = el("div", "mo-grid");
    for (let i = 0; i < mochila.ranuras.length; i++) g.appendChild(lugar({ z: "grid", i }, "Mochila"));
    rejilla.replaceChildren(t3, g);
  }

  // ----- Abrir y cerrar -----
  let previo = null;
  const tecla = (ev) => {
    const k = ev.key.toLowerCase();
    if (ev.repeat || (k !== "escape" && k !== "i" && k !== "b")) return;
    ev.preventDefault();
    cerrar();
  };
  function abrir() {
    if (!fondo.hidden) return;
    if (alAbrir) alAbrir();
    previo = document.activeElement;
    sel = null; avisar("");
    pintar();
    fondo.hidden = false;
    fondo.scrollTop = 0;
    addEventListener("keydown", tecla);
    try { bCerrar.focus({ preventScroll: true }); } catch (e) {}
  }
  function cerrar() {
    if (fondo.hidden) return;
    fondo.hidden = true;
    sel = null;
    removeEventListener("keydown", tecla);
    try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
    if (alCerrar) alCerrar();
  }
  return { abrir, cerrar, abierto: () => !fondo.hidden, repintar: () => { if (!fondo.hidden) pintar(); } };
}
