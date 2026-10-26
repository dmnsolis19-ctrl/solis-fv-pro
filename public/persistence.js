import { normalize, VERSION,calculate } from './engine.js';
export const PROJECT_SCHEMA = 'solis-fv-project/v1';
export function projectId(cryptoAPI=globalThis.crypto) {
  if(typeof cryptoAPI.randomUUID==='function') return cryptoAPI.randomUUID();
  // getRandomValues also works on ordinary HTTP previews; randomUUID needs a secure context.
  const bytes=cryptoAPI.getRandomValues(new Uint8Array(16));
  return 'fv-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function projectEnvelope(inputs) {return {schema:PROJECT_SCHEMA,engineVersion:VERSION,exportedAt:new Date().toISOString(),inputs:normalize(inputs)};}
export function parseProject(text) {
  if(typeof text!=='string'||text.length>3000000) throw new Error('Archivo demasiado grande (máximo 3 MB).');
  const data=JSON.parse(text);
  if(data.schema!==PROJECT_SCHEMA) throw new Error('Formato de proyecto no compatible. Importa un archivo JSON de SOLIS FV Pro.');
  return normalize(data.inputs);
}
export function readSaved(storage) {
  try {
    const items=JSON.parse(storage.getItem('solis-fv-projects-v1')||'[]');
    if(!Array.isArray(items)) return [];
    return items.slice(0,50).flatMap(item=>{
      try {if(typeof item.id!=='string'||typeof item.updatedAt!=='string')return [];return [{id:item.id,updatedAt:item.updatedAt,inputs:normalize(item.inputs),emissions:Array.isArray(item.emissions)?item.emissions.filter(x=>x&&typeof x.at==='string'&&typeof x.revision==='string'&&typeof x.engine==='string'&&typeof x.dcKw==='number'&&typeof x.panels==='number'&&Array.isArray(x.changed)&&x.changed.every(k=>typeof k==='string')).slice(-20):[]}];}catch{return [];}
    });
  } catch{return [];}
}
export function saveProject(storage,inputs,id) {
  const items=readSaved(storage), normalized=normalize(inputs);
  const entry={id:id||projectId(),updatedAt:new Date().toISOString(),inputs:normalized};
  const previous=items.find(x=>x.id===entry.id),r=calculate(normalized);
  const changed=previous?Object.keys(normalized).filter(k=>JSON.stringify(normalized[k])!==JSON.stringify(previous.inputs[k])):['initial'];
  entry.emissions=[...(previous?.emissions||[]),{at:entry.updatedAt,revision:normalized.documentRevision,engine:VERSION,dcKw:r.dcKw,panels:r.panels,changed}].slice(-20);
  const next=[entry,...items.filter(x=>x.id!==entry.id)].slice(0,50);
  storage.setItem('solis-fv-projects-v1',JSON.stringify(next));
  return entry;
}
