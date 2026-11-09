// Ruta: compartido/fondo-madera.js
// Botón 🌙/☀️ que alterna el fondo de madera de los juegos: clara (por defecto) u oscura con luna.
// Las imágenes (imagenes/fondomaderaclara.webp y imagenes/fondomaderaoscura.webp) y los colores están en compartido/inmersivo.css;
// aquí solo se pone o quita la clase «oscura» en <html> y se recuerda la elección en este dispositivo.
// Uso: al final del <body> de cada juego:   <script type="module" src="../compartido/fondo-madera.js"></script>
// Para evitar el parpadeo de la madera clara al abrir en modo oscuro, pon esto en el <head> (opcional):
//   <script>try{if(localStorage.getItem("fondo_madera")==="oscura")document.documentElement.classList.add("oscura")}catch(e){}</script>

const CLAVE = "fondo_madera";           // "clara" | "oscura"
const raiz = document.documentElement;

if (raiz.classList.contains("inmersivo")) {
  const leer = () => { try { return localStorage.getItem(CLAVE) === "oscura"; } catch (e) { return false; } };
  const meta = document.querySelector('meta[name="theme-color"]');

  const b = document.createElement("button");
  b.type = "button";
  b.id = "btn-fondo";
  b.className = "b3d chico b-oro btn-fondo";

  function aplicar(oscura) {
    raiz.classList.toggle("oscura", oscura);
    b.innerHTML = '<span class="b-ico">' + (oscura ? "☀️" : "🌙") + "</span>";
    const t = oscura ? "Cambiar a madera clara" : "Cambiar a madera oscura (modo oscuro)";
    b.title = t; b.setAttribute("aria-label", t); b.setAttribute("aria-pressed", String(oscura));
    if (meta) meta.setAttribute("content", oscura ? "#1d2024" : "#d9a866");
  }

  b.addEventListener("click", () => {
    const oscura = !raiz.classList.contains("oscura");
    try { localStorage.setItem(CLAVE, oscura ? "oscura" : "clara"); } catch (e) {}
    aplicar(oscura);
  });
  addEventListener("storage", (e) => { if (e.key === CLAVE) aplicar(leer()); }); // otra pestaña lo cambió

  aplicar(leer());
  document.body.appendChild(b);
}
