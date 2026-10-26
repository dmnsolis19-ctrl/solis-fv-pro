import {escapeHTML as e,download,workbookBytes} from './exports.js';
import {calculate,stringLayout} from './engine.js';
import {layoutRoof,roofRows,ROOF_KEYS} from './roof.js';
import {roofSVG} from './roof-svg.js';
const fmt=(n,d=2)=>Number(n).toLocaleString('es-CL',{maximumFractionDigits:d});
const field=(p,k,label,help='')=>`<div class="field"><label for="field-${k}">${label}</label><input id="field-${k}" data-field="${k}" type="number" step="any" value="${e(p[k])}">${help?`<small>${help}</small>`:''}</div>`;
const section=(title,body)=>`<section class="advanced-form-section"><h3>${title}</h3><div class="form-grid">${body}</div></section>`;
const card=(title,body)=>`<section class="card"><div class="card-heading"><h2>${title}</h2></div>${body}</section>`;
export function roofForm(p){return section('Verificación geométrica',`<label class="check-field wide"><input data-field="roofLayout" type="checkbox" ${p.roofLayout?'checked':''}> Usar esta cubierta en el cálculo</label><p class="wide form-note">Medidas reales sobre el plano inclinado del techo. Una superficie rectangular coplanar. Los retiros son decisiones del proyecto, no valores normativos automáticos.</p>`+field(p,'roofWidth','Ancho de cubierta · m')+field(p,'roofLength','Largo de cubierta · m')+field(p,'roofMargin','Retiro perimetral · m','Se aplica a los cuatro bordes.'))+section('Módulo y patrón',field(p,'panelWidth','Ancho del módulo · m','Dimensiones exteriores de la ficha.')+field(p,'panelLength','Largo del módulo · m')+field(p,'panelGap','Separación lateral · m')+field(p,'rowGap','Separación entre filas · m','En el plano de cubierta; no calcula distancia por sombras.')+`<div class="field wide"><label for="field-layoutOrientation">Orientación de módulos</label><select id="field-layoutOrientation" data-field="layoutOrientation"><option value="auto" ${p.layoutOrientation==='auto'?'selected':''}>Automática · comparar ambos patrones</option><option value="portrait" ${p.layoutOrientation==='portrait'?'selected':''}>Vertical</option><option value="landscape" ${p.layoutOrientation==='landscape'?'selected':''}>Horizontal</option></select><small>Patrón regular desde el retiro superior izquierdo. No combina orientaciones.</small></div>`)+section('Edición del plano',`<p class="wide form-note">Añade obstáculos o pasillos, arrástralos y ajusta sus coordenadas en la tabla. Haz clic en una celda para excluirla o restaurarla.</p><div class="wide roof-actions"><button type="button" class="button secondary" data-roof-action="add-obstacle">+ Obstáculo</button><button type="button" class="button secondary" data-roof-action="add-passage">+ Pasillo</button><button type="button" class="text-button" data-roof-action="undo" disabled>Deshacer edición del plano</button><button type="button" class="text-button" data-roof-action="clear">Limpiar exclusiones</button></div><div class="wide note">Los strings se colorean por numeración conceptual. Este plano no define el conexionado ni las longitudes de cable.</div>`);}
export function roofResults(r){
 const p=r.p,plan=r.roofPlan;
 if(!plan.valid)return card('Plano no disponible',`<div class="note warning">${e(plan.reason)}</div><p class="muted">Reduce la escala de la cubierta o revisa sus parámetros. El motor no sustituye un patrón no evaluado por una capacidad inventada.</p>`);
 const metric=(label,v,sub)=>`<div><small>${label}</small><strong>${v}</strong><span>${sub}</span></div>`;
 const obstacles=p.roofObstacles.map((o,i)=>`<tr><td><span class="roof-obstacle-label">${o.kind==='passage'?'Pasillo':'Obstáculo'} ${i+1}</span><input type="text" maxlength="80" data-roof-obstacle="${o.id}" data-roof-key="name" value="${e(o.name)}" aria-label="Nombre ${e(o.name)}"></td>${['x','y','width','length','clearance'].map(k=>`<td><input type="number" step="0.05" min="0" data-roof-obstacle="${o.id}" data-roof-key="${k}" value="${o[k]}" aria-label="${({x:'X',y:'Y',width:'Ancho',length:'Largo',clearance:'Resguardo'})[k]} de ${e(o.name)} en metros"></td>`).join('')}<td><button class="roof-delete" data-roof-remove="${o.id}" aria-label="Eliminar ${e(o.name)}">✕</button></td></tr>`).join('');
 return `<div class="roof-summary">${metric('Paneles requeridos',r.panels,'Según energía y strings')}${metric('Capacidad del patrón',plan.capacity,plan.orientation==='portrait'?'Módulos verticales':'Módulos horizontales')}${metric('Estado del diseño',plan.fits?'Cabe':'No cabe',`${plan.placed} de ${r.panels} en el plano`)}</div>`+
 `<div class="roof-state ${plan.fits?'':'insufficient'}"><span class="tag ${p.roofLayout?'teal':'amber'}">${p.roofLayout?'VERIFICACIÓN ACTIVA':'VISTA PREVIA · SIN APLICAR'}</span><p>${p.roofLayout?(plan.fits?'El patrón admite la cantidad solicitada. Revisa las demás comprobaciones del proyecto.':`Faltan ${r.panels-plan.capacity} posiciones. El cálculo energético y los materiales conservan ${r.panels} módulos hasta que apliques un ajuste.`):'Activa «Usar esta cubierta en el cálculo» para que el espacio limite la viabilidad del diseño.'}</p>${p.roofLayout&&!plan.fits?'<button class="button primary" data-roof-action="fit">Reducir objetivo para que quepa</button><small>Actualiza la cobertura objetivo y recalcula paneles, potencia, materiales y costos. Conserva el consumo.</small>':''}</div>`+
 card('Implantación del generador',`<div class="roof-canvas">${roofSVG(p,plan,{interactive:true})}</div><div class="roof-legend"><span><i class="placed"></i>Panel en diseño</span><span><i class="free"></i>Posición libre</span><span><i class="excluded"></i>Celda excluida</span><span><i class="obstacle"></i>Obstáculo / pasillo</span></div><p class="muted">Origen (0, 0) en esquina superior izquierda; X hacia la derecha, Y hacia abajo. Arrastra los obstáculos o edita sus medidas debajo. Las celdas admiten teclado: Tab y Enter/Espacio.</p>${plan.cells.length>500?`<div class="note warning">Vista limitada a las primeras 500 de ${plan.cells.length} celdas. El cálculo y los archivos exportados usan todas. Usa SVG/Excel para revisar el plano completo.</div>`:''}<div class="roof-actions"><button class="button secondary small" data-roof-action="svg">Descargar plano SVG</button><button class="button secondary small" data-roof-action="coordinates">Excel de posiciones</button></div>`)+
 card('Obstáculos y pasillos',`<p class="muted">Todas las medidas en metros. El resguardo amplía el área excluida alrededor de cada objeto. Una celda se descarta si se solapa con esa área. Máximo 50 objetos.</p>${obstacles?`<div class="table-scroll"><table class="roof-obstacles"><thead><tr><th>Objeto</th><th>X</th><th>Y</th><th>Ancho</th><th>Largo</th><th>Resguardo</th><th>Quitar</th></tr></thead><tbody>${obstacles}</tbody></table></div>`:'<div class="roof-empty">Sin obstáculos. Añade chimeneas, lucernarios o pasillos desde el panel de edición.</div>'}`)+
 card('Comprobaciones del plano',`<div class="roof-facts"><div><span>Superficie de cubierta</span><strong>${fmt(plan.grossArea)} m²</strong></div><div><span>Área interior tras retiros</span><strong>${fmt(plan.innerArea)} m²</strong></div><div><span>Obstáculos + resguardos (unión)</span><strong>${fmt(plan.blockedArea)} m²</strong></div><div><span>Área libre geométrica</span><strong>${fmt(plan.usableArea)} m²</strong></div><div><span>Área de módulos representados</span><strong>${fmt(plan.moduleArea)} m²</strong></div><div><span>Celdas excluidas / sin coincidencia</span><strong>${plan.excluded} / ${plan.staleExcluded}</strong></div></div><p class="muted">${plan.alternatives.map(x=>`${x.orientation==='portrait'?'Vertical':'Horizontal'}: ${x.capacity} posiciones (${x.rows} filas × ${x.columns} columnas antes de exclusiones)`).join(' · ')}.</p>${plan.staleExcluded?'<div class="note warning">Hay exclusiones de un patrón anterior. Límpialas o recupera las medidas originales para revisarlas.</div>':''}<div class="note">Compara dos patrones regulares; no busca el máximo global ni mezcla orientaciones. Sin sombras, separación por inclinación entre filas, relieve, cargas de viento, estructura ni distancias normativas automáticas. El azimut del sitio describe este mismo plano; no gira el dibujo.</div>`);
}
/** Explicit fit, preserving demand. Selects greatest electrically valid count within the grid. */
export function fitRoofInputs(raw){
 const r=calculate(raw),p=r.p,plan=r.roofPlan;
 if(!p.roofLayout||!plan.valid||plan.fits)throw new Error('Activa una cubierta con capacidad inferior al diseño para ajustar el objetivo.');
 const limits=stringLayout(p,1);let best=0;
 if(limits.valid)for(let strings=1;strings<=p.mppts*p.stringsPerMppt;strings++){
  const parallel=Math.ceil(strings/p.mppts);if(parallel*p.imp>p.mpptCurrent||parallel*p.isc*p.pvCurrentFactor>p.mpptIsc)continue;
  const series=Math.min(limits.max,Math.floor(plan.capacity/strings),p.maxPvKw>0?Math.floor(p.maxPvKw*1000/p.panelW/strings):Infinity);const count=series*strings;
  if(series<limits.min||p.maxPvKw>0&&count*p.panelW/1000>p.maxPvKw)continue;
  const check=stringLayout(p,count);if(check.valid&&check.count<=plan.capacity)best=Math.max(best,check.count);
 }
 if(!best)throw new Error('La cubierta no admite el mínimo de módulos exigido por los strings. Revisa cubierta, módulo o inversor.');
 const coverage=(best-1e-7)*p.panelW/1000*r.specificYield/r.annual*100;
 if(coverage<1||coverage>=p.coverage)throw new Error('No hay un objetivo menor admisible entre 1 % y el objetivo actual. Revisa la configuración.');
 const next={...p,coverage},verified=calculate(next);
 if(!verified.layout.valid||!verified.roofPlan.fits)throw new Error('No se pudo ajustar un diseño compatible. Revisa los límites de strings.');
 return next;
}
export function setupRoof({getInputs,setInputs,repaint,notify,getResult}){
 const undo=[];let counter=0,identity=null;
 function commit(next,keys=ROOF_KEYS){
  const current=getInputs(),changed=keys.filter(k=>JSON.stringify(current[k])!==JSON.stringify(next[k]));
  if(!changed.length)return;
  const before=Object.fromEntries(changed.map(k=>[k,structuredClone(current[k])])),after=Object.fromEntries(changed.map(k=>[k,structuredClone(next[k])]));
  setInputs(next);undo.push({before,after});if(undo.length>20)undo.shift();repaint();
 }
 function toggleCell(id){const p=getInputs(),plan=layoutRoof(p);if(!plan.valid||!plan.cells.some(c=>c.id===id&&!c.blocked))return;const exists=p.roofExcluded.includes(id);if(!exists&&p.roofExcluded.length>=5000)throw new Error('Máximo de 5000 exclusiones.');commit({...p,layoutOrientation:p.layoutOrientation==='auto'?plan.orientation:p.layoutOrientation,roofExcluded:exists?p.roofExcluded.filter(x=>x!==id):[...p.roofExcluded,id]});}
 function act(fn){try{fn();}catch(err){notify(err.message);}}
 document.addEventListener('click',event=>{
  const cell=event.target.closest('[data-roof-cell]');if(cell){act(()=>toggleCell(cell.dataset.roofCell));return;}
  const b=event.target.closest('button');if(!b)return;
  if(!b.dataset.roofAction&&!b.dataset.roofRemove)return;
  act(()=>{
   const p=getInputs(),action=b.dataset.roofAction;
   if(b.dataset.roofRemove){commit({...p,roofObstacles:p.roofObstacles.filter(o=>o.id!==b.dataset.roofRemove)});return;}
   if(action==='undo'){
    const last=undo.at(-1);if(!last)return;
    if(Object.entries(last.after).some(([k,v])=>JSON.stringify(p[k])!==JSON.stringify(v))){undo.length=0;repaint();throw new Error('El plano cambió después de esa edición. Ya no se puede deshacer con seguridad.');}
    setInputs({...p,...last.before});undo.pop();repaint();return;
   }
   if(action==='clear'){commit({...p,roofExcluded:[]});return;}
   if(action==='add-obstacle'||action==='add-passage'){
    if(p.roofObstacles.length>=50)throw new Error('Máximo de 50 objetos.');
    const passage=action==='add-passage',width=Math.min(passage ? 0.8 : 1,p.roofWidth-2*p.roofMargin),length=Math.min(passage?p.roofLength-2*p.roofMargin:1,p.roofLength-2*p.roofMargin);
    const o={id:`o-${Date.now()}-${++counter}`,kind:passage?'passage':'obstacle',name:passage?'Pasillo':'Obstáculo',x:p.roofMargin,y:p.roofMargin,width:Math.max(.1,width),length:Math.max(.1,length),clearance:passage?0:.2};
    commit({...p,roofObstacles:[...p.roofObstacles,o]});return;
   }
   if(action==='fit'){const next=fitRoofInputs(p);setInputs(next);repaint();notify(`Objetivo ajustado a ${fmt(next.coverage)} %. Consumo conservado; revisa las demás alertas.`);return;}
   if(action==='svg'||action==='coordinates'){
    const r=getResult();if(!r?.roofPlan.valid)throw new Error('Corrige los parámetros antes de exportar el plano.');
    if(action==='svg')download(roofSVG(r.p,r.roofPlan,{limit:20000}),'SOLIS-plano-cubierta.svg','image/svg+xml');
    else download(workbookBytes([{name:'Posiciones',rows:roofRows(r.roofPlan)}]),'SOLIS-posiciones-cubierta.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   }
  });
 });
 document.addEventListener('keydown',event=>{const cell=event.target.closest('[data-roof-cell]');if(cell&&['Enter',' '].includes(event.key)){event.preventDefault();act(()=>toggleCell(cell.dataset.roofCell));}});
 document.addEventListener('change',event=>{
  const el=event.target,id=el.dataset.roofObstacle,key=el.dataset.roofKey;if(!id||!key)return;
  act(()=>{try{const p=getInputs(),value=key==='name'?el.value:el.value===''?NaN:Number(el.value);commit({...p,roofObstacles:p.roofObstacles.map(o=>o.id===id?{...o,[key]:value}:o)});}catch(error){repaint();throw error;}});
 });
 function mount(){
  const p=getInputs(),nextIdentity=JSON.stringify([p.project,p.client]);if(identity!==null&&identity!==nextIdentity)undo.length=0;identity=nextIdentity;
  document.querySelectorAll('[data-roof-action="undo"]').forEach(b=>b.disabled=!undo.length);
  const svg=document.querySelector('#roof-plan-svg');if(!svg)return;
  const xy=event=>{const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse());};
  let drag=null;
  svg.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;const group=event.target.closest('[data-roof-drag]');if(!group)return;
   const p=getInputs(),o=p.roofObstacles.find(o=>o.id===group.dataset.roofDrag);if(!o)return;
   const start=xy(event);drag={id:o.id,group,start,o,dx:0,dy:0};svg.setPointerCapture(event.pointerId);event.preventDefault();
  });
  svg.addEventListener('pointermove',event=>{if(!drag)return;const now=xy(event),p=getInputs(),o=drag.o;drag.dx=Math.max(-o.x,Math.min(p.roofWidth-o.width-o.x,now.x-drag.start.x));drag.dy=Math.max(-o.y,Math.min(p.roofLength-o.length-o.y,now.y-drag.start.y));drag.group.setAttribute('transform',`translate(${drag.dx},${drag.dy})`);});
  svg.addEventListener('pointerup',()=>{if(!drag)return;const d=drag;drag=null;d.group.removeAttribute('transform');if(Math.abs(d.dx)+Math.abs(d.dy)<.001)return;act(()=>{const p=getInputs();commit({...p,roofObstacles:p.roofObstacles.map(o=>o.id===d.id?{...o,x:Math.max(0,Math.min(p.roofWidth-o.width,Math.round((d.o.x+d.dx)*1000)/1000)),y:Math.max(0,Math.min(p.roofLength-o.length,Math.round((d.o.y+d.dy)*1000)/1000))}:o)});});});
  svg.addEventListener('pointercancel',()=>{drag?.group.removeAttribute('transform');drag=null;});
 }
 return {mount};
}
