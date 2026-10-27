import {parsePhoton} from '../public/geocode.js';
export async function handleGeocode(request,{fetcher=fetch,cache,waitUntil}={}){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':status===200?'public, max-age=86400':'no-store'}});
 if(request.method!=='GET')return json({error:'Usa GET.'},405);
 const url=new URL(request.url),q=url.searchParams.get('q')?.trim();
 if([...url.searchParams.keys()].some(k=>k!=='q')||url.searchParams.getAll('q').length!==1||!q||q.length<3||q.length>120||/[\u0000-\u001f<>]/.test(q))return json({error:'Introduce una ciudad o dirección de Chile entre 3 y 120 caracteres.'},400);
 const key=new Request('https://solis-cache.invalid/geocode?q='+encodeURIComponent(q.toLowerCase()));
 if(cache){const hit=await cache.match(key);if(hit)return hit;}
 const endpoint=new URL('https://photon.komoot.io/api/');endpoint.search=new URLSearchParams({q,limit:'10',countrycode:'CL',lang:'es'}).toString();
 try{const upstream=await fetcher(endpoint.href,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!upstream.ok)return json({error:'Servicio de ubicación temporalmente no disponible.'},upstream.status===429?429:502);const text=await upstream.text();if(text.length>300000)throw new Error();const results=parsePhoton(JSON.parse(text));const result=json({results,source:'Photon / OpenStreetMap'});if(cache&&waitUntil)waitUntil(cache.put(key,result.clone()));return result;}catch{return json({error:'No se pudo consultar la ubicación. Usa las sugerencias locales o introduce coordenadas.'},502);}
}
