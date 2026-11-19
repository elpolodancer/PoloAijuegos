// Ruta: ataqueglobal/barras-ataqueglobal.js
// BARRITAS DE PROGRESO sobre cada país propio que está ocupado (expandiendo, fabricando un misil o investigando).
// Son pequeñas y se ven SIEMPRE, aunque el país no esté seleccionado. Solo es pantalla: juego-ataqueglobal.js le dice qué países están ocupados.
//
//   const barras = crearBarras({ mundo, trabajos: () => Map(iso → { texto, total, resta }) });   // mundo.posicion(iso) → { x, y, visible }
//   crearMundo({ …, alCuadro: () => barras.seguir() });   // cada cuadro: las barritas siguen a su país y avanzan
//   barras.mostrar(true|false);  barras.limpiar();

const CSS = `
.bp{position:fixed;left:0;top:0;z-index:4;width:0;height:0;pointer-events:none}
.bp[hidden]{display:none}
.bp-u{position:absolute;left:0;top:0;display:flex;align-items:center;gap:3px;padding:2px 4px 2px 3px;border-radius:6px;background:rgba(2,18,26,.82);border:1px solid rgba(45,232,245,.85);box-shadow:0 0 6px rgba(45,232,245,.35);will-change:transform}
.bp-u span{font:700 9px/1 system-ui,sans-serif;color:#c8fbff}
.bp-u i{display:block;width:26px;height:4px;border-radius:2px;background:rgba(45,232,245,.22);overflow:hidden}
.bp-u i b{display:block;height:100%;width:0;background:#2de8f5}
`;
const icono = (t) => (/^Expand/.test(t) ? "⤢" : /^Fabric/.test(t) ? "🚀" : /^Investig/.test(t) ? "🧪" : "•");

export function crearBarras({ mundo, trabajos, contenedor = document.body }) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  const raiz = document.createElement("div"); raiz.className = "bp"; raiz.hidden = true; raiz.setAttribute("aria-hidden", "true"); contenedor.appendChild(raiz);
  const filas = new Map(); // iso → { el, relleno, ico, pos, ancho, texto }

  function quitar(iso) { const f = filas.get(iso); if (f) { f.el.remove(); filas.delete(iso); } }
  function seguir() {
    if (raiz.hidden) return;
    const t = trabajos();
    for (const iso of [...filas.keys()]) if (!t.has(iso)) quitar(iso);
    for (const [iso, o] of t) {
      let f = filas.get(iso);
      if (!f) {
        const el = document.createElement("div"); el.className = "bp-u";
        const ico = document.createElement("span"), i = document.createElement("i"), r = document.createElement("b");
        i.appendChild(r); el.append(ico, i); raiz.appendChild(el);
        f = { el, relleno: r, ico, pos: "", ancho: "", texto: "" }; filas.set(iso, f);
      }
      const p = mundo.posicion(iso);
      if (!p || !p.visible) { f.el.style.visibility = "hidden"; continue; }
      f.el.style.visibility = "";
      const w = Math.round(Math.max(0, Math.min(1, 1 - o.resta / o.total)) * 100) + "%";
      if (w !== f.ancho) { f.ancho = w; f.relleno.style.width = w; }
      if (o.texto !== f.texto) { f.texto = o.texto; f.ico.textContent = icono(o.texto); f.el.title = o.texto; }
      const tr = "translate(" + (p.x - 22).toFixed(1) + "px," + (p.y + 12).toFixed(1) + "px)"; // un poco debajo del centro del país
      if (tr !== f.pos) { f.pos = tr; f.el.style.transform = tr; }
    }
  }
  function limpiar() { for (const iso of [...filas.keys()]) quitar(iso); }
  return { seguir, limpiar, mostrar(si) { raiz.hidden = !si; if (!si) limpiar(); } };
}
