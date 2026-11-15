// Ruta: granjafeliz/panel-almacen-granjafeliz.js
// Ventana «Enviar productos» de Granja feliz (como la de Farm Frenzy): se abre al tocar el almacén. Un tablero con DOS zonas:
//   izquierda = tu ALMACÉN (imagen del producto y la cantidad como x1, x2, x3…), derecha = lo que ya estás CARGANDO en el camión para venderlo.
// Cada fila tiene los botones «1» (pasa uno) y «todo» (pasa todos los que quepan). A la derecha de la ventana va el camión del juego (el mismo que dibuja escena-granjafeliz.js)
// con el peso que lleva y lo que te pagarán. «Enviar ▶» manda el camión; «Cancelar» (o Esc, o tocar fuera) cierra sin cambiar nada.
// No usa Firebase ni la lógica del juego: recibe los datos y avisa con funciones. Trae sus PROPIOS estilos (los inyecta al abrir), así que no hace falta tocar ningún .css.
//
//   const panel = crearPanelAlmacen({ productos: D.PRODUCTOS, pesoDe: (k) => peso en el camión (opcional), dibujarCamion: ES.dibujarCamion, alAbrir, alCerrar, alEnviar });
//   panel.abrir({ almacen: J.almacen, capCamion: 60, camionLejos: false });   // almacen = { producto: cantidad }
//   alEnviar(carga) recibe { producto: cantidad } ya validado por el panel; el juego lo vuelve a validar y devuelve true si el camión salió.
//   panel.cerrar();  panel.abierto();
// Pestaña «Animales» (opcional, como en Farm Frenzy: clic en el almacén → animales → elegir cuál y cuántos → se venden al 50 %):
//   crearPanelAlmacen({ ..., alVender: (sel) => true })   y   panel.abrir({ ..., animales: { gallina: { n: 3, venta: 50, nombre: "Gallina", emoji: "🐔" }, ... } })
//   alVender(sel) recibe { tipo: cantidad } ya validado por el panel; el juego lo vuelve a validar y devuelve true si se vendió. Sin «animales» no hay pestañas.

function inyectarEstilos() {
  if (document.getElementById("pa-estilos")) return;
  const e = document.createElement("style");
  e.id = "pa-estilos";
  e.textContent =
    ".pa-fondo{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:8px;background:rgba(0,0,0,.55);font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none}" +
    ".pa-fondo[hidden]{display:none}" +
    ".pa-panel{width:min(780px,100%);max-height:100%;display:flex;flex-direction:column;gap:8px;padding:10px 14px 12px;border-radius:18px;background:linear-gradient(180deg,#ecd3a0,#d9b57a);border:3px solid #7a4d22;box-shadow:0 12px 40px rgba(0,0,0,.5);color:#3b2410}" +
    ".pa-panel h2{margin:0;text-align:center;font-size:1.15rem;color:#5a3512;text-shadow:0 1px 0 rgba(255,240,210,.7)}" +
    ".pa-cuerpo{display:flex;gap:10px;min-height:0;flex:1}" +
    ".pa-tablero{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;background:#8a5a2c;border:2px solid #5a3512;border-radius:10px;overflow:hidden;max-height:calc(100dvh - 120px)}" +
    ".pa-zona{display:flex;flex-direction:column;min-width:0;min-height:0}" +
    ".pa-zona+.pa-zona{border-left:2px solid #5a3512}" +
    ".pa-zona h3{margin:0;padding:5px 8px;font-size:.85rem;color:#fff4c2;background:#6b4423;text-align:center}" +
    ".pa-lista{flex:1;min-height:120px;overflow:auto;padding:4px;display:flex;flex-direction:column;gap:3px}" +
    ".pa-fila{display:flex;align-items:center;gap:6px;padding:3px 6px;min-height:38px;border-radius:7px;background:rgba(255,226,150,.14);color:#fff;font-weight:800;font-size:.9rem}" +
    ".pa-fila[hidden]{display:none}.pa-fila.vacia{opacity:.4}" +
    ".pa-ico{font-size:1.4rem;line-height:1;width:1.7rem;text-align:center}" +
    ".pa-x{min-width:2.2em}" +
    ".pa-info{flex:1;min-width:0;text-align:right;font-size:.75rem;color:#ffe6a8;font-weight:700;white-space:nowrap}" +
    ".pa-vacio{padding:10px 6px;text-align:center;font-size:.8rem;color:#ffe6a8}" +
    ".pa-b{min-width:34px;height:30px;padding:0 8px;font:inherit;font-size:.78rem;font-weight:800;color:#fff;background:linear-gradient(180deg,#4a9bff,#1f5fcf);border:2px solid #123c86;border-radius:9px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
    ".pa-b:disabled{opacity:.4;cursor:default}.pa-b:focus-visible{outline:2px solid #fff;outline-offset:1px}" +
    ".pa-lado{width:210px;display:flex;flex-direction:column;gap:8px;align-items:stretch}" +
    ".pa-camion{display:block;width:100%;height:auto}" +
    ".pa-peso{height:16px;border-radius:8px;background:rgba(0,0,0,.4);overflow:hidden;border:2px solid #5a3512}" +
    ".pa-peso i{display:block;height:100%;width:0;background:#7be05a}.pa-peso.lleno i{background:#ffb020}" +
    ".pa-ptxt{text-align:center;font-weight:800;font-size:.85rem}" +
    ".pa-total{padding:6px;border-radius:9px;background:#6b4423;color:#fff4c2;text-align:center;font-weight:800}" +
    ".pa-msg{min-height:1.2em;font-size:.8rem;text-align:center;color:#7a1f10;font-weight:700}" +
    ".pa-acciones{display:flex;gap:8px}.pa-acciones .b3d{flex:1}" +
    ".pa-tabs{display:flex;gap:8px;justify-content:center}" +
    ".pa-tab{height:32px;padding:0 14px;font:inherit;font-size:.85rem;font-weight:800;color:#5a3512;background:rgba(255,240,210,.55);border:2px solid #7a4d22;border-radius:10px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
    ".pa-tab[aria-selected=true]{color:#fff4c2;background:#6b4423}.pa-tab:focus-visible{outline:2px solid #fff;outline-offset:1px}" +
    ".pa-cuerpo[hidden]{display:none}" +
    "@media (max-width:640px){.pa-cuerpo{flex-direction:column;overflow:auto}.pa-lado{width:auto}.pa-camion{max-width:150px;margin:0 auto}}" +
    "@media (max-height:460px){.pa-panel{padding:6px 10px 8px;gap:5px}.pa-fila{min-height:32px}.pa-camion{max-width:150px;margin:0 auto}.pa-tablero{max-height:calc(100dvh - 100px)}}";
  document.head.appendChild(e);
}
const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
const fmt = (n) => Number(n).toLocaleString("es-MX");

export function crearPanelAlmacen(o) {
  const P = o.productos, peso = o.pesoDe || ((k) => P[k].peso);   // peso de cada producto EN EL CAMIÓN (el juego lo calcula: el oso enjaulado depende del almacén)
  let fondo = null, S = null, previo = null, filas = {}, ui = {}, A = null, filasA = {}, uiA = {}, titulo = null, tabs = {};

  const pesoCarga = () => Object.keys(S.carga).reduce((t, k) => t + S.carga[k] * peso(k), 0);
  const valorCarga = () => Object.keys(S.carga).reduce((t, k) => t + S.carga[k] * P[k].valor, 0);

  function pasar(k, n) { // n = Infinity para «todo»
    const quedan = S.hay[k] - (S.carga[k] || 0), cabe = Math.floor((S.cap - pesoCarga()) / peso(k)), m = Math.min(n, quedan, cabe);
    if (m <= 0) {
      S.msg = peso(k) > S.cap ? "El camión no puede con «" + P[k].nombre + "» (pesa " + peso(k) + " y el camión lleva " + S.cap + "). Mejora el camión."
        : cabe <= 0 ? "No cabe más en el camión (" + pesoCarga() + " / " + S.cap + ")" : "";
      render(); return;
    }
    S.carga[k] = (S.carga[k] || 0) + m; S.msg = ""; render();
  }
  function devolver(k, n) {
    const m = Math.min(n, S.carga[k] || 0);
    if (m <= 0) return;
    S.carga[k] -= m; if (!S.carga[k]) delete S.carga[k];
    S.msg = ""; render();
  }

  function pintarCamion() { // el camión del juego, con un poco de la carga asomando sobre la caja
    const c = ui.cv.getContext("2d");
    c.setTransform(3, 0, 0, 3, 0, 0); c.clearRect(0, 0, 116, 70);
    o.dibujarCamion(c, { x: 0, y: 14, w: 116, h: 90 }, false, false);
    const unidades = [];
    for (const k of Object.keys(S.carga)) for (let i = 0; i < Math.min(3, S.carga[k]); i++) unidades.push(P[k].emoji);
    c.fillStyle = "#000"; c.font = "15px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    unidades.slice(0, 6).forEach((e, i) => c.fillText(e, 26 + i * 8, 22));
  }

  // Por qué hay botones apagados: un botón desactivado no recibe toques, así que el motivo se muestra siempre abajo (no solo al tocar).
  function explicar() {
    const pend = Object.keys(S.hay).filter((k) => S.hay[k] - (S.carga[k] || 0) > 0);
    const pesado = pend.find((k) => peso(k) > S.cap);
    if (pesado) return "El camión no puede con «" + P[pesado].nombre + "» (pesa " + peso(pesado) + " y el camión lleva " + S.cap + "). Mejora el camión.";
    const noCaben = pend.filter((k) => Math.floor((S.cap - pesoCarga()) / peso(k)) < 1).map((k) => P[k].nombre);
    if (!noCaben.length) return "";
    return "No cabe más en el camión (" + pesoCarga() + " / " + S.cap + "): " + noCaben.slice(0, 3).join(", ") + (noCaben.length > 3 ? "…" : "") + ". Lo que sobra se queda en el almacén.";
  }

  function render() {
    for (const k in filas) {
      const f = filas[k], quedan = S.hay[k] - (S.carga[k] || 0), enCamion = S.carga[k] || 0, cabe = Math.floor((S.cap - pesoCarga()) / peso(k));
      f.izq.fila.classList.toggle("vacia", quedan <= 0);
      f.izq.x.textContent = "x" + quedan;
      f.izq.uno.disabled = S.lejos || quedan < 1 || cabe < 1;
      f.izq.todo.disabled = f.izq.uno.disabled;
      f.der.fila.hidden = enCamion <= 0;
      f.der.x.textContent = "x" + enCamion;
      f.der.info.textContent = "$" + fmt(enCamion * P[k].valor);
      f.der.uno.disabled = S.lejos || enCamion < 1;
      f.der.todo.disabled = f.der.uno.disabled;
    }
    const pesoTotal = pesoCarga(), valor = valorCarga();
    ui.vacio.hidden = Object.keys(S.hay).length > 0;
    ui.peso.firstChild.style.width = Math.min(100, (pesoTotal / S.cap) * 100) + "%";
    ui.peso.classList.toggle("lleno", pesoTotal >= S.cap);
    ui.ptxt.textContent = "⚖️ " + pesoTotal + " / " + S.cap;
    ui.total.textContent = "💵 $" + fmt(valor);
    ui.msg.textContent = S.lejos ? "El camión está en camino. Cuando regrese podrás cargarlo." : S.msg || explicar();
    ui.enviar.disabled = S.lejos || valor <= 0;
    pintarCamion();
  }

  function fila(k, lado) { // lado: "izq" (almacén) o "der" (camión)
    const f = el("div", "pa-fila"), x = el("span", "pa-x"), info = el("span", "pa-info", lado === "izq" ? "⚖️" + peso(k) : "");
    const uno = el("button", "pa-b", "1"), todo = el("button", "pa-b", "todo");
    uno.type = todo.type = "button";
    const q = lado === "izq" ? "Pasar al camión" : "Quitar del camión";
    uno.setAttribute("aria-label", q + ": 1 " + P[k].nombre.toLowerCase()); todo.setAttribute("aria-label", q + ": todo " + P[k].nombre.toLowerCase());
    uno.addEventListener("click", () => (lado === "izq" ? pasar(k, 1) : devolver(k, 1)));
    todo.addEventListener("click", () => (lado === "izq" ? pasar(k, Infinity) : devolver(k, Infinity)));
    f.append(el("span", "pa-ico", P[k].emoji), x, info, uno, todo);
    return { fila: f, x, info, uno, todo };
  }

  // ----- Pestaña «Animales»: izquierda = los de tu granja, derecha = los que vas a vender (al 50 %) -----
  const totalVenta = () => Object.keys(A.venta).reduce((t, k) => t + A.venta[k] * A.info[k].venta, 0);
  const cuantosVenta = () => Object.keys(A.venta).reduce((t, k) => t + A.venta[k], 0);
  function ponerEnVenta(k, n) { const m = Math.min(n, A.hay[k] - (A.venta[k] || 0)); if (m > 0) { A.venta[k] = (A.venta[k] || 0) + m; renderA(); } }
  function quitarDeVenta(k, n) { const m = Math.min(n, A.venta[k] || 0); if (m <= 0) return; A.venta[k] -= m; if (!A.venta[k]) delete A.venta[k]; renderA(); }
  function filaA(k, lado) {
    const f = el("div", "pa-fila"), x = el("span", "pa-x"), info = el("span", "pa-info");
    const uno = el("button", "pa-b", "1"), todo = el("button", "pa-b", "todo");
    uno.type = todo.type = "button";
    const q = lado === "izq" ? "Poner a la venta" : "Quitar de la venta", nom = A.info[k].nombre.toLowerCase();
    uno.setAttribute("aria-label", q + ": 1 " + nom); todo.setAttribute("aria-label", q + ": todas las " + nom + "s");
    uno.addEventListener("click", () => (lado === "izq" ? ponerEnVenta(k, 1) : quitarDeVenta(k, 1)));
    todo.addEventListener("click", () => (lado === "izq" ? ponerEnVenta(k, Infinity) : quitarDeVenta(k, Infinity)));
    f.append(el("span", "pa-ico", A.info[k].emoji), x, info, uno, todo);
    return { fila: f, x, info, uno, todo };
  }
  function renderA() {
    for (const k in filasA) {
      const f = filasA[k], quedan = A.hay[k] - (A.venta[k] || 0), v = A.venta[k] || 0;
      f.izq.fila.classList.toggle("vacia", quedan <= 0);
      f.izq.x.textContent = "x" + quedan; f.izq.info.textContent = "$" + fmt(A.info[k].venta) + " c/u";
      f.izq.uno.disabled = f.izq.todo.disabled = quedan < 1;
      f.der.fila.hidden = v <= 0;
      f.der.x.textContent = "x" + v; f.der.info.textContent = "$" + fmt(v * A.info[k].venta);
      f.der.uno.disabled = f.der.todo.disabled = v < 1;
    }
    uiA.vacio.hidden = Object.keys(A.hay).length > 0;
    uiA.total.textContent = "💵 +$" + fmt(totalVenta()) + (cuantosVenta() ? " (" + cuantosVenta() + ")" : "");
    uiA.msg.textContent = A.msg || "Se venden al 50 % de su precio. Perderás lo que estén produciendo.";
    uiA.vender.disabled = cuantosVenta() < 1;
  }
  function vender() {
    if (!A || cuantosVenta() < 1) return;
    if (o.alVender && o.alVender({ ...A.venta }) === false) { A.msg = "No se pudo vender"; renderA(); return; }
    cerrar();
  }
  function mostrarTab(t) {
    const an = t === "animales" && !!A;
    ui.cuerpo.hidden = an; if (uiA.cuerpo) uiA.cuerpo.hidden = !an;
    for (const id in tabs) tabs[id].setAttribute("aria-selected", String(id === (an ? "animales" : "prod")));
    titulo.textContent = an ? "🐾 Vender animales" : "📦 Enviar productos";
    fondo.setAttribute("aria-label", an ? "Vender animales" : "Enviar productos");
    if (an) renderA(); else render();
  }

  function abrir(datos) {
    if (fondo) return;
    inyectarEstilos();
    previo = document.activeElement;
    const hay = {};
    for (const k of Object.keys(P)) { const n = Math.floor(Number(datos.almacen && datos.almacen[k])) || 0; if (n > 0) hay[k] = n; }
    S = { hay, carga: {}, cap: datos.capCamion, lejos: !!datos.camionLejos, msg: "" };
    A = null; filasA = {}; uiA = {}; tabs = {};
    if (datos.animales) {
      const h = {}, info = {};
      for (const k of Object.keys(datos.animales)) { const a = datos.animales[k], n = Math.floor(Number(a && a.n)) || 0; if (n > 0) { h[k] = n; info[k] = { nombre: String(a.nombre || k), emoji: String(a.emoji || "🐾"), venta: Math.max(0, Math.floor(Number(a.venta)) || 0) }; } }
      A = { hay: h, venta: {}, info, msg: "" };   // con «animales» siempre hay pestaña (si no hay ninguno dice «No tienes animales»)
    }

    fondo = el("div", "pa-fondo");
    fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Enviar productos");
    const panel = el("div", "pa-panel");
    const listaIzq = el("div", "pa-lista"), listaDer = el("div", "pa-lista");
    filas = {};
    for (const k of Object.keys(hay)) { filas[k] = { izq: fila(k, "izq"), der: fila(k, "der") }; listaIzq.appendChild(filas[k].izq.fila); listaDer.appendChild(filas[k].der.fila); }
    ui.vacio = el("div", "pa-vacio", "El almacén está vacío"); listaIzq.appendChild(ui.vacio);
    const zona = (titulo, lista) => { const z = el("div", "pa-zona"); z.append(el("h3", "", titulo), lista); return z; };
    const tablero = el("div", "pa-tablero"); tablero.append(zona("📦 Almacén", listaIzq), zona("🚚 En el camión", listaDer));

    ui.cv = el("canvas", "pa-camion"); ui.cv.width = 116 * 3; ui.cv.height = 70 * 3;
    ui.peso = el("div", "pa-peso"); ui.peso.appendChild(el("i"));
    ui.ptxt = el("div", "pa-ptxt"); ui.total = el("div", "pa-total"); ui.msg = el("div", "pa-msg"); ui.msg.setAttribute("role", "status");
    const cancelar = el("button", "b3d txt b-gris", "Cancelar"); cancelar.type = "button"; cancelar.addEventListener("click", cerrar);
    ui.enviar = el("button", "b3d txt b-verde", "Enviar ▶"); ui.enviar.type = "button"; ui.enviar.addEventListener("click", enviar);
    const acciones = el("div", "pa-acciones"); acciones.append(cancelar, ui.enviar);
    const lado = el("div", "pa-lado"); lado.append(ui.cv, ui.ptxt, ui.peso, ui.total, ui.msg, acciones);
    const cuerpo = el("div", "pa-cuerpo"); cuerpo.append(tablero, lado);
    ui.cuerpo = cuerpo; titulo = el("h2", "", "📦 Enviar productos");
    panel.append(titulo);
    if (A) {
      const barra = el("div", "pa-tabs");
      for (const [id, txt] of [["prod", "📦 Productos"], ["animales", "🐾 Animales"]]) {
        const b = el("button", "pa-tab", txt); b.type = "button"; b.setAttribute("role", "tab"); tabs[id] = b;
        b.addEventListener("click", () => mostrarTab(id)); barra.appendChild(b);
      }
      barra.setAttribute("role", "tablist"); panel.appendChild(barra);
    }
    panel.appendChild(cuerpo);
    if (A) {
      const izq = el("div", "pa-lista"), der = el("div", "pa-lista");
      for (const k of Object.keys(A.hay)) { filasA[k] = { izq: filaA(k, "izq"), der: filaA(k, "der") }; izq.appendChild(filasA[k].izq.fila); der.appendChild(filasA[k].der.fila); }
      uiA.vacio = el("div", "pa-vacio", "No tienes animales"); izq.appendChild(uiA.vacio);
      const tab2 = el("div", "pa-tablero"); tab2.append(zona("🐾 En la granja", izq), zona("💲 Para vender", der));
      uiA.total = el("div", "pa-total"); uiA.msg = el("div", "pa-msg"); uiA.msg.setAttribute("role", "status");
      const cancelar2 = el("button", "b3d txt b-gris", "Cancelar"); cancelar2.type = "button"; cancelar2.addEventListener("click", cerrar);
      uiA.vender = el("button", "b3d txt b-oro", "Vender ▶"); uiA.vender.type = "button"; uiA.vender.addEventListener("click", vender);
      const acc2 = el("div", "pa-acciones"); acc2.append(cancelar2, uiA.vender);
      const lado2 = el("div", "pa-lado"); lado2.append(uiA.total, uiA.msg, acc2);
      uiA.cuerpo = el("div", "pa-cuerpo"); uiA.cuerpo.hidden = true; uiA.cuerpo.append(tab2, lado2);
      panel.appendChild(uiA.cuerpo);
    }
    fondo.appendChild(panel);

    fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
    fondo.addEventListener("keydown", (e) => { // Tab no se sale de la ventana
      if (e.key !== "Tab") return;
      const bs = [...fondo.querySelectorAll("button:not(:disabled)")];
      if (!bs.length) return;
      const i = bs.indexOf(document.activeElement);
      const sig = e.shiftKey ? (i <= 0 ? bs.length - 1 : i - 1) : (i < 0 || i === bs.length - 1 ? 0 : i + 1);
      e.preventDefault(); bs[sig].focus();
    });
    addEventListener("keydown", tecla, true);

    if (o.alAbrir) o.alAbrir();
    document.body.appendChild(fondo);
    render();
    if (A) mostrarTab("prod");
    try { (ui.enviar.disabled ? cancelar : ui.enviar).focus({ preventScroll: true }); } catch (e) {}
  }
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };   // Esc cierra (sin abrir también la pausa)

  function enviar() {
    if (!S || S.lejos || valorCarga() <= 0) return;
    if (o.alEnviar && o.alEnviar({ ...S.carga }) === false) { S.msg = "No se pudo enviar el camión"; render(); return; }
    cerrar();
  }
  function cerrar() {
    if (!fondo) return;
    fondo.remove(); fondo = null; S = null; filas = {}; ui = {}; A = null; filasA = {}; uiA = {}; tabs = {};
    removeEventListener("keydown", tecla, true);
    try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
    if (o.alCerrar) o.alCerrar();
  }
  return { abrir, cerrar, abierto: () => !!fondo };
}
