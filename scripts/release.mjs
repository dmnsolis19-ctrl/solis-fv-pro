/** Same build command for GitHub and Cloudflare: reject broken code before producing assets. */
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(args){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0){console.error('Publicación detenida: falló una validación. No se generó una nueva compilación.');process.exit(result.status||1);}
}
if(Number(process.versions.node.split('.')[0])<22){console.error('Se requiere Node.js 22 o superior.');process.exit(1);}
for(const directory of ['public','server','functions']){
 const files=await readdir(new URL('../'+directory+'/',import.meta.url),{recursive:true});
 for(const file of files.filter(x=>x.endsWith('.js')).sort())run(['--check',directory+'/'+file]);
}
const tests=(await readdir(new URL('../tests/',import.meta.url))).filter(x=>x.endsWith('.test.mjs')).sort().map(x=>'tests/'+x);
if(!tests.length){console.error('Publicación detenida: falta la suite de pruebas.');process.exit(1);}
run(['--test',...tests]);
run(['scripts/build.mjs']);
