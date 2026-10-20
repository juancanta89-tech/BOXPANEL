// BOXPANEL reseller API module for Cloudflare Workers.
// Requires authenticated Cloudflare Access identity resolved server-side.
// Not deployed. Import routeReseller into main Worker after configuring D1 and R2.
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
async function identity(request,env,verifyAccess){
 if(!await verifyAccess(request,env))return null;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
 const sub=String(payload.sub||'');
 if(!sub)return null;
 return env.DB.prepare('SELECT id,role,reseller_id FROM panel_accounts WHERE access_identity=? AND active=1').bind(sub).first();
}
function scope(account,requested){if(account.role==='super_admin')return requested||null;return account.reseller_id}
function validateUrl(s){const url=new URL(s);if(!['https:','http:'].includes(url.protocol))throw Error('invalid URL');return url.href.slice(0,1500)}
export async function routeReseller(request,env,verifyAccess){
 const account=await identity(request,env,verifyAccess);
 if(!account)return reply({error:'Unauthorized'},401);
 const u=new URL(request.url),path=u.pathname,method=request.method;
 const requested=u.searchParams.get('reseller_id');
 const resellerId=scope(account,requested);
 if(!resellerId)return reply({error:'reseller_id required for super admin'},400);
 if(account.role!=='super_admin'&&requested&&requested!==account.reseller_id)return reply({error:'Forbidden'},403);
 const reseller=await env.DB.prepare('SELECT id,status FROM resellers WHERE id=?').bind(resellerId).first();
 if(!reseller)return reply({error:'Reseller not found'},404);
 if(reseller.status!=='active'&&account.role!=='super_admin')return reply({error:'Reseller suspended'},403);
 try{
  if(path==='/api/reseller/dns'&&method==='GET'){
   const r=await env.DB.prepare('SELECT id,title,server_url,created_at FROM reseller_dns WHERE reseller_id=? ORDER BY created_at').bind(resellerId).all();
   return reply({items:r.results,limit:3});
  }
  if(path==='/api/reseller/dns'&&method==='POST'){
   const b=await request.json(),id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO reseller_dns(id,reseller_id,title,server_url) VALUES(?,?,?,?)').bind(id,resellerId,String(b.title||'').slice(0,100),validateUrl(b.url)).run();
   return reply({ok:true,id},201);
  }
  const dnsMatch=path.match(/^\/api\/reseller\/dns\/([a-f0-9-]{36})$/);
  if(dnsMatch&&method==='PUT'){
   const b=await request.json();
   const r=await env.DB.prepare('UPDATE reseller_dns SET title=?,server_url=? WHERE id=? AND reseller_id=?').bind(String(b.title||'').slice(0,100),validateUrl(b.url),dnsMatch[1],resellerId).run();
   return reply({ok:r.meta.changes>0},r.meta.changes?200:404);
  }
  if(dnsMatch&&method==='DELETE'){
   const r=await env.DB.prepare('DELETE FROM reseller_dns WHERE id=? AND reseller_id=?').bind(dnsMatch[1],resellerId).run();
   return reply({ok:r.meta.changes>0},r.meta.changes?200:404);
  }
  if(path==='/api/reseller/ads'&&method==='GET'){
   const r=await env.DB.prepare('SELECT id,title,mime_type,created_at FROM reseller_ads WHERE reseller_id=? ORDER BY created_at').bind(resellerId).all();
   return reply({items:r.results,limit:8});
  }
  if(path==='/api/reseller/ads'&&method==='POST'){
   if(!env.ADS_BUCKET)return reply({error:'Image uploads are disabled until a no-overage storage service is configured'},503);
   const type=request.headers.get('Content-Type')||'';
   if(!type.toLowerCase().startsWith('multipart/form-data'))return reply({error:'Expected multipart form'},415);
   const form=await request.formData(),file=form.get('image'),title=String(form.get('title')||'').slice(0,100);
   if(!(file instanceof File)||!allowedTypes.has(file.type)||file.size===0||file.size>5*1024*1024)return reply({error:'Invalid image. JPG, PNG, WebP; max 5MB'},400);
   const bytes=new Uint8Array(await file.arrayBuffer());
   const valid=file.type==='image/png'&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71||file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255||file.type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
   if(!valid)return reply({error:'Image signature mismatch'},400);
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM reseller_ads WHERE reseller_id=?').bind(resellerId).first();
   if(count.n>=8)return reply({error:'Maximum 8 images'},409);
   const id=crypto.randomUUID(),key='resellers/'+resellerId+'/ads/'+id;
   await env.ADS_BUCKET.put(key,bytes,{httpMetadata:{contentType:file.type}});
   try{await env.DB.prepare('INSERT INTO reseller_ads(id,reseller_id,title,r2_object_key,mime_type) VALUES(?,?,?,?,?)').bind(id,resellerId,title,key,file.type).run()}
   catch(e){await env.ADS_BUCKET.delete(key);return reply({error:'Unable to save image or limit reached'},409)}
   return reply({ok:true,id},201);
  }
  const adMatch=path.match(/^\/api\/reseller\/ads\/([a-f0-9-]{36})$/);
  if(adMatch&&method==='GET'){
   const ad=await env.DB.prepare('SELECT r2_object_key,mime_type FROM reseller_ads WHERE id=? AND reseller_id=?').bind(adMatch[1],resellerId).first();
   if(!ad)return reply({error:'Not found'},404);
   if(!env.ADS_BUCKET)return reply({error:'Image storage is not configured'},503);
   const obj=await env.ADS_BUCKET.get(ad.r2_object_key);
   if(!obj)return reply({error:'File not found'},404);
   return new Response(obj.body,{headers:{'content-type':ad.mime_type,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if(adMatch&&method==='DELETE'){
   const ad=await env.DB.prepare('SELECT r2_object_key FROM reseller_ads WHERE id=? AND reseller_id=?').bind(adMatch[1],resellerId).first();
   if(!ad)return reply({error:'Not found'},404);
   await env.DB.prepare('DELETE FROM reseller_ads WHERE id=? AND reseller_id=?').bind(adMatch[1],resellerId).run();
   if(env.ADS_BUCKET)await env.ADS_BUCKET.delete(ad.r2_object_key);
   return reply({ok:true});
  }
  return reply({error:'Not found'},404);
 }catch{return reply({error:'Invalid request or storage error'},400)}
}
