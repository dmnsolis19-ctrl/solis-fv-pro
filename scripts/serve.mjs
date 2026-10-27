import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import {handleSolar} from '../server/solar-handler.js';
import {handleGeocode} from '../server/geocode-handler.js';
const root = resolve('public');
const portIndex=process.argv.indexOf('--port');
const port=Number(portIndex>=0?process.argv[portIndex+1]:(process.env.PORT||5173));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json', '.webmanifest':'application/manifest+json' };
createServer(async (req, res) => {
  try {
    if(['/api/solar','/api/geocode'].includes(new URL(req.url,'http://local').pathname)){
      const handler=new URL(req.url,'http://local').pathname==='/api/geocode'?handleGeocode:handleSolar;
      const response=await handler(new Request(new URL(req.url,'http://localhost'),{method:req.method}));
      res.writeHead(response.status,Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));return;
    }
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname === '/' ? '/index.html' : new URL(req.url, 'http://local').pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(file);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(port, '0.0.0.0', () => console.log('SOLIS FV Pro disponible en puerto ' + port));
