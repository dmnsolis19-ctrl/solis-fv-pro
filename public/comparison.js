import {calculate,normalize} from './engine.js';
export function scenario(p,name,overrides={}){
 const next=structuredClone(p);Object.assign(next,overrides);
 // Coverage changes retain site and equipment; battery removal does not erase source inputs.
 const r=calculate(next);
 return {name,inputs:normalize(next),result:r};
}
export function defaultScenarios(p){return [scenario(p,'Diseño actual'),scenario(p,'Sin almacenamiento',{system:'grid'}),scenario(p,'Cobertura 80 %',{coverage:80}),scenario(p,'Cobertura 120 %',{coverage:120})];}
export function compareRows(items){return [['Alternativa','Estado','Potencia DC kWp','Inversor kW','Módulos','Batería kWh','Generación kWh/año','Autoconsumo kWh/año','Inversión','Ahorro neto año 1','Retorno simple años','VAN'],...items.map(({name,result:r})=>[name,r.blocked?'REVISAR':'Preliminar',r.dcKw,r.inverterKw,r.panels,r.batteryKwh,r.production,r.self,r.capex,r.netSaving,r.payback??'Sin retorno',r.npv])];}
