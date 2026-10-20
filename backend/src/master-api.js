// BOXPANEL master admin routes. Caller MUST verify Cloudflare Access JWT first.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
function getSub(request){const jwt=request.headers.get('Cf-Access-Jwt-Assertion');if(!jwt)return '';try{return String(JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub||'')}catch{return ''}}
export async function routeMaster(request,env,verifyAccess){
 if(!await verifyAccess(request,env))return json({error:'Unauthorized'},401);
 const sub=getSub(request);if(!sub)return json({error:'Unauthorized'},401);
 const user=await env.DB.prepare('SELECT id FROM panel_accounts WHERE access_identity=? AND role=? AND active=1').bind(sub,'super_admin').first();
 if(!user)return json({error:'Forbidden'},403);
 const path=new URL(request.url).pathname,method=request.method;
 try{
  if(path==='/api/master/resellers'&&method==='GET'){
   const result=await env.DB.prepare('SELECT r.id,r.username,r.display_name,r.status,r.credit_balance,(SELECT COUNT(*) FROM reseller_ads a WHERE a.reseller_id=r.id) AS ads_count,(SELECT COUNT(*) FROM reseller_dns d WHERE d.reseller_id=r.id) AS dns_count FROM resellers r ORDER BY r.created_at DESC LIMIT 200').all();
   return json({resellers:result.results});
  }
  if(path==='/api/master/resellers'&&method==='POST'){
   const b=await request.json(),username=String(b.username||'').trim(),name=String(b.display_name||'').trim();
   if(!/^[a-zA-Z0-9_-]{3,40}$/.test(username)||!name||name.length>100)return json({error:'Invalid reseller details'},400);
   const id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO resellers(id,username,display_name) VALUES(?,?,?)').bind(id,username,name).run();
   await env.DB.prepare('INSERT INTO audit_events(id,actor_id,actor_role,reseller_id,action,target_id) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'super_admin',id,'reseller.create',id).run();
   return json({ok:true,id},201);
  }
  const match=path.match(/^\/api\/master\/resellers\/([a-f0-9-]{36})\/status$/);
  if(match&&method==='PUT'){
   const b=await request.json();if(!['active','suspended'].includes(b.status))return json({error:'Invalid status'},400);
   const result=await env.DB.prepare('UPDATE resellers SET status=? WHERE id=?').bind(b.status,match[1]).run();
   if(!result.meta.changes)return json({error:'Not found'},404);
   await env.DB.prepare('INSERT INTO audit_events(id,actor_id,actor_role,reseller_id,action,target_id,details) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'super_admin',match[1],'reseller.status',match[1],b.status).run();
   return json({ok:true});
  }
  return json({error:'Not found'},404);
 }catch{return json({error:'Invalid request or database error'},400)}
}
