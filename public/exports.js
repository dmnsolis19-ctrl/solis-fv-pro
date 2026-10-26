import { projectEnvelope } from './persistence.js';
import {roofRows} from './roof.js';
import {reviewRows,reviewState} from './review.js';
import {circuitRows} from './schematic.js';
export const escapeHTML = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Neutralize spreadsheet formula injection in CSV. XLSX uses explicit inline strings.
export function csvCell(value) {
  let s=String(value??'');
  if(typeof value!=='number'&&/^[\s]*[=+@\-]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function materialsRows(r) {
  return [['Código','Categoría','Descripción','Cantidad','Unidad','Precio unitario','Total','Observaciones'],...r.bom.map(x=>[x.code,x.category,x.description,x.qty,x.unit,x.price,x.total,x.note]),['','','TOTAL','','','',r.capex,r.p.currency]];
}
export function materialsCSV(r) {return '\ufeff'+materialsRows(r).map(row=>row.map(csvCell).join(';')).join('\r\n');}
const enc=new TextEncoder();
function crc32(data) {let crc=0xffffffff;for(const b of data){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
/** Minimal standards-compliant ZIP (stored), used for genuine OOXML Excel workbooks. */
export function zipStore(files) {
  const parts=[],central=[];let offset=0,centralSize=0;
  for(const [path,text]of files){
    const name=enc.encode(path),data=enc.encode(text),crc=crc32(data);
    const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);
    const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);
    parts.push(h,data);central.push(c);offset+=h.length+data.length;centralSize+=c.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  const all=[...parts,...central,end],out=new Uint8Array(all.reduce((s,b)=>s+b.length,0));let at=0;for(const b of all){out.set(b,at);at+=b.length;}return out;
}
function column(i) {let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
export function workbookBytes(sheets) {
  const files=[];
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  files.push(['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`]);
  files.push(['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
  files.push(['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`]);
  files.push(['xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`]);
  sheets.forEach((s,i)=>files.push([`xl/worksheets/sheet${i+1}.xml`,`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="24" customWidth="1"/><col min="3" max="3" width="65" customWidth="1"/><col min="4" max="8" width="22" customWidth="1"/></cols><sheetData>${s.rows.map((row,y)=>`<row r="${y+1}">${row.map((value,x)=>typeof value==='number'&&Number.isFinite(value)?`<c r="${column(x)}${y+1}"><v>${value}</v></c>`:`<c r="${column(x)}${y+1}" t="inlineStr"><is><t xml:space="preserve">${xml(value??'')}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`]));
  return zipStore(files);
}
export function reportSheets(r) {
  const sheets=[
    {name:'Resumen',rows:[['SOLIS FV Pro','Predimensionamiento v'+r.version],['Proyecto',r.p.project],['Cliente',r.p.client],['Ubicación',r.p.location],['Estado',r.blocked?'REQUIERE CORRECCIONES':'Predimensionamiento; requiere validación técnica'],['Consumo anual kWh',r.annual],['Potencia DC kWp',r.dcKw],['Paneles',r.panels],['Inversor kW AC',r.inverterKw],[r.hourly?'Producción anual kWh después de clipping':'Producción anual kWh antes de clipping',r.production],['Relación DC AC',r.ratio],['Baterías kWh',r.batteryKwh],['Inversión '+r.p.currency,r.capex],['Ahorro anual neto estimado',r.netSaving],['VAN',r.npv],['Retorno simple años',r.payback??'No recupera en el horizonte'],['Recurso',r.hourly?'POA y temperatura de célula importadas':'HSP manuales; no conectadas a fuente meteorológica'],['Térmica',r.p.ampacityVerified?'Tabla validada por el usuario':'TABLA ILUSTRATIVA SIN VALIDAR'],['Strings',r.layout.valid?`${r.layout.strings} × ${r.layout.series}`:'Sin configuración compatible']]},
    {name:'Materiales',rows:materialsRows(r)},
    {name:'Conductores',rows:[['Circuito','Sección mm2','Corriente A','Iz corregida A','Caída %','Ruta m','Estado'],...Object.entries(r.cables).filter(([,c])=>c).map(([k,c])=>[k,c.section??'Sin solución',c.current,c.iz??'',c.drop??'',c.length,c.verified?'Tabla declarada validada':'Orientativo'])]},
    {name:'Producción mensual',rows:[['Mes','HSP h día','Consumo kWh',r.hourly?'Producción kWh después de clipping':'Producción kWh antes de clipping'],...r.monthly.map(m=>[m.month,m.hsp,m.consumption,m.production])]},
    {name:'Flujo de caja',rows:[['Año','Flujo neto '+r.p.currency,'Flujo acumulado '+r.p.currency],[0,-r.capex,-r.capex],...r.cashflow.map(x=>[x.year,x.cash,x.cumulative])]},
    {name:'Parámetros',rows:[['Parámetro','Valor'],...Object.entries(r.p).filter(([k])=>!['hourlyProfile','logoData','roofObstacles','roofExcluded','reviewRecords'].includes(k)).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):typeof v==='object'?JSON.stringify(v):v]),['reviewRecords',`${Object.keys(r.p.reviewRecords).length} declaraciones; contexto completo en JSON`],['roofObstacles',`${r.p.roofObstacles.length} objetos; datos completos en JSON y hoja de cubierta si está activa`],['roofExcluded',`${r.p.roofExcluded.length} exclusiones; datos completos en JSON y hoja de cubierta si está activa`],['logoData',r.p.logoData?'Logo PNG/JPEG incluido en JSON':'Sin logo'],['hourlyProfile',r.p.hourlyProfile?`${r.p.hourlyProfile.length} horas; ${r.p.hourlyProfile[0][0]} a ${r.p.hourlyProfile.at(-1)[0]}`:'No importado']]},
    {name:'Alertas',rows:[['Nivel','Observación'],...r.alerts.map(a=>[a.level,a.text])]}
  ];
  const review=reviewState(r);sheets.push({name:'Revisión técnica',rows:[['Revisión técnica','Declaraciones del usuario; no certifican el diseño'],['Vigentes / aplicables',`${review.reviewed+review.na} / ${review.total}`],['Pendientes',review.pending],['Por cambios técnicos',review.stale],[],...reviewRows(r),[],...circuitRows(r)]});
  if(r.p.roofLayout){const plan=r.roofPlan;sheets.push({name:'Cubierta 2D',rows:[['Cubierta 2D','Plano conceptual sin sombras ni estructura'],['Estado',plan.valid?(plan.fits?'Cabe':'NO CABE'):plan.reason],['Módulos requeridos',r.panels],['Capacidad del patrón',plan.capacity],['Módulos representados',plan.placed],['Ancho cubierta m',r.p.roofWidth],['Largo cubierta m',r.p.roofLength],['Retiro m',r.p.roofMargin],['Patrón',plan.orientation??r.p.layoutOrientation],['Rutas de cables','No se deducen del plano; longitudes manuales'],[],...roofRows(plan),[],['Obstáculo ID','Nombre','Tipo','X m','Y m','Ancho m','Largo m','Resguardo m'],...r.p.roofObstacles.map(o=>[o.id,o.name,o.kind,o.x,o.y,o.width,o.length,o.clearance]),[],['Celda excluida'],...r.p.roofExcluded.map(id=>[id])]});}
  return sheets;
}
export function projectJSON(p) {return JSON.stringify(projectEnvelope(p),null,2);}
export function download(data,name,type) {
  const url=URL.createObjectURL(new Blob([data],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
