const L=Math.log10;
const hitos=n=>(n>=10)+(n>=25)+(n>=50)+(n>=100?1+Math.floor((n-100)/100):0);
const G1=1.10, G2=1.1075;                       // producción por nivel: ×1.10 hasta el 100, ×1.1075 después
const logProd=n=>{let s=0;for(let k=1;k<n;k++)s+=L(k<100?G1:G2);return s+hitos(n)*L(2);};
const TAU=100;
function logCosto1(n,GF){let s=L(113);for(let k=10;k<n;k++)s+=L(GF+(1.28-GF)*Math.exp(-(k-10)/TAU));return s;}
let lo=1.05,hi=1.28;
for(let it=0;it<80;it++){const m=(lo+hi)/2; (logCosto1(650,m)>L(4.33e39))?hi=m:lo=m;}
const GF=(lo+hi)/2; console.log('GF',GF.toFixed(4),'TAU',TAU);
const D=[{i:0,n:650,costo:4.33e39,ext:97.2e30},{i:4,n:540,costo:710e33,ext:511e27},{i:9,n:460,costo:352e33,ext:10.7e30},{i:19,n:100,costo:392e36,ext:9.33e33}];
for(const d of D){const p=L(d.ext)-L(5)-logProd(d.n), z=L(d.costo)-logCosto1(d.n,GF);console.log('pozo',d.i+1,'p=',p.toFixed(2),'z=',z.toFixed(2),'z-p=',(z-p).toFixed(2));}
