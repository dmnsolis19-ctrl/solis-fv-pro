import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, calculate, annualConsumption, normalize, sizeCable, validateHourly, parseHourlyCSV, simulateHourly } from '../public/engine.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const p=()=>structuredClone(DEFAULTS);
export function profile(year=2025) {
  const start=Date.UTC(year,0,1),count=(Date.UTC(year+1,0,1)-start)/3600000;
  return Array.from({length:count},(_,i)=>{const hour=i%24;return [new Date(start+i*3600000).toISOString(),hour>=7&&hour<18?Math.sin((hour-7)/11*Math.PI)*900:0,30,0.8];});
}
test('Units: day, month and year convert to one annual energy',()=>{
 near(annualConsumption(20,'day'),7300);near(annualConsumption(500,'month'),6000);near(annualConsumption(7000,'year'),7000);
 near(calculate({...p(),consumption:20,period:'day'}).annual,calculate({...p(),consumption:7300,period:'year'}).annual);
});
test('Monthly production sums exactly; requested energy determines minimum panels',()=>{
 const r=calculate(p());assert.equal(r.blocked,false);assert.ok(r.panels>=r.targetPanels);assert.equal(r.panels,r.layout.series*r.layout.strings);
 near(r.production,r.dcKw*4.5*365*0.8);near(r.monthly.reduce((s,m)=>s+m.consumption,0),r.annual);
 near(r.bom.reduce((s,x)=>s+x.total,0),r.capex);
});
test('Strings satisfy cold, hot, start, current, input count and DC power limits',()=>{
 const r=calculate(p()),l=r.layout;assert.ok(l.valid);assert.ok(l.voltageCold<r.p.dcMax);
 assert.ok(l.voltageHot>=r.p.mpptMin);assert.ok(l.series*l.vmpCold<=r.p.mpptMax);
 assert.ok(l.series*l.vocHot>=r.p.startVoltage);
 assert.ok(l.distribution.every(n=>n<=r.p.stringsPerMppt&&n*r.p.imp<=r.p.mpptCurrent&&n*r.p.isc*r.p.pvCurrentFactor<=r.p.mpptIsc));
 assert.equal(l.distribution.reduce((s,n)=>s+n,0),l.strings);
});
test('An incompatible inverter blocks layout and DC cable, without fabricating strings',()=>{
 for(const change of [{mpptCurrent:1},{mpptIsc:1},{maxPvKw:0.5},{dcMax:140,mpptMax:130,mpptMin:120,startVoltage:130}]){
  const r=calculate({...p(),...change});assert.equal(r.layout.valid,false);assert.equal(r.cables.dc,null);assert.equal(r.blocked,true);
 }
});
test('Cold limit is strict: Voc exactly at maximum is rejected',()=>{
 const r=calculate({...p(),consumption:1,period:'day',voc:50,vmp:40,betaVoc:0,betaVmp:0,dcMax:200,mpptMin:50,mpptMax:190,startVoltage:50});
 assert.ok(r.layout.valid);assert.ok(r.layout.max<=3);assert.ok(r.layout.voltageCold<200);
});
test('Longer routes and lower correction factors never reduce selected section',()=>{
 let last=0;
 for(const length of [1,10,20,40,80,160]){const c=sizeCable({current:20,voltage:230,length},p());if(c.valid){assert.ok(c.section>=last);last=c.section;assert.ok(c.drop<=3&&c.iz>=20);}}
 const base=sizeCable({current:30,voltage:230,length:10},p());const derated=sizeCable({current:30,voltage:230,length:10},{...p(),groupFactor:0.6});assert.ok(derated.section>=base.section);
});
test('Known resistive voltage drop and ampacity example',()=>{
 const c=sizeCable({current:20,voltage:230,length:30},p());assert.equal(c.section,4);near(c.drop,2*30*20*0.0175*(1+0.00393*50)/4/230*100);
});
test('Three-phase current uses line-to-line voltage; EPS is single-phase',()=>{
 const r=calculate({...p(),phase:'three',voltage:400,gridKw:12});near(r.gridCurrent,12000/(Math.sqrt(3)*400));near(r.backupVoltage,400/Math.sqrt(3));near(r.backupCurrent,3000/(400/Math.sqrt(3)));
 assert.equal(r.cables.grid.conductors,5);assert.equal(r.cables.backup.conductors,3);
});
test('Roof, EPS overload and impossible cable are flagged',()=>{
 assert.ok(calculate({...p(),roof:1}).alerts.some(x=>x.level==='error'&&x.text.includes('Superficie')));
 assert.ok(calculate({...p(),backupKw:20}).alerts.some(x=>x.level==='error'&&x.text.includes('respaldo')));
 assert.equal(sizeCable({current:10000,voltage:230,length:100},p()).valid,false);
});
test('On-grid has no battery or backup cable; individual BOM prices survive recalculation',()=>{
 const r=calculate({...p(),system:'grid',unitPrices:{'FV-01':123}});assert.equal(r.batteries,0);assert.equal(r.cables.backup,null);assert.equal(r.bom.find(x=>x.code==='FV-01').price,123);
});
test('Missing, nonfinite, malformed and contradictory inputs fail validation',()=>{
 for(const change of [{consumption:''},{consumption:null},{hsp:NaN},{performance:Infinity},{mppts:1.5},{voc:30},{isc:5},{mpptMin:550},{ampacity:'15,,26'},{ampacityVerified:'yes'},{hourlyProfile:[]},{unitPrices:{bad:-1}}])assert.throws(()=>normalize({...p(),...change}));
});
test('Annual financial balance, no payback on negative saving, zero tariff is accepted',()=>{
 const r=calculate({...p(),buyTariff:0,sellTariff:0});assert.equal(r.netSaving,-r.p.maintenance);assert.equal(r.payback,null);assert.ok(r.npv<0);
 const f=calculate(p());near(f.grossSaving,f.self*f.p.buyTariff+f.exported*f.p.sellTariff);assert.ok(f.self<=f.annual);
});
test('Hourly input validates a full UTC year, rejects duplicates, invalid order and incomplete CSV',()=>{
 const rows=profile();assert.equal(validateHourly(rows).length,8760);
 const duplicate=structuredClone(rows);duplicate[10][0]=duplicate[9][0];assert.throws(()=>validateHourly(duplicate));
 assert.equal(validateHourly(profile(2024)).length,8784);
 assert.throws(()=>parseHourlyCSV('timestamp,poa_wm2,cell_temp_c,load_kwh\n2025-01-01T00:00:00Z,,25,1'));
 const csv='timestamp,poa_wm2,cell_temp_c,load_kwh\n'+rows.map(r=>r.join(',')).join('\n');assert.equal(parseHourlyCSV(csv).length,8760);
});
test('Hourly simulation conserves AC energy and load with battery and clipping',()=>{
 const inputs={...p(),hourlyProfile:profile(),inverterKw:2},r=calculate(inputs),h=r.hourly;
 near(h.annual,h.self+h.grid,1e-6);near(h.production,h.self+h.exported+h.batteryLoss+h.endStored,1e-6);
 near(h.acPotential,h.production+h.clipping,1e-6);assert.ok(h.clipping>0);assert.ok(h.batteryDelivered>0);assert.ok(h.endStored>=-1e-8);
 near(r.production,h.production);near(r.self,h.self);near(r.exported,h.exported);near(r.annual,8760*.8,1e-6);
});
test('Hourly on-grid mode has no storage losses and annual generation is balanced',()=>{
 const inputs={...p(),system:'grid',hourlyProfile:profile()};const h=simulateHourly(inputs,5,4,0);
 near(h.production,h.self+h.exported,1e-6);near(h.batteryLoss,0);near(h.endStored,0);
});
test('Deterministic scenarios preserve all string constraints',()=>{
 let seed=9123;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let i=0;i<200;i++){
  const r=calculate({...p(),consumption:50+rnd()*4000,tempMin:-30+rnd()*40,tempMax:40+rnd()*45,mppts:1+Math.floor(rnd()*4),stringsPerMppt:1+Math.floor(rnd()*3)});
  if(!r.layout.valid)continue;
  assert.ok(r.layout.voltageCold<r.p.dcMax);assert.ok(r.layout.voltageHot>=r.p.mpptMin);assert.ok(r.layout.series*r.layout.vmpCold<=r.p.mpptMax);assert.ok(r.panels>=r.targetPanels);
 }
});
