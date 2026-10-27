import {MARKET_PRODUCTS,MARKET_DATE} from './market-data.js';
export const CATALOG_REVISION='2026-10-26';
const jinkoSource='https://www.jinkosolar.com/uploads/619f40ec/JKM550-570N-72HL4-BDV-F1-EN.pdf';
const goodweSource='https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_ES-Uniq_Datasheet-EN.pdf';
const ehSource='https://en.goodwe.com/Ftp/EN/Downloads/Datasheet/GW_EH_Datasheet-EN.pdf';
export const PANELS=[
 {id:'jinko-550n-bdv',brand:'Jinko Solar',model:'JKM550N-72HL4-BDV',source:jinkoSource,revision:'F1 EN · IEC 2016',values:{panelW:550,vmp:41.58,imp:13.23,voc:50.27,isc:14.01,panelArea:2.278*1.134,panelWidth:1.134,panelLength:2.278,betaVoc:-0.25,gammaPower:-0.30},notes:'Datos frontales STC. Sin ganancia bifacial. βVmp no figura en esta ficha: conservar y verificar el supuesto de diseño.'},
 {id:'jinko-560n-bdv',brand:'Jinko Solar',model:'JKM560N-72HL4-BDV',source:jinkoSource,revision:'F1 EN · IEC 2016',values:{panelW:560,vmp:41.95,imp:13.35,voc:50.67,isc:14.13,panelArea:2.278*1.134,panelWidth:1.134,panelLength:2.278,betaVoc:-0.25,gammaPower:-0.30},notes:'Datos frontales STC. Sin ganancia bifacial. βVmp pendiente de ficha ampliada.'},
 {id:'jinko-570n-bdv',brand:'Jinko Solar',model:'JKM570N-72HL4-BDV',source:jinkoSource,revision:'F1 EN · IEC 2016',values:{panelW:570,vmp:42.29,imp:13.48,voc:51.07,isc:14.25,panelArea:2.278*1.134,panelWidth:1.134,panelLength:2.278,betaVoc:-0.25,gammaPower:-0.30},notes:'Datos frontales STC. Sin ganancia bifacial. βVmp pendiente de ficha ampliada.'}
];
export const INVERTERS=[
 ...[5,6].map(kw=>({id:`goodwe-es-${kw}`,brand:'GoodWe',model:`GW${kw*1000}-ES-C10`,source:goodweSource,revision:'EN V2.1 · 2026-10-20',
 values:{inverterKw:kw,dcMax:600,mpptMin:60,mpptMax:550,startVoltage:58,mppts:2,stringsPerMppt:1,mpptCurrent:20,mpptIsc:26,maxPvKw:kw*2,backupLimit:kw,batteryPower:kw,phase:'single',voltage:230,system:'hybrid',inverterEfficiency:96.2,inverterAcMaxCurrent:kw===5?25:30},
 notes:'Batería LV 48 V: validar modelo y BMS. 580–600 V: standby. Revisar MPPT a potencia nominal en manual. Eficiencia europea usada como aproximación constante; no curva. Para Chile, potencia AC máxima = nominal.'})),
 {id:'goodwe-eh-5',brand:'GoodWe',model:'GW5000-EH',source:ehSource,revision:'Ficha EN consultada 2026-10-26',values:{inverterKw:5,dcMax:580,mpptMin:100,mpptMax:550,startVoltage:90,mppts:2,stringsPerMppt:1,mpptCurrent:12.5,mpptIsc:15.2,maxPvKw:6.65,backupLimit:5,batteryPower:5,phase:'single',voltage:230,system:'hybrid',inverterAcMaxCurrent:0},notes:'Batería HV 85–460 V; comprobar activación de respaldo. El límite de 12,5 A puede excluir módulos modernos. Corriente AC máxima y eficiencia: completar desde ficha/manual aplicable.'}
];
export function applyCatalog(p,kind,id){
 const entry=[...(kind==='panel'?PANELS:kind==='inverter'?INVERTERS:[]),...MARKET_PRODUCTS.filter(x=>x.category===kind&&x.values)].find(x=>x.id===id);
 if(!entry)throw new Error('Equipo no encontrado.');
 const prefix=kind==='panel'?'panel':'inverter';
 return {...p,...entry.values,[prefix+'Model']:`${entry.brand} ${entry.model}`,[prefix+'CatalogId']:id,
  [prefix+'Source']:{source:entry.source,revision:entry.revision||'Ficha documentada en catálogo Chile',checkedAt:MARKET_DATE,notes:entry.notes,values:entry.values}};
}
export function catalogStatus(p,kind){const s=p[kind+'Source'];if(!s)return 'manual';return Object.entries(s.values).every(([k,v])=>p[k]===v)?'matched':'modified';}
