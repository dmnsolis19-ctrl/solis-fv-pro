import {pumpingRows} from './pumping.js';
import {PDFDocument,rgb} from './vendor/pdf-lib.esm.min.js';
import {embedReportFonts} from './report-fonts.js';
import {solarMatches} from './solar.js';
import {catalogStatus} from './catalog.js';
import {reviewRows,reviewState} from './review.js';
import {circuitRows} from './schematic.js';
import {supplyRows,selectionCompatible} from './procurement.js';
const W=595.28,H=841.89,M=42,CW=W-2*M,BOTTOM=H-55;
const ink=rgb(.08,.18,.22),muted=rgb(.34,.41,.44),teal=rgb(.04,.43,.42),pale=rgb(.94,.97,.97),line=rgb(.82,.87,.88);
const n=(v,d=1)=>Number(v).toLocaleString('es-CL',{maximumFractionDigits:d});
// Standard PDF fonts support Spanish/WinAnsi. Preserve technical meaning for other glyphs.
export function pdfText(value){return String(value??'—').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/→/g,' > ').replace(/×/g,'x').replace(/Ω/g,'ohm').replace(/β/g,'beta').replace(/γ/g,'gamma').replace(/Δ/g,'delta').replace(/≈/g,'~').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/[^\x20-\xff\n\r\t€‘’“”•…]/gu,'?');}
function wrap(value,font,size,width){
 const out=[];
 for(const para of pdfText(value).split(/\r?\n/)){
  let current='';
  for(const word of para.split(/\s+/).filter(Boolean)){
   if(font.widthOfTextAtSize(word,size)>width){
    if(current){out.push(current);current='';}
    for(const c of word){if(current&&font.widthOfTextAtSize(current+c,size)>width){out.push(current);current='';}current+=c;}
   }else if(current&&font.widthOfTextAtSize(current+' '+word,size)>width){out.push(current);current=word;}
   else current+=(current?' ':'')+word;
  }out.push(current);
 }return out.length?out:[''];
}
class Layout{
 constructor(doc,regular,bold,p,date,logo){Object.assign(this,{doc,regular,bold,p,date,logo});this.section='';}
 text(text,x,top,size=10,bold=false,color=ink){this.page.drawText(pdfText(text),{x,y:H-top-size,size,font:bold?this.bold:this.regular,color});}
 box(x,top,width,height,color){this.page.drawRectangle({x,y:H-top-height,width,height,color});}
 rule(top){this.page.drawLine({start:{x:M,y:H-top},end:{x:W-M,y:H-top},thickness:.6,color:line});}
 clipped(text,width,size=9,bold=false){const f=bold?this.bold:this.regular;let t=pdfText(text);while(t&&f.widthOfTextAtSize(t,size)>width)t=t.slice(0,-1);return t;}
 pageStart(title=this.section,continuation=false){
  this.section=title;this.page=this.doc.addPage([W,H]);
  this.box(0,0,W,7,teal);let x=M;
  if(this.logo){const s=Math.min(64/this.logo.width,34/this.logo.height);this.page.drawImage(this.logo,{x:M,y:H-55,width:this.logo.width*s,height:this.logo.height*s});x+=75;}
  this.text(this.clipped(this.p.company||'SOLIS FV Pro',290-(x-M),11,true),x,27,11,true);
  this.text('INGENIERÍA Y ENERGÍA SOLAR',x,45,7,false,muted);
  this.text(this.clipped(this.p.documentCode+' / Rev. '+this.p.documentRevision,170,8,true),W-M-170,27,8,true);
  this.text((this.p.documentStatus==='review'?'Para revisión':'Borrador')+' / '+this.date,W-M-170,43,8,false,muted);
  this.rule(68);this.y=88;
  const lines=wrap(title+(continuation?' (continuación)':''),this.bold,19,CW);
  for(const t of lines){this.text(t,M,this.y,19,true);this.y+=25;}this.y+=16;
 }
 ensure(height){if(this.y+height>BOTTOM)this.pageStart(this.section,true);}
 paragraph(text,{size=10,bold=false,color=ink,gap=12}={}){for(const t of wrap(text,bold?this.bold:this.regular,size,CW)){this.ensure(size*1.4);this.text(t,M,this.y,size,bold,color);this.y+=size*1.4;}this.y+=gap;}
 subhead(text){this.ensure(50);this.paragraph(text,{size:12,bold:true,color:teal,gap:9});}
 table(heads,rows,ratios){
  const widths=(ratios||heads.map(()=>1)).map(v=>CW*v/(ratios||heads.map(()=>1)).reduce((a,b)=>a+b,0)),size=8.5,leading=12,pad=7;
  const render=(cells,height,header=false,index=0)=>{let x=M;this.box(M,this.y,CW,height,header?teal:index%2===0?pale:rgb(1,1,1));cells.forEach((lines,i)=>{lines.forEach((t,j)=>this.text(t,x+pad,this.y+pad+j*leading,size,header,header?rgb(1,1,1):ink));x+=widths[i];});this.y+=height;};
  const header=heads.map((h,i)=>wrap(h,this.bold,size,widths[i]-pad*2)),hh=Math.max(...header.map(c=>c.length))*leading+pad*2;
  this.ensure(hh+40);render(header,hh,true);
  rows.forEach((row,index)=>{
   const cells=heads.map((_,i)=>wrap(row[i]??'—',this.regular,size,widths[i]-pad*2));let remaining=Math.max(...cells.map(c=>c.length)),offset=0;
   while(remaining>0){
    if(this.y+leading+pad*2>BOTTOM){this.pageStart(this.section,true);render(header,hh,true);}
    const count=Math.min(remaining,Math.floor((BOTTOM-this.y-pad*2)/leading));
    // Split an oversized row across pages, repeating column headers on each page.
    render(cells.map(c=>c.slice(offset,offset+count)),count*leading+pad*2,false,index);offset+=count;remaining-=count;
   }
  });this.y+=15;
 }
 image(image,maxHeight=330){const scale=Math.min(CW/image.width,maxHeight/image.height),width=image.width*scale,height=image.height*scale;this.ensure(height+12);this.page.drawImage(image,{x:M+(CW-width)/2,y:H-this.y-height,width,height});this.y+=height+15;}
 finish(){const pages=this.doc.getPages();pages.forEach((page,i)=>{this.page=page;this.rule(H-39);this.text(this.clipped(this.p.documentCode+' / Rev. '+this.p.documentRevision+' / SOLIS FV Pro',CW-65,7),M,H-29,7,false,muted);this.text(`${i+1} / ${pages.length}`,W-M-39,H-29,7,false,muted);});}
}
export async function buildReportPDF(r,{comparisons=[],generatedAt=new Date().toISOString(),figures={}}={}){
 const p=r.p,doc=await PDFDocument.create(),[regular,bold]=await embedReportFonts(doc);
 doc.setTitle(pdfText(p.project+' - '+p.documentCode));doc.setAuthor(pdfText(p.company));doc.setSubject('Predimensionamiento fotovoltaico para revisión');doc.setCreator('SOLIS FV Pro '+r.version);doc.setCreationDate(new Date(generatedAt));
 let logo=null;if(p.logoData)try{logo=await (p.logoData.startsWith('data:image/png')?doc.embedPng(p.logoData):doc.embedJpg(p.logoData));}catch{throw new Error('El logo no es una imagen válida. Vuelve a cargar un PNG/JPEG para emitir el PDF.');}
 const l=new Layout(doc,regular,bold,p,new Date(generatedAt).toLocaleDateString('es-CL'),logo),money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:p.currency,maximumFractionDigits:p.currency==='CLP'?0:2}).format(v);
 const solar=solarMatches(p)?`${p.solarResource.database}; consulta ${p.solarResource.fetchedAt}; período ${p.solarResource.period.join('-')}`:'HSP manuales; sin recurso externo vigente asociado al sitio';
 l.pageStart('Estudio fotovoltaico');l.paragraph('PROPUESTA TÉCNICA Y ECONÓMICA',{size:9,bold:true,color:teal});l.paragraph(p.project,{size:27,bold:true,gap:8});l.paragraph(p.client+' / '+p.location,{size:12,color:muted,gap:24});
 const metrics=[[n(r.dcKw,2)+' kWp','Generador solar'],[r.panels+' módulos',n(p.panelW,0)+' Wp por módulo'],[n(r.production,0)+' kWh','Producción anual estimada']];
 l.ensure(94);metrics.forEach(([v,label],i)=>{const x=M+i*CW/3;l.box(x,l.y,CW/3-6,76,pale);l.text(v,x+12,l.y+15,Math.min(17,(CW/3-30)/bold.widthOfTextAtSize(pdfText(v),1)),true,teal);l.text(label,x+12,l.y+47,8,false,muted);});l.y+=99;
 l.table(['Proyecto','Información'],[['Sistema',`${p.system==='hybrid'?'Híbrido con respaldo':'Conectado a red'}; ${p.phase==='single'?'monofásico':'trifásico'}`],['Empalme',`${n(p.gridKw)} kW; ${n(p.voltage)} V`],['Demanda / cobertura anual',`${n(r.annual,0)} kWh / ${n(r.coverage)} % (no autonomía)`],['Responsable / revisor',`${p.engineer||'Sin asignar'} / ${p.reviewer||'Sin asignar'}`],['Fuente solar',solar]],[1,2.5]);
 l.paragraph(r.blocked?'REQUIERE CORRECCIONES':'PENDIENTE DE VALIDACIÓN PROFESIONAL',{size:11,bold:true,color:teal});l.paragraph('Estimación energética, strings, conductores orientativos, almacenamiento y presupuesto. No incluye sombras 3D, estructura, cortocircuito ni coordinación de protecciones. No acredita cumplimiento normativo.',{size:9,color:muted});if(p.reportNotes)l.paragraph(p.reportNotes);
 l.pageStart('Configuración y balance energético');
 l.table(['Componente','Selección / comprobación'],[['Módulo',p.panelModel],['Inversor',`${p.inverterModel}; ${n(r.inverterKw)} kW AC`],['Strings',r.layout.valid?`${r.layout.strings} strings x ${r.layout.series} módulos; MPPT ${r.layout.distribution.join(' / ')}`:'Sin configuración compatible'],['Voc frío / límite',r.layout.valid?`${n(r.layout.voltageCold)} / ${p.dcMax} V`:'Pendiente'],['Vmp caliente / mínimo',r.layout.valid?`${n(r.layout.voltageHot)} / ${p.mpptMin} V`:'Pendiente'],['Extremos de célula',`${p.tempMin} a ${p.tempMax} °C`],['Relación DC/AC / superficie',`${n(r.ratio,2)} / ${n(r.area)} m²`],['Almacenamiento',`${r.batteries} x ${n(p.batteryModule,2)} kWh = ${n(r.batteryKwh,2)} kWh`]], [1,2.5]);
 l.subhead('Producción y demanda mensual');
 l.ensure(145);const chartY=l.y,chartH=93,max=Math.max(1,...r.monthly.flatMap(m=>[m.production,m.consumption])),step=CW/12;
 r.monthly.forEach((m,i)=>{const x=M+i*step;for(const [v,color,dx]of [[m.production,teal,7],[m.consumption,rgb(.76,.83,.84),20]]){const h=chartH*v/max;l.box(x+dx,chartY+chartH-h,10,h,color);}l.text(m.month.slice(0,3),x+6,chartY+chartH+8,7,false,muted);});l.y+=129;l.paragraph('Verde: producción. Gris: demanda. Escala común; detalle en kWh en la tabla.',{size:8,color:muted});
 l.table(['Mes','HSP h/día','Demanda kWh','Producción kWh'],r.monthly.map(m=>[m.month,n(m.hsp,2),n(m.consumption),n(m.production)]),[1,1,1.3,1.3]);l.paragraph(r.hourly?'Modelo horario: clipping y pérdidas desglosadas; batería equivalente AC con SOC inicial vacío.':'Modelo mensual: potencia x HSP x días x PR. Producción antes de clipping; autoconsumo supuesto, sin simulación horaria.',{size:9,color:muted});
 if(p.roofLayout){l.pageStart('Cubierta y distribución conceptual 2D');if(figures.roof)l.image(await doc.embedJpg(figures.roof),350);l.table(['Comprobación','Resultado'],[['Cubierta / retiro',`${p.roofWidth} x ${p.roofLength} m / ${p.roofMargin} m`],['Módulo',`${p.panelWidth} x ${p.panelLength} m`],['Requeridos / capacidad / representados',`${r.panels} / ${r.roofPlan.capacity} / ${r.roofPlan.placed}`],['Estado',!r.roofPlan.valid?r.roofPlan.reason:r.roofPlan.fits?'Admite la cantidad solicitada':'NO CABE; cálculo conserva la cantidad solicitada']], [1.4,2]);l.paragraph('Plano conceptual en el plano de cubierta. Sin sombras, estructura, mezcla de orientaciones ni rutas eléctricas; longitudes de cable manuales. La vista del informe representa hasta 500 celdas.',{size:9,color:muted});if(p.roofObstacles.length)l.table(['Objeto','X / Y m','Ancho x largo m','Resguardo m'],p.roofObstacles.map(o=>[o.name,`${o.x} / ${o.y}`,`${o.width} x ${o.length}`,o.clearance]),[1.7,1,1,1]);}
 if(p.includeSchematic){l.pageStart('Diagrama unifilar conceptual');if(figures.schematic)l.image(await doc.embedJpg(figures.schematic),390);l.paragraph(p.schematicNotes||'Topología conceptual para revisión; sin especificación automática de dispositivos.',{size:9});l.table(circuitRows(r)[0].slice(0,6),circuitRows(r).slice(1).map(row=>row.slice(0,6).map(v=>typeof v==='number'?n(v,2):v)),[2.3,1.35,1.1,1.1,1,1.1]);l.paragraph('DC agrupado por string; no prescribe unir MPPT. EPS separado de cargas generales. Transferencia, neutro, PE y cable de batería requieren ingeniería específica.',{size:9,color:muted});}
 l.pageStart('Conductores y verificaciones');l.table(['Circuito','Cu mm²','I diseño A','Iz corr. A','Caída %','Ruta ida m'],Object.entries(r.cables).filter(([,c])=>c).map(([k,c])=>[k,c.section??'Sin solución',n(c.current,2),c.iz?n(c.iz):'—',c.drop!==null?n(c.drop,2):'—',n(c.length)]),[1,1,1,1,1,1]);
 l.paragraph(`Referencia térmica: ${p.cableReference}. ${p.ampacityVerified?'Tabla declarada validada por el usuario.':'Tabla ilustrativa SIN VALIDAR.'}`,{size:9});l.table(['Criterio','Valor'],[['Caída límite AC / DC',`${p.acDrop} / ${p.dcDrop} % por circuito`],['Cobre / temperatura',`${p.conductorTemp} °C; cálculo resistivo`],['Corrección temperatura / agrupamiento',`${p.tempFactor} / ${p.groupFactor}`],['Respaldo',`${p.backupKw} kW; ${p.autonomy} h; EPS monofásico ${n(r.backupVoltage)} V`],['DoD / eficiencia batería',`${p.dod} / ${p.batteryEfficiency} %`]], [1.4,2]);l.subhead('Alertas del cálculo');l.table(['Nivel','Observación'],r.alerts.map(a=>[a.level==='error'?'CORREGIR':a.level==='warning'?'REVISAR':'SUPUESTO',a.text]),[1,5]);
 l.pageStart('Presupuesto y evaluación económica');l.table(['Partida / descripción','Cantidad','Neto unitario','Importe neto'],r.bom.map(x=>[`${x.code} / ${x.description}`,`${n(x.qty,2)} ${x.unit}`,money(x.price),money(x.total)]),[3.7,1,1.5,1.6]);l.paragraph('INVERSIÓN ESTIMADA: '+money(r.capex),{size:15,bold:true,color:teal});l.paragraph('Importes netos; impuestos, trámites y financiación excluidos. Los precios de proveedor con impuesto se convierten a netos. Las partidas de referencia siguen siendo editables.',{size:9,color:muted});l.table(['Indicador','Resultado'],[['Autoconsumo / excedentes',`${n(r.self,0)} / ${n(r.exported,0)} kWh/año`],['Compra / venta',`${money(p.buyTariff)} / ${money(p.sellTariff)} por kWh`],['Ahorro neto año 1',money(r.netSaving)],['Retorno simple',r.payback===null?'No recupera en el horizonte':n(r.payback)+' años'],['VAN',`${money(r.npv)}; ${p.years} años; tasa ${p.discount} %`]], [1.4,2]);l.paragraph(`Degradación FV ${p.degradation} %/año. Sin sustituciones de batería o inversor. Autoconsumo ${r.hourly?'calculado con perfil horario':'supuesto: '+p.selfConsumption+' % de producción, limitado por demanda'}. Protecciones como partida global pendiente de detalle.`,{size:9,color:muted});
 const supplies=supplyRows(p);if(supplies.length>1){l.pageStart('Cotizaciones y proveedores del proyecto');l.paragraph('Copias conservadas al aplicar cada precio. Cambiar la base de proveedores no modifica esta emisión. Si cambia el diseño o la moneda, una selección incompatible deja de alimentar el presupuesto; prevalece cualquier precio manual de partida.',{size:9});for(const row of supplies.slice(1)){const [code,model,supplier,price,currency,date,until,url]=row,s=p.procurement.selected[code];l.subhead(code+' / '+model);l.table(['Dato','Cotización'],[['Proveedor',supplier],['Precio neto por unidad o metro',new Intl.NumberFormat('es-CL',{style:'currency',currency}).format(price)],['Fecha / vigencia',date+' / '+(until||'Sin plazo declarado')],['Estado en presupuesto',s?selectionCompatible(code,s,p,r.cables)?Object.hasOwn(p.unitPrices,code)?'Precio manual de partida tiene prioridad':'Compatible con el cálculo actual':'Incompatible: se usa referencia/manual':'Adicional; solo costo, sin dimensionamiento'],['Referencia',url||'Sin enlace']], [1.2,2.8]);}}
 l.pageStart('Registro de revisión técnica');const review=reviewState(r);l.paragraph(`${review.reviewed+review.na} / ${review.total} registros vigentes; ${review.pending} pendientes (${review.stale} por cambios técnicos). Las declaraciones no anulan errores ni certifican cumplimiento.`,{size:10});l.table(reviewRows(r)[0],reviewRows(r).slice(1),[1,2.4,1.4,1.2,1.1,2.2]);l.paragraph('Referencias declaradas por el usuario; no comprobadas externamente. Conservar el JSON de cada emisión. Sin firma digital; lista orientativa no exhaustiva.',{size:9,color:muted});
 if(comparisons.length){l.pageStart('Comparación de alternativas');l.table(['Alternativa','kWp','Batería kWh','Inversión','Ahorro año 1','Estado'],comparisons.map(({name,result:x})=>[name,n(x.dcKw,2),n(x.batteryKwh,2),money(x.capex),money(x.netSaving),x.blocked?'CORREGIR':'Preliminar']),[1.7,.8,1,1.4,1.4,1.2]);l.paragraph('Mismo sitio, recurso y tarifas. Sin perfil horario, la batería no aumenta automáticamente el autoconsumo. Revisar alertas de cada alternativa; las cotizaciones incompatibles no se trasladan como si fueran válidas.',{size:9,color:muted});}
 if(p.pumping.enabled){l.pageStart('Estudio independiente de bombeo solar');l.paragraph('Hidráulica estacionaria, agua a 20 °C. Independiente del sistema residencial y de su presupuesto. Generador, motor, curvas, NPSH y límites reales requieren revisión.');l.table(pumpingRows(r)[0],pumpingRows(r).slice(1).map(row=>row.map(v=>typeof v==='number'?n(v,4):v)),[1.5,3,1]);}
 l.pageStart('Trazabilidad y fuentes');const states={manual:'Ingreso manual',matched:'Coincide con campos documentados',modified:'Modificado respecto a la ficha'};
 l.table(['Referencia','Procedencia'],[['Coordenadas',`${p.latitude}, ${p.longitude}; WGS84`],['Plano',`${p.tilt}° inclinación; azimut ${p.azimuth}° desde norte horario`],['Recurso',solar],['Perfil horario',p.hourlyProfile?`${p.hourlyProfile.length} horas UTC; ${p.hourlyProfile[0][0]} a ${p.hourlyProfile.at(-1)[0]}`:'Sin perfil importado'],['Módulo / inversor',states[catalogStatus(p,'panel')]+' / '+states[catalogStatus(p,'inverter')]],['Motor / emisión',r.version+' / '+generatedAt]], [1,3]);
 for(const kind of ['panel','inverter']){const s=p[kind+'Source'];if(s){l.subhead(kind==='panel'?'Ficha del módulo':'Ficha del inversor');l.paragraph(s.source,{size:8});l.paragraph(`${s.revision}; consulta ${s.checkedAt}. ${s.notes}`,{size:9});l.paragraph('Campos documentados: '+Object.entries(s.values).map(([k,v])=>`${k}: ${typeof v==='number'?n(v,4):v}`).join('; '),{size:8,color:muted});}}
 if(p.solarResource){l.subhead('Solicitud solar conservada');l.paragraph(p.solarResource.url,{size:8});l.paragraph(p.solarResource.method,{size:9});}
 l.subhead('Entrega reproducible');l.paragraph('Conservar el JSON editable con entradas completas y cotizaciones aplicadas. Excel incluye materiales, resultados y revisión. Respaldar separadamente la base de proveedores. La evidencia comercial no acredita stock ni certificación SEC.',{size:9});l.paragraph('Referencias de consulta: documentación PVGIS API v5.3 (Joint Research Centre); fichas del fabricante y referencias comerciales enlazadas en el catálogo. Normativa aplicable y versiones vigentes deben validarse para cada proyecto. Metodología y límites en docs/METODOLOGIA.md.',{size:9,color:muted});l.finish();return doc.save();
}
