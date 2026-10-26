const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function projectPoint(lat,lon,z){const size=256*2**z,r=clamp(lat,-85.0511,85.0511)*Math.PI/180;return [(lon+180)/360*size,(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*size];}
export function unprojectPoint(x,y,z){const size=256*2**z;return [Math.atan(Math.sinh(Math.PI*(1-2*y/size)))*180/Math.PI,((x/size*360-180+540)%360)-180];}
/** Only visible standard OSM tiles, browser caching, no prefetch, explicit user activation. */
export function mountMap(element,{latitude,longitude,onPick}){
 let z=12,center=[latitude,longitude],down=null,moved=false;
 const layer=document.createElement('div');layer.className='map-tiles';element.append(layer);
 const pin=document.createElement('span');pin.className='map-pin';pin.textContent='+';pin.setAttribute('aria-hidden','true');element.append(pin);
 const controls=document.createElement('div');controls.className='map-controls';
 for(const [label,change]of [['Acercar',1],['Alejar',-1]]){const b=document.createElement('button');b.type='button';b.textContent=change>0?'+':'−';b.ariaLabel=label;b.onclick=()=>{z=clamp(z+change,2,18);draw();};controls.append(b);}element.append(controls);
 const attr=document.createElement('div');attr.className='map-attribution';attr.innerHTML='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Reportar</a>';element.append(attr);
 const readout=document.createElement('span');readout.className='map-readout';element.append(readout);
 const tiles=new Map();
 function draw(){
  const w=element.clientWidth,h=element.clientHeight,[cx,cy]=projectPoint(...center,z),left=cx-w/2,top=cy-h/2,needed=new Set();
  const n=2**z;
  for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+h)/256);y++){
   if(y<0||y>=n)continue;const tx=((x%n)+n)%n,key=`${z}/${x}/${y}`;needed.add(key);
   let tile=tiles.get(key);if(!tile){tile=document.createElement('img');tile.alt='';tile.draggable=false;tile.src=`https://tile.openstreetmap.org/${z}/${tx}/${y}.png`;tile.referrerPolicy='strict-origin-when-cross-origin';tile.onload=()=>{element.classList.add('map-loaded');};tile.onerror=()=>{readout.textContent='Mapa no disponible. Usa las coordenadas.';};tiles.set(key,tile);layer.append(tile);}
   tile.style.left=`${x*256-left}px`;tile.style.top=`${y*256-top}px`;
  }
  for(const [key,tile]of tiles)if(!needed.has(key)){tile.remove();tiles.delete(key);}
  readout.textContent=`Centro ${center[0].toFixed(5)}, ${center[1].toFixed(5)} · clic para seleccionar`;
 }
 element.onpointerdown=ev=>{if(ev.target.closest('button,a'))return;down={x:ev.clientX,y:ev.clientY,c:projectPoint(...center,z)};moved=false;element.setPointerCapture(ev.pointerId);};
 element.onpointermove=ev=>{if(!down)return;const dx=ev.clientX-down.x,dy=ev.clientY-down.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){center=unprojectPoint(down.c[0]-dx,down.c[1]-dy,z);draw();}};
 element.onpointerup=ev=>{if(!down)return;const wasMoved=moved;down=null;if(wasMoved)return;const rect=element.getBoundingClientRect(),[cx,cy]=projectPoint(...center,z);const [lat,lon]=unprojectPoint(cx+ev.clientX-rect.left-rect.width/2,cy+ev.clientY-rect.top-rect.height/2,z);onPick(Number(clamp(lat,-80,80).toFixed(5)),Number(lon.toFixed(5)));};
 element.onpointercancel=()=>{down=null;};
 const observer=new ResizeObserver(draw);observer.observe(element);draw();return ()=>observer.disconnect();
}
