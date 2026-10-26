/** Rectangular, coplanar 2D packing. Uniform grids only; no structural or shade model. */
export const ROOF_DEFAULTS=Object.freeze({roofLayout:false,roofWidth:10,roofLength:8,roofMargin:0.5,panelWidth:1.134,panelLength:2.278,panelGap:0.02,rowGap:0.15,layoutOrientation:'auto',roofObstacles:[],roofExcluded:[]});
export const ROOF_KEYS=Object.keys(ROOF_DEFAULTS);
export const MAX_CELLS=20000;
export function roofErrors(p){
 const errors=[];
 if(typeof p.roofLayout!=='boolean')errors.push('La activación de cubierta debe ser verdadera o falsa.');
 for(const [key,name,min,max]of [['roofWidth','Ancho de cubierta',1,500],['roofLength','Largo de cubierta',1,500],['roofMargin','Retiro perimetral',0,20],['panelWidth','Ancho de módulo',0.1,5],['panelLength','Largo de módulo',0.1,5],['panelGap','Separación lateral',0,10],['rowGap','Separación entre filas',0,20]])if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<min||p[key]>max)errors.push(`${name}: valor entre ${min} y ${max} m.`);
 if(p.roofMargin*2>=Math.min(p.roofWidth,p.roofLength))errors.push('Los retiros deben dejar un área interior positiva.');
 if(!['auto','portrait','landscape'].includes(p.layoutOrientation))errors.push('Orientación de módulos no válida.');
 if(!Array.isArray(p.roofObstacles)||p.roofObstacles.length>50)errors.push('Se admiten hasta 50 obstáculos o pasillos.');
 else{
  const ids=new Set();
  for(const o of p.roofObstacles){
   if(!o||typeof o!=='object'||Array.isArray(o)||typeof o.id!=='string'||!/^[a-zA-Z0-9-]{1,60}$/.test(o.id)||ids.has(o.id)){errors.push('Identificador de obstáculo no válido o duplicado.');continue;}ids.add(o.id);
   if(typeof o.name!=='string'||o.name.length>80||!['obstacle','passage'].includes(o.kind))errors.push('Nombre o tipo de obstáculo no válido.');
   if(['x','y','width','length','clearance'].some(k=>typeof o[k]!=='number'||!Number.isFinite(o[k]))||o.x<0||o.y<0||o.width<0.1||o.length<0.1||o.clearance<0||o.clearance>20||o.x+o.width>p.roofWidth+1e-8||o.y+o.length>p.roofLength+1e-8)errors.push(`Obstáculo «${o.name||o.id}»: medidas o posición fuera de la cubierta.`);
  }
 }
 if(!Array.isArray(p.roofExcluded)||p.roofExcluded.length>5000||p.roofExcluded.some(s=>typeof s!=='string'||!/^[pl](?::\d+\.\d{6}){4}$/.test(s))||new Set(p.roofExcluded).size!==p.roofExcluded.length)errors.push('Exclusiones de módulos no válidas (hasta 5000 celdas únicas).');
 return errors;
}
export function intersects(a,b){return a.x<b.x+b.width-1e-9&&a.x+a.width>b.x+1e-9&&a.y<b.y+b.length-1e-9&&a.y+a.length>b.y+1e-9;}
export function expandObstacle(o){return {x:o.x-o.clearance,y:o.y-o.clearance,width:o.width+2*o.clearance,length:o.length+2*o.clearance};}
function cellId(orientation,x,y,width,length){return `${orientation==='portrait'?'p':'l'}:${[x,y,width,length].map(v=>v.toFixed(6)).join(':')}`;}
export function unionArea(rectangles,bounds){
 const rects=rectangles.map(r=>{const x=Math.max(bounds.x,r.x),y=Math.max(bounds.y,r.y);return {x,y,width:Math.min(bounds.x+bounds.width,r.x+r.width)-x,length:Math.min(bounds.y+bounds.length,r.y+r.length)-y};}).filter(r=>r.width>0&&r.length>0);
 const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){
  const left=xs[i-1],right=xs[i],ys=rects.filter(r=>r.x<right&&r.x+r.width>left).map(r=>[r.y,r.y+r.length]).sort((a,b)=>a[0]-b[0]);
  let bottom=0,top=0,total=0,first=true;
  for(const [a,b]of ys){if(first){bottom=a;top=b;first=false;}else if(a>top){total+=top-bottom;bottom=a;top=b;}else top=Math.max(top,b);}
  if(!first)total+=top-bottom;area+=(right-left)*total;
 }
 return area;
}
function grid(p,orientation){
 const width=orientation==='portrait'?p.panelWidth:p.panelLength,length=orientation==='portrait'?p.panelLength:p.panelWidth;
 const innerWidth=p.roofWidth-2*p.roofMargin,innerLength=p.roofLength-2*p.roofMargin;
 const columns=Math.max(0,Math.floor((innerWidth+p.panelGap+1e-9)/(width+p.panelGap))),rows=Math.max(0,Math.floor((innerLength+p.rowGap+1e-9)/(length+p.rowGap)));
 if(rows*columns>MAX_CELLS)return {orientation,rows,columns,valid:false,capacity:0,cells:[],reason:`El patrón supera ${MAX_CELLS} celdas; reduce las dimensiones o usa un estudio específico.`};
 const blocked=p.roofObstacles.map(expandObstacle),excluded=new Set(p.roofExcluded),cells=[];
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const x=p.roofMargin+column*(width+p.panelGap),y=p.roofMargin+row*(length+p.rowGap);
  const c={id:cellId(orientation,x,y,width,length),x,y,width,length,row:row+1,column:column+1};
  c.blocked=blocked.some(o=>intersects(c,o));c.excluded=excluded.has(c.id);cells.push(c);
 }
 return {orientation,rows,columns,valid:true,cells,capacity:cells.filter(c=>!c.blocked&&!c.excluded).length};
}
export function layoutRoof(p,requested=0,series=0){
 const errors=roofErrors(p);if(errors.length)return {active:p.roofLayout,valid:false,capacity:0,placed:0,requested,positions:[],cells:[],reason:errors.join(' ')};
 const candidates=(p.layoutOrientation==='auto'?['portrait','landscape']:[p.layoutOrientation]).map(o=>grid(p,o));
 const complete=candidates.filter(c=>c.valid).sort((a,b)=>b.capacity-a.capacity||(a.orientation==='portrait'?-1:1));
 // Do not call an uncomputed orientation inferior when the cell bound prevents its evaluation.
 if(candidates.some(c=>!c.valid))return {...candidates.find(c=>!c.valid),active:p.roofLayout,placed:0,requested,positions:[]};
 const best=complete[0],available=best.cells.filter(c=>!c.blocked&&!c.excluded);
 const positions=available.slice(0,Math.min(requested,best.capacity)).map((c,i)=>({...c,number:i+1,string:series?Math.floor(i/series)+1:null,seriesIndex:series?i%series+1:null}));
 const inner={x:p.roofMargin,y:p.roofMargin,width:p.roofWidth-2*p.roofMargin,length:p.roofLength-2*p.roofMargin};
 const innerArea=inner.width*inner.length,blockedArea=unionArea(p.roofObstacles.map(expandObstacle),inner);
 const knownIds=new Set(best.cells.map(c=>c.id));
 return {...best,active:p.roofLayout,requested,positions,placed:positions.length,fits:requested<=best.capacity,
  grossArea:p.roofWidth*p.roofLength,innerArea,blockedArea,usableArea:Math.max(0,innerArea-blockedArea),moduleArea:positions.length*p.panelWidth*p.panelLength,
  excluded:p.roofExcluded.filter(id=>knownIds.has(id)).length,staleExcluded:p.roofExcluded.filter(id=>!knownIds.has(id)).length,
  alternatives:candidates.map(({orientation,capacity,rows,columns})=>({orientation,capacity,rows,columns}))};
}
export function roofRows(plan){return [['N° módulo','String conceptual','Posición en serie','Fila','Columna','X m','Y m','Ancho m','Largo m'],...plan.positions.map(c=>[c.number,c.string??'',c.seriesIndex??'',c.row,c.column,c.x,c.y,c.width,c.length])];}
