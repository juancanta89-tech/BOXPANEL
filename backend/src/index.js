import { routeReseller } from './reseller-api.js';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const allowedOrigin=env=>env.PUBLIC_ORIGIN;
function cors(request,env){const origin=request.headers.get('Origin');return origin===allowedOrigin(env)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}}
function b64url(s){s=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function verifyAccess(request,env){
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||env.ACCESS_AUD.startsWith('REPLACE_'))return false;
 try{
  const [head,payload,sig]=token.split('.');if(!head||!payload||!sig)return false;
  const h=JSON.parse(new TextDecoder().decode(b64url(head)));
  const p=JSON.parse(new TextDecoder().decode(b64url(payload)));
  if(h.alg!=='RS256'||!h.kid||p.aud!==env.ACCESS_AUD&&!(Array.isArray(p.aud)&&p.aud.includes(env.ACCESS_AUD)))return false;
  const issuer='https://'+env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(p.iss!==issuer||!p.exp||p.exp*1000<=Date.now()||!p.iat||p.iat*1000>Date.now()+60000)return false;
  const jwks=await fetch(issuer+'/cdn-cgi/access/certs',{cf:{cacheTtl:300}}).then(r=>{if(!r.ok)throw Error('certs');return r.json()});
  const jwk=jwks.keys?.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(sig),new TextEncoder().encode(head+'.'+payload));
 }catch{return false}
}
function clean(body){
 const name=String(body.name||'').trim().slice(0,100);
 const category=String(body.category||'TV').trim().slice(0,80);
 const description=String(body.description||'').trim().slice(0,2000);
 const icon=String(body.icon||'📺').slice(0,16);
 const published=body.published===true||body.published===1?1:0;
 const image_url=checkUrl(body.image_url);
 const download_url=checkUrl(body.download_url);
 if(!name||!category)throw Error('Nombre y categoría requeridos');
 return {name,category,description,icon,published,image_url,download_url};
}
function checkUrl(value){if(!value)return null;const u=new URL(String(value));if(u.protocol!=='https:')throw Error('Solo se admiten enlaces HTTPS');return u.href.slice(0,1500)}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 const headers=cors(request,env);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 if(path==='/health')return json({ok:true,service:'BOXPANEL API'},200,headers);
 if(path.startsWith('/api/reseller/'))return routeReseller(request,env,verifyAccess);
 if(path==='/api/products'&&request.method==='GET'){
  const r=await env.DB.prepare('SELECT id,name,category,description,icon,image_url,download_url,updated_at FROM products WHERE published=1 ORDER BY updated_at DESC LIMIT 100').all();
  return json({products:r.results},200,headers);
 }
 if(!path.startsWith('/api/admin/'))return json({error:'Not found'},404,headers);
 if(!(await verifyAccess(request,env)))return json({error:'Unauthorized'},401,headers);
 // Only the verified super admin may access global product management.
 try{
  const jwt=request.headers.get('Cf-Access-Jwt-Assertion');
  const raw=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const claims=JSON.parse(atob(raw));
  const account=await env.DB.prepare('SELECT role,active FROM panel_accounts WHERE access_identity=?').bind(String(claims.sub||'')).first();
  if(!account||account.active!==1||account.role!=='super_admin')return json({error:'Forbidden'},403,headers);
  if(path==='/api/admin/products'&&request.method==='GET'){
   const r=await env.DB.prepare('SELECT * FROM products ORDER BY updated_at DESC LIMIT 200').all();return json({products:r.results},200,headers);
  }
  if(path==='/api/admin/products'&&request.method==='POST'){
   const p=clean(await request.json());const id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO products (id,name,category,description,icon,image_url,download_url,published) VALUES (?,?,?,?,?,?,?,?)').bind(id,p.name,p.category,p.description,p.icon,p.image_url,p.download_url,p.published).run();
   return json({ok:true,id},201,headers);
  }
  const m=path.match(/^\/api\/admin\/products\/([a-f0-9-]{36})$/);
  if(m&&request.method==='PUT'){
   const p=clean(await request.json());const r=await env.DB.prepare('UPDATE products SET name=?,category=?,description=?,icon=?,image_url=?,download_url=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(p.name,p.category,p.description,p.icon,p.image_url,p.download_url,p.published,m[1]).run();
   return json({ok:r.meta.changes>0},r.meta.changes?200:404,headers);
  }
  if(m&&request.method==='DELETE'){
   const r=await env.DB.prepare('DELETE FROM products WHERE id=?').bind(m[1]).run();return json({ok:r.meta.changes>0},r.meta.changes?200:404,headers);
  }
  return json({error:'Not found'},404,headers);
 }catch(e){return json({error:e instanceof SyntaxError?'JSON inválido':'Datos inválidos'},400,headers)}
}};
