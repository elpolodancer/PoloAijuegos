// Ruta: compartido/fondo-madera.js
// Fondo de madera de los juegos + botón 🌙/☀️ (abajo a la izquierda) que alterna madera clara (por defecto) y oscura con luna.
// Este módulo trae sus PROPIOS estilos (los inyecta en <head>), así que no hace falta tocar compartido/inmersivo.css.
// Las imágenes se buscan junto a este archivo: ../imagenes/fondomaderaclara.webp y ../imagenes/fondomaderaoscura.webp
// Uso: al final del <body> de cada juego:   <script type="module" src="../compartido/fondo-madera.js"></script>
// Para evitar el parpadeo de la madera clara al abrir en modo oscuro, pon esto en el <head> (opcional):
//   <script>try{if(localStorage.getItem("fondo_madera")==="oscura")document.documentElement.classList.add("oscura")}catch(e){}</script>

const CLAVE = "fondo_madera";           // "clara" | "oscura"
const raiz = document.documentElement;

if (raiz.classList.contains("inmersivo")) {
  const clara = new URL("../imagenes/fondomaderaclara.webp", import.meta.url).href;
  const oscura = new URL("../imagenes/fondomaderaoscura.webp", import.meta.url).href;

  // --txt-fondo / --txt-fondo-suave / --sombra-txt: colores para textos que van DIRECTO sobre la madera (cambian solos)
  const estilo = document.createElement("style");
  estilo.textContent =
    'html.inmersivo{--txt-fondo:#4a2a10;--txt-fondo-suave:#6b4423;--sombra-txt:0 2px 0 rgba(255,240,210,.6);' +
    'background:url("' + clara + '") center/cover no-repeat,#d9a866}' +
    'html.inmersivo.oscura{--txt-fondo:#f1f2f4;--txt-fondo-suave:#b0b4bd;--sombra-txt:0 3px 0 rgba(0,0,0,.5);' +
    'background:url("' + oscura + '") center/cover no-repeat,#1d2024}' +
    'button.b3d.btn-fondo{position:fixed;z-index:6;top:auto;right:auto;' +
    'bottom:max(14px,env(safe-area-inset-bottom));left:max(10px,env(safe-area-inset-left))}';
  document.head.appendChild(estilo);

  const leer = () => { try { return localStorage.getItem(CLAVE) === "oscura"; } catch (e) { return false; } };
  const meta = document.querySelector('meta[name="theme-color"]');

  const b = document.createElement("button");
  b.type = "button";
  b.id = "btn-fondo";
  b.className = "b3d chico b-oro btn-fondo";

  function aplicar(esOscura) {
    raiz.classList.toggle("oscura", esOscura);
    b.innerHTML = '<span class="b-ico">' + (esOscura ? "☀️" : "🌙") + "</span>";
    const t = esOscura ? "Cambiar a madera clara" : "Cambiar a madera oscura (modo oscuro)";
    b.title = t; b.setAttribute("aria-label", t); b.setAttribute("aria-pressed", String(esOscura));
    if (meta) meta.setAttribute("content", esOscura ? "#1d2024" : "#d9a866");
  }

  b.addEventListener("click", () => {
    const esOscura = !raiz.classList.contains("oscura");
    try { localStorage.setItem(CLAVE, esOscura ? "oscura" : "clara"); } catch (e) {}
    aplicar(esOscura);
  });
  addEventListener("storage", (e) => { if (e.key === CLAVE) aplicar(leer()); }); // otra pestaña lo cambió

  aplicar(leer());
  document.body.appendChild(b);
}
