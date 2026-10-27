import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from '../public/vendor/pdf-lib.esm.min.js';
import {buildReportPDF,pdfText} from '../public/pdf-report.js';
import {DEFAULTS,calculate} from '../public/engine.js';
import {defaultScenarios} from '../public/comparison.js';
test('Direct PDF is readable A4 with project metadata, document sections and deterministic emission date',async()=>{
 const p={...DEFAULTS,project:'Instalación Ñuñoa - revisión áéíóú',roofLayout:true},r=calculate(p),bytes=await buildReportPDF(r,{generatedAt:'2026-10-27T12:00:00Z',comparisons:defaultScenarios(p)}),doc=await PDFDocument.load(bytes);
 assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');assert.equal(doc.getTitle(),p.project+' - '+p.documentCode);assert.ok(doc.getPageCount()>=9);for(const page of doc.getPages()){assert.ok(Math.abs(page.getWidth()-595.28)<.01);assert.ok(Math.abs(page.getHeight()-841.89)<.01);}assert.equal(doc.getCreationDate().toISOString(),'2026-10-27T12:00:00.000Z');
});
test('PDF handles long user text, no-space strings, large supplier tables and rejects a damaged logo',async()=>{
 const p={...DEFAULTS,project:'Á'.repeat(240),company:'S'.repeat(240),reportNotes:'Notas técnicas '.repeat(16),procurement:{selected:{},extras:Array.from({length:50},(_,i)=>({id:'EX'+i,qty:1,offer:{productId:'victron-100-30',model:'Referencia '+i,category:'controller',unit:'ud',cores:1,section:0,supplier:'Proveedor '+i,unitNet:1,currency:'CLP',quotedAt:'2026-10-27',validUntil:'',url:'https://example.com/'+'a'.repeat(580)}}))}};
 const bytes=await buildReportPDF(calculate(p)),doc=await PDFDocument.load(bytes);assert.ok(doc.getPageCount()>20);assert.match(pdfText('Cu mm² Ω → ≤ ≥'),/ohm.*>.*<=.*>=/);
 await assert.rejects(()=>buildReportPDF(calculate({...DEFAULTS,logoData:'data:image/png;base64,AAAA'})),/logo/);
});
