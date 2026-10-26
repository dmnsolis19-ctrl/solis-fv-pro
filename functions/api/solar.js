import {handleSolar} from '../../server/solar-handler.js';
export function onRequest(context){return handleSolar(context.request,{cache:globalThis.caches?.default,waitUntil:p=>context.waitUntil(p)});}
