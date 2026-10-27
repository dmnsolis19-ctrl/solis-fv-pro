import test from 'node:test';
import assert from 'node:assert/strict';
import {localPlaces,parsePhoton} from '../public/geocode.js';
import {handleGeocode} from '../server/geocode-handler.js';
const data={features:[{properties:{name:'Concepción',countrycode:'CL',city:'Concepción',country:'Chile'},geometry:{coordinates:[-73.05,-36.827]}}]};
test('Offline Chile suggestions handle accents and update valid coordinates',()=>{assert.deepEqual(localPlaces('maipu'),localPlaces('Maipú'));assert.equal(localPlaces('concep')[0].latitude,-36.827);assert.equal(localPlaces('concep')[0].longitude,-73.05);assert.equal(localPlaces('hanga')[0].longitude,-109.433);assert.deepEqual(localPlaces('x'),[]);assert.deepEqual(localPlaces('unknown city'),[]);});
test('Photon parser excludes other countries and invalid coordinates',()=>{assert.deepEqual(parsePhoton(data)[0],{name:'Concepción, Chile',latitude:-36.827,longitude:-73.05,source:'Photon / OpenStreetMap'});assert.equal(parsePhoton({features:[...data.features,{properties:{name:'Other',countrycode:'US'},geometry:{coordinates:[1,1]}},{properties:{name:'Bad',countrycode:'CL'},geometry:{coordinates:[900,-33]}}]}).length,1);assert.throws(()=>parsePhoton({}));});
test('Geocode endpoint validates before fetching, restricts country/host and caches normalized results',async()=>{
 let calls=0,url;const fetcher=async u=>{calls++;url=new URL(u);return Response.json(data);};
 for(const query of ['q=a','q=Concep&q=Talca','q=Concep&url=https://evil.invalid','q=%3Cscript%3E'])assert.equal((await handleGeocode(new Request('https://app.invalid/api/geocode?'+query),{fetcher})).status,400);assert.equal(calls,0);
 assert.equal((await handleGeocode(new Request('https://app.invalid/api/geocode?q=Concep',{method:'POST'}),{fetcher})).status,405);
 const r=await handleGeocode(new Request('https://app.invalid/api/geocode?q=Concep'),{fetcher});assert.equal(r.status,200);assert.equal(url.origin,'https://photon.komoot.io');assert.equal(url.searchParams.get('countrycode'),'CL');assert.equal((await r.json()).results[0].latitude,-36.827);
 const cached=await handleGeocode(new Request('https://app.invalid/api/geocode?q=Concep'),{cache:{match:async()=>new Response('cached')},fetcher:()=>{throw Error();}});assert.equal(await cached.text(),'cached');
});
test('Geocode failures return explicit errors and never synthesize a location',async()=>{
 const request=new Request('https://app.invalid/api/geocode?q=Concep');for(const fetcher of [async()=>Response.json({}),async()=>{throw Error('network');},async()=>new Response('x'.repeat(300001))]){const r=await handleGeocode(request,{fetcher});assert.equal(r.status,502);assert.ok((await r.json()).error);}
 assert.equal((await handleGeocode(request,{fetcher:async()=>new Response('limited',{status:429})})).status,429);
});
