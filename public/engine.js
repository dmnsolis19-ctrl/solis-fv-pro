import {PUMP_DEFAULTS,pumpErrors,calculatePumping} from './pumping.js';
/** Deterministic preliminary engineering. No network, DOM or hidden weather data. */
import {solarMatches,solarRequest} from './solar.js';
import {catalogStatus} from './catalog.js';
import {ROOF_DEFAULTS,roofErrors,layoutRoof} from './roof.js';
import {REVIEW_DEFAULTS,reviewErrors} from './review.js';
import {SUPPLY_DEFAULTS,supplyErrors,selectionCompatible,offerExpired} from './procurement.js';
export const VERSION = '1.5.0';
export const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
// Illustrative ampacities ONLY. User must replace and explicitly verify against installation method.
export const SECTIONS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120];
export const DEMO_AMPACITY = [15,20,26,34,46,61,80,99,119,151,182,210];
export const DEFAULTS = Object.freeze({
  pumping:PUMP_DEFAULTS,
  ...ROOF_DEFAULTS,...REVIEW_DEFAULTS,...SUPPLY_DEFAULTS,
  project:'Residencia Los Olivos', client:'Cliente de ejemplo', location:'Chile · recurso solar manual', company:'SOLIS Ingeniería', engineer:'',
  consumption:680, period:'month', coverage:100, hsp:4.5, performance:80, roof:60, spaceFactor:1.2,
  system:'hybrid', phase:'single', voltage:230, gridKw:9.2, pf:1, dcAcRatio:1.2,
  panelModel:'Módulo de ejemplo · 550 W', panelW:550, vmp:41.96, voc:49.9, imp:13.11, isc:13.95, panelArea:2.58,
  betaVoc:-0.28, betaVmp:-0.35, tempMin:-5, tempMax:70,
  inverterModel:'Inversor de ejemplo · verificar ficha', inverterKw:0, dcMax:600, mpptMin:120, mpptMax:500, startVoltage:150,
  mppts:2, stringsPerMppt:1, mpptCurrent:20, mpptIsc:25, maxPvKw:0, pvCurrentFactor:1.25,
  gridLength:15, acLength:15, backupLength:12, dcLength:20, acDrop:3, dcDrop:1.5, conductorTemp:70,
  tempFactor:1, groupFactor:1, ampacityVerified:false, ampacity:DEMO_AMPACITY.join(','), cableReference:'Tabla ilustrativa; reemplazar por ficha y método de instalación',
  backupKw:3, autonomy:4, dod:90, batteryEfficiency:92, batteryModule:5.12, backupLimit:6,
  selfConsumption:60, buyTariff:180, sellTariff:80, panelCost:110000, inverterCost:1100000,
  batteryCost:1500000, cableCost:2500, structureCost:45000, otherCost:350000, laborCost:650000, maintenance:80000,
  degradation:0.5, tariffGrowth:0, discount:6, years:20, currency:'CLP',
  monthlySolar:false, monthlyHsp:[4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5],
  gammaPower:-0.35, soiling:2, shadeLoss:0, mismatch:2, dcLoss:1.5, inverterEfficiency:97, acLoss:1,
  batteryPower:5, hourlyProfile:null, unitPrices:{}, gridMinSection:6,acMinSection:4,backupMinSection:2.5,
  latitude:-33.45,longitude:-70.66,tilt:25,azimuth:0,solarResource:null,
  integrationProjectId:'',panelCatalogId:'',inverterCatalogId:'',panelSource:null,inverterSource:null,inverterAcMaxCurrent:0,
  documentCode:'SOL-FV-001',documentRevision:'01',documentStatus:'draft',reviewer:'',reportNotes:'',logoData:''
});
const LIMITS = {
 consumption:[0.01,1e8], coverage:[1,200], hsp:[0.1,12], performance:[10,100], roof:[0,1e7], spaceFactor:[1,5],
 voltage:[100,1000], gridKw:[0.1,10000], pf:[0.5,1], dcAcRatio:[0.5,2],
 panelW:[10,2000], vmp:[1,200], voc:[1,250], imp:[0.01,100], isc:[0.01,100], panelArea:[0.01,20],
 betaVoc:[-2,0], betaVmp:[-2,0], tempMin:[-70,25], tempMax:[25,100], inverterKw:[0,10000],
 dcMax:[10,2000], mpptMin:[1,1900], mpptMax:[1,2000], startVoltage:[1,2000], mppts:[1,20], stringsPerMppt:[1,20],
 mpptCurrent:[0.1,1000], mpptIsc:[0.1,1000], maxPvKw:[0,10000], pvCurrentFactor:[1,2],
 gridLength:[0,10000], acLength:[0,10000], backupLength:[0,10000], dcLength:[0,10000], acDrop:[0.1,10], dcDrop:[0.1,10],
 conductorTemp:[20,100], tempFactor:[0.1,1.5], groupFactor:[0.1,1], backupKw:[0,10000], autonomy:[0,168],
 dod:[10,100], batteryEfficiency:[50,100], batteryModule:[0.1,500], backupLimit:[0,10000], selfConsumption:[0,100],
 buyTariff:[0,1e7], sellTariff:[0,1e7], panelCost:[0,1e9], inverterCost:[0,1e10], batteryCost:[0,1e10], cableCost:[0,1e8],
  structureCost:[0,1e8], otherCost:[0,1e12], laborCost:[0,1e12], maintenance:[0,1e10], degradation:[0,5], tariffGrowth:[-10,20], discount:[0,30], years:[1,40],
  gammaPower:[-2,0],soiling:[0,50],shadeLoss:[0,99],mismatch:[0,50],dcLoss:[0,50],inverterEfficiency:[50,100],acLoss:[0,50],batteryPower:[0.1,1000],gridMinSection:[1.5,120],acMinSection:[1.5,120],backupMinSection:[1.5,120],
  latitude:[-80,80],longitude:[-180,180],tilt:[0,90],azimuth:[0,360],inverterAcMaxCurrent:[0,20000]
};
export class InputError extends Error { constructor(errors) { super(errors.join(' · ')); this.errors=errors; } }
export function normalize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError(['Proyecto no válido.']);
  const p = {...DEFAULTS}, errors=[];
  for (const k of Object.keys(DEFAULTS)) if (Object.hasOwn(raw,k)) p[k]=raw[k];
  for (const [k,[min,max]] of Object.entries(LIMITS)) {
    if (p[k] === '' || p[k] === null || typeof p[k] === 'boolean') {errors.push(`${k}: introduce un número.`);continue;}
    p[k]=Number(p[k]);
    if (!Number.isFinite(p[k]) || p[k]<min || p[k]>max) errors.push(`${k}: valor entre ${min} y ${max}.`);
  }
  for (const k of ['mppts','stringsPerMppt','years']) if (!Number.isInteger(p[k])) errors.push(`${k}: debe ser entero.`);
  for (const [k,options] of Object.entries({period:['day','month','year'],phase:['single','three'],system:['grid','hybrid'],currency:['CLP','USD','PEN']})) if(!options.includes(p[k])) errors.push(`${k}: opción no válida.`);
  for (const k of ['integrationProjectId','project','client','location','company','engineer','panelModel','inverterModel','cableReference','panelCatalogId','inverterCatalogId','documentCode','documentRevision','reviewer','reportNotes']) if(typeof p[k]!=='string'||p[k].length>240) errors.push(`${k}: texto no válido (máximo 240 caracteres).`);
  if(!['draft','review'].includes(p.documentStatus))errors.push('Estado documental no válido.');
  if(typeof p.logoData!=='string'||p.logoData.length>400000||(p.logoData&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.logoData)))errors.push('Logo no válido: PNG/JPEG hasta 250 KB.');
  if(p.solarResource!==null){
    try{const s=p.solarResource;if(s.provider!=='PVGIS'||s.apiVersion!=='5.3'||!Array.isArray(s.monthlyHsp)||s.monthlyHsp.length!==12||s.monthlyHsp.some(v=>!Number.isFinite(v)||v<0.1||v>12)||typeof s.fetchedAt!=='string'||!Number.isFinite(Date.parse(s.fetchedAt))||typeof s.database!=='string'||s.database.length>80||!Array.isArray(s.period)||s.period.length!==2||s.period.some(v=>v!==null&&(!Number.isInteger(v)||v<1900||v>2200))||new URL(s.url).origin!=='https://re.jrc.ec.europa.eu')throw new Error();solarRequest(s.request);}catch{errors.push('Metadatos de recurso solar no válidos.');}
  }
  for(const key of ['panelSource','inverterSource'])if(p[key]!==null){
    const s=p[key];
    if(!s||typeof s!=='object'||Array.isArray(s)||typeof s.source!=='string'||!/^https:\/\//.test(s.source)||s.source.length>600||['revision','checkedAt','notes'].some(k=>typeof s[k]!=='string'||s[k].length>600)||!s.values||typeof s.values!=='object'||Array.isArray(s.values)||Object.keys(s.values).length>40||Object.entries(s.values).some(([k,v])=>!Object.hasOwn(DEFAULTS,k)||!['number','string'].includes(typeof v))) errors.push('Fuente de catálogo no válida.');
  }
  for(const k of ['monthlySolar','ampacityVerified']) if(typeof p[k]!=='boolean') errors.push(`${k}: debe ser verdadero o falso.`);
  if(!Array.isArray(p.monthlyHsp)||p.monthlyHsp.length!==12||p.monthlyHsp.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0.1||n>12)) errors.push('HSP mensuales: introduce 12 valores entre 0,1 y 12.');
  if(typeof p.ampacity!=='string') errors.push('Tabla térmica no válida.');
  else {
    const values=p.ampacity.split(',').map(Number);
    if(values.length!==SECTIONS.length || values.some((x,i)=>!Number.isFinite(x)||x<=0||x>3000||(i>0&&x<values[i-1]))) errors.push('La tabla térmica debe tener 12 capacidades positivas y crecientes, separadas por coma.');
  }
  if(p.voc<=p.vmp) errors.push('Voc debe ser mayor que Vmp.');
  if(p.isc<p.imp) errors.push('Isc debe ser mayor o igual que Imp.');
  if(p.mpptMin>=p.mpptMax||p.mpptMax>p.dcMax) errors.push('Se requiere MPPT mínimo < MPPT máximo ≤ tensión DC máxima.');
  if(p.startVoltage>p.dcMax) errors.push('La tensión de arranque supera el máximo DC.');
  if(p.tempMin>=p.tempMax) errors.push('La temperatura mínima debe ser menor que la máxima.');
  if(p.hourlyProfile!==null) {
    try {validateHourly(p.hourlyProfile);}catch(error){errors.push(error.message);}
  }
  if(!p.unitPrices||typeof p.unitPrices!=='object'||Array.isArray(p.unitPrices)||Object.entries(p.unitPrices).some(([k,v])=>!/^[A-Z0-9-]{1,20}$/.test(k)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12)) errors.push('Precios unitarios no válidos.');
  if(p.pumping&&typeof p.pumping==='object'&&!Array.isArray(p.pumping))p.pumping={...PUMP_DEFAULTS,...p.pumping};
  errors.push(...pumpErrors(p.pumping));
  errors.push(...roofErrors(p),...reviewErrors(p),...supplyErrors(p));
  if(errors.length) throw new InputError(errors);
  return p;
}
export function annualConsumption(value, period) {return value * ({day:365,month:12,year:1}[period]);}
export function validateHourly(rows) {
  if(!Array.isArray(rows)||![8760,8784].includes(rows.length)) throw new InputError(['El perfil debe contener un año completo: 8760 o 8784 horas en UTC.']);
  let first;
  rows.forEach((row,i)=>{
    if(!Array.isArray(row)||row.length!==4||typeof row[0]!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(row[0])) throw new InputError([`Perfil, fila ${i+2}: timestamp ISO UTC con Z y tres valores numéricos requeridos.`]);
    const date=Date.parse(row[0]);
    if(i===0) first=date;
    if(!Number.isFinite(date)||date!==first+i*3600000||row.slice(1).some(v=>typeof v!=='number'||!Number.isFinite(v))||row[1]<0||row[1]>1600||row[2]<-70||row[2]>100||row[3]<0||row[3]>1e6) throw new InputError([`Perfil, fila ${i+2}: hora discontinua, duplicada o valor fuera de rango.`]);
  });
  const start=new Date(first), year=start.getUTCFullYear();
  if(first!==Date.UTC(year,0,1)||first+rows.length*3600000!==Date.UTC(year+1,0,1)) throw new InputError(['El perfil debe empezar el 1 de enero a las 00:00 UTC y terminar el 31 de diciembre a las 23:00 UTC.']);
  if(rows.reduce((s,r)=>s+r[3],0)<=0||rows.reduce((s,r)=>s+r[1],0)<=0) throw new InputError(['El perfil debe contener consumo e irradiancia mayores que cero.']);
  return rows;
}
export function parseHourlyCSV(text) {
  if(text.length>3e6) throw new InputError(['CSV demasiado grande (máximo 3 MB).']);
  const lines=text.replace(/^\ufeff/,'').trim().split(/\r?\n/),delimiter=lines[0].includes(';')?';':',';
  const header=lines.shift().split(delimiter).map(s=>s.trim().replaceAll('"',''));
  if(header.join(',')!=='timestamp,poa_wm2,cell_temp_c,load_kwh') throw new InputError(['Encabezado requerido: timestamp,poa_wm2,cell_temp_c,load_kwh']);
  const rows=lines.map((line,i)=>{
    const cells=line.split(delimiter).map(s=>s.trim().replaceAll('"',''));
    if(cells.length!==4||cells.some(s=>s==='')) throw new InputError([`CSV, fila ${i+2}: se requieren cuatro columnas completas.`]);
    return [cells[0],...cells.slice(1).map(s=>Number(delimiter===';'?s.replace(',','.'):s))];
  });
  return validateHourly(rows);
}
export function simulateHourly(p,dcKw,inverterKw,batteryKwh) {
  const monthly=MONTHS.map(month=>({month,hsp:0,consumption:0,production:0,self:0,exported:0,grid:0}));
  const dcFactor=(1-p.soiling/100)*(1-p.shadeLoss/100)*(1-p.mismatch/100)*(1-p.dcLoss/100);
  const efficiency=Math.sqrt(p.batteryEfficiency/100),usable=batteryKwh*p.dod/100;
  let soc=0,clipping=0,batteryLoss=0,batteryDelivered=0,totalIrradiation=0,acPotential=0;
  for(const [timestamp,poa,temp,load] of p.hourlyProfile) {
    const m=monthly[new Date(timestamp).getUTCMonth()];
    const dc=dcKw*poa/1000*Math.max(0,1+p.gammaPower/100*(temp-25))*dcFactor;
    const potential=dc*p.inverterEfficiency/100;
    acPotential+=potential*(1-p.acLoss/100);
    const ac=Math.min(inverterKw,potential)*(1-p.acLoss/100);
    clipping+=(potential-Math.min(inverterKw,potential))*(1-p.acLoss/100);
    let self=Math.min(ac,load),surplus=ac-self,deficit=load-self;
    if(usable>0) {
      const charge=Math.min(surplus,p.batteryPower,(usable-soc)/efficiency);
      soc+=charge*efficiency;surplus-=charge;batteryLoss+=charge*(1-efficiency);
      const discharge=Math.min(deficit,p.batteryPower,soc*efficiency);
      soc-=discharge/efficiency;self+=discharge;deficit-=discharge;
      batteryLoss+=discharge/efficiency-discharge;batteryDelivered+=discharge;
    }
    m.consumption+=load;m.production+=ac;m.self+=self;m.exported+=surplus;m.grid+=deficit;m.hsp+=poa/1000;
    totalIrradiation+=poa/1000;
  }
  const sum=k=>monthly.reduce((s,m)=>s+m[k],0);
  const annual=sum('consumption'),production=sum('production');
  monthly.forEach((m,i)=>{const year=new Date(p.hourlyProfile[0][0]).getUTCFullYear();m.hsp/=new Date(Date.UTC(year,i+1,0)).getUTCDate();});
  return {monthly,annual,production,self:sum('self'),exported:sum('exported'),grid:sum('grid'),clipping,batteryLoss,batteryDelivered,endStored:soc,totalIrradiation,acPotential};
}
export function stringLayout(p, target) {
  const vocCold=p.voc*(1+p.betaVoc/100*(p.tempMin-25));
  const vmpHot=p.vmp*(1+p.betaVmp/100*(p.tempMax-25));
  const vmpCold=p.vmp*(1+p.betaVmp/100*(p.tempMin-25));
  const vocHot=p.voc*(1+p.betaVoc/100*(p.tempMax-25));
  if(vmpHot<=0||vocHot<=0) return {valid:false,vocCold,vmpHot,vmpCold,vocHot,min:0,max:0,reason:'Coeficientes térmicos fuera de un rango físico útil.'};
  const min=Math.max(1,Math.ceil(p.mpptMin/vmpHot),Math.ceil(p.startVoltage/vocHot));
  const max=Math.min(Math.ceil(p.dcMax/vocCold)-1,Math.floor(p.mpptMax/vmpCold),1000);
  const candidates=[];
  for(let strings=1; strings<=p.mppts*p.stringsPerMppt;strings++) {
    const parallel=Math.ceil(strings/p.mppts);
    if(parallel*p.imp>p.mpptCurrent || parallel*p.isc*p.pvCurrentFactor>p.mpptIsc) continue;
    const series=Math.max(min,Math.ceil(target/strings));
    const count=series*strings;
    if(series>max || (p.maxPvKw>0 && count*p.panelW/1000>p.maxPvKw)) continue;
    candidates.push({strings,series,count,parallel});
  }
  candidates.sort((a,b)=>a.count-b.count || a.strings-b.strings);
  const best=candidates[0];
  if(!best) return {valid:false,vocCold,vmpHot,vmpCold,vocHot,min,max,reason:'No hay configuración de strings compatible con la energía solicitada y los límites indicados. Cambia el inversor, los MPPT o el objetivo.'};
  const distribution=Array.from({length:p.mppts},(_,i)=>Math.floor(best.strings/p.mppts)+(i<best.strings%p.mppts?1:0));
  return {...best,valid:true,vocCold,vmpHot,vmpCold,vocHot,min,max,distribution,
    voltageCold:best.series*vocCold, voltageHot:best.series*vmpHot, voltageSTC:best.series*p.vmp};
}
export function sizeCable({current,voltage,length,three=false,dc=false,minSection=1.5,pf=1},p) {
  const rho=0.0175*(1+0.00393*(p.conductorTemp-20)); // Cu Ω mm²/m
  const capacity=p.ampacity.split(',').map(Number);
  const factor=p.tempFactor*p.groupFactor;
  const limit=dc?p.dcDrop:p.acDrop;
  for(let i=0;i<SECTIONS.length;i++) {
    const section=SECTIONS[i], iz=capacity[i]*factor;
    // Resistive approximation. Reactance, harmonics and neutral imbalance require detailed study.
    const dropV=(three?Math.sqrt(3):2)*length*current*rho*(dc?1:pf)/section;
    const drop=dropV/voltage*100;
    if(section>=minSection && iz>=current && drop<=limit) return {section,current,iz,drop,dropV,length,conductors:dc?2:(three?5:3),voltage,valid:true,verified:p.ampacityVerified};
  }
  return {section:null,current,iz:null,drop:null,length,conductors:dc?2:(three?5:3),voltage,valid:false,verified:p.ampacityVerified};
}
export function calculate(raw) {
  const p=normalize(raw), alerts=[];
  const add=(level,text)=>alerts.push({level,text});
  let annual=p.hourlyProfile?p.hourlyProfile.reduce((s,row)=>s+row[3],0):annualConsumption(p.consumption,p.period);
  const solar=p.monthlySolar?p.monthlyHsp:Array(12).fill(p.hsp);
  const solarYear=p.hourlyProfile?p.hourlyProfile.reduce((s,row)=>s+row[1]/1000,0):solar.reduce((s,h,i)=>s+h*DAYS[i],0);
  const specificYield=solarYear*p.performance/100;
  const requiredKw=annual*p.coverage/100/specificYield;
  const targetPanels=Math.ceil(requiredKw*1000/p.panelW);
  const layout=stringLayout(p,targetPanels);
  const panels=layout.valid?layout.count:targetPanels;
  const dcKw=panels*p.panelW/1000;
  const inverterSizes=[1,1.5,2,3,3.6,4,5,6,8,10,12,15,20,25,30,40,50,60,80,100,150,200,250];
  const inverterKw=p.inverterKw || inverterSizes.find(x=>x>=dcKw/p.dcAcRatio) || Math.ceil(dcKw/p.dcAcRatio/10)*10;
  const ratio=dcKw/inverterKw;
  let monthly=solar.map((h,i)=>({month:MONTHS[i],hsp:h,consumption:annual/365*DAYS[i],production:dcKw*h*DAYS[i]*p.performance/100}));
  let production=monthly.reduce((s,m)=>s+m.production,0);
  const roofPlan=layoutRoof(p,panels,layout.valid?layout.series:0);
  const area=p.roofLayout?panels*p.panelWidth*p.panelLength:panels*p.panelArea*p.spaceFactor;
  const three=p.phase==='three', divisor=(three?Math.sqrt(3):1)*p.voltage*p.pf;
  const gridCurrent=p.gridKw*1000/divisor, acCurrent=Math.max(inverterKw*1000/divisor,p.inverterAcMaxCurrent);
  // Backup is explicitly single-phase; independent of the grid phase setting.
  const backupVoltage=three?p.voltage/Math.sqrt(3):p.voltage;
  const backupCurrent=p.backupKw*1000/(backupVoltage*p.pf);
  const cables={
    grid:sizeCable({current:gridCurrent,voltage:p.voltage,length:p.gridLength,three,pf:p.pf,minSection:p.gridMinSection},p),
    ac:sizeCable({current:acCurrent,voltage:p.voltage,length:p.acLength,three,pf:p.pf,minSection:p.acMinSection},p),
    backup:p.system==='hybrid'&&p.backupKw>0?sizeCable({current:backupCurrent,voltage:backupVoltage,length:p.backupLength,pf:p.pf,minSection:p.backupMinSection},p):null,
    dc:layout.valid?sizeCable({current:p.isc*p.pvCurrentFactor,voltage:layout.voltageHot,length:p.dcLength,dc:true,minSection:4},p):null
  };
  const batteryRequired=p.system==='hybrid'?p.backupKw*p.autonomy/(p.dod/100*p.batteryEfficiency/100):0;
  const batteries=Math.ceil(batteryRequired/p.batteryModule), batteryKwh=batteries*p.batteryModule;
  const hourly=p.hourlyProfile?simulateHourly(p,dcKw,inverterKw,batteryKwh):null;
  if(hourly){monthly=hourly.monthly;production=hourly.production;}
  const coverage=production/annual*100;
  if(!layout.valid) add('error',layout.reason);
  if(p.solarResource&&!solarMatches(p))add('warning','El recurso consultado no coincide con la ubicación, orientación o HSP actuales. Vuelve a consultar PVGIS; los valores presentes se consideran manuales.');
  for(const kind of ['panel','inverter'])if(catalogStatus(p,kind)==='modified')add('warning',`Parámetros de ${kind==='panel'?'módulo':'inversor'} modificados respecto a la ficha del catálogo. Revisa la trazabilidad.`);
  if(p.panelSource)add('warning','βVmp no está documentado en las fichas de módulos incluidas; el valor actual es un supuesto editable, pendiente de verificar. Sin ganancia bifacial.');
  if(p.inverterSource?.values.phase&&p.phase!==p.inverterSource.values.phase)add('error','La fase de red no coincide con el inversor seleccionado del catálogo. Selecciona un equipo compatible.');
  if(layout.valid&&panels>targetPanels) add('info',`Se agregaron ${panels-targetPanels} módulos para formar strings iguales y respetar la ventana MPPT.`);
  if(p.roofLayout){
    if(!roofPlan.valid)add('error',roofPlan.reason);
    else if(!roofPlan.fits)add('error',`La cubierta admite ${roofPlan.capacity} módulos en el patrón elegido; el diseño requiere ${panels}. Cambia el plano o aplica un objetivo que quepa.`);
    if(roofPlan.staleExcluded)add('warning',`${roofPlan.staleExcluded} exclusiones no corresponden al patrón actual. Revisa o limpia las exclusiones de cubierta.`);
    if(Math.abs(p.panelWidth*p.panelLength-p.panelArea)/p.panelArea>0.02)add('warning','Las dimensiones del módulo difieren más del 2 % del área declarada en Dimensionamiento. La cubierta usa ancho × largo; revisa la ficha.');
    add('info','Cubierta 2D rectangular con patrón uniforme y retiros manuales. No verifica sombras, estructura ni rutas de cable; los colores de string son conceptuales.');
  }else if(area>p.roof) add('error',`Superficie estimada ${area.toFixed(1)} m² superior a los ${p.roof} m² disponibles.`);
  if(hourly&&coverage<p.coverage*0.98) add('warning','La simulación horaria no alcanza la cobertura objetivo. El dimensionamiento inicial usa PR; revisa pérdidas, potencia y consumo.');
  if(p.hourlyProfile&&p.hourlyProfile.some(row=>row[2]<p.tempMin||row[2]>p.tempMax)) add('warning','El perfil contiene temperaturas de célula fuera de los extremos usados para validar strings. Actualiza las temperaturas de diseño.');
  if(inverterKw>p.gridKw) add('warning','La potencia AC del inversor supera la del empalme. Revisa el límite de conexión y eventual control de inyección con la distribuidora.');
  if(ratio>1.35||ratio<0.8) add('warning',`Relación DC/AC ${ratio.toFixed(2)}: revisar compatibilidad y clipping con el fabricante.`);
  if(ratio>1&&!hourly) add('info','Producción antes de clipping: el modelo simplificado no simula la limitación horaria del inversor.');
  if(!p.ampacityVerified) add('warning','Los calibres son orientativos: se usa una tabla térmica ilustrativa sin validar. Reemplázala y confirma método, aislamiento, temperatura y agrupamiento.');
  for(const [name,c] of Object.entries(cables)) if(c&&!c.valid) add('error',`Circuito ${name}: ninguna sección hasta 120 mm² cumple los criterios. Requiere cálculo específico.`);
  if(p.system==='hybrid'&&p.backupKw>Math.min(inverterKw,p.backupLimit)) add('error','La carga de respaldo supera la potencia del inversor o el límite EPS declarado.');
  if(p.system==='hybrid'&&p.backupKw>0&&p.autonomy===0) add('warning','Respaldo configurado sin autonomía: no se incluye batería. Confirma si el fabricante permite EPS sin batería.');
  if(Math.abs(p.vmp*p.imp-p.panelW)/p.panelW>0.08) add('warning','Vmp × Imp difiere más del 8 % de la potencia del módulo. Revisa la ficha técnica.');
  const bom=[];
  const item=(code,category,description,qty,unit,price=0,note='')=>{const chosen=p.procurement.selected[code];if(chosen){if(selectionCompatible(code,chosen,p,cables)){price=chosen.unitNet;note+=` Proveedor: ${chosen.supplier}; cotización ${chosen.quotedAt}; neto ${chosen.currency}.`;if(offerExpired(chosen))add('warning',`Cotización de ${chosen.supplier} para ${code} vencida; actualizar antes de comprar.`);}else add('warning',`La selección de proveedor para ${code} no coincide con equipo, sección o moneda actuales. Se usa el precio manual/de referencia.`);}price=p.unitPrices[code]??price;bom.push({code,category,description,qty,unit,price,total:qty*price,note});};
  item('FV-01','Generación',`${p.panelModel} · ${p.panelW} W`,panels,'ud',p.panelCost,layout.valid?'Cantidad compatible con strings calculados':'Pendiente de configuración válida');
  item('INV-01','Conversión',`${p.inverterModel} · ${inverterKw} kW · ${p.system==='hybrid'?'híbrido':'on-grid'}`,1,'ud',p.inverterCost,'Verificar todos los límites de ficha y certificaciones');
  item('EST-01','Estructura','Kit de montaje por módulo',panels,'kit',p.structureCost,'Anclajes, viento y estructura deben ser calculados');
  if(batteries) item('BAT-01','Respaldo',`Batería compatible · ${p.batteryModule} kWh`,batteries,'ud',p.batteryCost,'Validar BMS, tensión, corriente, potencia y capacidad EPS');
  let cableMeters=0;
  for(const [key,c] of Object.entries(cables)) if(c?.valid) {
    const strings=key==='dc'?layout.strings:1;
    const selected=p.procurement.selected['CAB-'+key.toUpperCase()],multi=selected&&selectionCompatible('CAB-'+key.toUpperCase(),selected,p,cables)&&selected.cores>1;
    const qty=Math.ceil(c.length*(multi?1:c.conductors)*strings*1.1);
    cableMeters+=qty;
    item('CAB-'+key.toUpperCase(),'Conductores',`${multi?selected.model+' · ':''}${key==='dc'?'Solar DC':key==='grid'?'Empalme → tablero':key==='ac'?'Inversor → conexión AC':'EPS → tablero de respaldo'} · Cu ${c.section} mm²`,qty,'m',p.cableCost,`${multi?'Metros de cable completo; ':''}Conductores ${multi?1:c.conductors} × ruta × ${strings} circuito(s) + 10 %. ${c.verified?'Tabla declarada validada por usuario':'Sección orientativa'}.`);
  }
  if(layout.valid) item('CON-01','Conexiones','Par de conectores solares compatibles',layout.strings*2,'par',0,'Cantidad preliminar, extremos de strings; misma marca y tipo');
  item('PRO-01','Protecciones','Protecciones AC/DC, diferencial, SPD, puesta a tierra y seccionamiento',1,'lote',p.otherCost,'Partida presupuestaria; tipos, polos, ratings, coordinación y fusibles por ingeniería');
  item('MO-01','Instalación','Mano de obra y puesta en servicio',1,'lote',p.laborCost,'Presupuesto editable; no incluye trámites ni impuestos');
  for(const x of p.procurement.extras){if(x.offer.currency!==p.currency){add('warning',`Partida adicional ${x.offer.model} omitida por moneda distinta.`);continue;}item('EX-'+x.id,'Adicional proveedor',x.offer.model,x.qty,x.offer.unit,x.offer.unitNet,`Solo presupuesto; sin dimensionamiento del equipo adicional. Proveedor ${x.offer.supplier}, ${x.offer.quotedAt}.`);if(offerExpired(x.offer))add('warning',`Cotización adicional ${x.offer.model} vencida.`);}
  const capex=bom.reduce((s,i)=>s+i.total,0);
  const self=hourly?hourly.self:Math.min(production*p.selfConsumption/100,annual), exported=hourly?hourly.exported:production-self;
  const grossSaving=self*p.buyTariff+exported*p.sellTariff, netSaving=grossSaving-p.maintenance;
  let npv=-capex, cumulative=-capex, payback=null;
  const cashflow=Array.from({length:p.years},(_,i)=>{
    const year=i+1, energy=production*(1-p.degradation/100)**i;
    const used=hourly?self*(1-p.degradation/100)**i:Math.min(energy*p.selfConsumption/100,annual), sold=hourly?exported*(1-p.degradation/100)**i:energy-used;
    const cash=(used*p.buyTariff+sold*p.sellTariff)*(1+p.tariffGrowth/100)**i-p.maintenance;
    const previous=cumulative;
    cumulative+=cash;
    if(payback===null&&cumulative>=0&&cash>0) payback=i+(-previous/cash);
    npv+=cash/(1+p.discount/100)**year;
    return {year,cash,cumulative};
  });
  add('info',hourly?'Simulación horaria con POA y temperatura de célula importadas. Batería equivalente acoplada en AC, SOC inicial vacío, sin tarifa horaria ni simulación geométrica de sombras.':'HSP, precios y tarifas son supuestos editables. El balance anual no prueba autonomía ni autoconsumo horario; no incluye sombras, clipping ni estudio estructural.');
  return {pumping:calculatePumping(p),version:VERSION,p,annual,specificYield,requiredKw,targetPanels,panels,dcKw,inverterKw,ratio,layout,roofPlan,monthly,production,coverage,area,gridCurrent,acCurrent,backupCurrent,backupVoltage,cables,batteryRequired,batteries,batteryKwh,bom,cableMeters,capex,self,exported,grossSaving,netSaving,payback,npv,cashflow,hourly,alerts,blocked:alerts.some(a=>a.level==='error')};
}
