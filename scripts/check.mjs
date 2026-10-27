import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const directory of ['public','server','functions']){
 for(const file of (await readdir(directory,{recursive:true})).filter(x=>x.endsWith('.js')).sort()){
  const result=spawnSync(process.execPath,['--check',directory+'/'+file],{stdio:'inherit'});if(result.error||result.status!==0)process.exit(1);
 }
}
console.log('Sintaxis validada.');
