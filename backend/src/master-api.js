import { audit, batch, fail, json, readBody, text } from './common.js';
export async function routeMaster(request, env, account) {
  if (account.role !== 'super_admin') fail(403,'Solo el administrador puede realizar esta operación.');
  const path = new URL(request.url).pathname, method = request.method;
  if (path === '/api/master/resellers' && method === 'GET') {
    const result = await env.DB.prepare(`SELECT r.id,r.username,r.display_name,r.status,r.credit_balance,
      (SELECT COUNT(*) FROM bp_ads a WHERE a.reseller_id=r.id) AS ads_count,
      (SELECT COUNT(*) FROM bp_dns d WHERE d.reseller_id=r.id) AS dns_count,
      (SELECT COUNT(*) FROM bp_panel_accounts p WHERE p.reseller_id=r.id AND p.active=1) AS accounts_count
      FROM bp_resellers r ORDER BY r.created_at DESC,r.id LIMIT 201`).all();
    return json({ resellers: result.results.slice(0,200), truncated: result.results.length > 200 });
  }
  if (path === '/api/master/resellers' && method === 'POST') {
    const b = await readBody(request), username = text(b.username,40), name = text(b.display_name);
    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) fail(400,'El usuario debe tener de 3 a 40 letras, números, guiones o guiones bajos.');
    const id = crypto.randomUUID();
    const statements = [env.DB.prepare('INSERT INTO bp_resellers(id,username,display_name) VALUES(?,?,?)').bind(id,username,name)];
    if (b.access_identity) statements.push(env.DB.prepare('INSERT INTO bp_panel_accounts(id,access_identity,role,reseller_id) VALUES(?,?,?,?)').bind(crypto.randomUUID(),text(b.access_identity,256),'reseller',id));
    statements.push(audit(env,account,id,'reseller.create',id));
    await batch(env,statements); return json({ ok:true,id },201);
  }
  const match = path.match(/^\/api\/master\/resellers\/([a-zA-Z0-9_-]{1,100})\/(status|account)$/);
  if (match && method === 'PUT') {
    const [,id,action] = match, b = await readBody(request);
    if (!await env.DB.prepare('SELECT id FROM bp_resellers WHERE id=?').bind(id).first()) fail(404,'Reseller no encontrado.');
    if (action === 'status') {
      if (!['active','suspended'].includes(b.status)) fail(400,'Estado inválido.');
      await batch(env,[env.DB.prepare('UPDATE bp_resellers SET status=? WHERE id=?').bind(b.status,id),audit(env,account,id,'reseller.status',id,b.status)]);
    } else {
      const identity = text(b.access_identity,256);
      // Existing identity for another tenant is never reassigned by an upsert.
      const previous = await env.DB.prepare('SELECT reseller_id FROM bp_panel_accounts WHERE access_identity=?').bind(identity).first();
      if (previous && previous.reseller_id !== id) fail(409,'La identidad ya está vinculada a otra cuenta.');
      const link = previous ? env.DB.prepare('UPDATE bp_panel_accounts SET active=1 WHERE access_identity=? AND reseller_id=?').bind(identity,id)
        : env.DB.prepare('INSERT INTO bp_panel_accounts(id,access_identity,role,reseller_id) VALUES(?,?,?,?)').bind(crypto.randomUUID(),identity,'reseller',id);
      await batch(env,[link,audit(env,account,id,'account.link',id)]);
    }
    return json({ ok:true });
  }
  fail(404,'Ruta no encontrada.');
}
