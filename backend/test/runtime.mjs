// Runs against bundled Worker and actual workerd D1 bindings; no remote account is used.
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:[new URL('../src/index.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'runtime-key'};
const base='https://runtime.example';
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-20',d1Databases:['DB'],bindings:{ACCESS_TEAM_DOMAIN:'runtime-tests.cloudflareaccess.com',ACCESS_AUD:'runtime-aud',ADS_STORAGE_ENABLED:'true',PUBLIC_ORIGIN:base},outboundService:()=>Response.json({keys:[jwk]})}));
try{
 const db=await mf.getD1Database('DB'),schema=await readFile(new URL('../migrations/0001_boxpanel.sql',import.meta.url),'utf8');
 // D1 exec accepts one statement per line; triggers include internal semicolons, so use prepare.
 const {DatabaseSync}=await import('node:sqlite');const parser=new DatabaseSync(':memory:');parser.exec(schema);
 // Reuse complete sqlite_master definitions, preserving trigger bodies.
 const defs=parser.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END").all();
 for(const {sql} of defs)await db.prepare(sql).run();
 await db.prepare('INSERT INTO bp_storage(id,used_bytes) VALUES(1,0)').run();
 await db.batch([db.prepare("INSERT INTO bp_resellers(id,username,display_name) VALUES('r1','runtime','Runtime')"),db.prepare("INSERT INTO bp_panel_accounts(id,access_identity,role,reseller_id) VALUES('a1','runtime-sub','reseller','r1')")]);
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const head=encode({alg:'RS256',kid:'runtime-key'}),payload=encode({sub:'runtime-sub',iss:'https://runtime-tests.cloudflareaccess.com',aud:'runtime-aud',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,Buffer.from(head+'.'+payload));
 const headers={'Cf-Access-Jwt-Assertion':head+'.'+payload+'.'+Buffer.from(sig).toString('base64url'),'X-Boxpanel-Request':'1','origin':base};
 let response=await mf.dispatchFetch(base+'/api/session',{headers});assert.equal(response.status,200,await response.clone().text());
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8l8AAAAASUVORK5CYII=','base64');
 response=await mf.dispatchFetch(base+'/api/reseller/ads?title=Imagen',{method:'POST',headers:{...headers,'content-type':'image/png'},body:png});assert.equal(response.status,201,await response.clone().text());
 const {id}=await response.json();response=await mf.dispatchFetch(base+'/api/reseller/ads/'+id,{headers});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
 for(let i=0;i<4;i++){response=await mf.dispatchFetch(base+'/api/reseller/dns',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({title:'DNS',url:'https://dns.example'})});assert.equal(response.status,i<3?201:409);}
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM bp_audit_events').first()).n,4);
 console.log('workerd/D1: sesión JWT, subida y lectura BLOB, cuota DNS y rollback auditado verificados.');
}finally{await mf.dispose();}
