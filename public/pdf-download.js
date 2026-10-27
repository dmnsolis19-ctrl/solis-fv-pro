import {buildReportPDF} from './pdf-report.js';
import {roofSVG} from './roof-svg.js';
import {schematicSVG} from './schematic.js';
let previousURL;
async function raster(svg){
 const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
 const width=Math.min(2200,Math.max(1200,image.naturalWidth*2)),height=Math.round(width*image.naturalHeight/image.naturalWidth),canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar el plano del PDF.');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);return canvas.toDataURL('image/jpeg',.94);
}
export async function downloadReportPDF(r,options={}){
 const figures={};if(r.p.roofLayout&&r.roofPlan.valid)figures.roof=await raster(roofSVG(r.p,r.roofPlan));if(r.p.includeSchematic)figures.schematic=await raster(schematicSVG(r));
 const bytes=await buildReportPDF(r,{...options,figures}),name=(r.p.documentCode+'-'+r.p.project).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,120);
 if(previousURL)URL.revokeObjectURL(previousURL);previousURL=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 // Keep an explicit user-activated link: some browsers block asynchronous downloads.
 const target=document.querySelector('#pdf-download-ready');target.replaceChildren();target.hidden=false;
 const label=document.createElement('span');label.textContent='Informe listo · ';
 const link=document.createElement('a');link.href=previousURL;link.download=name+'.pdf';link.textContent='Guardar PDF generado';
 const close=document.createElement('button');close.type='button';close.className='text-button';close.textContent='Cerrar';close.addEventListener('click',()=>{target.hidden=true;URL.revokeObjectURL(previousURL);previousURL=null;});target.append(label,link,close);
 link.click();return bytes.length;
}
