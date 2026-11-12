// Ruta: ataqueglobal/menu-pais-ataqueglobal.js
// MENÚ CIRCULAR de un país propio (estilo First Strike): al tocar un país tuyo salen sus botones en círculo alrededor de él, con la etiqueta curva,
// y siguen al país mientras giras o acercas el planeta. Al tocar otro país, el menú se pliega y se abre el del nuevo (o ninguno si no es tuyo).
// También trae un panel de lista (para «Expandir» y «Investigar») y un aviso corto. No usa Firebase ni red; sus estilos los inyecta él mismo.
//
// Uso:
//   const menu = crearMenuPais({
//     mundo,                                   // necesita mundo.posicion(iso) → { x, y, visible } (mapa-ataqueglobal.js)
//     acciones: (iso) => [ { texto: "EXPANDIR", nombre: "Expandir", icono: "expandir"|"misil"|"investigar", deshabilitado, info, alElegir } ],
//     centro: (iso) => null | { texto, fraccion },   // lo que se muestra bajo el país cuando está ocupado (fraccion 0 a 1)
//   });
//   mundo = crearMundo({ …, alCuadro: () => menu.seguir() });   // para que el menú siga al país
//   menu.abrir(iso); menu.cerrar(); menu.refrescar() (tras un cambio de estado); menu.tic() (cada ~250 ms: solo actualiza contadores)
//   menu.abrirPanel({ titulo, sub, filas: () => [ { encabezado } | { texto, ayuda, estado: () => "…", deshabilitado, hecha, alElegir } ] }); menu.cerrarPanel(); menu.panelAbierto()
//   menu.aviso("texto");

const D = 86;          // distancia (px) del centro del país a cada botón
const ICONOS = { // trazos de 24×24
  expandir: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="2.2"/>',
  misil: '<path d="M12 2.5c3 2.8 4 7 3 12H9c-1-5 0-9.2 3-12z"/><circle cx="12" cy="9" r="1.4"/><path d="M9 14.5l-3.5 4.5 3.5-1.200M15 14.5l3.5 4.5-3.5-1.200M12 17.5v4"/>',
  investigar: '<path d="M9.5 3h5M10.5 3v6l-5.2 9.2a2 2 0 0 0 1.8 3h9.8a2 2 0 0 0 1.8-3L13.5 9V3"/><path d="M8 15h8"/><circle cx="11" cy="18" r=".6"/><circle cx="14" cy="17" r=".6"/>',
};

const CSS = `
.rm{position:fixed;left:0;top:0;z-index:5;width:0;height:0;pointer-events:none;will-change:transform}
.rm[hidden]{display:none}
.rm-anillo{position:absolute;left:0;top:0;border-radius:50%;transform:translate(-50%,-50%) scale(.2);opacity:0;transition:transform .28s ease-out,opacity .22s}
.rm.abierto .rm-anillo{transform:translate(-50%,-50%) scale(1);opacity:1}
.rm-a1{width:46px;height:46px;border:2px dashed rgba(60,240,255,.95);box-shadow:0 0 12px rgba(60,240,255,.5),inset 0 0 12px rgba(60,240,255,.35)}
.rm-a2{width:78px;height:78px;border:1.5px solid rgba(60,240,255,.5)}
.rm-a3{width:116px;height:116px;border:1px solid rgba(60,240,255,.28)}
.rm-a1::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(60,240,255,.8);animation:rm-sonar 1.8s ease-out infinite}
@keyframes rm-sonar{from{transform:scale(1);opacity:.9}to{transform:scale(2.3);opacity:0}}
.rm-b{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;padding:0;border-radius:50%;border:3px solid #2de8f5;color:#2de8f5;
  background:radial-gradient(circle at 50% 30%,#10404e,#06141c 78%);box-shadow:0 0 0 3px rgba(45,232,245,.16),0 0 14px rgba(45,232,245,.45),inset 0 0 10px rgba(45,232,245,.25);
  pointer-events:auto;cursor:pointer;touch-action:manipulation;transform:translate(0,0) scale(.2);opacity:0;transition:transform .24s cubic-bezier(.2,.9,.3,1.25),opacity .18s,filter .12s}
.rm.abierto .rm-b{transform:translate(calc(var(--dx)*1px),calc(var(--dy)*1px)) scale(1);opacity:1}
.rm-b svg.ico{display:block;width:30px;height:30px;margin:auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.rm-b svg.eti{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;overflow:visible;pointer-events:none}
.rm-b svg.eti text{font:800 10.5px system-ui,sans-serif;letter-spacing:.07em;fill:currentColor;paint-order:stroke;stroke:rgba(2,8,14,.92);stroke-width:3px;stroke-linejoin:round}
.rm-b:hover:not(:disabled){filter:brightness(1.3)}
.rm-b:active:not(:disabled){filter:brightness(1.6)}
.rm-b:disabled{color:#7f9096;border-color:#4d5c61;box-shadow:none;cursor:default;filter:saturate(.35)}
.rm-b:focus-visible{outline:3px solid #fff;outline-offset:3px}
.rm-info{position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;padding:0 5px;box-sizing:border-box;border-radius:11px;font:800 11px/17px system-ui,sans-serif;text-align:center;color:#fff;background:#02121a;border:2px solid #2de8f5}
.rm-centro{position:absolute;left:0;top:0;transform:translate(-50%,36px);min-width:130px;padding:5px 12px 7px;text-align:center;color:#c8fbff;font:700 12px system-ui,sans-serif;white-space:nowrap;
  background:rgba(2,18,26,.88);border:2px solid #2de8f5;border-radius:12px;box-shadow:0 0 12px rgba(45,232,245,.4)}
.rm-centro i{display:block;height:4px;margin-top:5px;border-radius:2px;background:rgba(45,232,245,.25);overflow:hidden}
.rm-centro i b{display:block;height:100%;width:0;background:#2de8f5}
@media (prefers-reduced-motion:reduce){.rm-anillo,.rm-b{transition:none}.rm-a1::after{animation:none;opacity:0}}

.rp{position:fixed;z-index:7;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,420px);max-height:calc(100% - 24px);display:flex;flex-direction:column;box-sizing:border-box;
  padding:14px 12px 12px;color:#f1f2f4;background:linear-gradient(180deg,#1a3944,#0d1f27);border:2px solid #2de8f5;border-radius:18px;box-shadow:0 0 0 3px rgba(45,232,245,.15),0 12px 28px rgba(0,0,0,.6)}
.rp[hidden]{display:none}
.rp-cab{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.rp-cab div{flex:1}
.rp-cab h2{margin:0;font-size:1.25rem;color:#8ff4fb}
.rp-cab small{display:block;margin-top:2px;color:#a9c3c9;font-size:.78rem;line-height:1.25}
.rp-x{flex:none;width:38px;height:38px;padding:0;font-size:18px;font-weight:800;color:#2de8f5;background:#06141c;border:2px solid #2de8f5;border-radius:50%;cursor:pointer;touch-action:manipulation}
.rp-lista{display:flex;flex-direction:column;gap:7px;overflow-y:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:2px}
.rp-enc{margin:6px 2px 0;font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8ff4fb}
.rp-fila{display:flex;flex-direction:column;gap:2px;width:100%;padding:8px 12px;text-align:left;font:inherit;color:#e6fbff;background:rgba(45,232,245,.1);border:2px solid #2de8f5;border-radius:12px;cursor:pointer;touch-action:manipulation}
.rp-fila b{font-size:.95rem}
.rp-fila small{color:#a9c3c9;font-size:.74rem;line-height:1.25}
.rp-fila .rp-est{font-size:.76rem;font-weight:800;color:#8ff4fb}
.rp-fila:hover:not(:disabled){background:rgba(45,232,245,.2)}
.rp-fila:disabled{cursor:default;color:#8a9ba0;border-color:#40545a;background:rgba(255,255,255,.04)}
.rp-fila:disabled .rp-est{color:#8a9ba0}
.rp-fila.hecha{border-color:#5ee27a}
.rp-fila.hecha .rp-est{color:#7df29a}
.rp-fila:focus-visible,.rp-x:focus-visible{outline:3px solid #fff;outline-offset:2px}
.rt{position:fixed;z-index:8;left:50%;top:max(12px,env(safe-area-inset-top));transform:translate(-50%,-30px);max-width:min(92vw,420px);padding:8px 16px;text-align:center;font:700 14px/1.25 system-ui,sans-serif;color:#d8fdff;
  background:rgba(2,18,26,.94);border:2px solid #2de8f5;border-radius:14px;box-shadow:0 0 14px rgba(45,232,245,.45);opacity:0;pointer-events:none;transition:transform .25s,opacity .25s}
.rt.ver{transform:translate(-50%,0);opacity:1}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let contador = 0;

// Etiqueta curva alrededor del botón, del lado de afuera del círculo (arriba si el botón está arriba, abajo si está abajo)
function etiqueta(texto, ang) {
  const arriba = Math.sin(ang) <= 0.05, a = (80 * Math.PI) / 180, r = arriba ? 37 : 46, id = "rm-arco-" + ++contador;
  const p = (t) => (r * Math.cos(t)).toFixed(1) + " " + (r * Math.sin(t)).toFixed(1);
  const d = "M" + p(arriba ? ang - a : ang + a) + "A" + r + " " + r + " 0 0 " + (arriba ? 1 : 0) + " " + p(arriba ? ang + a : ang - a);
  return '<svg class="eti" viewBox="-75 -75 150 150" aria-hidden="true"><path id="' + id + '" d="' + d + '" fill="none"/><text><textPath href="#' + id + '" xlink:href="#' + id + '" startOffset="50%" text-anchor="middle">' + esc(texto) + "</textPath></text></svg>";
}
// Ángulos (radianes, 0 = derecha, −π/2 = arriba) de n botones repartidos alrededor del país
function angulos(n) {
  if (n === 1) return [-Math.PI / 2];
  if (n === 2) return [(-140 * Math.PI) / 180, (-40 * Math.PI) / 180];
  return Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n);
}
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
export { mmss };

export function crearMenuPais({ mundo, acciones, centro, contenedor = document.body }) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const raiz = document.createElement("div"); raiz.className = "rm"; raiz.hidden = true; contenedor.appendChild(raiz);
  const panel = document.createElement("div"); panel.className = "rp"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Panel de acciones"); contenedor.appendChild(panel);
  const aviso_ = document.createElement("div"); aviso_.className = "rt"; aviso_.setAttribute("role", "status"); aviso_.setAttribute("aria-live", "polite"); contenedor.appendChild(aviso_);

  let iso = null, espera = 0, vivos = [], panelDef = null, vivosPanel = [], ultimaPos = "";

  // ---------- Menú circular ----------
  function construir() {
    raiz.replaceChildren(); vivos = [];
    for (const c of ["rm-a3", "rm-a2", "rm-a1"]) { const a = document.createElement("div"); a.className = "rm-anillo " + c; raiz.appendChild(a); }
    const lista = (acciones(iso) || []).filter(Boolean), ang = angulos(lista.length);
    lista.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rm-b"; b.disabled = !!a.deshabilitado;
      b.setAttribute("aria-label", a.nombre || a.texto);
      b.style.setProperty("--dx", (Math.cos(ang[i]) * D).toFixed(1));
      b.style.setProperty("--dy", (Math.sin(ang[i]) * D).toFixed(1));
      b.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[a.icono] || "") + "</svg>" + etiqueta(a.texto, ang[i]) + (a.info != null ? '<span class="rm-info">' + esc(a.info) + "</span>" : "");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); if (a.alElegir) a.alElegir(); });
      raiz.appendChild(b);
    });
    const c = centro && centro(iso);
    if (c) {
      const el = document.createElement("div"); el.className = "rm-centro";
      const t = document.createElement("span"), barra = document.createElement("i"), rel = document.createElement("b");
      barra.appendChild(rel); el.append(t, barra); raiz.appendChild(el);
      vivos.push(() => { const x = centro(iso); if (!x) return; if (t.textContent !== x.texto) t.textContent = x.texto; rel.style.width = Math.round(Math.max(0, Math.min(1, x.fraccion)) * 100) + "%"; });
      vivos[vivos.length - 1]();
    }
  }
  function montar(nuevo) {
    iso = nuevo; construir(); ultimaPos = ""; raiz.hidden = false; seguir();
    void raiz.offsetWidth; // para que arranque la animación de apertura
    raiz.classList.add("abierto");
  }
  // Abre el menú del país (si ya había uno abierto, primero se pliega y después se abre el nuevo)
  function abrir(nuevo) {
    clearTimeout(espera);
    if (raiz.classList.contains("abierto")) { raiz.classList.remove("abierto"); iso = null; espera = setTimeout(() => montar(nuevo), 170); }
    else montar(nuevo);
  }
  function cerrar() {
    clearTimeout(espera);
    iso = null; raiz.classList.remove("abierto");
    espera = setTimeout(() => { if (!iso) raiz.hidden = true; }, 240);
  }
  // Lo llama el mundo en cada cuadro: el menú sigue al país mientras se gira o se acerca el planeta
  function seguir() {
    if (!iso) return;
    const p = mundo.posicion(iso);
    if (!p || !p.visible) { raiz.style.visibility = "hidden"; return; }
    raiz.style.visibility = "";
    const t = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)";
    if (t !== ultimaPos) { ultimaPos = t; raiz.style.transform = t; }
  }
  function refrescar() {
    if (iso && !raiz.hidden) { construir(); raiz.classList.add("abierto"); }
    if (panelDef) construirPanel(true);
  }
  function tic() { for (const f of vivos) f(); for (const f of vivosPanel) f(); }

  // ---------- Panel de lista ----------
  function construirPanel(conservar) {
    const antes = conservar ? (panel.querySelector(".rp-lista") || {}).scrollTop || 0 : 0;
    panel.replaceChildren(); vivosPanel = [];
    const cab = document.createElement("div"); cab.className = "rp-cab";
    const tit = document.createElement("div");
    const h = document.createElement("h2"); h.textContent = panelDef.titulo; tit.appendChild(h);
    if (panelDef.sub) { const s = document.createElement("small"); s.textContent = panelDef.sub; tit.appendChild(s); }
    const x = document.createElement("button"); x.type = "button"; x.className = "rp-x"; x.textContent = "✕"; x.setAttribute("aria-label", "Cerrar");
    x.addEventListener("click", cerrarPanel);
    cab.append(tit, x);
    const lista = document.createElement("div"); lista.className = "rp-lista";
    for (const f of panelDef.filas()) {
      if (f.encabezado) { const e = document.createElement("div"); e.className = "rp-enc"; e.textContent = f.encabezado; lista.appendChild(e); continue; }
      const b = document.createElement("button"); b.type = "button"; b.className = "rp-fila" + (f.hecha ? " hecha" : ""); b.disabled = !!f.deshabilitado;
      const n = document.createElement("b"); n.textContent = f.texto; b.appendChild(n);
      if (f.ayuda) { const s = document.createElement("small"); s.textContent = f.ayuda; b.appendChild(s); }
      if (f.estado) {
        const e = document.createElement("span"); e.className = "rp-est"; e.textContent = f.estado(); b.appendChild(e);
        vivosPanel.push(() => { const t = f.estado(); if (e.textContent !== t) e.textContent = t; });
      }
      b.addEventListener("click", () => { if (f.alElegir) f.alElegir(); });
      lista.appendChild(b);
    }
    panel.append(cab, lista);
    panel.hidden = false;
    lista.scrollTop = antes;
    if (!conservar) { const p = panel.querySelector(".rp-fila:not(:disabled)") || x; try { p.focus({ preventScroll: true }); } catch (e) {} }
  }
  function abrirPanel(def) { panelDef = def; construirPanel(false); }
  function cerrarPanel() { if (!panelDef) return; panelDef = null; vivosPanel = []; panel.hidden = true; panel.replaceChildren(); }
  // Esc cierra el panel antes que cualquier otra cosa (así no abre además el menú de pausa)
  addEventListener("keydown", (ev) => { if (ev.key === "Escape" && panelDef) { ev.preventDefault(); ev.stopPropagation(); cerrarPanel(); } }, true);

  // ---------- Aviso corto ----------
  let tAviso = 0;
  function aviso(texto) {
    aviso_.textContent = texto; aviso_.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(() => aviso_.classList.remove("ver"), 3200);
  }

  return { abrir, cerrar, seguir, refrescar, tic, abrirPanel, cerrarPanel, panelAbierto: () => !!panelDef, aviso, abierto: () => !!iso };
}
