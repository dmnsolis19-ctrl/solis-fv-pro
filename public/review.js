/** User-declared engineering review. This never overrides calculation errors. */
export const REVIEW_DEFAULTS=Object.freeze({includeSchematic:true,schematicNotes:'',reviewAuthor:'',reviewRecords:{}});
export const REVIEW_ITEMS=Object.freeze([
 {id:'dc',group:'DC',title:'Seccionamiento y sobrecorriente DC',help:'Documenta equipos, polos, tensión DC, corrientes y justificación de fusibles por string; comprueba manuales y normativa aplicable.'},
 {id:'ac',group:'AC',title:'Protección del circuito AC',help:'Registra interruptor, polos, curva, capacidad de corte, corriente de falla y coordinación con el conductor y el tablero.'},
 {id:'residual',group:'AC',title:'Protección diferencial / corriente residual',help:'Verifica tipo y sensibilidad, RCMU del inversor y compatibilidad con sus instrucciones. No se deducen de la potencia.'},
 {id:'surge',group:'DC / AC',title:'Sobretensiones y arco eléctrico',help:'Revisa SPD, coordinación, instalación y protección de arco que resulten aplicables al sitio y equipo.'},
 {id:'earth',group:'PE',title:'Puesta a tierra y equipotencialidad',help:'Define esquema de tierra, PE, uniones de marcos, electrodo y ensayos. No se calcula un PE a partir del cable de fase.'},
 {id:'thermal',group:'CABLES',title:'Tabla térmica y canalización',help:'Identifica cable, aislamiento, método de instalación, factores, canalización y tramos; verifica las secciones fuera de la tabla de ejemplo.'},
 {id:'interface',group:'RED',title:'Interfaz de red y conexión',help:'Revisa autorización del equipo, anti-isla, ajustes de red, medición y límites de inyección con la distribuidora.'},
 {id:'eps',group:'EPS',title:'Transferencia, neutro y respaldo',help:'Documenta separación de cargas críticas, transferencia y tratamiento de neutro según el fabricante. Verifica que EPS no realimente la red.',applies:r=>Boolean(r.cables.backup)},
 {id:'battery',group:'BATERÍA',title:'Batería, BMS y protección del banco',help:'Comprueba tensión, BMS compatible, corriente de carga/descarga y falla, cable y protección del banco. El unifilar no calcula estos conductores.',applies:r=>r.batteries>0},
 {id:'commission',group:'ENTREGA',title:'Ensayos, rotulación y documentación',help:'Planifica inspecciones, continuidad, aislamiento, polaridad, pruebas funcionales y documentación de entrega aplicables.'}
]);
export function reviewErrors(p){
 const errors=[];
 if(typeof p.includeSchematic!=='boolean')errors.push('La inclusión del unifilar debe ser verdadera o falsa.');
 for(const [k,max]of [['schematicNotes',240],['reviewAuthor',120]])if(typeof p[k]!=='string'||p[k].length>max)errors.push(`${k}: texto no válido (máximo ${max} caracteres).`);
 const records=p.reviewRecords;
 if(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).length>REVIEW_ITEMS.length){errors.push('Registro de revisiones no válido.');return errors;}
 for(const [id,x]of Object.entries(records)){
  if(!REVIEW_ITEMS.some(i=>i.id===id)||!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['status','by','note','at','basis'].includes(k))||!['reviewed','na'].includes(x.status)||typeof x.by!=='string'||!x.by.trim()||x.by.length>120||typeof x.note!=='string'||!x.note.trim()||x.note.length>500||typeof x.at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(x.at)||!Number.isFinite(Date.parse(x.at))||typeof x.basis!=='string'||!x.basis.startsWith('review-v1:')||x.basis.length>20000)errors.push(`Revisión ${id}: requiere estado válido, responsable, referencia/justificación, fecha y contexto.`);
 }
 return errors;
}
export function reviewBasis(id,r){
 const p=r.p,pick=keys=>Object.fromEntries(keys.map(k=>[k,p[k]]));
 const site=pick(['project','client','location','latitude','longitude','system','phase','voltage']);
 const pv={...pick(['panelModel','panelW','vmp','voc','imp','isc','betaVoc','betaVmp','tempMin','tempMax','pvCurrentFactor','dcMax','mpptMin','mpptMax','startVoltage','mppts','stringsPerMppt','mpptCurrent','mpptIsc','maxPvKw']),panels:r.panels,layout:r.layout,cable:r.cables.dc};
 const ac={...pick(['inverterModel','inverterAcMaxCurrent','gridKw','pf','backupLimit']),inverterKw:r.inverterKw,grid:r.cables.grid,ac:r.cables.ac};
 const backup={...pick(['backupKw','backupLength','backupLimit','batteryPower','autonomy','dod','batteryEfficiency','batteryModule']),voltage:r.backupVoltage,cable:r.cables.backup,batteries:r.batteries,batteryKwh:r.batteryKwh};
 const thermal=pick(['ampacity','ampacityVerified','cableReference','tempFactor','groupFactor','conductorTemp','gridMinSection','acMinSection','backupMinSection','acDrop','dcDrop']);
 const contexts={dc:{pv},ac:{ac},residual:{ac},surge:{pv,ac},earth:{pv,ac,backup},thermal:{pv,ac,backup,thermal},interface:{ac,pv},eps:{ac,backup},battery:{ac,backup},commission:{pv,ac,backup,thermal}};
 if(!Object.hasOwn(contexts,id))throw new Error('Ítem de revisión desconocido.');
 return 'review-v1:'+JSON.stringify({site,...contexts[id]});
}
export function reviewState(r){
 const items=REVIEW_ITEMS.map(item=>{
  const applicable=item.applies?item.applies(r):true,record=r.p.reviewRecords[item.id]??null;
  const stale=Boolean(record&&record.basis!==reviewBasis(item.id,r));
  const status=!applicable?'inactive':!record?'pending':stale?'stale':record.status;
  return {...item,applicable,record,stale,status};
 });
 const active=items.filter(x=>x.applicable);
 return {items,total:active.length,reviewed:active.filter(x=>x.status==='reviewed').length,na:active.filter(x=>x.status==='na').length,pending:active.filter(x=>['pending','stale'].includes(x.status)).length,stale:active.filter(x=>x.status==='stale').length};
}
export const REVIEW_LABELS={pending:'Pendiente',stale:'Revisar por cambios',reviewed:'Revisado por usuario',na:'No aplica · justificado',inactive:'Fuera del sistema actual'};
export function recordReview(r,id,status,by,note,at=new Date().toISOString()){
 const item=REVIEW_ITEMS.find(x=>x.id===id);if(!item||(item.applies&&!item.applies(r)))throw new Error('Esta revisión no corresponde al sistema actual.');
 const records={...r.p.reviewRecords};
 if(status==='pending')delete records[id];
 else records[id]={status,by:by.trim(),note:note.trim(),at,basis:reviewBasis(id,r)};
 const p={...r.p,reviewRecords:records},errors=reviewErrors(p);if(errors.length)throw new Error(errors.join(' '));
 return p;
}
export function reviewRows(r){return [['Área','Revisión','Estado actual','Responsable','Fecha','Referencia / justificación'],...reviewState(r).items.map(x=>[x.group,x.title,REVIEW_LABELS[x.status],x.record?.by??'',x.record?.at??'',x.record?.note??''])];}
