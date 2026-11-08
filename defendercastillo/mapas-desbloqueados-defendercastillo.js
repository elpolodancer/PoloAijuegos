// Ruta: defendercastillo/mapas-desbloqueados-defendercastillo.js
// ARCHIVO GENERADO por constructor-mapas-defendercastillo.mjs (node constructor-mapas-defendercastillo.mjs calibrar / generar): no se edita a mano.
// Mapas fijos de la pestaña «🔓 Desbloqueados» (por dentro la pestaña sigue llamándose «clasico»). Tamaño de 12×18 a 30×30 celdas.
// «req» = nivel de Michoacán que hay que pasar para abrir el mapa; «calib» = multiplicador de vida de los enemigos (ya incluido en las oleadas).
export const MAPAS_DESBLOQUEADOS = [
  {"id":"D1","n":1,"region":"Desbloqueados","nombre":"Valle tranquilo","dificultad":"Fácil","req":1,"semilla":520001,"cols":12,"filas":18,"oroInicial":250,"vidaCastillo":100,"castillo":{"c":4,"f":16,"w":4,"h":2},"camino":[[-0.5,0.5],[10.5,0.5],[10.5,2.5],[1.5,2.5],[1.5,4.5],[10.5,4.5],[10.5,6.5],[1.5,6.5],[1.5,8.5],[10.5,8.5],[10.5,10.5],[1.5,10.5],[1.5,12.5],[10.5,12.5],[10.5,14.5],[5.5,14.5],[5.5,16.6]],"torres":["arquero","canon"],"nuevas":{"torres":["arquero","canon"],"enemigos":["goblin","lobo"]},"vuelan":false,"calib":1.668,
    "obstaculos": [[3,1,"🌳"],[8,1,"🌳"],[0,3,"🌳"],[5,3,"🌳"],[8,3,"🌲"],[11,4,"🌳"],[1,5,"🌲"],[11,6,"🌳"],[4,7,"🌲"],[2,9,"🌲"],[5,9,"🪨"],[2,11,"🌲"],[11,11,"🌲"],[1,13,"🌳"],[5,13,"🌲"],[8,13,"🌳"],[9,15,"🌲"],[1,17,"🌳"]],
    "oleadas": [
      {"vida":1.668,"oro":1,"bono":30,"jefe":false,"grupos":[["lobo",3,0.33,0],["goblin",3,0.43,0.5]]},
      {"vida":1.909,"oro":1.07,"bono":34,"jefe":false,"grupos":[["lobo",4,0.33,0],["goblin",4,0.43,0.66]]},
      {"vida":2.17,"oro":1.14,"bono":38,"jefe":false,"grupos":[["lobo",10,0.33,0]]},
      {"vida":2.451,"oro":1.22,"bono":41,"jefe":false,"grupos":[["lobo",7,0.33,0],["goblin",8,0.43,0.83]]},
      {"vida":2.754,"oro":1.29,"bono":45,"jefe":false,"grupos":[["lobo",8,0.33,0],["goblin",10,0.43,1.32]]},
      {"vida":3.08,"oro":1.36,"bono":48,"jefe":false,"grupos":[["goblin",22,0.43,0]]},
      {"vida":3.431,"oro":1.43,"bono":52,"jefe":false,"grupos":[["goblin",24,0.43,0]]},
      {"vida":3.809,"oro":1.5,"bono":56,"jefe":false,"grupos":[["goblin",23,0.43,0]]},
      {"vida":4.214,"oro":1.58,"bono":59,"jefe":false,"grupos":[["goblin",14,0.43,0],["lobo",12,0.33,3.01]]},
      {"vida":4.65,"oro":1.65,"bono":63,"jefe":false,"grupos":[["lobo",13,0.33,0],["goblin",15,0.43,2.15]]},
      {"vida":5.118,"oro":1.72,"bono":66,"jefe":false,"grupos":[["lobo",27,0.33,0]]},
      {"vida":5.619,"oro":1.79,"bono":70,"jefe":false,"grupos":[["lobo",13,0.33,0],["goblin",16,0.43,1.65]]}
    ]
  },
  {"id":"D2","n":2,"region":"Desbloqueados","nombre":"Camino del río","dificultad":"Fácil","req":2,"semilla":520002,"cols":14,"filas":20,"oroInicial":275,"vidaCastillo":100,"castillo":{"c":12,"f":8,"w":2,"h":4},"camino":[[0.5,-0.5],[0.5,18.5],[2.5,18.5],[2.5,1.5],[4.5,1.5],[4.5,18.5],[6.5,18.5],[6.5,1.5],[8.5,1.5],[8.5,18.5],[10.5,18.5],[10.5,9.5],[12.6,9.5]],"torres":["arquero","canon","mago"],"nuevas":{"torres":["mago"],"enemigos":["orco"]},"vuelan":false,"calib":1.65,
    "obstaculos": [[5,0,"🌳"],[8,0,"🌲"],[12,0,"🌲"],[10,1,"🌲"],[9,3,"🪨"],[10,3,"🪨"],[11,4,"🌲"],[5,5,"🌲"],[1,6,"🪨"],[5,7,"🌳"],[9,7,"🌳"],[10,7,"🌲"],[11,7,"🌲"],[9,11,"🌲"],[7,14,"🌲"],[11,17,"🌲"],[13,17,"🌳"],[7,18,"🌲"],[4,19,"🌳"],[6,19,"🌳"]],
    "oleadas": [
      {"vida":1.65,"oro":1,"bono":31,"jefe":false,"grupos":[["lobo",3,0.33,0],["goblin",3,0.43,0.5]]},
      {"vida":1.892,"oro":1.07,"bono":34,"jefe":false,"grupos":[["goblin",9,0.43,0]]},
      {"vida":2.152,"oro":1.14,"bono":38,"jefe":false,"grupos":[["lobo",5,0.33,0],["goblin",6,0.43,0.83]]},
      {"vida":2.433,"oro":1.22,"bono":42,"jefe":true,"grupos":[["orco",2,1.03,0],["orco",1,1.03,0.52]]},
      {"vida":2.735,"oro":1.29,"bono":45,"jefe":false,"grupos":[["goblin",10,0.43,0],["orco",2,1.03,2.15]]},
      {"vida":3.06,"oro":1.36,"bono":49,"jefe":false,"grupos":[["orco",2,1.03,0],["lobo",9,0.33,1.03]]},
      {"vida":3.409,"oro":1.43,"bono":52,"jefe":false,"grupos":[["lobo",10,0.33,0],["orco",2,1.03,1.65]]},
      {"vida":3.785,"oro":1.5,"bono":56,"jefe":true,"grupos":[["orco",2,1.03,0],["lobo",8,0.33,1.03],["orco",2,1.03,1.18]]},
      {"vida":4.188,"oro":1.58,"bono":60,"jefe":false,"grupos":[["orco",5,1.03,0]]},
      {"vida":4.62,"oro":1.65,"bono":63,"jefe":false,"grupos":[["orco",3,1.03,0],["goblin",15,0.43,1.55]]},
      {"vida":5.083,"oro":1.72,"bono":67,"jefe":false,"grupos":[["orco",3,1.03,0],["goblin",16,0.43,1.55]]},
      {"vida":5.579,"oro":1.79,"bono":70,"jefe":true,"grupos":[["orco",1,1.03,0],["lobo",7,0.33,0.52],["goblin",8,0.43,1.67],["orco",2,1.03,1.69]]}
    ]
  }
];
