import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,calculate,normalize} from '../public/engine.js';
import {MARKET_PRODUCTS} from '../public/market-data.js';
import {applyCatalog} from '../public/catalog.js';
import {normalizeBook,readBook,saveBook,restoreBook,netUnit,offerSnapshot,offerExpired,selectionCompatible} from '../public/procurement.js';
import {projectJSON,reportSheets} from '../public/exports.js';
import {parseProject} from '../public/persistence.js';
const offer=(productId='canadian-cs6w-550ms',extra={})=>({id:'price-1',productId,supplier:'Proveedor de prueba',price:119000,packQty:1,currency:'CLP',tax:'gross',taxRate:19,quotedAt:'2026-10-27',validUntil:'',url:'https://example.com/cotizacion',...extra});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const project=()=>applyCatalog(applyCatalog(structuredClone(DEFAULTS),'panel','canadian-cs6w-550ms'),'inverter','solis-s6-plus-6');
test('Chile catalog separates documented parameter sets from reference-only architectures',()=>{
 assert.equal(MARKET_PRODUCTS.length,19);assert.equal(new Set(MARKET_PRODUCTS.map(x=>x.id)).size,19);
 for(const x of MARKET_PRODUCTS){assert.equal(new URL(x.source).protocol,'https:');assert.equal(new URL(x.retail).protocol,'https:');if(x.brand==='Victron Energy')assert.equal(x.values,undefined);}
 assert.throws(()=>applyCatalog(DEFAULTS,'panel','jinko-jkm550m'));
 const r=calculate(project());assert.ok(r.layout.valid);assert.equal(r.p.dcMax,500);assert.equal(r.p.imp,13.2);assert.equal(r.p.inverterKw,6);assert.equal(r.p.panelWidth,1.134);assert.equal(r.p.betaVmp,DEFAULTS.betaVmp);
});
test('Supplier normalization handles packs, tax, zero, currency and valid Gregorian dates',()=>{
 const clean=normalizeBook({schema:'solis-suppliers/v1',offers:[offer()]});assert.equal(netUnit(clean.offers[0]),100000);assert.equal(netUnit(offer('topsolar-6',{price:238000,packQty:100})),2000);assert.equal(netUnit(offer('topsolar-6',{price:0})),0);
 for(const changes of [{price:-1},{packQty:0},{price:Infinity},{currency:'EUR'},{taxRate:101},{quotedAt:'2026-02-30'},{validUntil:'2026-10-20'},{url:'javascript:alert(1)'}])assert.throws(()=>normalizeBook({schema:'solis-suppliers/v1',offers:[offer('canadian-cs6w-550ms',changes)]}));
 assert.throws(()=>normalizeBook({schema:'solis-suppliers/v1',offers:[offer(),offer()]}));
 assert.equal(offerExpired(offer('topsolar-6',{validUntil:'2026-10-27'}),'2026-10-27'),false);assert.equal(offerExpired(offer('topsolar-6',{validUntil:'2026-10-27'}),'2026-10-28'),true);
});
test('Provider base backup restores and malformed/failed writes preserve original data',()=>{
 const storage=memory(),book={schema:'solis-suppliers/v1',offers:[offer()]};saveBook(storage,book);saveBook(storage,{schema:book.schema,offers:[]});assert.equal(readBook(storage).offers.length,0);restoreBook(storage);assert.equal(readBook(storage).offers.length,1);
 const before=storage.getItem('solis-fv-suppliers-v1');assert.throws(()=>saveBook(storage,{schema:'wrong',offers:[]}));assert.equal(storage.getItem('solis-fv-suppliers-v1'),before);
 const fail={getItem:storage.getItem,setItem:()=>{throw new Error('Quota');}};assert.throws(()=>saveBook(fail,book));assert.equal(storage.getItem('solis-fv-suppliers-v1'),before);
 storage.setItem('solis-fv-suppliers-v1','broken');assert.throws(()=>readBook(storage));assert.equal(storage.getItem('solis-fv-suppliers-v1'),'broken');
});
test('Applied prices are snapshots, survive JSON, enter BOM and yield to explicit manual prices',()=>{
 const quote=offer(),snapshot=offerSnapshot(quote),p=project();p.procurement={selected:{'FV-01':snapshot},extras:[]};quote.price=1;
 const r=calculate(p);assert.equal(r.bom.find(x=>x.code==='FV-01').price,100000);assert.equal(snapshot.unitNet,100000);
 assert.equal(calculate({...p,unitPrices:{'FV-01':555}}).bom.find(x=>x.code==='FV-01').price,555);
 assert.deepEqual(parseProject(projectJSON(p)).procurement,p.procurement);assert.ok(reportSheets(r).some(x=>x.name==='Proveedores'));
 assert.ok(reportSheets(r).find(x=>x.name==='Parámetros').rows.every(row=>String(row[1]).length<32767));
});
test('Design changes and different currency do not retain an incompatible provider price',()=>{
 const p=project(),snapshot=offerSnapshot(offer());p.procurement={selected:{'FV-01':snapshot},extras:[]};
 for(const next of [{...p,panelW:600},{...p,currency:'USD'},applyCatalog(p,'panel','jinko-550n-bdv')]){const r=calculate(next);assert.equal(r.bom.find(x=>x.code==='FV-01').price,next.panelCost);assert.ok(r.alerts.some(x=>x.text.includes('no coincide')));}
});
test('Multicore cable quantities use full cable metres, DC remains metres per conductor/string',()=>{
 const p={...applyCatalog(project(),'inverter','solis-s6-plus-5'),acLength:8,acMinSection:4},base=calculate(p);assert.equal(base.cables.ac.section,4);
 const ac=offerSnapshot(offer('rvk-3x4',{price:1190})),dc=offerSnapshot(offer('topsolar-6',{price:1190}));
 assert.ok(selectionCompatible('CAB-AC',ac,base.p,base.cables));assert.equal(selectionCompatible('CAB-AC',offerSnapshot(offer('powerflex-2x15')),base.p,base.cables),false);
 const r=calculate({...p,procurement:{selected:{'CAB-AC':ac,'CAB-DC':dc},extras:[]}});assert.equal(r.bom.find(x=>x.code==='CAB-AC').qty,Math.ceil(8*1.1));
 assert.equal(base.bom.find(x=>x.code==='CAB-AC').qty,Math.ceil(8*base.cables.ac.conductors*1.1));
 if(selectionCompatible('CAB-DC',dc,r.p,r.cables))assert.equal(r.bom.find(x=>x.code==='CAB-DC').qty,Math.ceil(r.cables.dc.length*2*r.layout.strings*1.1));
 assert.equal(r.cables.ac.section,base.cables.ac.section);
});
test('External controllers add explicit cost without changing calculated inverter or energy',()=>{
 const p=project(),base=calculate(p),snapshot=offerSnapshot(offer('victron-250-100',{price:1190000}));p.procurement={selected:{},extras:[{id:'MPPT-1',qty:2,offer:snapshot}]};
 const r=calculate(p);assert.equal(r.capex,base.capex+2000000);assert.equal(r.production,base.production);assert.equal(r.inverterKw,base.inverterKw);assert.match(r.bom.find(x=>x.code==='EX-MPPT-1').note,/sin dimensionamiento/);
 assert.throws(()=>normalize({...p,procurement:{selected:{},extras:[{id:'BAD',qty:-1,offer:snapshot}]}}));
 const changed=calculate({...p,currency:'USD'});assert.ok(!changed.bom.some(x=>x.code==='EX-MPPT-1'));assert.ok(changed.alerts.some(x=>x.text.includes('moneda distinta')));
});
