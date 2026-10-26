import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,calculate,normalize} from '../public/engine.js';
import {layoutRoof,intersects,unionArea,expandObstacle} from '../public/roof.js';
import {roofSVG} from '../public/roof-svg.js';
import {fitRoofInputs} from '../public/roof-ui.js';
import {reportSheets,projectJSON} from '../public/exports.js';
import {parseProject} from '../public/persistence.js';
import {buildReport} from '../public/report.js';
import {applyCatalog} from '../public/catalog.js';
const p={...DEFAULTS,roofLayout:true,roofWidth:6,roofLength:4,roofMargin:0,panelWidth:1,panelLength:2,panelGap:0,rowGap:0,layoutOrientation:'portrait'};
const obstacle=(overrides={})=>({id:'a',name:'Chimenea',kind:'obstacle',x:1,y:0,width:1,length:2,clearance:0,...overrides});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Known rectangular grid, exact edge fits, gaps and perimeter setbacks',()=>{
 const grid=layoutRoof(p,10,5);assert.equal(grid.capacity,12);assert.equal(grid.placed,10);assert.equal(grid.fits,true);assert.equal(grid.positions[5].string,2);assert.equal(grid.positions[5].seriesIndex,1);
 assert.equal(layoutRoof({...p,roofMargin:.5}).capacity,5);
 assert.equal(layoutRoof({...p,panelGap:.1,rowGap:.1}).capacity,5);
 assert.equal(layoutRoof({...p,roofWidth:1,roofLength:2},2).capacity,1);
 assert.equal(layoutRoof({...p,roofWidth:1,roofLength:1}).capacity,0);
});
test('Auto orientation compares both uniform grids, chooses highest and deterministic tie',()=>{
 const q={...p,roofWidth:4,roofLength:3,layoutOrientation:'auto'};
 const plan=layoutRoof(q);assert.equal(plan.orientation,'landscape');assert.equal(plan.capacity,6);assert.equal(plan.alternatives.length,2);
 assert.equal(layoutRoof({...q,roofLength:4}).orientation,'portrait');
});
test('Obstacles, passages and clearance exclude intersecting cells; touching edges allowed',()=>{
 assert.equal(intersects({x:0,y:0,width:1,length:2},{x:1,y:0,width:1,length:2}),false);
 assert.equal(layoutRoof({...p,roofObstacles:[obstacle()]}).capacity,11);
 assert.equal(layoutRoof({...p,roofObstacles:[obstacle({clearance:.1})]}).capacity,6);
 assert.equal(layoutRoof({...p,roofObstacles:[obstacle({kind:'passage',length:4})]}).capacity,10);
 const plan=layoutRoof({...p,roofObstacles:[obstacle({clearance:.1})]},12);
 for(const cell of plan.positions)assert.ok(!intersects(cell,expandObstacle(obstacle({clearance:.1}))));
});
test('Blocked area is clipped to the inner roof and overlapping obstacles are counted once',()=>{
 near(unionArea([{x:-1,y:-1,width:3,length:3},{x:1,y:1,width:3,length:3}],{x:0,y:0,width:3,length:3}),7);
 const plan=layoutRoof({...p,roofObstacles:[obstacle(),obstacle({id:'b'})]});near(plan.blockedArea,2);near(plan.usableArea,22);
});
test('Exclusions use geometric cell IDs, restore without drift and signal stale geometry',()=>{
 const initial=layoutRoof(p),id=initial.cells[0].id,next={...p,roofExcluded:[id]};
 const plan=layoutRoof(next,12);assert.equal(plan.capacity,11);assert.equal(plan.excluded,1);assert.equal(plan.staleExcluded,0);assert.ok(!plan.positions.some(c=>c.id===id));
 assert.equal(layoutRoof({...next,roofMargin:.1}).staleExcluded,1);assert.equal(layoutRoof({...next,roofExcluded:[]}).capacity,12);
 const r=calculate({...next,roofMargin:.1});assert.ok(r.alerts.some(x=>x.text.includes('exclusiones')));
});
test('Malformed geometry and imported hostile object IDs are rejected',()=>{
 for(const q of [{roofWidth:0},{roofMargin:2},{panelLength:NaN},{roofLayout:'true'},{layoutOrientation:'diagonal'},{roofObstacles:[obstacle({x:6})]},{roofObstacles:[obstacle({id:'"><script>'})]},{roofExcluded:['invalid']},{roofObstacles:[obstacle(),obstacle()]}])assert.throws(()=>normalize({...p,...q}));
 const plan=layoutRoof({...p,roofWidth:500,roofLength:500,panelWidth:.1,panelLength:.1,layoutOrientation:'auto'});assert.equal(plan.valid,false);assert.equal(plan.capacity,0);assert.ok(plan.reason.includes('20000'));
 assert.ok(calculate({...p,roofWidth:500,roofLength:500,panelWidth:.1,panelLength:.1}).blocked);
});
test('Random deterministic grids keep every panel within setbacks and clear of obstacles',()=>{
 for(let i=1;i<=120;i++){
  const q={...p,roofWidth:4+i%17,roofLength:5+i%13,roofMargin:(i%5)/10,panelGap:(i%4)/50,rowGap:(i%3)/10,layoutOrientation:'auto',roofObstacles:[obstacle({x:1.1,y:1.5,clearance:(i%4)/10})]};
  const plan=layoutRoof(q,200,7),cells=plan.positions;assert.ok(plan.valid);assert.equal(new Set(cells.map(c=>c.id)).size,cells.length);
  for(const c of cells){assert.ok(c.x>=q.roofMargin-1e-8&&c.y>=q.roofMargin-1e-8&&c.x+c.width<=q.roofWidth-q.roofMargin+1e-8&&c.y+c.length<=q.roofLength-q.roofMargin+1e-8);assert.ok(!intersects(c,expandObstacle(q.roofObstacles[0])));}
  for(let j=1;j<cells.length;j++)assert.ok(!intersects(cells[j-1],cells[j]));
 }
});
test('Capacity failure does not silently alter energy, strings or materials',()=>{
 const base=calculate(DEFAULTS),q={...DEFAULTS,roofLayout:true,roofWidth:5,roofLength:5},r=calculate(q);
 assert.equal(r.panels,base.panels);assert.equal(r.production,base.production);assert.equal(r.capex,base.capex);assert.ok(!r.roofPlan.fits);assert.ok(r.blocked);assert.equal(r.bom.find(x=>x.code==='FV-01').qty,r.panels);
 assert.ok(r.alerts.some(x=>x.level==='error'&&x.text.includes('cubierta')));
 const areaOverride=calculate({...DEFAULTS,roofLayout:true,roof:0,roofWidth:15,roofLength:15});assert.ok(areaOverride.roofPlan.fits);assert.ok(!areaOverride.alerts.some(x=>x.text.includes('Superficie estimada')));
});
test('Explicit fit preserves demand and recomputes strings, BOM and budget consistently',()=>{
 const raw={...DEFAULTS,roofLayout:true,roofWidth:7,roofLength:5},before=calculate(raw),next=fitRoofInputs(raw),after=calculate(next);
 assert.ok(next.coverage<raw.coverage);assert.equal(next.consumption,raw.consumption);assert.equal(after.annual,before.annual);assert.ok(after.roofPlan.fits);assert.ok(after.layout.valid);assert.ok(after.panels<before.panels);assert.ok(after.capex<before.capex);
 assert.equal(after.bom.find(x=>x.code==='FV-01').qty,after.panels);assert.equal(after.bom.find(x=>x.code==='EST-01').qty,after.panels);assert.equal(after.roofPlan.positions.length,after.panels);
 assert.throws(()=>fitRoofInputs({...raw,roofWidth:2,roofLength:2}),/mínimo/);assert.throws(()=>fitRoofInputs({...raw,roofLayout:false}));
});
test('Roof JSON roundtrip, old schema defaults, catalog dimensions and report/export geometry',()=>{
 const raw={...p,project:'<script>"bad"</script>',roofObstacles:[obstacle({name:'<img src=x onerror=evil()>'})]},r=calculate(raw),svg=roofSVG(r.p,r.roofPlan);
 assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('<img src=x'));assert.ok(svg.includes('&lt;img'));assert.ok(!svg.includes('data-roof-cell'));
 assert.deepEqual(parseProject(projectJSON(raw)),r.p);assert.equal(parseProject(JSON.stringify({schema:'solis-fv-project/v1',inputs:{project:'Antiguo'}})).roofLayout,false);
 const cat=applyCatalog(DEFAULTS,'panel','jinko-550n-bdv');near(cat.panelWidth*cat.panelLength,cat.panelArea);
 const sheets=reportSheets(r);assert.equal(sheets.length,8);const rows=sheets.at(-1).rows;assert.equal(rows.find(x=>x[0]==='Módulos requeridos')[1],r.panels);assert.equal(rows.find(x=>x[0]==='Módulos representados')[1],r.roofPlan.placed);
 const html=buildReport(r);assert.ok(html.includes('Cubierta y distribución'));assert.ok(html.includes('NO CABE'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('<svg'));
 assert.equal(reportSheets(calculate(DEFAULTS)).length,7);assert.ok(!buildReport(calculate(DEFAULTS)).includes('Cubierta y distribución conceptual'));
});
