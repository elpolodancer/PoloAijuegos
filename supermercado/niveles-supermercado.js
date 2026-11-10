// Ruta: supermercado/niveles-supermercado.js
// MODO NIVELES de «Supermercado»: definición de los niveles y la lógica de sus metas. No usa document ni localStorage (se prueba en Node).
//
// Reglas del mapa (compartido/mapa-niveles.js + compartido/etapas-mapa.js):
//   • Cada ESTADO de México (32) tiene NIVELES_POR_ETAPA = 10 niveles, y cada PAÍS (194) después de México también tiene 10.
//   • Número global de nivel: 1 a 10 = 1.er estado, 11 a 20 = 2.º estado… (el orden de los estados es el de crearEtapas en juego-supermercado.js).
//   • NIVELES se llena poco a poco: la clave es el número GLOBAL del nivel. Mientras un nivel no exista aquí, el mapa no lo deja abrir.
//
// Cada nivel:
//   nombre          título corto
//   restricciones   lo que NO se puede hacer en ese nivel (false = prohibido): edificio (ampliarlo), patio (ampliarlo), granja (comprarla)
//   dineroInicial   (opcional) dinero con el que empieza; por defecto el mismo que una partida nueva
//   objetivos       lista de metas; el nivel se completa cuando TODAS están cumplidas. Cada meta lleva icono, texto y una lista de «pasos»:
//                     { t: "jardin",   p: id }   comprar el jardín de ese producto
//                     { t: "estante",  p: id }   tener la estantería de ese producto
//                     { t: "empleado", p: id }   contratar al empleado de ese jardín
//                     { t: "dinero",   n: N }    llegar a N monedas (se cuenta el dinero que tienes en ese momento)
//   Un paso cumplido ya no se pierde: si llegas a $1000 y luego gastas, la meta sigue cumplida.

export const NIVELES_POR_ETAPA = 10;

export const NIVELES = {
  // ---------- Estado 1 · nivel 1 ----------
  1: {
    nombre: "Primeras cosechas",
    restricciones: { edificio: false, patio: false, granja: false },
    objetivos: [
      { icono: "🥕", texto: "Zanahoria", pasos: [{ t: "jardin", p: "zanahoria" }, { t: "estante", p: "zanahoria" }, { t: "empleado", p: "zanahoria" }] },
      // el empleado de cilantro exige su estantería (regla del juego), así que esa estantería se compra sí o sí aunque no sea un paso aparte
      { icono: "🌿", texto: "Cilantro", pasos: [{ t: "jardin", p: "cilantro" }, { t: "empleado", p: "cilantro" }] },
      { icono: "💰", texto: "Llega a $1,000", pasos: [{ t: "dinero", n: 1000 }] },
    ],
  },
};

// Último nivel que ya existe (el mapa solo deja abrir hasta ese; al agregar el siguiente se abre solo para quien ya terminó el anterior)
export const NIVELES_LISTOS = Math.max(...Object.keys(NIVELES).map(Number));

const NOMBRE_RESTRICCION = { edificio: "ampliar el edificio", patio: "ampliar el patio", granja: "la granja" };
export function textoRestricciones(def) {
  const r = (def && def.restricciones) || {};
  const l = Object.keys(NOMBRE_RESTRICCION).filter((k) => r[k] === false).map((k) => NOMBRE_RESTRICCION[k]);
  return l.length ? "🚫 No disponible: " + l.join(", ") : "";
}

const fmt = (n) => Math.floor(n).toLocaleString("es-MX");
const ROTULO = { jardin: "🌱 Jardín", estante: "🗄️ Estantería", empleado: "👷 Empleado" };

function cumple(paso, foto) {
  const g = foto.jardines && foto.jardines[paso.p];
  switch (paso.t) {
    case "jardin": return !!(g && g.comprado);
    case "empleado": return !!(g && g.emp);
    case "estante": return Array.isArray(foto.estantes) && foto.estantes.includes(paso.p);
    case "dinero": return Number(foto.dinero) >= paso.n;
    default: return false;
  }
}
function rotulo(paso, foto, hecho) {
  if (paso.t === "dinero") return hecho ? "$" + fmt(paso.n) : "$" + fmt(Math.max(0, Number(foto.dinero) || 0)) + " / $" + fmt(paso.n);
  return ROTULO[paso.t] || paso.t;
}

// foto = { dinero, jardines: { id: { comprado, emp } }, estantes: [ids de producto] }
// logrados = Set (lo guarda quien llama durante la partida): ahí se anotan los pasos que ya se cumplieron
// Devuelve { completo, objetivos: [{ icono, texto, hecho, pasos: [{ rotulo, hecho }] }] }
export function evaluarNivel(def, foto, logrados = new Set()) {
  const objetivos = def.objetivos.map((o, oi) => {
    const pasos = o.pasos.map((p, pi) => {
      const clave = oi + ":" + pi;
      if (!logrados.has(clave) && cumple(p, foto)) logrados.add(clave);
      const hecho = logrados.has(clave);
      return { rotulo: rotulo(p, foto, hecho), hecho };
    });
    return { icono: o.icono, texto: o.texto, hecho: pasos.every((p) => p.hecho), pasos };
  });
  return { completo: objetivos.every((o) => o.hecho), objetivos };
}
