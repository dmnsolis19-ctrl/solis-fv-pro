export const SOLAR_VERSION='pvgis-5.3';
export function solarRequest(values){
  const out={};
  for(const [k,min,max]of [['latitude',-80,80],['longitude',-180,180],['tilt',0,90],['azimuth',0,360]]){
    const v=values[k];if(v===''||v===null||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw new Error(`${k}: valor entre ${min} y ${max}.`);
    out[k]=Number(Number(v).toFixed(4));
  }
  return out;
}
// Compass azimuth: 0 N, 90 E, 180 S, 270 W. PVGIS: 0 S, -90 E, 90 W.
export function pvgisURL(values){
  const v=solarRequest(values),url=new URL('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc');
  const aspect=((v.azimuth+180)%360)-180; // normalize compass before converting
  const southBased=aspect>=0?aspect-180:aspect+180;
  for(const [k,value]of Object.entries({lat:v.latitude,lon:v.longitude,angle:v.tilt,aspect:southBased,peakpower:1,loss:0,raddatabase:'PVGIS-ERA5',usehorizon:1,outputformat:'json'}))url.searchParams.set(k,value);
  return url;
}
const DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
export function solarFromPVGIS(data,request,fetchedAt=new Date().toISOString()){
  request=solarRequest(request);
  const loc=data?.inputs?.location,plane=data?.inputs?.mounting_system?.fixed;
  const actualAngle=plane?.slope?.value,aspect=plane?.azimuth?.value;
  const expectedAspect=Number(pvgisURL(request).searchParams.get('aspect'));
  if(!loc||!Number.isFinite(loc.latitude)||!Number.isFinite(loc.longitude)||Math.abs(loc.latitude-request.latitude)>0.0002||Math.abs(loc.longitude-request.longitude)>0.0002||!Number.isFinite(actualAngle)||Math.abs(actualAngle-request.tilt)>0.01||!Number.isFinite(aspect)||Math.abs((((aspect-expectedAspect)+540)%360)-180)>0.01)throw new Error('La respuesta PVGIS no coincide con las coordenadas y el plano solicitados.');
  const rows=data?.outputs?.monthly?.fixed;
  if(!Array.isArray(rows)||rows.length!==12)throw new Error('PVGIS no devolvió 12 meses válidos.');
  const sorted=[...rows].sort((a,b)=>a.month-b.month);
  const hsp=sorted.map((r,i)=>{
    const value=Number(r['H(i)_m'])/DAYS[i];
    if(r.month!==i+1||!Number.isFinite(value)||value<0.1||value>12)throw new Error('Irradiación mensual PVGIS fuera del rango admitido.');
    return value;
  });
  const meta=data.inputs?.meteo_data||{};
  return {provider:'PVGIS',apiVersion:'5.3',database:typeof meta.radiation_db==='string'?meta.radiation_db:'PVGIS-ERA5',
    period:[meta.year_min??null,meta.year_max??null],fetchedAt,request:solarRequest(request),url:pvgisURL(request).href,monthlyHsp:hsp,
    method:'H(i)_m / días del mes; irradiación en plano inclinado, horizonte topográfico PVGIS. Sin sombras de edificios.',
    providerYield:sorted.map(r=>Number.isFinite(Number(r.E_m))?Number(r.E_m):null)};
}
export function solarMatches(p){
  const s=p.solarResource;if(!s)return false;
  try{return JSON.stringify(solarRequest(p))===JSON.stringify(s.request)&&p.monthlySolar&&s.monthlyHsp.every((v,i)=>Math.abs(v-p.monthlyHsp[i])<1e-8);}catch{return false;}
}
export async function fetchSolar(p,fetcher=fetch){
  const request=solarRequest(p),query=new URLSearchParams(Object.entries(request));
  const response=await fetcher('/api/solar?'+query,{signal:AbortSignal.timeout(26000),headers:{Accept:'application/json'}});
  let data;try{data=await response.json();}catch{throw new Error('La ruta solar no está disponible. Publica con Pages Functions o Workers; también puedes importar el JSON original de PVGIS.');}
  if(!response.ok)throw new Error(data.error||'No se pudo obtener el recurso solar.');
  return solarFromPVGIS(data,request);
}
