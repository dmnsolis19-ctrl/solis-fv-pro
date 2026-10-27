import {MARKET_PRODUCTS,MARKET_DATE} from './market-data.js';
export const SUPPLY_DEFAULTS=Object.freeze({procurement:{selected:{},extras:[]}});
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const httpOK=x=>x===''||typeof x==='string'&&x.length<=600&&/^https:\/\//.test(x);
export function normalizeBook(raw){
 if(!raw||raw.schema!=='solis-suppliers/v1'||!Array.isArray(raw.offers)||raw.offers.length>1000)throw new Error('Base de proveedores no válida (hasta 1000 precios).');
 const ids=new Set();
 const offers=raw.offers.map(o=>{
  if(!o||typeof o!=='object'||typeof o.id!=='string'||!/^[a-zA-Z0-9-]{1,60}$/.test(o.id)||ids.has(o.id)||!MARKET_PRODUCTS.some(p=>p.id===o.productId)||typeof o.supplier!=='string'||!o.supplier.trim()||o.supplier.length>120||!Number.isFinite(o.price)||o.price<0||o.price>1e12||!Number.isFinite(o.packQty)||o.packQty<=0||o.packQty>1e6||!['CLP','USD','PEN'].includes(o.currency)||!['net','gross'].includes(o.tax)||!Number.isFinite(o.taxRate)||o.taxRate<0||o.taxRate>100||!dateOK(o.quotedAt)||(o.validUntil!==''&&!dateOK(o.validUntil))||(o.validUntil&&o.validUntil<o.quotedAt)||!httpOK(o.url))throw new Error('Precio/proveedor no válido. Comprueba unidad, moneda, impuestos y fechas.');
  ids.add(o.id);return {id:o.id,productId:o.productId,supplier:o.supplier.trim(),price:o.price,packQty:o.packQty,currency:o.currency,tax:o.tax,taxRate:o.taxRate,quotedAt:o.quotedAt,validUntil:o.validUntil,url:o.url};
 });return {schema:'solis-suppliers/v1',offers};
}
export function readBook(storage){const text=storage.getItem('solis-fv-suppliers-v1');return text?normalizeBook(JSON.parse(text)):{schema:'solis-suppliers/v1',offers:[]};}
export function saveBook(storage,book){const clean=normalizeBook(book),previous=storage.getItem('solis-fv-suppliers-v1');if(previous)storage.setItem('solis-fv-suppliers-backup-v1',previous);storage.setItem('solis-fv-suppliers-v1',JSON.stringify(clean));return clean;}
export function restoreBook(storage){const previous=storage.getItem('solis-fv-suppliers-backup-v1');if(!previous)throw new Error('No hay respaldo anterior.');return saveBook(storage,normalizeBook(JSON.parse(previous)));}
export function netUnit(o){return o.price/o.packQty/(o.tax==='gross'?1+o.taxRate/100:1);}
export function offerExpired(o,today=new Date().toISOString().slice(0,10)){return Boolean(o.validUntil&&o.validUntil<today);}
export function offerSnapshot(o){const product=MARKET_PRODUCTS.find(x=>x.id===o.productId);if(!product)throw new Error('Producto no encontrado.');return {productId:product.id,model:`${product.brand} ${product.model}`,category:product.category,unit:product.unit,cores:product.cores??1,section:product.section??0,supplier:o.supplier,unitNet:netUnit(o),currency:o.currency,quotedAt:o.quotedAt,validUntil:o.validUntil,url:o.url};}
export function supplyErrors(p){
 const errors=[],v=p.procurement;
 if(!v||typeof v!=='object'||Array.isArray(v)||!v.selected||typeof v.selected!=='object'||Array.isArray(v.selected)||Object.keys(v.selected).length>6||!Array.isArray(v.extras)||v.extras.length>50)return ['Selección de proveedores no válida.'];
 const valid=s=>s&&typeof s==='object'&&['productId','model','category','unit','supplier','currency','quotedAt','validUntil','url'].every(k=>typeof s[k]==='string')&&s.productId.length<=80&&s.model.length<=240&&s.supplier.length>0&&s.supplier.length<=120&&Object.hasOwn({inverter:1,panel:1,controller:1,dcCable:1,acCable:1},s.category)&&['ud','m'].includes(s.unit)&&Number.isFinite(s.unitNet)&&s.unitNet>=0&&s.unitNet<=1e12&&Number.isInteger(s.cores)&&s.cores>=1&&s.cores<=5&&Number.isFinite(s.section)&&s.section>=0&&s.section<=120&&['CLP','USD','PEN'].includes(s.currency)&&dateOK(s.quotedAt)&&(s.validUntil===''||(dateOK(s.validUntil)&&s.validUntil>=s.quotedAt))&&httpOK(s.url);
 for(const [code,s]of Object.entries(v.selected))if(!['FV-01','INV-01','CAB-DC','CAB-AC','CAB-GRID','CAB-BACKUP'].includes(code)||!valid(s))errors.push('Proveedor seleccionado no válido.');
 const ids=new Set();for(const x of v.extras){if(!x||!valid(x.offer)||typeof x.id!=='string'||!/^[A-Z0-9-]{1,12}$/.test(x.id)||ids.has(x.id)||!Number.isFinite(x.qty)||x.qty<=0||x.qty>1e6)errors.push('Partida adicional de proveedor no válida.');ids.add(x?.id);}
 return errors;
}
export function selectionCompatible(code,s,p,cables={}){
 if(s.currency!==p.currency)return false;
 if(code==='FV-01'||code==='INV-01'){const kind=code==='FV-01'?'panel':'inverter',source=p[kind+'Source'];return Boolean(s.category===kind&&s.productId===p[kind+'CatalogId']&&source&&Object.entries(source.values).every(([k,v])=>p[k]===v));}
 const key=code.replace('CAB-','').toLowerCase(),c=cables[key];
 return Boolean(c?.valid&&s.section===c.section&&(key==='dc'?s.category==='dcCable'&&s.cores===1:s.category==='acCable'&&(s.cores===1||s.cores===c.conductors)));
}
export function supplyRows(p){return [['Partida','Producto','Proveedor','Precio neto unitario','Moneda','Fecha cotización','Válido hasta','Referencia'],...Object.entries(p.procurement.selected).map(([code,x])=>[code,x.model,x.supplier,x.unitNet,x.currency,x.quotedAt,x.validUntil,x.url]),...p.procurement.extras.map(x=>['EX-'+x.id,x.offer.model,x.offer.supplier,x.offer.unitNet,x.offer.currency,x.offer.quotedAt,x.offer.validUntil,x.offer.url])];}
