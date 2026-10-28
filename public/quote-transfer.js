/** Commercial handoff: quantities and technical context only. Never exports purchase/sale prices. */
export const QUOTE_TRANSFER_SCHEMA='solis-fv-quote/v1';
export function quoteTransfer(r,{generatedAt=new Date().toISOString()}={}){
 if(r.blocked)throw new Error('Corrige los errores del diseño antes de exportarlo al cotizador.');
 const p=r.p;
 if(!/^[a-zA-Z0-9:-]{8,80}$/.test(p.integrationProjectId))throw new Error('Falta el identificador del proyecto para la integración.');
 if(!['CLP','USD'].includes(p.currency))throw new Error('La integración admite CLP o USD. No convierte monedas; PEN no está disponible en el cotizador.');
 if(!r.bom.length||r.bom.length>200)throw new Error('La integración admite entre 1 y 200 materiales.');
 const codes=new Set();
 const items=r.bom.map(x=>{
  const unit=({ud:'un',lote:'gl'})[x.unit]||x.unit;
  if(!/^[A-Z0-9-]{1,20}$/.test(x.code)||codes.has(x.code)||!['un','m','par','kit','gl'].includes(unit))throw new Error('Código duplicado, código o unidad no compatible con el cotizador: '+x.code);
  codes.add(x.code);
  if(!Number.isFinite(x.qty)||x.qty<=0||x.qty>1e6||Number(x.qty.toFixed(6))!==x.qty)throw new Error('Cantidad fuera del límite de integración: '+x.code);
  const key=x.code.startsWith('CAB-')?x.code.slice(4).toLowerCase():null,c=key?r.cables[key]:null;
  const specification=c?`Cu ${c.section} mm²; ruta de ida ${c.length} m. Cantidad de compra del listado, incluye 10 %; comprobar conductores y cable completo/unipolar. Tabla térmica ${c.verified?'declarada validada por usuario':'orientativa sin validar'}.`:x.code.startsWith('EX-')?'Referencia adicional de presupuesto; equipo no dimensionado por el motor.':x.code==='PRO-01'?'Partida global de protecciones pendiente de ingeniería y desglose.':'';
  return {code:x.code,description:x.description.slice(0,240),quantity:x.qty,unit,specification};
 });
 return {schema:QUOTE_TRANSFER_SCHEMA,source:{application:'SOLIS FV Pro',engineVersion:r.version,projectId:p.integrationProjectId,documentCode:p.documentCode,revision:p.documentRevision,generatedAt},project:{name:p.project,client:p.client,location:p.location,currency:p.currency},design:{dcKw:r.dcKw,panels:r.panels,inverterKw:r.inverterKw,batteryKwh:r.batteryKwh,productionKwhYear:r.production,preliminary:true,warnings:r.alerts.map(x=>x.text).slice(0,100)},items};
}
