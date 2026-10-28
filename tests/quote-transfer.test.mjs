import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,DEFAULTS} from '../public/engine.js';import {quoteTransfer} from '../public/quote-transfer.js';
const p={...DEFAULTS,integrationProjectId:'fv-integration-test-001'};
test('Handoff preserves quantities, cable sections and preliminary warnings but excludes prices and suppliers',()=>{
 const r=calculate(p),data=quoteTransfer(r);assert.equal(data.schema,'solis-fv-quote/v1');assert.equal(data.items.length,r.bom.length);assert.equal(data.source.projectId,p.integrationProjectId);
 for(const row of data.items){const original=r.bom.find(x=>x.code===row.code);assert.equal(row.quantity,original.qty);assert.equal(row.description,original.description);assert.ok(!('price'in row));assert.ok(!('unitCost'in row));}
 assert.equal(data.design.preliminary,true);assert.ok(data.design.warnings.length);assert.match(data.items.find(x=>x.code==='CAB-AC').specification,/mm²/);assert.ok(!JSON.stringify(data).includes('unitPrices'));
});
test('Blocked designs, unsupported currencies, missing identity and excessive quantities fail explicitly',()=>{
 assert.throws(()=>quoteTransfer(calculate({...p,dcMax:200,mpptMax:190,mpptMin:120})),/errores/);
 assert.throws(()=>quoteTransfer(calculate({...p,currency:'PEN'})),/monedas/);
 assert.throws(()=>quoteTransfer(calculate(DEFAULTS)),/identificador/);
 const r=calculate(p);r.bom[0].qty=1e7;assert.throws(()=>quoteTransfer(r),/Cantidad/);
 const units=calculate(p);units.bom[0].unit='rollo';assert.throws(()=>quoteTransfer(units),/unidad/);
 const duplicate=calculate(p);duplicate.bom[1].code=duplicate.bom[0].code;assert.throws(()=>quoteTransfer(duplicate),/duplicado/);
});
