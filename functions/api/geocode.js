import {handleGeocode} from '../../server/geocode-handler.js';
export function onRequest(context){return handleGeocode(context.request,{cache:globalThis.caches?.default,waitUntil:p=>context.waitUntil(p)});}
