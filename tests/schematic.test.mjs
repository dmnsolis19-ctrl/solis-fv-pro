import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,calculate,normalize} from '../public/engine.js';
import {recordReview,reviewState,reviewBasis,REVIEW_ITEMS} from '../public/review.js';
import {schematicModel,schematicSVG,circuitRows} from '../public/schematic.js';
import {schematicResults} from '../public/schematic-ui.js';
import {buildReport} from '../public/report.js';
import {reportSheets,projectJSON} from '../public/exports.js';
import {parseProject} from '../public/persistence.js';
const record=(r,id='dc',status='reviewed',note='Ficha y memoria de ejemplo; revisión ficticia de prueba')=>recordReview(r,id,status,'Responsable de prueba',note,'2026-10-26T23:00:00Z');
test('On-grid topology has no EPS or battery branch; endpoints are defined',()=>{
 const r=calculate({...DEFAULTS,system:'grid'}),m=schematicModel(r),ids=new Set(m.nodes.map(x=>x.id));
 assert.ok(!m.eps&&!m.battery);assert.ok(!ids.has('critical'));assert.ok(!ids.has('battery'));
 for(const edge of m.edges){assert.ok(ids.has(edge.from));assert.ok(ids.has(edge.to));}
 assert.ok(!circuitRows(r).flat().some(v=>String(v).includes('EPS')));
});
test('Hybrid EPS is a separate branch; battery and critical loads use calculated results',()=>{
 const r=calculate({...DEFAULTS,phase:'three',voltage:400}),m=schematicModel(r),critical=m.nodes.find(x=>x.id==='critical');
 assert.ok(m.eps&&m.battery);assert.ok(critical.lines[0].includes('230,94 V'));
 assert.ok(m.nodes.find(x=>x.id==='battery').lines.some(x=>x.includes('15,36 kWh')));
 const c=m.edges.find(x=>x.to==='critical');assert.equal(c.from,'eps-protection');assert.equal(c.circuit,'backup');
 assert.ok(!m.edges.some(x=>['grid','meter','loads','ac-protection'].includes(x.from)&&x.to==='critical'));
 assert.ok(!schematicModel(calculate({...DEFAULTS,backupKw:0})).eps);
 const noBattery=schematicModel(calculate({...DEFAULTS,autonomy:0}));assert.ok(noBattery.eps);assert.ok(!noBattery.battery);
});
test('Cable rows match engineering values and do not fabricate invalid DC routes',()=>{
 const r=calculate(DEFAULTS),rows=circuitRows(r);assert.equal(rows.length,5);
 assert.equal(rows[1][1],r.cables.grid.section);assert.equal(rows[1][2],r.cables.grid.current);
 assert.equal(rows.at(-1)[6],r.layout.strings);assert.equal(rows.at(-1)[5],r.p.dcLength);
 const invalid=calculate({...DEFAULTS,dcMax:120,mpptMax:100,mpptMin:80,startVoltage:90});
 assert.equal(invalid.layout.valid,false);assert.equal(circuitRows(invalid).length,4);assert.ok(schematicSVG(invalid).includes('SIN STRINGS COMPATIBLES'));assert.ok(schematicSVG(invalid).includes('REQUIERE CORRECCIONES'));
});
test('Review requires a responsible person, reference and valid item; pending reopens',()=>{
 const r=calculate(DEFAULTS);assert.equal(reviewState(r).pending,10);
 for(const [by,note]of [['','Ficha'],['Persona',''],[' '.repeat(3),'Texto']])assert.throws(()=>recordReview(r,'dc','reviewed',by,note));
 assert.throws(()=>recordReview(r,'dc','approved','Persona','Texto'));assert.throws(()=>record(r,'unknown'));
 const done=calculate(record(r));assert.equal(reviewState(done).reviewed,1);assert.equal(reviewState(done).pending,9);
 const reopened=calculate(recordReview(done,'dc','pending','',''));assert.equal(reviewState(reopened).reviewed,0);assert.equal(reopened.p.reviewRecords.dc,undefined);
});
test('Electrical changes invalidate related declarations; prices and document notes do not',()=>{
 const p=record(calculate(DEFAULTS)),r=calculate(p);
 assert.equal(reviewState(calculate({...p,buyTariff:p.buyTariff+1,schematicNotes:'Nota nueva'})).items.find(x=>x.id==='dc').status,'reviewed');
 for(const delta of [{voc:51},{mpptMax:490},{dcLength:99},{consumption:1000},{project:'Otra obra'}])assert.equal(reviewState(calculate({...p,...delta})).items.find(x=>x.id==='dc').status,'stale');
 const stale=calculate({...p,voc:51});assert.equal(stale.p.reviewRecords.dc.by,'Responsable de prueba');assert.equal(reviewState(stale).stale,1);
 assert.notEqual(reviewBasis('dc',r),reviewBasis('dc',stale));
 assert.equal(reviewState(calculate({...p,voc:DEFAULTS.voc})).items.find(x=>x.id==='dc').status,'reviewed');
});
test('Not applicable needs justification; inactive EPS and battery declarations are preserved',()=>{
 const r=calculate(DEFAULTS),p=record(r,'eps','na','Justificación ficticia para prueba de persistencia'),onGrid=calculate({...p,system:'grid'}),s=reviewState(onGrid);
 assert.equal(s.total,8);assert.equal(s.items.find(x=>x.id==='eps').status,'inactive');assert.ok(onGrid.p.reviewRecords.eps);
 assert.throws(()=>record(onGrid,'eps'));assert.equal(reviewState(calculate(p)).na,1);
});
test('Declaring every review never clears calculation errors or changes materials',()=>{
 let r=calculate({...DEFAULTS,roofLayout:true,roofWidth:2,roofLength:2});const before=r;
 for(const item of REVIEW_ITEMS.filter(x=>!x.applies||x.applies(r)))r=calculate(record(r,item.id));
 assert.equal(reviewState(r).pending,0);assert.ok(r.blocked);assert.deepEqual(r.alerts,before.alerts);assert.deepEqual(r.bom,before.bom);assert.equal(r.production,before.production);
});
test('Review schema rejects malformed records and imports old projects without declarations',()=>{
 const p=record(calculate(DEFAULTS));
 for(const delta of [{reviewRecords:[]},{reviewRecords:{alien:p.reviewRecords.dc}},{reviewRecords:{dc:{...p.reviewRecords.dc,at:'yesterday'}}},{reviewRecords:{dc:{...p.reviewRecords.dc,basis:'abc'}}},{reviewRecords:{dc:{...p.reviewRecords.dc,extra:true}}},{reviewAuthor:'x'.repeat(121)},{includeSchematic:'yes'}])assert.throws(()=>normalize({...p,...delta}));
 assert.deepEqual(parseProject(projectJSON(p)),p);
 const old=parseProject(JSON.stringify({schema:'solis-fv-project/v1',inputs:{consumption:400}}));assert.deepEqual(old.reviewRecords,{});assert.equal(old.includeSchematic,true);
});
test('SVG, interface and report escape untrusted notes and keep the PDF toggle independent',()=>{
 const p=record(calculate({...DEFAULTS,project:'<script>alert(1)</script>',inverterModel:'<img src=x onerror=bad()>',schematicNotes:'</textarea><script>bad</script>'}),'dc','reviewed','<img src=x onerror=bad()>'),r=calculate(p);
 for(const text of [schematicSVG(r),schematicResults(r),buildReport(r)]){assert.ok(!text.includes('<script>'));assert.ok(!text.includes('<img src=x'));}
 assert.ok(schematicSVG(r).includes('&lt;script&gt;'));assert.ok(buildReport(r).includes('Diagrama unifilar conceptual'));
 const off=buildReport(calculate({...p,includeSchematic:false}));assert.ok(!off.includes('Diagrama unifilar conceptual'));assert.ok(off.includes('Registro de revisión técnica'));
});
test('Excel contains current review status and reference, not oversized context cells',()=>{
 const r=calculate({...record(calculate(DEFAULTS)),voc:51}),sheets=reportSheets(r),review=sheets.find(x=>x.name==='Revisión técnica');
 assert.equal(sheets.length,8);assert.ok(review.rows.some(row=>row.includes('Revisar por cambios')));assert.ok(review.rows.some(row=>row.includes(r.p.reviewRecords.dc.note)));
 const cell=sheets.find(x=>x.name==='Parámetros').rows.find(row=>row[0]==='reviewRecords')[1];assert.ok(cell.length<150);assert.ok(!cell.includes('review-v1:'));
});
