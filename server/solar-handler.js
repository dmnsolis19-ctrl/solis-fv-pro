import {pvgisURL} from '../public/solar.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=86400':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleSolar(request,{fetcher=fetch,cache=null,waitUntil=()=>{}}={}){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  const url=new URL(request.url);
  let upstream;
  try{
    if([...url.searchParams.keys()].some(k=>!['latitude','longitude','tilt','azimuth'].includes(k)))return json({error:'Parámetro no permitido.'},400);
    upstream=pvgisURL(Object.fromEntries(url.searchParams));
  }catch(e){return json({error:e.message},400);}
  const key=new Request(new URL('/api/solar?'+upstream.searchParams,request.url));
  try{
    const cached=cache?await cache.match(key):null;if(cached)return cached;
    const response=await fetcher(upstream.href,{signal:AbortSignal.timeout(22000),headers:{Accept:'application/json'},redirect:'error'});
    if(!response.ok)return json({error:`PVGIS respondió ${response.status}. Revisa cobertura o inténtalo más tarde.`},response.status===429?429:502);
    if(Number(response.headers.get('content-length')||0)>500000)return json({error:'Respuesta solar demasiado grande.'},502);
    const text=await response.text();if(text.length>500000)return json({error:'Respuesta solar demasiado grande.'},502);
    const data=JSON.parse(text);
    if(!Array.isArray(data.outputs?.monthly?.fixed)||data.outputs.monthly.fixed.length!==12)return json({error:'Respuesta PVGIS incompleta.'},502);
    const output=json(data);if(cache)waitUntil(cache.put(key,output.clone()));return output;
  }catch{return json({error:'El proveedor solar no respondió a tiempo. Se conservan tus datos anteriores; puedes reintentar o importar JSON de PVGIS.'},502);}
}
