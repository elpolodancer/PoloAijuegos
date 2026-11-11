// Ruta: piano/niveles-piano.js
// Niveles del mapa estándar del portal (compartido/mapa-niveles.js): 30 por cada estado de México (32) y 30 por cada país (194) = 6780.
// POR_ETAPA es cuántos niveles tiene cada estado o país. NIVELES[n - 1] define el nivel número n (1 = primer nivel del primer estado;
// el orden de los estados y países sale de compartido/etapas-mapa.js: no lo cambies después de publicar, porque movería el progreso).
//
// POR AHORA NO HAY NINGÚN NIVEL (a propósito): el mapa ya funciona y muestra «pronto». Cada nivel que agregues es una canción y
// una meta de puntos; al llegar a la meta se gana el nivel y se abre el siguiente:
//     { cancion: "Estrellita (Mozart)", puntos: 30 }
// «cancion» debe ser el nombre EXACTO de una canción de juego-piano.js (o de melodias-piano.js).
// Escríbelos dentro de la lista de abajo, en orden: el primer elemento es el nivel 1, el segundo el nivel 2…

export const POR_ETAPA = 30;
export const NIVELES = [];
