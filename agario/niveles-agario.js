// Ruta: agario/niveles-agario.js
// Niveles de Agario. TODAVÍA NO ESTÁN CREADOS (ESTANDARES-juegos.md, sección 10: primero los estándares, después los niveles).
// Mientras NIVELES esté vacío, el mapa funciona completo (195 países × 20 niveles = 3 900) y cada botón de nivel muestra 🚧.
// Cuando se definan las mecánicas y metas, aquí van los 3 900 niveles (el nivel n está en NIVELES[n - 1]).

export const POR_ETAPA = 20;          // niveles por país (estándar A-bis)
export const NIVELES = [];            // aún sin niveles
// Monedas que da cada nivel la primera vez que se pasa. PROVISIONAL (el estándar pide de 15 a 45 por nivel): se fijará junto con los niveles.
export const monedasDe = (i) => 15;
