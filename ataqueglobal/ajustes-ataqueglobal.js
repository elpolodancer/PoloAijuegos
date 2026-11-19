// Ruta: ataqueglobal/ajustes-ataqueglobal.js
// PANEL DE AJUSTES (se abre desde el menú de pausa): volumen de la música, volumen de los efectos y pantalla completa.
// Los volúmenes se guardan en el aparato (localStorage). Estilos propios inyectados; no usa Firebase ni red.
//
//   const ajustes = crearAjustes({ alCerrar: () => {}, alCambiar: (tipo, valor) => {} });   // tipo: "musica" | "efectos"; valor: 0 a 1
//   ajustes.abrir(); ajustes.cerrar(); ajustes.abierto(); ajustes.volumen("musica") → 0..1
// Para que la música/los efectos obedezcan, cualquier módulo puede:
//   import { volumenGuardado } from "./ajustes-ataqueglobal.js";  →  audio.volume = volumenGuardado("musica");
//   o escuchar:  addEventListener("ataqueglobal:volumen", (e) => { e.detail.tipo, e.detail.valor });
// Además, la música se aplica sola a cualquier <audio>/<video> que ya esté en la página.

const CLAVES = { musica: "ataqueglobal_vol_musica", efectos: "ataqueglobal_vol_efectos" };
const DEFECTO = { musica: 0.7, efectos: 0.8 };
export function volumenGuardado(tipo) {
  try { const v = localStorage.getItem(CLAVES[tipo]); if (v != null && v !== "") { const n = Number(v); if (n >= 0 && n <= 1) return n; } } catch (e) {}
  return DEFECTO[tipo];
}

const CSS = `
.aj{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,8,14,.72)}
.aj[hidden]{display:none}
.aj-p{width:min(92vw,420px);max-height:100%;overflow-y:auto;box-sizing:border-box;padding:16px 16px 14px;color:#f1f2f4;font:600 14px system-ui,sans-serif;
  background:linear-gradient(180deg,#1a3944,#0d1f27);border:2px solid #2de8f5;border-radius:18px;box-shadow:0 0 0 3px rgba(45,232,245,.15),0 12px 28px rgba(0,0,0,.6)}
.aj-p h2{margin:0 0 12px;font-size:1.3rem;color:#8ff4fb}
.aj-f{margin:0 0 14px}
.aj-f label{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;font-weight:800;color:#e6fbff}
.aj-f label output{color:#8ff4fb;font-variant-numeric:tabular-nums}
.aj-f small{display:block;margin-top:4px;color:#a9c3c9;font-size:.74rem;font-weight:600}
.aj-f input[type=range]{width:100%;height:32px;margin:0;accent-color:#2de8f5;touch-action:pan-y;cursor:pointer}
.aj-p button{font:800 14px system-ui,sans-serif;width:100%;padding:11px 14px;margin-top:2px;color:#2de8f5;background:#06141c;border:2px solid #2de8f5;border-radius:12px;cursor:pointer;touch-action:manipulation}
.aj-p button:hover:not(:disabled){background:#0b2530}
.aj-p button:disabled{color:#7f9096;border-color:#4d5c61;cursor:default}
.aj-p .aj-ok{margin-top:12px;color:#fff;background:#1d6b78}
.aj-p button:focus-visible,.aj-f input:focus-visible{outline:3px solid #fff;outline-offset:2px}
`;

export function crearAjustes({ alCerrar, alCambiar } = {}) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  const raiz = document.createElement("div"); raiz.className = "aj"; raiz.hidden = true;
  raiz.setAttribute("role", "dialog"); raiz.setAttribute("aria-modal", "true"); raiz.setAttribute("aria-labelledby", "aj-titulo");
  raiz.innerHTML =
    '<div class="aj-p"><h2 id="aj-titulo">⚙️ Ajustes</h2>' +
    '<div class="aj-f"><label for="aj-musica">🎵 Música <output id="aj-musica-n"></output></label><input id="aj-musica" type="range" min="0" max="100" step="1"></div>' +
    '<div class="aj-f"><label for="aj-efectos">💥 Efectos <output id="aj-efectos-n"></output></label><input id="aj-efectos" type="range" min="0" max="100" step="1"><small>Los efectos de sonido llegarán pronto; ya queda guardado tu volumen.</small></div>' +
    '<div class="aj-f"><button type="button" id="aj-pc"></button><small id="aj-pc-nota" hidden>Este navegador no permite pantalla completa.</small></div>' +
    '<button type="button" class="aj-ok" id="aj-ok">Volver</button></div>';
  document.body.appendChild(raiz);
  const $ = (id) => raiz.querySelector("#" + id);
  const btnPC = $("aj-pc");

  function aplicar(tipo, v) {
    if (tipo === "musica") document.querySelectorAll("audio,video").forEach((el) => { try { el.volume = v; } catch (e) {} });
    dispatchEvent(new CustomEvent("ataqueglobal:volumen", { detail: { tipo, valor: v } }));
    if (alCambiar) alCambiar(tipo, v);
  }
  for (const tipo of ["musica", "efectos"]) {
    const r = $("aj-" + tipo), n = $("aj-" + tipo + "-n");
    r.value = String(Math.round(volumenGuardado(tipo) * 100)); n.textContent = r.value + " %";
    r.addEventListener("input", () => {
      const v = Number(r.value) / 100; n.textContent = r.value + " %";
      try { localStorage.setItem(CLAVES[tipo], String(v)); } catch (e) {}
      aplicar(tipo, v);
    });
  }
  aplicar("musica", volumenGuardado("musica")); // al arrancar, la música ya existente respeta el volumen guardado

  const puedePC = !!(document.documentElement.requestFullscreen && document.fullscreenEnabled !== false);
  function pintarPC() {
    btnPC.disabled = !puedePC; $("aj-pc-nota").hidden = puedePC;
    btnPC.textContent = document.fullscreenElement ? "⛶ Salir de pantalla completa" : "⛶ Pantalla completa";
  }
  btnPC.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }
      else { await document.documentElement.requestFullscreen(); if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape").catch(() => {}); }
    } catch (e) {}
    pintarPC();
  });
  document.addEventListener("fullscreenchange", pintarPC);
  pintarPC();

  function cerrar() { if (raiz.hidden) return; raiz.hidden = true; if (alCerrar) alCerrar(); }
  function abrir() { pintarPC(); raiz.hidden = false; $("aj-ok").focus(); }
  $("aj-ok").addEventListener("click", cerrar);
  raiz.addEventListener("pointerdown", (ev) => { if (ev.target === raiz) cerrar(); });
  // Esc cierra los ajustes antes que cualquier otra cosa (así no cierra además la pausa)
  addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !raiz.hidden) { ev.preventDefault(); ev.stopPropagation(); cerrar(); } }, true);

  return { abrir, cerrar, abierto: () => !raiz.hidden, volumen: volumenGuardado };
}
