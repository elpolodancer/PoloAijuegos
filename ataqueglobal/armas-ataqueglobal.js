// Ruta: ataqueglobal/armas-ataqueglobal.js
// BOTONES DE ATAQUE (abajo a la derecha del mundo, a la izquierda del ⛶ y de la columna de zoom) + aviso de «elige el objetivo» + burbuja de confirmación.
//   💀 «todos»  = apunta TODOS los misiles (niveles 1, 2 y 3);   ✈✈✈ «n1» = apunta solo los de nivel 1;   🧪 «super1» y «super2» = superarmas (aún sin efecto).
// Solo es pantalla: no sabe de reglas. juego-ataqueglobal.js le dice qué mostrar (pintar) y qué hacer al pulsar (alPulsar) y al confirmar o cancelar.
//
// Uso:
//   const armas = crearArmas({ mundo, alPulsar: (id) => {}, alConfirmar: () => {}, alCancelar: () => {} });
//   armas.pintar({ todos: { n: 5, activo: false }, n1: { n: 5, activo: false }, supers: [{ estado: "bloqueada"|"disponible"|"curso"|"lista", fraccion: 0.4 }, { … }] });
//   armas.mostrar(true|false);  armas.banner("Elige dónde atacar…") / armas.banner(null);
//   armas.confirmar({ lon, lat, texto, puedeDisparar }) / armas.confirmar(null);  armas.seguir() (cada cuadro: la burbuja sigue al objetivo);  armas.apuntando() → ¿hay aviso o burbuja?

const jet = (x, y, k) => '<path transform="translate(' + x + " " + y + ") scale(" + k + ')" d="M0 -6.5l1.6 4.5v2.5l3.6 2.6v1.6l-3.6-.9-.6 2.7h-2l-.6-2.7-3.6.9v-1.6l3.6-2.6v-2.5z"/>';
const ICONOS = {
  todos: '<circle cx="12" cy="12" r="10.8"/><path d="M12 .5v3M12 20.5v3M.5 12h3M20.5 12h3"/><path d="M12 6.5c-2.6 0-4.5 1.8-4.5 4.2 0 1.4.7 2.4 1.7 3V16h5.6v-2.3c1-.6 1.7-1.6 1.7-3 0-2.4-1.9-4.2-4.5-4.2z"/><circle cx="10.2" cy="11" r="1"/><circle cx="13.8" cy="11" r="1"/><path d="M10.7 16v-1.5M12 16v-1.5M13.3 16v-1.5"/>',
  n1: jet(12, 10, 1.150) + jet(5, 16.5, .8) + jet(19, 16.5, .8),
  super1: '<circle cx="11.5" cy="14.5" r="6.5"/><path d="M15 9.2l2-3M17 6.2l2.3-.8M18 4l.6 1.7M8.5 13.5a3.2 3.2 0 0 1 2.3-2.3"/>',
  super2: '<path d="M12 2c2.6 2.6 3.6 6.2 3 11.2H9C8.4 8.2 9.4 4.6 12 2z"/><circle cx="12" cy="8" r="1.5"/><path d="M9 13.2l-2.6 4.2h3.2M15 13.2l2.6 4.2h-3.2M10.5 18h3M12 18v4"/>',
};
const NOMBRES = { todos: "Apuntar todos los misiles", n1: "Atacar con todos los misiles de nivel 1", super1: "Primera superarma", super2: "Segunda superarma" };
const CSS = `
.ar{position:fixed;z-index:5;right:max(62px,calc(env(safe-area-inset-right) + 62px));bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:flex-end;gap:12px}
.ar[hidden]{display:none}
.ar-col{display:flex;flex-direction:column;align-items:center;gap:9px}
.ar-un{display:flex;flex-direction:column;align-items:center;gap:3px}
.ar-b{position:relative;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%;border:3px solid #2de8f5;color:#2de8f5;background:radial-gradient(circle at 50% 30%,#10404e,#06141c 78%);
  box-shadow:0 0 0 3px rgba(45,232,245,.16),0 0 14px rgba(45,232,245,.45),inset 0 0 10px rgba(45,232,245,.25);cursor:pointer;touch-action:manipulation;transition:filter .12s,transform .08s}
.ar-b svg{display:block;width:62%;height:62%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.ar-b:hover:not(:disabled){filter:brightness(1.3)}
.ar-b:active:not(:disabled){transform:scale(.94);filter:brightness(1.6)}
.ar-b:disabled{color:#7f9096;border-color:#4d5c61;box-shadow:none;cursor:default;filter:saturate(.3)}
.ar-b:focus-visible{outline:3px solid #fff;outline-offset:3px}
.ar-b.activo{animation:ar-pulso .8s ease-in-out infinite alternate;color:#ff6a5e;border-color:#ff6a5e}
@keyframes ar-pulso{to{box-shadow:0 0 0 5px rgba(255,106,94,.3),0 0 20px rgba(255,106,94,.8),inset 0 0 12px rgba(255,106,94,.4)}}
.ar-todos{width:78px;height:78px}.ar-n1{width:62px;height:62px}.ar-sup{width:54px;height:54px}
.ar-num{position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;padding:0 5px;box-sizing:border-box;border-radius:11px;font:800 11px/17px system-ui,sans-serif;text-align:center;color:#fff;background:#02121a;border:2px solid #2de8f5}
.ar-num:empty{display:none}
.ar-anillo{position:absolute;inset:-7px;border-radius:50%;pointer-events:none;opacity:0;background:conic-gradient(#2de8f5 calc(var(--f,0) * 360deg),rgba(45,232,245,.15) 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3px));mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3px))}
.ar-b.curso .ar-anillo{opacity:1}
.ar-cap{font:800 10px/1 system-ui,sans-serif;letter-spacing:.08em;color:#2de8f5;text-shadow:0 1px 3px #000,0 0 6px rgba(0,0,0,.8);white-space:nowrap}
.ar-cap.apagado{color:#8fa0a6}
#ficha{max-width:max(180px,calc(100vw - 400px))}
@media (max-height:420px){.ar-todos{width:68px;height:68px}.ar-n1{width:54px;height:54px}.ar-sup{width:46px;height:46px}.ar-col{gap:6px}}
@media (prefers-reduced-motion:reduce){.ar-b.activo{animation:none}}

.ab{position:fixed;z-index:6;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);max-width:max(200px,calc(100vw - 340px));display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;
  font:700 13px/1.25 system-ui,sans-serif;color:#d8fdff;background:rgba(2,18,26,.92);border:2px solid #2de8f5;border-radius:14px;box-shadow:0 0 14px rgba(45,232,245,.45)}
.ab[hidden]{display:none}
.ab button,.ac button{font:800 12px system-ui,sans-serif;letter-spacing:.04em;padding:7px 12px;color:#2de8f5;background:#06141c;border:2px solid #2de8f5;border-radius:10px;cursor:pointer;touch-action:manipulation}
.ac{position:fixed;z-index:6;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:7px;padding:9px 12px;text-align:center;color:#d8fdff;font:700 13px/1.25 system-ui,sans-serif;
  background:rgba(2,18,26,.94);border:2px solid #2de8f5;border-radius:14px;box-shadow:0 0 14px rgba(45,232,245,.45);white-space:nowrap}
.ac[hidden]{display:none}
.ac-f{display:flex;gap:8px}
.ac .ac-si{color:#fff;background:#b3261e;border-color:#ff6a5e}
.ac .ac-si:hover{filter:brightness(1.2)}
.ab button:focus-visible,.ac button:focus-visible{outline:3px solid #fff;outline-offset:2px}
`;

export function crearArmas({ mundo, contenedor = document.body, alPulsar, alConfirmar, alCancelar }) {
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const raiz = document.createElement("div"); raiz.className = "ar"; raiz.hidden = true; raiz.setAttribute("role", "group"); raiz.setAttribute("aria-label", "Armas");
  const botones = {};
  function unidad(id, clase, conNumero) {
    const u = document.createElement("div"); u.className = "ar-un";
    const b = document.createElement("button"); b.type = "button"; b.className = "ar-b " + clase; b.setAttribute("aria-label", NOMBRES[id]); b.title = NOMBRES[id];
    b.innerHTML = '<span class="ar-anillo"></span><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[id] + "</svg>" + (conNumero ? '<span class="ar-num"></span>' : "");
    b.addEventListener("click", () => { if (alPulsar) alPulsar(id); });
    const c = document.createElement("span"); c.className = "ar-cap";
    u.append(b, c);
    botones[id] = { b, c, n: b.querySelector(".ar-num"), anillo: b.querySelector(".ar-anillo"), clave: "" };
    return u;
  }
  const colA = document.createElement("div"); colA.className = "ar-col"; colA.append(unidad("super1", "ar-sup"), unidad("super2", "ar-sup"));
  const colB = document.createElement("div"); colB.className = "ar-col"; colB.append(unidad("n1", "ar-n1", true), unidad("todos", "ar-todos", true));
  raiz.append(colA, colB);
  contenedor.appendChild(raiz);

  const aviso = document.createElement("div"); aviso.className = "ab"; aviso.hidden = true; aviso.setAttribute("role", "status");
  const avisoT = document.createElement("span"), avisoX = document.createElement("button"); avisoX.type = "button"; avisoX.textContent = "CANCELAR";
  avisoX.addEventListener("click", () => { if (alCancelar) alCancelar(); });
  aviso.append(avisoT, avisoX); contenedor.appendChild(aviso);

  const burbuja = document.createElement("div"); burbuja.className = "ac"; burbuja.hidden = true;
  const burbujaT = document.createElement("span"), fila = document.createElement("div"); fila.className = "ac-f";
  const no = document.createElement("button"); no.type = "button"; no.textContent = "✕"; no.setAttribute("aria-label", "Cancelar");
  const si = document.createElement("button"); si.type = "button"; si.className = "ac-si"; si.textContent = "DISPARAR";
  no.addEventListener("click", () => { if (alCancelar) alCancelar(); });
  si.addEventListener("click", () => { if (alConfirmar) alConfirmar(); });
  fila.append(no, si); burbuja.append(burbujaT, fila); contenedor.appendChild(burbuja);
  let objetivo = null, medida = "";

  // Esc cancela el apuntado antes que cualquier otra cosa (así no abre además el menú de pausa)
  addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !aviso.hidden) { ev.preventDefault(); ev.stopPropagation(); if (alCancelar) alCancelar(); } }, true);

  function pintarBoton(id, { disabled, activo, curso, fraccion, cap, apagado, num }) {
    const x = botones[id], clave = [disabled, activo, curso, Math.round((fraccion || 0) * 100), cap, num].join("|");
    if (x.clave === clave) return;
    x.clave = clave;
    x.b.disabled = !!disabled; x.b.classList.toggle("activo", !!activo); x.b.classList.toggle("curso", !!curso);
    x.b.style.setProperty("--f", String(fraccion || 0));
    x.c.textContent = cap; x.c.classList.toggle("apagado", !!apagado);
    if (x.n) x.n.textContent = num > 0 ? String(num) : "";
  }
  function pintar(e) {
    for (const id of ["todos", "n1"]) {
      const d = e[id], hay = d.n > 0;
      pintarBoton(id, { disabled: !hay && !d.activo, activo: d.activo, cap: d.activo ? "CANCELAR" : hay ? "A PUNTO" : "SIN MISILES", apagado: !hay && !d.activo, num: d.n });
    }
    ["super1", "super2"].forEach((id, i) => {
      const d = e.supers[i], es = d.estado;
      pintarBoton(id, { disabled: es !== "lista", curso: es === "curso", fraccion: d.fraccion, apagado: es !== "lista",
        cap: es === "lista" ? "A PUNTO" : es === "curso" ? "INVESTIGANDO" : es === "disponible" ? "SIN INVESTIGAR" : "BLOQUEADA" });
    });
  }
  function banner(texto) { aviso.hidden = !texto; if (texto) avisoT.textContent = texto; }
  function confirmar(d) {
    objetivo = d || null;
    burbuja.hidden = !d;
    if (!d) return;
    burbujaT.textContent = d.texto; si.hidden = !d.puedeDisparar; medida = "";
    seguir();
  }
  // La burbuja se queda junto al objetivo mientras se gira o se acerca el planeta
  function seguir() {
    if (!objetivo || burbuja.hidden) return;
    const p = mundo.aPantalla(objetivo.lon, objetivo.lat);
    if (!p) { burbuja.style.visibility = "hidden"; return; }
    burbuja.style.visibility = "";
    const w = burbuja.offsetWidth || 180, h = burbuja.offsetHeight || 70, W = innerWidth, H = innerHeight;
    const x = Math.max(8, Math.min(W - w - 8, p[0] - w / 2));
    const abajo = p[1] - h - 34 < 50; // si no cabe arriba del objetivo, va abajo
    const y = abajo ? Math.min(H - h - 8, p[1] + 34) : p[1] - h - 34;
    const t = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
    if (t !== medida) { medida = t; burbuja.style.transform = t; }
  }

  return { pintar, mostrar(si_) { raiz.hidden = !si_; }, banner, confirmar, seguir, apuntando: () => !aviso.hidden || !burbuja.hidden };
}
