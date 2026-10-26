/** Conceptual single-line topology; device ratings and terminal wiring are not inferred. */
const n=(v,d=2)=>Number(v).toLocaleString('es-CL',{maximumFractionDigits:d});
const e=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut=(s,max=33)=>s.length>max?s.slice(0,max-1)+'…':s;
export const CIRCUITS={dc:'String FV → inversor',grid:'Empalme → conexión',ac:'Inversor → conexión AC',backup:'EPS → cargas críticas'};
export function circuitRows(r){
 return [['Circuito','Sección Cu mm²','I diseño A','Iz corregida A','Caída %','Ruta ida m','Circuitos','Criterio térmico'],...Object.entries(r.cables).filter(([,c])=>c).map(([key,c])=>[CIRCUITS[key],c.section??'SIN SOLUCIÓN',c.current,c.iz??'',c.drop??'',c.length,key==='dc'?r.layout.strings:1,c.verified?'Declarado validado por usuario':'Tabla ilustrativa sin validar'])];
}
export function schematicModel(r){
 const p=r.p,eps=Boolean(r.cables.backup),battery=r.batteries>0;
 const nodes=[
  {id:'pv',x:40,y:145,w:250,h:115,title:'GENERADOR FV',kind:'dc',lines:[`${r.panels} módulos · ${n(r.dcKw)} kWp`,r.layout.valid?`${r.layout.strings} strings × ${r.layout.series} módulos`:'SIN STRINGS COMPATIBLES',r.layout.valid?cut('MPPT: '+r.layout.distribution.join(' / '),30):'Revisar límites eléctricos']},
  {id:'dc-protection',x:40,y:350,w:250,h:95,title:'SECCIONAMIENTO DC',kind:'pending',lines:['Protecciones por definir','Representación agrupada']},
  {id:'inverter',x:420,y:330,w:250,h:160,title:p.system==='hybrid'?'INVERSOR HÍBRIDO':'INVERSOR ON-GRID',kind:'inverter',lines:[cut(p.inverterModel,27),`${n(r.inverterKw)} kW AC · DC/AC ${n(r.ratio)}`,p.phase==='single'?'AC: monofásico':'AC: trifásico']},
  {id:'ac-protection',x:780,y:350,w:230,h:95,title:'PROTECCIÓN AC',kind:'pending',lines:['Dispositivos por definir','Polos y ratings pendientes']},
  {id:'grid',x:1030,y:145,w:210,h:105,title:'RED / EMPALME',kind:'ac',lines:[`${n(p.gridKw)} kW · ${n(p.voltage)} V`,p.phase==='single'?'1 fase':'3 fases · V entre fases']},
  {id:'meter',x:1030,y:285,w:210,h:75,title:'MEDICIÓN',kind:'pending',lines:['Interfaz por verificar']},
  {id:'loads',x:1030,y:550,w:210,h:110,title:'TABLERO GENERAL',kind:'ac',lines:['Cargas de la instalación','Protección por definir']}
 ];
 const edges=[
  {id:'pv-dc',from:'pv',to:'dc-protection',kind:'dc',path:'M165 260V350'},
  {id:'dc-inverter',from:'dc-protection',to:'inverter',kind:'dc',circuit:'dc',path:'M290 397H420'},
  {id:'inverter-ac',from:'inverter',to:'ac-protection',kind:'ac',circuit:'ac',path:'M670 397H780'},
  {id:'grid-meter',from:'grid',to:'meter',kind:'ac',path:'M1135 250V285'},
  {id:'meter-ac',from:'meter',to:'ac-protection',kind:'ac',circuit:'grid',path:'M1135 360V397H1010'},
  {id:'ac-loads',from:'ac-protection',to:'loads',kind:'ac',path:'M1010 397H1135V550'}
 ];
 if(eps){nodes.push({id:'eps-protection',x:420,y:610,w:250,h:80,title:'PROTECCIÓN EPS',kind:'pending',lines:['Transferencia / neutro: revisar']},{id:'critical',x:780,y:600,w:230,h:105,title:'CARGAS CRÍTICAS',kind:'eps',lines:[`${n(p.backupKw)} kW · ${n(r.backupVoltage)} V`,'EPS monofásico separado']});edges.push({id:'inverter-eps',from:'inverter',to:'eps-protection',kind:'eps',path:'M545 490V610'},{id:'eps-critical',from:'eps-protection',to:'critical',kind:'eps',circuit:'backup',path:'M670 650H780'});}
 if(battery){nodes.push({id:'battery',x:40,y:600,w:250,h:115,title:'BANCO DE BATERÍAS',kind:'battery',lines:[`${r.batteries} × ${n(p.batteryModule)} kWh`,`${n(r.batteryKwh)} kWh nominales`,'BMS / cable / protección: revisar']});edges.push({id:'battery-inverter',from:'battery',to:'inverter',kind:'battery',path:'M290 650H340V460H420'});}
 return {nodes,edges,eps,battery,valid:r.layout.valid&&!r.blocked};
}
export function schematicSVG(r){
 const m=schematicModel(r),p=r.p;
 const palette={dc:['#e7f2ed','#317e67'],ac:['#eaf0f9','#3b6d9a'],inverter:['#206b61','#ffffff'],eps:['#f0ebf8','#7e63a0'],battery:['#f0ebf8','#7e63a0'],pending:['#fcf4e7','#9b793e']};
 const lines=m.edges.map(edge=>`<path data-edge="${edge.id}" data-from="${edge.from}" data-to="${edge.to}" d="${edge.path}" fill="none" stroke="${palette[edge.kind][1]}" stroke-width="3"/>${edge.circuit?`<rect x="${edge.circuit==='dc'?338:edge.circuit==='ac'?708:edge.circuit==='grid'?1088:708}" y="${edge.circuit==='backup'?630:edge.circuit==='grid'?365:377}" width="35" height="29" rx="4" fill="white"/><text x="${edge.circuit==='dc'?355:edge.circuit==='ac'?725:edge.circuit==='grid'?1105:725}" y="${edge.circuit==='backup'?651:edge.circuit==='grid'?386:398}" text-anchor="middle" font-size="16" fill="${palette[edge.kind][1]}">${{dc:'C1',ac:'C2',grid:'C3',backup:'C4'}[edge.circuit]}</text>`:''}`).join('');
 const nodes=m.nodes.map(b=>{const [bg,ink]=palette[b.kind];return `<g data-node="${b.id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="9" fill="${bg}" stroke="${b.kind==='inverter'?bg:ink}" stroke-opacity=".45" stroke-dasharray="${b.kind==='pending'?'5 4':'none'}"/><text x="${b.x+15}" y="${b.y+27}" font-size="17" font-weight="700" fill="${ink}">${e(b.title)}</text>${b.lines.map((line,i)=>`<text x="${b.x+15}" y="${b.y+53+i*23}" font-size="15" fill="${ink}">${e(line)}</text>`).join('')}</g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 845" class="schematic-svg" role="img" aria-label="Unifilar conceptual de ${e(p.project)}. ${m.eps?'Con ramal EPS separado.':'Sin ramal EPS.'} ${r.blocked?'Diseño con errores pendientes.':'Predimensionamiento.'}"><title>Unifilar conceptual · ${e(p.project)}</title><desc>Una línea representa cada circuito o grupo de circuitos; no es un plano de terminales. El generador DC está agrupado y no implica unir entradas MPPT. EPS separado de la red. Sin dimensionamiento automático de protecciones, PE, cable de batería ni conmutación de neutro.</desc><rect width="1280" height="845" rx="12" fill="#ffffff"/><g font-family="Arial, sans-serif"><text x="40" y="45" font-size="25" font-weight="700" fill="#285b50">${e(cut(p.project,64))}</text><text x="40" y="76" font-size="16" fill="#688679">${e(cut(p.documentCode,42))} · Rev. ${e(cut(p.documentRevision,12))} · ${r.blocked?'REQUIERE CORRECCIONES':'PREDIMENSIONAMIENTO PARA REVISIÓN'}</text><text x="40" y="105" font-size="15" fill="#9a7a42">UNIFILAR CONCEPTUAL · PROTECCIONES Y PE PENDIENTES DE DEFINICIÓN</text>${lines}<circle cx="1135" cy="397" r="5" fill="#3b6d9a"/>${nodes}<text x="180" y="309" font-size="15" fill="#317e67">DC agrupado · por string</text>${m.eps?'<text x="559" y="560" font-size="16" fill="#7e63a0">EPS</text>':''}<rect x="40" y="748" width="1200" height="69" rx="7" fill="#f3f6f2"/><text x="58" y="776" font-size="16" fill="#597c68">C1: DC por string · C2: inversor AC · C3: empalme${m.eps?' · C4: EPS':''}</text><text x="58" y="801" font-size="15" fill="#718a79">PE, tierra, SPD, diferencial, fusibles y transferencia requieren diseño y verificación específicos.</text></g></svg>`;
}
