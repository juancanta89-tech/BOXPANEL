import {mkdir,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const target=fileURLToPath(new URL('../public/',import.meta.url));
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const file of ['index.html','public.js','panel.css','panel.js','api-client.js','master.html','reseller.html','conexion.html'])await copyFile(new URL('../../'+file,import.meta.url),target+'/'+file);
console.log('Assets preparados (solo archivos públicos).');
