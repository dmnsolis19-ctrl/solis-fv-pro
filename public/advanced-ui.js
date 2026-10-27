import {escapeHTML as e,download,workbookBytes} from './exports.js';
import {MONTHS} from './engine.js';
import {fetchSolar,solarFromPVGIS,pvgisURL,solarMatches} from './solar.js';
import {PANELS,INVERTERS,applyCatalog,catalogStatus} from './catalog.js';
import {defaultScenarios,compareRows} from './comparison.js';
import {mountMap} from './site-map.js';
import {buildReport} from './report.js';
import {roofForm,roofResults,setupRoof} from './roof-ui.js';
import {schematicResults,setupSchematic} from './schematic-ui.js';
import {setupGeocoder} from './geocode.js';
import {marketResults,setupMarket} from './market-ui.js';
const fmt=(n,d=1)=>Number(n).toLocaleString('es-CL',{maximumFractionDigits:d});
const changedSummary=keys=>[...new Set(keys.map(k=>({initial:'Primera emisión',project:'Nombre del proyecto',client:'Cliente',location:'Ubicación',latitude:'Coordenadas',longitude:'Coordenadas',tilt:'Inclinación',azimuth:'Orientación',solarResource:'Fuente solar',monthlyHsp:'Recurso mensual',hourlyProfile:'Perfil horario',consumption:'Consumo',period:'Período',coverage:'Cobertura',panelModel:'Módulo',panelW:'Potencia del módulo',inverterModel:'Inversor',inverterKw:'Potencia AC',unitPrices:'Precios',documentRevision:'Revisión documental',documentStatus:'Estado documental',logoData:'Logo',engineer:'Responsable',reviewer:'Revisor',reportNotes:'Observaciones',system:'Tipo de sistema',backupKw:'Carga crítica',autonomy:'Autonomía',ampacity:'Tabla térmica',reviewRecords:'Revisiones técnicas',reviewAuthor:'Responsable de revisión',includeSchematic:'Unifilar en informe',schematicNotes:'Notas del unifilar',roofLayout:'Verificación de cubierta',roofWidth:'Geometría de cubierta',roofLength:'Geometría de cubierta',roofMargin:'Retiros',roofObstacles:'Obstáculos y pasillos',roofExcluded:'Exclusiones',panelWidth:'Dimensiones del módulo',panelLength:'Dimensiones del módulo',layoutOrientation:'Patrón de cubierta',panelGap:'Separaciones',rowGap:'Separaciones'}[k]||'Otros parámetros técnicos')))].join(', ');
const field=(p,k,label,help='',type='number')=>`<div class="field"><label for="field-${k}">${label}</label><input id="field-${k}" data-field="${k}" type="${type}" ${type==='number'?'step="any"':'maxlength="240"'} value="${e(p[k])}">${help?`<small>${e(help)}</small>`:''}</div>`;
const section=(title,body)=>`<section class="advanced-form-section"><h3>${title}</h3><div class="form-grid">${body}</div></section>`;
const card=(title,body,subtitle='')=>`<section class="card"><div class="card-heading"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div></div>${body}</section>`;
export const NEW_TITLES={schematic:['Unifilar y revisión técnica','Documenta la topología y los puntos pendientes de ingeniería.'],roof:['Cubierta y distribución 2D','Comprueba el espacio disponible y ajusta la implantación del generador.'],site:['Ubicación y recurso solar','Sitio, orientación y datos solares con procedencia verificable.'],catalog:['Catálogo técnico','Equipos contrastados con fichas de sus fabricantes.'],compare:['Comparación de alternativas','Evalúa diseños bajo los mismos supuestos antes de decidir.'],report:['Informe y revisiones','Una entrega profesional con identidad, resultados y trazabilidad.']};
export function advancedForm(tab,p){
 if(tab==='roof')return roofForm(p);
 if(tab==='site')return section('Coordenadas del sitio',field(p,'location','Nombre de ubicación','','text')+field(p,'latitude','Latitud · WGS84','Sur negativo; ejemplo: −33,45')+field(p,'longitude','Longitud · WGS84','Oeste negativo; ejemplo: −70,66')+`<div class="wide city-shortcuts"><button type="button" data-city="santiago">Santiago</button><button type="button" data-city="antofagasta">Antofagasta</button><button type="button" data-city="concepcion">Concepción</button><button type="button" data-city="lima">Lima</button><button type="button" data-city="juliaca">Juliaca</button></div>`)+section('Plano del generador',field(p,'tilt','Inclinación · grados','0° horizontal, 90° vertical.')+field(p,'azimuth','Azimut · grados','0° norte, 90° este, 180° sur, 270° oeste.')+`<div class="wide note">En el hemisferio sur, norte corresponde a azimut 0°. La consulta aplica este plano al recurso; no rota físicamente el esquema de módulos.</div><button type="button" class="button primary wide" data-advanced="solar-fetch">Consultar recurso PVGIS</button><p class="wide form-note">Consulta externa a PVGIS mediante Cloudflare. Envía coordenadas e inclinación/orientación; no envía cliente ni datos de consumo.</p><button type="button" class="button secondary wide" data-advanced="solar-link">Abrir solicitud PVGIS</button><button type="button" class="button secondary wide" data-advanced="solar-import">Importar respuesta JSON PVGIS</button><p class="wide form-note">Importa solo la respuesta de la solicitud anterior. Se comprueba que sus coordenadas y plano coincidan. Los valores nuevos se aplican únicamente si la respuesta es válida.</p>`);
 if(tab==='report')return section('Identidad de la entrega',field(p,'company','Empresa','','text')+field(p,'engineer','Responsable','','text')+field(p,'reviewer','Revisor','','text')+field(p,'documentCode','Código documental','','text')+field(p,'documentRevision','Revisión','','text')+`<div class="field"><label for="field-documentStatus">Estado documental</label><select id="field-documentStatus" data-field="documentStatus"><option value="draft" ${p.documentStatus==='draft'?'selected':''}>Borrador</option><option value="review" ${p.documentStatus==='review'?'selected':''}>Para revisión</option></select></div>`+field(p,'reportNotes','Observaciones · máx. 240 caracteres','','text')+`<div class="wide logo-controls">${p.logoData?`<img src="${p.logoData}" alt="Logo de empresa cargado">`:''}<button type="button" class="button secondary" data-advanced="logo-upload">Cargar logo PNG/JPEG</button>${p.logoData?'<button type="button" class="text-button" data-advanced="logo-remove">Quitar</button>':''}<small>Máximo 250 KB. Se guarda dentro del proyecto JSON.</small></div>`);
 return '';
}
export function advancedResults(tab,r,history=[]){
 if(tab==='roof')return roofResults(r);
 if(tab==='schematic')return schematicResults(r);
 const p=r.p,money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(n);
 if(tab==='site'){
 const s=p.solarResource,valid=solarMatches(p);
 return card('Selecciona la ubicación',`<div id="site-map" class="site-map"><div class="map-placeholder"><strong>Ubica tu proyecto</strong><p>Activa el mapa para cargar cartografía de OpenStreetMap. También puedes introducir coordenadas sin cargarlo.</p><button class="button secondary" data-advanced="map-enable">Activar mapa</button></div></div><p class="muted">Arrastra para mover; usa +/− para acercar; haz clic para fijar coordenadas. Las ciudades son puntos aproximados de referencia.</p>`)+
 card('Procedencia del recurso',`<div class="source-summary"><span class="tag ${valid?'teal':'amber'}">${valid?'PVGIS asociado al plano actual':'Recurso manual / requiere consulta'}</span><h3>${valid?e(s.database):'Datos solares editables'}</h3><p>${valid?`Consulta: ${e(new Date(s.fetchedAt).toLocaleString('es-CL'))} · período: ${s.period.map(x=>x??'no informado').join('–')}`:'No hay una consulta externa vigente para estas coordenadas y plano.'}</p><p>Plano: ${p.tilt}° · azimut ${p.azimuth}° desde norte.</p></div>${valid?`<div class="solar-months">${s.monthlyHsp.map((h,i)=>`<div><small>${MONTHS[i]}</small><strong>${fmt(h,2)}</strong><span>h/día</span></div>`).join('')}</div><p class="muted">${e(s.method)}</p>`:'<div class="note warning">Los ejemplos HSP existentes no se reemplazan hasta recibir una respuesta válida. Si cambias el sitio o el plano, vuelve a consultar.</div>'}${p.hourlyProfile?'<div class="note warning">Hay un perfil horario importado: ese perfil sigue determinando la simulación. La consulta mensual PVGIS no lo reemplaza.</div>':''}`)+card('Uso del recurso en el cálculo','<p class="muted">Se transforma la irradiación mensual en el plano del generador H(i)_m a HSP medias diarias. SOLIS aplica su propio PR y dimensionamiento. No se utiliza la producción PVGIS E_m como resultado del sistema ni se afirma una simulación certificada.</p>');
 }
 if(tab==='catalog')return marketResults(p);
 if(tab==='compare'){
 const items=defaultScenarios(p);
 return `<div class="section-intro"><span class="tag teal">4 ALTERNATIVAS · MISMO SITIO Y TARIFAS</span><h2>Elige con resultados comparables.</h2><p>La fila actual es tu diseño. Las alternativas se calculan por separado y conservan sus incompatibilidades.</p></div><section class="card"><div class="table-scroll"><table class="comparison-table"><thead><tr><th>Indicador</th>${items.map(x=>`<th>${e(x.name)}</th>`).join('')}</tr></thead><tbody>${[
 ['Generador',x=>fmt(x.dcKw,2)+' kWp'],['Módulos',x=>x.panels],['Inversor',x=>fmt(x.inverterKw)+' kW'],['Banco',x=>fmt(x.batteryKwh,2)+' kWh'],['Generación anual',x=>fmt(x.production,0)+' kWh'],['Autoconsumo anual',x=>fmt(x.self,0)+' kWh'],['Inversión',x=>money(x.capex)],['Ahorro neto año 1',x=>money(x.netSaving)],['Retorno simple',x=>x.payback===null?'Sin retorno':fmt(x.payback)+' años'],['VAN',x=>money(x.npv)],['Errores / avisos',x=>x.alerts.filter(a=>a.level==='error').length+' / '+x.alerts.filter(a=>a.level==='warning').length]
 ].map(([label,fn])=>`<tr><td>${label}</td>${items.map(x=>`<td>${fn(x.result)}</td>`).join('')}</tr>`).join('')}<tr><td>Acciones</td>${items.map((x,i)=>`<td><button class="button small secondary" data-compare-detail="${i}">Ver alertas</button>${i?`<button class="button small primary" data-scenario="${i}">Aplicar</button>`:'<span class="tag teal">Actual</span>'}</td>`).join('')}</tr></tbody></table></div></section><button class="button secondary" data-advanced="compare-export">Exportar comparación a Excel</button><div id="comparison-detail"></div><div class="note warning">Sin perfil horario, retirar la batería no cambia la generación ni el porcentaje supuesto de autoconsumo. La diferencia es de costo y respaldo; importa un perfil para estimar el efecto energético de almacenar.</div>`;
 }
 if(tab==='report')return card('Informe técnico y comercial',`<div class="report-preview-card"><span class="tag teal">${e(p.documentCode)} · REV. ${e(p.documentRevision)}</span><h3>${e(p.project)}</h3><p>${e(p.company)} · ${e(p.client)}</p><div class="inline-stats"><div><small>Generador</small><strong>${fmt(r.dcKw,2)} kWp</strong></div><div><small>Inversión estimada</small><strong>${money(r.capex)}</strong></div></div><p class="muted">Portada, balance mensual, cubierta 2D cuando está activa, strings, cables, alertas, presupuesto, comparación de alternativas y fuentes. Incluye logo y datos del responsable.</p><button class="button primary" data-advanced="report-preview">Vista previa del informe</button><button class="button primary" data-advanced="report-pdf">Descargar PDF</button><button class="button secondary" data-advanced="report-print">Imprimir informe</button></div>`)+card('Historial de emisiones locales',`<p class="muted">Cada guardado registra fecha, revisión, versión del motor, resumen y campos modificados. El JSON exportado conserva las entradas completas de la emisión actual. No hay firma digital ni restauración automática de emisiones anteriores.</p><button class="button secondary" data-advanced="revision-save">Guardar emisión actual</button>${history.length?`<div class="table-scroll"><table><thead><tr><th>Fecha / revisión</th><th>Motor</th><th>Resumen</th><th>Campos modificados</th></tr></thead><tbody>${[...history].reverse().map(x=>`<tr><td>${e(new Date(x.at).toLocaleString('es-CL'))}<br>Rev. ${e(x.revision)}</td><td>${e(x.engine)}</td><td>${fmt(x.dcKw,2)} kWp · ${x.panels} módulos</td><td>${e(changedSummary(x.changed)||'Sin cambios en parámetros')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Guarda el proyecto para registrar su primera emisión.</p>'}`);
 return '';
}
export function setupAdvanced({getInputs,setInputs,repaint,notify,save,getResult,getHistory}){
 setupMarket({getInputs,setInputs,repaint,notify,getResult});
 const geo=setupGeocoder({getInputs,setInputs,repaint,notify});
 const roof=setupRoof({getInputs,setInputs,repaint,notify,getResult});
 setupSchematic({getInputs,setInputs,repaint,notify,getResult});
 let disposeMap=null,mapEnabled=false,loading=false,pdfBusy=false;
 async function emitPDF(){if(pdfBusy)return;const r=getResult();if(!r){notify('Corrige las entradas antes de generar el informe.');return;}pdfBusy=true;const buttons=[...document.querySelectorAll('[data-advanced=report-pdf]')];buttons.forEach(b=>{b.disabled=true;b.textContent='Generando PDF…';});notify('Preparando informe PDF…');try{const {downloadReportPDF}=await import('./pdf-download.js');await downloadReportPDF(r,{comparisons:defaultScenarios(r.p)});notify('Informe PDF generado.');}catch(error){notify(error.message||'No se pudo emitir el PDF.');}finally{pdfBusy=false;buttons.forEach(b=>{b.disabled=false;b.textContent='Descargar PDF';});}}
 const installMap=()=>{disposeMap?.();disposeMap=null;const el=document.querySelector('#site-map');if(el&&mapEnabled){el.replaceChildren();disposeMap=mountMap(el,{...getInputs(),onPick:(lat,lon)=>{setInputs({...getInputs(),latitude:lat,longitude:lon});repaint();}});}};
 async function pickFile(accept,callback){const input=document.createElement('input');input.type='file';input.accept=accept;input.addEventListener('change',async()=>{if(input.files[0])try{await callback(input.files[0]);}catch(e){notify(e.message);}});input.click();}
 const putSolar=s=>{const next={...getInputs(),solarResource:s,monthlySolar:true,monthlyHsp:s.monthlyHsp};setInputs(next);repaint();notify('HSP mensuales aplicadas con fuente y fecha de consulta.');};
 function showReport(print=false){
  const r=getResult();if(!r){notify('Corrige las entradas antes de generar el informe.');return;}
  const target=document.querySelector('#print-report');target.innerHTML=buildReport(r,{comparisons:defaultScenarios(r.p)});
  const dlg=document.querySelector('#report-dialog');document.querySelector('#report-preview').innerHTML=target.innerHTML;
  if(print){document.title=`${r.p.documentCode} - ${r.p.project}`;window.print();}else if(!dlg.open)dlg.showModal();
 }
 document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  try{
   const p=getInputs();
   if(b.dataset.equipment){setInputs(applyCatalog(p,b.dataset.kind,b.dataset.equipment));repaint();notify('Ficha aplicada. Revisa compatibilidad y parámetros pendientes.');}
   if(b.dataset.city){const cities={santiago:[-33.45,-70.66,'Santiago, Chile'],antofagasta:[-23.65,-70.4,'Antofagasta, Chile'],concepcion:[-36.82,-73.05,'Concepción, Chile'],lima:[-12.05,-77.04,'Lima, Perú'],juliaca:[-15.5,-70.13,'Juliaca, Perú']};const [latitude,longitude,location]=cities[b.dataset.city];setInputs({...p,latitude,longitude,location});repaint();}
   if(b.dataset.scenario){const x=defaultScenarios(p)[Number(b.dataset.scenario)];setInputs(x.inputs);repaint();notify(`Alternativa aplicada: ${x.name}.`);}
   if(b.dataset.compareDetail){const x=defaultScenarios(p)[Number(b.dataset.compareDetail)];document.querySelector('#comparison-detail').innerHTML=card(e(x.name),x.result.alerts.map(a=>`<p class="muted"><strong>${e(a.level)}</strong> · ${e(a.text)}</p>`).join(''));}
   const action=b.dataset.advanced;
   if(action==='map-enable'){mapEnabled=true;installMap();}
   if(action==='solar-fetch'){
    if(loading)return;loading=true;b.disabled=true;b.textContent='Consultando PVGIS…';
    const requestInputs=structuredClone(p);
    try{const resource=await fetchSolar(requestInputs);const now=getInputs();if(['latitude','longitude','tilt','azimuth'].some(k=>now[k]!==requestInputs[k]))throw new Error('Cambiaste la ubicación o el plano durante la consulta. Repite para aplicar datos coherentes.');putSolar(resource);}finally{loading=false;if(b.isConnected){b.disabled=false;b.textContent='Consultar recurso PVGIS';}}
   }
   if(action==='solar-link')window.open(pvgisURL(p).href,'_blank','noopener');
   if(action==='solar-import')pickFile('.json,application/json',async file=>{
    if(file.size>500000)throw new Error('Respuesta PVGIS mayor a 500 KB.');const data=JSON.parse(await file.text()),now=getInputs();
    const loc=data.inputs?.location,plane=data.inputs?.mounting_system?.fixed;
    const actualAngle=plane?.slope?.value,aspect=plane?.azimuth?.value;
    const expected=new URL(pvgisURL(now));
    if(!loc||!plane||Math.abs(Number(loc.latitude)-now.latitude)>0.0002||Math.abs(Number(loc.longitude)-now.longitude)>0.0002||!Number.isFinite(actualAngle)||Math.abs(actualAngle-now.tilt)>0.01||!Number.isFinite(aspect)||Math.abs((((aspect-Number(expected.searchParams.get('aspect')))+540)%360)-180)>0.01)throw new Error('La respuesta no corresponde a las coordenadas y orientación actuales. Usa «Abrir solicitud PVGIS» y guarda su JSON.');
    putSolar(solarFromPVGIS(data,now));
   });
   if(action==='logo-upload')pickFile('image/png,image/jpeg',async file=>{if(file.size>250000)throw new Error('El logo debe pesar menos de 250 KB.');if(!['image/png','image/jpeg'].includes(file.type))throw new Error('Usa PNG o JPEG.');const reader=new FileReader();reader.onload=()=>{setInputs({...getInputs(),logoData:reader.result});repaint();};reader.readAsDataURL(file);});
   if(action==='logo-remove'){setInputs({...p,logoData:''});repaint();}
   if(action==='compare-export')download(workbookBytes([{name:'Alternativas',rows:compareRows(defaultScenarios(p))}]),'SOLIS-comparacion.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   if(action==='revision-save')save();
   if(action==='report-preview')showReport();
   if(action==='report-print')showReport(true);
   if(action==='report-pdf')await emitPDF();
   if(action==='report-close')document.querySelector('#report-dialog').close();
  }catch(error){notify(error.message);}
 });
 return {mount:()=>{installMap();roof.mount();geo.mount();},downloadPDF:emitPDF,print:()=>showReport(true),preview:()=>showReport(false)};
}
