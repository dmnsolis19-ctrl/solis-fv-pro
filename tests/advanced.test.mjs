import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,calculate,normalize,VERSION} from '../public/engine.js';
import {pvgisURL,solarFromPVGIS,solarMatches,fetchSolar} from '../public/solar.js';
import {handleSolar} from '../server/solar-handler.js';
import {applyCatalog,catalogStatus,PANELS,INVERTERS} from '../public/catalog.js';
import {defaultScenarios,compareRows} from '../public/comparison.js';
import {buildReport} from '../public/report.js';
import {saveProject,readSaved,parseProject,projectEnvelope} from '../public/persistence.js';
import {reportSheets,workbookBytes} from '../public/exports.js';
import {projectPoint,unprojectPoint} from '../public/site-map.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const request={latitude:-33.45,longitude:-70.66,tilt:25,azimuth:0};
// Synthetic contract fixture, never a weather dataset or a user-facing solar estimate.
const fixture=()=>({inputs:{location:{latitude:-33.45,longitude:-70.66},mounting_system:{fixed:{slope:{value:25},azimuth:{value:180}}},meteo_data:{radiation_db:'PVGIS-ERA5',year_min:2005,year_max:2023}},outputs:{monthly:{fixed:[31,28,31,30,31,30,31,31,30,31,30,31].map((days,i)=>({month:i+1,'H(i)_m':4*days,E_m:100}))}}});
test('Compass azimuth converts N/E/S/W correctly without changing tilt',()=>{
 for(const [azimuth,expected]of [[0,-180],[90,-90],[180,0],[270,90],[360,-180]]){const u=pvgisURL({...request,azimuth});assert.equal(Number(u.searchParams.get('aspect')),expected);assert.equal(u.searchParams.get('angle'),'25');assert.equal(u.hostname,'re.jrc.ec.europa.eu');assert.equal(u.searchParams.get('raddatabase'),'PVGIS-ERA5');}
});
test('PVGIS irradiance converts to HSP, provenance matches only the current site and monthly values',()=>{
 const solarResource=solarFromPVGIS(fixture(),request),p={...DEFAULTS,...request,solarResource,monthlyHsp:solarResource.monthlyHsp,monthlySolar:true};
 assert.deepEqual(solarResource.monthlyHsp,Array(12).fill(4));assert.equal(solarMatches(p),true);assert.equal(solarMatches({...p,tilt:30}),false);assert.equal(solarMatches({...p,monthlySolar:false}),false);
 const r=calculate(p);near(r.production,r.dcKw*4*365*.8);assert.equal(r.p.solarResource.database,'PVGIS-ERA5');
 assert.ok(calculate({...p,azimuth:90}).alerts.some(x=>x.text.includes('recurso consultado no coincide')));
});
test('PVGIS rejects mismatched locations, missing metadata, duplicate months and invalid irradiation',()=>{
 for(const mutate of [x=>x.inputs.location.latitude=0,x=>delete x.inputs.location.longitude,x=>x.inputs.mounting_system.fixed.slope.value=35,x=>x.outputs.monthly.fixed[1].month=1,x=>x.outputs.monthly.fixed[0]['H(i)_m']=-1]){const x=fixture();mutate(x);assert.throws(()=>solarFromPVGIS(x,request));}
});
test('Solar API validates requests before fetching and cannot become an arbitrary proxy',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json(fixture());};
 for(const query of ['latitude=0','latitude=-91&longitude=0&tilt=25&azimuth=0','latitude=0&longitude=0&tilt=25&azimuth=0&url=https://evil.invalid']){assert.equal((await handleSolar(new Request('https://test.invalid/api/solar?'+query),{fetcher})).status,400);}
 assert.equal(calls,0);assert.equal((await handleSolar(new Request('https://test.invalid/api/solar',{method:'POST'}),{fetcher})).status,405);
});
test('Solar API success, cache, upstream rate limit, malformed response and network failure',async()=>{
 const req=new Request('https://test.invalid/api/solar?'+new URLSearchParams(request));let calledURL;
 const output=await handleSolar(req,{fetcher:async url=>{calledURL=url;return Response.json(fixture());}});assert.equal(output.status,200);assert.ok(calledURL.startsWith('https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?'));assert.equal(output.headers.get('cache-control'),'public, max-age=86400');
 const cached=await handleSolar(req,{cache:{match:async()=>new Response('cache')},fetcher:()=>{throw Error();}});assert.equal(await cached.text(),'cache');
 assert.equal((await handleSolar(req,{fetcher:async()=>new Response('limited',{status:429})})).status,429);
 assert.equal((await handleSolar(req,{fetcher:async()=>Response.json({})})).status,502);
 assert.equal((await handleSolar(req,{fetcher:async()=>{throw Error('network');}})).status,502);
});
test('Browser solar client keeps a useful error when the deployed route is missing',async()=>{
 await assert.rejects(()=>fetchSolar(request,async()=>new Response('<html>not found</html>')),/ruta solar/);
 const s=await fetchSolar(request,async()=>Response.json(fixture()));assert.equal(s.monthlyHsp.length,12);
});
test('Catalog loads only documented fields and tracks manual edits',()=>{
 const p=applyCatalog(DEFAULTS,'panel',PANELS[0].id);assert.equal(p.panelW,550);assert.equal(p.betaVmp,DEFAULTS.betaVmp);assert.equal(catalogStatus(p,'panel'),'matched');assert.equal(catalogStatus({...p,voc:48},'panel'),'modified');assert.throws(()=>applyCatalog(p,'panel','unknown'));
 const next=applyCatalog(p,'inverter','goodwe-es-6'),r=calculate(next);assert.equal(r.inverterKw,6);assert.equal(r.acCurrent,30);assert.ok(r.layout.valid);assert.ok(r.alerts.some(x=>x.text.includes('βVmp')));assert.equal(next.panelSource.source,PANELS[0].source);
 assert.equal(calculate({...next,phase:'three',voltage:400}).blocked,true);
});
test('Old low-current inverter is detected as incompatible with high-current panels',()=>{
 const p=applyCatalog(applyCatalog(DEFAULTS,'panel',PANELS[0].id),'inverter','goodwe-eh-5');assert.equal(calculate(p).layout.valid,false);
});
test('Comparison keeps the original intact and recomputes each alternative',()=>{
 const before=structuredClone(DEFAULTS),items=defaultScenarios(DEFAULTS);assert.deepEqual(DEFAULTS,before);assert.equal(items.length,4);assert.equal(items[1].result.batteryKwh,0);assert.ok(items[1].result.capex<items[0].result.capex);assert.equal(items[1].result.production,items[0].result.production);assert.equal(items[2].inputs.coverage,80);assert.equal(items[3].inputs.coverage,120);assert.equal(compareRows(items).length,5);
});
test('Version 1 JSON migrates with defaults; revision history persists and is bounded',()=>{
 const old={schema:'solis-fv-project/v1',inputs:{project:'Migrado',consumption:500}};const migrated=parseProject(JSON.stringify(old));assert.equal(migrated.documentRevision,'01');assert.equal(migrated.latitude,-33.45);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};const first=saveProject(storage,DEFAULTS);
 for(let i=0;i<25;i++)saveProject(storage,{...DEFAULTS,documentRevision:String(i),consumption:500+i},first.id);
 const item=readSaved(storage)[0];assert.equal(item.emissions.length,20);assert.ok(item.emissions.at(-1).changed.includes('consumption'));assert.equal(item.emissions.at(-1).engine,VERSION);
});
test('Report includes identity, source notes, alert status and comparison; user text is escaped',()=>{
 const r=calculate({...DEFAULTS,project:'<script>alert(1)</script>',reportNotes:'<img src=x onerror=evil()>',documentCode:'SOL-123'});const html=buildReport(r,{comparisons:defaultScenarios(r.p),generatedAt:'2026-10-26T12:00:00Z'});
 assert.ok(html.includes('SOL-123'));assert.ok(html.includes('Comparación de alternativas'));assert.ok(html.includes('Trazabilidad'));assert.ok(html.includes('SIN VALIDAR'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
});
test('Large logo does not become an oversized spreadsheet cell; JSON keeps it',()=>{
 const logoData='data:image/png;base64,'+'A'.repeat(90000),r=calculate({...DEFAULTS,logoData});const sheets=reportSheets(r);const cell=sheets.find(s=>s.name==='Parámetros').rows.find(row=>row[0]==='logoData')[1];assert.ok(cell.length<100);assert.equal(projectEnvelope(r.p).inputs.logoData,logoData);assert.ok(workbookBytes(sheets).length>0);
});
test('Map projection roundtrips representative sites and supports southern latitudes',()=>{
 for(const [lat,lon]of [[-33.45,-70.66],[-15.5,-70.13],[40,10],[0,0]])for(const z of [2,12,18]){const x=projectPoint(lat,lon,z),back=unprojectPoint(...x,z);near(back[0],lat);near(back[1],lon);}
});
