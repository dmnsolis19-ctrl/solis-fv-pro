import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,DEFAULTS} from '../public/engine.js';
import {csvCell,materialsCSV,reportSheets,workbookBytes,projectJSON,escapeHTML} from '../public/exports.js';
import {parseProject,readSaved,saveProject,projectId} from '../public/persistence.js';
test('CSV neutralizes formulas and quotes embedded separators',()=>{
 assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell(' @SUM(A1)'),'"\' @SUM(A1)"');assert.equal(csvCell(-5),'"-5"');
 const csv=materialsCSV(calculate(DEFAULTS));assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('Precio unitario'));
});
test('Real XLSX ZIP signatures, workbook parts and no executable formulas',()=>{
 const r=calculate({...DEFAULTS,panelModel:'=DANGER()'}),sheets=reportSheets(r),data=workbookBytes(sheets);
 assert.equal(new DataView(data.buffer).getUint32(0,true),0x04034b50);
 const text=new TextDecoder().decode(data);assert.ok(text.includes('[Content_Types].xml'));assert.ok(text.includes('xl/workbook.xml'));assert.ok(text.includes('inlineStr'));assert.ok(text.includes('=DANGER()'));assert.ok(!text.includes('<f>'));assert.equal(sheets.length,8);
});
test('Project JSON roundtrip preserves all parameters and rejects wrong schemas',()=>{
 const inputs={...DEFAULTS,project:'Proyecto "Sol" <2026>',unitPrices:{'FV-01':999}};
 assert.deepEqual(parseProject(projectJSON(inputs)),inputs);assert.throws(()=>parseProject('{"schema":"wrong","inputs":{}}'));assert.throws(()=>parseProject('{'));
});
test('Saved projects update by ID and corrupted entries are discarded',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const first=saveProject(storage,DEFAULTS);saveProject(storage,{...DEFAULTS,project:'Editado'},first.id);assert.equal(readSaved(storage).length,1);assert.equal(readSaved(storage)[0].inputs.project,'Editado');
 storage.setItem('solis-fv-projects-v1','not json');assert.deepEqual(readSaved(storage),[]);
});
test('Untrusted user strings are HTML escaped',()=>{assert.equal(escapeHTML('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');});
test('Project IDs work in HTTP previews without randomUUID',()=>{
 assert.match(projectId({getRandomValues:array=>{array.fill(15);return array;}}),/^fv-[0-9a-f]{32}$/);
});
