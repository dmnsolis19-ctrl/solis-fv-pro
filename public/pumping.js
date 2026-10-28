export const PUMP_SOURCE='https://datatool.pumps.org/pump-fundamentals/sys-curves';
export const DRIVE_SOURCE='https://www.invt.com/uploads/file1/20250604/GD100-PV%20Catalog-V3.0.pdf';
export const PUMP_DRIVES=[
 {id:'invt-gd100-075',model:'INVT GD100-0R7G-SS2-PV',kw:.75,amps:7.2,voltage:220,phases:1,dcMax:440,start:200,min:200,max:400,mpp:330,retail:'https://enertik.com/cl/tienda/bombeo-solar/drivers-solares-vfd/inversor-de-bombeo-solar-invt-linea-gd100-750w/'},
 {id:'invt-gd100-4',model:'INVT GD100-004G-4-PV',kw:4,amps:9.5,voltage:380,phases:3,dcMax:800,start:300,min:300,max:750,mpp:550,retail:'https://enertik.com/cl/tienda/bombeo-solar/drivers-solares-vfd/inversor-de-bombeo-solar-invt-linea-gd100-trifasico-4000w/'},
 {id:'invt-gd100-30',model:'INVT GD100-030G-4-PV',kw:30,amps:60,voltage:380,phases:3,dcMax:800,start:300,min:300,max:750,mpp:550,retail:'https://www.solares.cl/tienda/variadores-de-frecuencia/inversor-variador-de-frecuencia-para-bomba-solar-30kw-trifasico-380v-invt'}
];
export const PUMP_DEFAULTS={enabled:false,dailyM3:30,hours:5,liftM:30,pressureBar:1,pipeLengthM:150,pipeInnerMm:50,roughnessMm:.007,sumK:5,pipePNbar:10,pumpEfficiency:55,motorEfficiency:85,driveEfficiency:96,hsp:4.5,pvFactor:.75,margin:20,motorShaftKw:2.2,motorAmps:5.5,motorVoltage:380,motorPhases:3,altitudeM:500,ambientC:30,derate:1,npshaM:0,npshrM:0,npshMarginM:1,curve:'',driveId:'invt-gd100-4',dcMax:800,dcAmps:0,dcIsc:0,pvMaxKw:0};
const limits={dailyM3:[.01,1e6],hours:[.1,24],liftM:[0,2000],pressureBar:[0,100],pipeLengthM:[0,100000],pipeInnerMm:[5,3000],roughnessMm:[0,10],sumK:[0,10000],pipePNbar:[.1,200],pumpEfficiency:[1,95],motorEfficiency:[1,99],driveEfficiency:[1,99.9],hsp:[.1,12],pvFactor:[.1,1],margin:[0,100],motorShaftKw:[.01,1000],motorAmps:[.01,3000],motorVoltage:[110,690],motorPhases:[1,3],altitudeM:[0,6000],ambientC:[-10,60],derate:[.1,1],npshaM:[0,200],npshrM:[0,200],npshMarginM:[0,20],dcMax:[100,1500],dcAmps:[0,3000],dcIsc:[0,5000],pvMaxKw:[0,2000]};
export function pumpErrors(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return ['Parámetros de bombeo no válidos.'];
 const errors=[];for(const [k,[lo,hi]]of Object.entries(limits))if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<lo||v[k]>hi)errors.push(`Bombeo ${k}: entre ${lo} y ${hi}.`);
 if(typeof v.enabled!=='boolean'||![1,3].includes(v.motorPhases)||!PUMP_DRIVES.some(d=>d.id===v.driveId)||typeof v.curve!=='string'||v.curve.length>4000)errors.push('Tipo, variador o curva de bombeo no válidos.');
 if(v.roughnessMm>=v.pipeInnerMm)errors.push('La rugosidad debe ser menor que el diámetro interior.');
 if(typeof v.curve==='string'&&v.curve.trim())try{parsePumpCurve(v.curve);}catch(e){errors.push(e.message);}
 return errors;
}
export function parsePumpCurve(text){
 const rows=text.trim().split(/\r?\n/).map(line=>line.split(/[;,\t]/).map(x=>x.trim()===''?NaN:Number(x.trim())));
 if(rows.length<2||rows.length>50||rows.some((x,i)=>x.length!==2||!x.every(Number.isFinite)||x[0]<0||x[0]>1e6||x[1]<0||x[1]>10000||(i>0&&(x[0]<=rows[i-1][0]||x[1]>rows[i-1][1]))))throw new Error('Curva de bomba: 2–50 filas «caudal m³/h;altura m», caudal creciente y altura no creciente, sin encabezado. Límites: Q ≤ 1.000.000 m³/h y H ≤ 10.000 m. Use punto decimal.');
 return rows;
}
const G=9.80665,RHO=998.2,NU=1.004e-6;
export function hydraulicPoint(v,flowM3h){
 const d=v.pipeInnerMm/1000,q=flowM3h/3600,velocity=q/(Math.PI*d*d/4),reynolds=velocity*d/NU;
 function turbulent(re){let x=7;for(let i=0;i<30;i++)x=-2*Math.log10(v.roughnessMm/1000/(3.7*d)+2.51*x/re);return 1/(x*x);}
 const frictionFactor=reynolds===0?0:reynolds<2300?64/reynolds:reynolds<4000?(64/2300+(turbulent(4000)-64/2300)*(reynolds-2300)/1700):turbulent(reynolds);
 const friction=frictionFactor*v.pipeLengthM/d*velocity*velocity/(2*G),minor=v.sumK*velocity*velocity/(2*G),pressureHead=v.pressureBar*1e5/(RHO*G),head=v.liftM+pressureHead+friction+minor;
 return {flowM3h,velocity,reynolds,frictionFactor,friction,minor,pressureHead,head,hydraulicKw:RHO*G*q*head/1000};
}
export function pumpOperatingPoint(v,curve){
 for(let i=1;i<curve.length;i++){
  const [q0,h0]=curve[i-1],[q1,h1]=curve[i],head=q=>h0+(h1-h0)*(q-q0)/(q1-q0),diff=q=>head(q)-hydraulicPoint(v,q).head;
  if(diff(q0)*diff(q1)>0)continue;
  let lo=q0,hi=q1;for(let j=0;j<60;j++){const mid=(lo+hi)/2;if(diff(mid)>0)lo=mid;else hi=mid;}
  return hydraulicPoint(v,(lo+hi)/2);
 }return null;
}
export function calculatePumping(p){
 const v=p.pumping,errors=pumpErrors(v);if(errors.length)throw new Error(errors.join(' '));
 const drive=PUMP_DRIVES.find(d=>d.id===v.driveId),flow=v.dailyM3/v.hours,hyd=hydraulicPoint(v,flow);
 const curve=v.curve.trim()?parsePumpCurve(v.curve):null,operating=curve?pumpOperatingPoint(v,curve):null,duty=operating||hyd;
 const shaftKw=duty.hydraulicKw/(v.pumpEfficiency/100),electricalKw=shaftKw/(v.motorEfficiency/100)/(v.driveEfficiency/100),dailyKwh=electricalKw*v.hours,requiredPvKw=dailyKwh/(v.hsp*v.pvFactor)*(1+v.margin/100);
 const warnings=['Modelo estacionario de agua limpia a 20 °C; HSP y rendimientos son supuestos editables. No garantiza volumen diario con irradiancia variable.','Validar curva Q-H, eficiencia en el punto de trabajo, NPSH, aforo y abatimiento del pozo, transitorios, PN, estructura, protecciones, puesta a tierra y cables de salida del VFD con el fabricante.','El 99 % MPPT del catálogo no es rendimiento eléctrico del variador. No se usa como eficiencia de conversión.'];
 if(duty.reynolds>=2300&&duty.reynolds<4000)warnings.push('Flujo en transición: factor de fricción interpolado; requiere revisión.');
 if(duty.velocity>3)warnings.push('Velocidad superior a 3 m/s: revisar diámetro, ruido y transitorios. Este umbral es orientativo.');
 if(shaftKw*(1+v.margin/100)>v.motorShaftKw)errors.push('Potencia mecánica de placa insuficiente para el punto solicitado y margen configurado.');
 if(v.motorShaftKw>drive.kw*v.derate||v.motorAmps>drive.amps*v.derate)errors.push('El motor supera la potencia o corriente de salida del variador con el factor de reducción aplicado.');
 if(v.motorPhases!==drive.phases||Math.abs(v.motorVoltage-drive.voltage)>drive.voltage*.05)errors.push('Fases o tensión nominal del motor no corresponden al variador seleccionado.');
 if(v.altitudeM>1000||v.ambientC>40)warnings.push('Altitud >1000 m o ambiente >40 °C: confirmar derrateo específico. El factor ingresado no se valida automáticamente.');
 if(Math.max(hyd.head,duty.head,curve?.[0][1]||0)*RHO*G/1e5>v.pipePNbar)errors.push('La altura equivalente del punto o el máximo documentado de la curva supera la PN declarada de tubería, aun sin golpe de ariete. Revisar perfil de presiones.');
 if(v.npshaM>0&&v.npshrM>0){if(v.npshaM-v.npshrM<v.npshMarginM)errors.push('Margen NPSH insuficiente con los valores declarados.');}else warnings.push('NPSH no comprobado: completar NPSHa disponible y NPSHr de la curva.');
 if(curve&&!operating)errors.push('La curva de bomba no cruza la curva del sistema en su intervalo documentado. No se extrapola.');
 if(operating&&operating.flowM3h<flow*.99)errors.push('El caudal de intersección de la curva es inferior al caudal de diseño.');
 if(operating)warnings.push('Potencia y energía calculadas en el cruce Q-H, a velocidad fija. Confirmar rendimientos, corriente y NPSHr en ese punto; el VFD no implica regulación automática al caudal objetivo.');
 if(drive.id==='invt-gd100-075')warnings.push('La referencia comercial chilena del variador 0,75 kW limita el motor recomendado a 1/2 HP. Confirmar por escrito compatibilidad del motor y revisión exacta; la potencia nominal del VFD no acredita cualquier motor de igual kW.');
 if(!curve)warnings.push('Sin curva Q-H: el caudal solicitado es un objetivo, no un punto de funcionamiento validado.');
 const vocCold=p.voc*(1+p.betaVoc/100*(p.tempMin-25)),vocHot=p.voc*(1+p.betaVoc/100*(p.tempMax-25)),vmpHot=p.vmp*(1+p.betaVmp/100*(p.tempMax-25)),vmpCold=p.vmp*(1+p.betaVmp/100*(p.tempMin-25));
 // Ideal lower DC-bus bound for nominal AC voltage; does not model modulation/boost hardware.
 const voltageValid=[vocCold,vocHot,vmpHot,vmpCold].every(x=>Number.isFinite(x)&&x>0);
 const minBus=Math.max(drive.min,Math.SQRT2*v.motorVoltage),minSeries=voltageValid?Math.max(1,Math.ceil(minBus/vmpHot),Math.ceil(drive.start/vocHot)):1,maxSeries=voltageValid?Math.min(Math.ceil(v.dcMax/vocCold)-1,Math.floor(drive.max/vmpCold)):0;
 if(!voltageValid)errors.push('Corrección térmica del módulo no física: Voc/Vmp deben permanecer positivos en ambos extremos.');
 let layout=null;
 for(let series=minSeries;vmpHot>0&&vocHot>0&&series<=maxSeries;series++){
  const parallel=Math.max(1,Math.ceil(requiredPvKw*1000/(series*p.panelW))),panels=series*parallel,dcKw=panels*p.panelW/1000;
  if(parallel>100||v.dcAmps>0&&parallel*p.imp>v.dcAmps||v.dcIsc>0&&parallel*p.isc*p.pvCurrentFactor>v.dcIsc||v.pvMaxKw>0&&dcKw>v.pvMaxKw)continue;
  if(!layout||panels<layout.panels)layout={series,parallel,panels,dcKw,vocCold:series*vocCold,vmpHot:series*vmpHot,operatingAmps:parallel*p.imp,designIsc:parallel*p.isc*p.pvCurrentFactor};
 }
 if(!layout)errors.push('Sin arreglo FV compatible con tensión en frío/caliente, bus AC nominal y límites declarados. Revisar módulo, temperatura y revisión del variador; no se fuerza una configuración.');
 const electricalComplete=v.dcAmps>0&&v.dcIsc>0&&v.pvMaxKw>0;
 if(!electricalComplete)warnings.push('Faltan límites DC específicos (Imp, Isc admisible y potencia FV). Completar desde la revisión exacta del fabricante antes de exportar. La corriente de entrada AC no equivale a la de entrada DC.');
 return {v,drive,...hyd,duty,shaftKw,electricalKw,dailyKwh,requiredPvKw,energyPanels:Math.ceil(requiredPvKw*1000/p.panelW),minBus,minSeries,maxSeries,layout,operating,warnings,errors,exportReady:errors.length===0&&electricalComplete};
}
export function pumpingRows(r){const x=r.pumping,v=x.v;return [
 ['Indicador','Valor','Unidad'],
 ['Volumen objetivo',v.dailyM3,'m³/día'],['Horas a caudal de diseño',v.hours,'h/día'],['Caudal de diseño',x.flowM3h,'m³/h'],
 ['Desnivel desde nivel dinámico',v.liftM,'m'],['Presión diferencial terminal',v.pressureBar,'bar'],['Altura por presión terminal',x.pressureHead,'m'],
 ['Longitud hidráulica',v.pipeLengthM,'m'],['Diámetro interior',v.pipeInnerMm,'mm'],['Rugosidad',v.roughnessMm,'mm'],['Suma K',v.sumK,''],['PN declarada',v.pipePNbar,'bar'],
 ['Altura dinámica al caudal objetivo',x.head,'m'],['Fricción lineal al objetivo',x.friction,'m'],['Pérdidas singulares al objetivo',x.minor,'m'],['Velocidad al objetivo',x.velocity,'m/s'],['Reynolds al objetivo',x.reynolds,''],['Factor Darcy al objetivo',x.frictionFactor,''],
 ['Rendimiento bomba / motor / VFD',`${v.pumpEfficiency} / ${v.motorEfficiency} / ${v.driveEfficiency}`,'%'],
 ['Base de potencia',x.operating?'Intersección de curva Q-H':'Objetivo sin curva',''],['Caudal usado para potencia',x.duty.flowM3h,'m³/h'],['Altura usada para potencia',x.duty.head,'m'],['Volumen a caudal fijo durante horas declaradas',x.duty.flowM3h*v.hours,'m³/día'],['Potencia hidráulica',x.duty.hydraulicKw,'kW'],['Potencia al eje',x.shaftKw,'kW'],['Potencia eléctrica a entrada del VFD',x.electricalKw,'kW'],['Energía eléctrica diaria',x.dailyKwh,'kWh/día'],
 ['HSP de diseño',v.hsp,'h/día'],['Factor FV previo al VFD',v.pvFactor,'0–1'],['Reserva de dimensionamiento',v.margin,'%'],['FV requerido por energía',x.requiredPvKw,'kWp'],
 ['Motor: potencia al eje de placa',v.motorShaftKw,'kW'],['Motor: corriente de placa',v.motorAmps,'A'],['Motor: tensión / fases',`${v.motorVoltage} / ${v.motorPhases}`,'V / fases'],['Variador',x.drive.model,''],['Altitud / ambiente',`${v.altitudeM} / ${v.ambientC}`,'m / °C'],['Factor de reducción VFD',v.derate,'0–1'],
 ['NPSHa / NPSHr declarados',`${v.npshaM||'Sin dato'} / ${v.npshrM||'Sin dato'}`,'m'],['Margen NPSH requerido',v.npshMarginM,'m'],
 ['Límite DC máximo declarado',v.dcMax,'V'],['Límite de operación DC',v.dcAmps||'Pendiente','A'],['Isc admisible del VFD',v.dcIsc||'Pendiente','A'],['FV máximo del VFD',v.pvMaxKw||'Pendiente','kWp'],
 ['Arreglo preliminar',x.layout?`${x.layout.series} serie × ${x.layout.parallel} paralelo`:'Sin solución',''],['Potencia FV del arreglo',x.layout?.dcKw??'Sin solución','kWp'],['Voc frío del arreglo',x.layout?.vocCold??'Sin solución','V'],['Vmp caliente del arreglo',x.layout?.vmpHot??'Sin solución','V'],['Imp / Isc de diseño del arreglo',x.layout?`${x.layout.operatingAmps} / ${x.layout.designIsc}`:'Sin solución','A'],
 ['Curva Q-H: Q m³/h; H m',v.curve||'Sin curva',''],['Caudal de curva',x.operating?.flowM3h??'Sin validar','m³/h'],
 ...x.errors.map(t=>['CORREGIR',t,'']),...x.warnings.map(t=>['REVISAR',t,'']),
 ['Método hidráulico',PUMP_SOURCE,''],['Datos nominales VFD',DRIVE_SOURCE,''],['Referencia comercial Chile',x.drive.retail,''],['Fecha de revisión de fuentes','2026-10-28','']
 ];}
