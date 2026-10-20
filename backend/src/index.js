import { authenticate, verifyAccess } from './auth.js';
import { routeReseller } from './reseller-api.js';
import { routeMaster } from './master-api.js';
import { audit, batch, fail, HttpError, json, readBody, text, url } from './common.js';
function finish(response, request, env) {
  const h = new Headers(response.headers), origin = request.headers.get('origin');
  h.set('x-content-type-options','nosniff'); h.set('referrer-policy','same-origin'); h.set('x-frame-options','DENY');
  h.set('vary','Origin');
  if (origin && origin === env.PUBLIC_ORIGIN) { h.set('access-control-allow-origin',origin); h.set('access-control-allow-credentials','true'); }
  return new Response(response.body,{status:response.status,headers:h});
}
async function productRoute(request,env,account) {
  if (account.role !== 'super_admin') fail(403,'Solo el administrador puede editar productos.');
  const path = new URL(request.url).pathname, method = request.method;
  if (path === '/api/admin/products' && method === 'GET') return json({products:(await env.DB.prepare('SELECT * FROM bp_products ORDER BY updated_at DESC,id LIMIT 200').all()).results});
  const match = path.match(/^\/api\/admin\/products\/([a-f0-9-]{36})$/), id = match?.[1];
  if ((!id && path === '/api/admin/products' && method === 'POST') || (id && method === 'PUT')) {
    const b = await readBody(request), name=text(b.name), category=text(b.category,80), description=text(b.description??'',2000,false), icon=text(b.icon??'📺',16);
    const image = b.image_url ? url(b.image_url) : null, download = b.download_url ? url(b.download_url) : null;
    const published = b.published === true ? 1 : 0, target = id || crypto.randomUUID();
    if (id && !await env.DB.prepare('SELECT id FROM bp_products WHERE id=?').bind(id).first()) fail(404,'Producto no encontrado.');
    const stmt = id ? env.DB.prepare('UPDATE bp_products SET name=?,category=?,description=?,icon=?,image_url=?,download_url=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(name,category,description,icon,image,download,published,id)
      : env.DB.prepare('INSERT INTO bp_products(id,name,category,description,icon,image_url,download_url,published) VALUES(?,?,?,?,?,?,?,?)').bind(target,name,category,description,icon,image,download,published);
    await batch(env,[stmt,audit(env,account,null,id?'product.update':'product.create',target)]); return json({ok:true,id:target},id?200:201);
  }
  if (id && method === 'DELETE') {
    if (!await env.DB.prepare('SELECT id FROM bp_products WHERE id=?').bind(id).first()) fail(404,'Producto no encontrado.');
    await batch(env,[env.DB.prepare('DELETE FROM bp_products WHERE id=?').bind(id),audit(env,account,null,'product.delete',id)]);return json({ok:true});
  }
  fail(404,'Ruta no encontrada.');
}
export default { async fetch(request,env) {
  try {
    const u = new URL(request.url), path = u.pathname, origin = request.headers.get('origin');
    // Cookie-authenticated writes must come from the hosted panel or its exact configured public origin.
    if (origin && origin !== u.origin && origin !== env.PUBLIC_ORIGIN) fail(403,'Origen no autorizado.');
    if (request.method === 'OPTIONS') {
      if (!origin) fail(403,'Origen requerido.');
      return finish(new Response(null,{status:204,headers:{'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'Content-Type, X-Boxpanel-Request'}}),request,env);
    }
    if (!['GET','HEAD'].includes(request.method) && request.headers.get('X-Boxpanel-Request') !== '1') fail(403,'Solicitud de escritura no autorizada.');
    if (path === '/health') return finish(json({ok:true,service:'BOXPANEL API',version:'1.0'}),request,env);
    if (path === '/api/products' && request.method === 'GET') return finish(json({products:(await env.DB.prepare('SELECT id,name,category,description,icon,image_url,download_url FROM bp_products WHERE published=1 ORDER BY updated_at DESC,id LIMIT 100').all()).results}),request,env);
    if (!path.startsWith('/api/')) {
      if (!env.ASSETS) fail(404,'Página no encontrada.');
      const response = await env.ASSETS.fetch(request);
      const h = new Headers(response.headers);
      h.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: https:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      return finish(new Response(response.body,{status:response.status,headers:h}),request,env);
    }
    if (path === '/api/identity' && request.method === 'GET') {
      const claims = await verifyAccess(request,env);
      if (!claims) fail(401,'Inicia sesión para consultar tu identidad.');
      return finish(json({sub:claims.sub}),request,env);
    }
    const account = await authenticate(request,env);
    let response;
    if (path === '/api/session' && request.method === 'GET') response=json({account,allow_http_dns:env.ALLOW_HTTP_DNS==='true'});
    else if (path === '/api/login' && request.method === 'GET') response=Response.redirect(u.origin+(account.role==='super_admin'?'/master.html':'/reseller.html'),303);
    else if (path.startsWith('/api/reseller/')) response=await routeReseller(request,env,account);
    else if (path.startsWith('/api/master/')) response=await routeMaster(request,env,account);
    else if (path.startsWith('/api/admin/')) response=await productRoute(request,env,account);
    else fail(404,'Ruta no encontrada.');
    return finish(response,request,env);
  } catch(e) {
    return finish(json({error:e instanceof HttpError?e.message:'Servicio temporalmente no disponible. Verifica la configuración de la base de datos.'},e instanceof HttpError?e.status:503),request,env);
  }
}};
