import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULTS,calculate,normalize} from '../public/engine.js';
import {PUMP_DEFAULTS,hydraulicPoint,calculatePumping,parsePumpCurve,pumpOperatingPoint} from '../public/pumping.js';
import {pumpingTransfer} from '../public/pumping-ui.js';
import {reportSheets} from '../public/exports.js';
import {buildReport} from '../public/report.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const p=(changes={})=>({...DEFAULTS,integrationProjectId:'fv-pump-test-2026',pumping:{...PUMP_DEFAULTS,...changes}});
test('Hydraulic energy and separated efficiencies reproduce rho g Q H, independently of household demand',()=>{
 const input=p({dailyM3:50,hours:5,liftM:100,pressureBar:0,pipeLengthM:0,sumK:0,pumpEfficiency:50,motorEfficiency:80,driveEfficiency:95});
 const r=calculatePumping(input);near(r.head,100);near(r.hydraulicKw,998.2*9.80665*(10/3600)*100/1000);near(r.shaftKw,r.hydraulicKw/.5);near(r.electricalKw,r.hydraulicKw/.5/.8/.95);near(r.dailyKwh,r.electricalKw*5);near(r.requiredPvKw,r.dailyKwh/(4.5*.75)*1.2);
 near(calculatePumping({...input,consumption:9999}).dailyKwh,r.dailyKwh);
});
test('Darcy-Weisbach, K and pressure conversions are internally consistent; laminar factor is 64/Re',()=>{
 const v={...PUMP_DEFAULTS,pipeInnerMm:100,pipeLengthM:100,sumK:3,pressureBar:1};const x=hydraulicPoint(v,10);near(x.velocity,(10/3600)/(Math.PI*.1**2/4));near(x.friction,x.frictionFactor*100/.1*x.velocity**2/(2*9.80665));near(x.minor,3*x.velocity**2/(2*9.80665));near(x.pressureHead,1e5/(998.2*9.80665));
 const small=hydraulicPoint(v,.01);assert.ok(small.reynolds<2300);near(small.frictionFactor,64/small.reynolds);near(hydraulicPoint(v,0).friction,0);
 assert.ok(hydraulicPoint(v,20).head>x.head);assert.ok(hydraulicPoint({...v,pipeInnerMm:150},10).head<x.head);
});
test('Real Q-H interpolation finds a bracketed operating point and never extrapolates',()=>{
 const v={...PUMP_DEFAULTS,liftM:10,pressureBar:0,pipeLengthM:0,sumK:0};const curve=parsePumpCurve('0;20\n10;0');near(pumpOperatingPoint(v,curve).flowM3h,5);assert.equal(pumpOperatingPoint({...v,liftM:30},curve),null);
 for(const text of ['0;\n10;5','5;2\n1;3','0;2\n1;3','0;2','0;2\n0;1','0;2\n1;-2'])assert.throws(()=>parsePumpCurve(text));
});
test('Motor phase, current, shaft power, NPSH and pipe pressure incompatibilities remain explicit',()=>{
 for(const [change,pattern]of [[{motorShaftKw:.1},/mecánica/],[{motorAmps:100},/corriente/],[{motorPhases:1},/Fases/],[{npshaM:3,npshrM:4},/NPSH/],[{pipePNbar:.1},/PN/]])assert.ok(calculatePumping(p(change)).errors.some(e=>pattern.test(e)));
 assert.throws(()=>normalize(p({pumpEfficiency:0})));assert.throws(()=>normalize(p({pipeInnerMm:-1})));assert.throws(()=>normalize(p({hours:0})));
});
test('Missing DC limits prevent handoff; incompatible cold voltage never produces fabricated strings',()=>{
 const r=calculate(p({enabled:true}));assert.equal(r.pumping.exportReady,false);assert.throws(()=>pumpingTransfer(r));assert.equal(r.pumping.layout,null);
 // Synthetic bounds to exercise constraints; not a claimed INVT hardware specification.
 const x=calculatePumping(p({dcMax:900,dcAmps:20,dcIsc:30,pvMaxKw:10}));assert.ok(x.layout);assert.ok(x.layout.vocCold<900);assert.ok(x.layout.vmpHot>=x.minBus);assert.ok(x.layout.operatingAmps<=20);assert.ok(x.layout.designIsc<=30);assert.ok(x.layout.dcKw<=10);
 const low=calculatePumping(p({dcMax:900,dcAmps:1,dcIsc:1,pvMaxKw:10}));assert.equal(low.layout,null);
});
test('Dedicated pump handoff and report sheets preserve independent quantities and omit household battery/inverter',()=>{
 const r=calculate(p({enabled:true,dcMax:900,dcAmps:20,dcIsc:30,pvMaxKw:10})),data=pumpingTransfer(r);assert.match(data.source.projectId,/:pump$/);assert.equal(data.items.find(x=>x.code==='PUMP-PV').quantity,r.pumping.layout.panels);assert.equal(data.items.find(x=>x.code==='PUMP-PIPE').quantity,150);assert.ok(!data.items.some(x=>x.code==='BAT-01'||x.code==='INV-01'));assert.ok(reportSheets(r).some(s=>s.name==='Bombeo solar'));assert.match(buildReport(r),/Estudio independiente de bombeo solar/);
 const base=calculate(p());assert.equal(base.bom.length,r.bom.length);assert.equal(base.panels,r.panels);assert.ok(!reportSheets(base).some(s=>s.name==='Bombeo solar'));
});

test('Power and PV energy use the actual curve intersection when flow exceeds the objective',()=>{
 const r=calculatePumping(p({dailyM3:10,hours:5,liftM:10,pressureBar:0,pipeLengthM:0,sumK:0,curve:'0;20\n10;0',motorShaftKw:.2}));
 near(r.flowM3h,2);near(r.duty.flowM3h,5);near(r.shaftKw,998.2*9.80665*(5/3600)*10/1000/.55);near(r.dailyKwh,r.electricalKw*5);assert.ok(r.errors.some(x=>x.includes('mecánica')));
 const bad=calculatePumping({...p(),betaVmp:-5,tempMax:100});assert.equal(bad.layout,null);assert.ok(bad.errors.some(x=>x.includes('no física')));
});
