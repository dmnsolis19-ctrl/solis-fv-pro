import {handleSolar} from './solar-handler.js';
import {handleGeocode} from './geocode-handler.js';
export default {async fetch(request,env,context){
  const path=new URL(request.url).pathname;
  if(path==='/api/geocode')return handleGeocode(request,{cache:globalThis.caches?.default,waitUntil:p=>context.waitUntil(p)});
  if(path==='/api/solar')return handleSolar(request,{cache:globalThis.caches?.default,waitUntil:p=>context.waitUntil(p)});
  if(path.startsWith('/api/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
}};
