import { audit, batch, fail, json, readBody, readBytes, text, url } from './common.js';
import { resellerScope } from './auth.js';
const MAX_IMAGE = 262144;
export function validImage(bytes, type) {
  if (type === 'image/png') return bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) && String.fromCharCode(...bytes.slice(12,16)) === 'IHDR';
  if (type === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  if (type === 'image/webp') return bytes.length >= 20 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP' && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4,true) + 8 === bytes.length;
  return false;
}
export async function routeReseller(request, env, account) {
  const resellerId = await resellerScope(request, env, account);
  const u = new URL(request.url), method = request.method;
  const match = u.pathname.match(/^\/api\/reseller\/(dns|ads)(?:\/([a-zA-Z0-9_-]{1,100}))?$/);
  if (!match) fail(404, 'Ruta no encontrada.');
  const [, kind, id] = match;
  if (kind === 'dns') {
    if (!id && method === 'GET') return json({ items: (await env.DB.prepare('SELECT id,title,server_url,created_at FROM bp_dns WHERE reseller_id=? ORDER BY created_at,id').bind(resellerId).all()).results, limit: 3 });
    if ((!id && method === 'POST') || (id && method === 'PUT')) {
      const b = await readBody(request);
      const title = text(b.title), server = url(b.url, env.ALLOW_HTTP_DNS === 'true');
      if (id && !await env.DB.prepare('SELECT id FROM bp_dns WHERE id=? AND reseller_id=?').bind(id, resellerId).first()) fail(404, 'DNS no encontrado.');
      const target = id || crypto.randomUUID();
      const stmt = id ? env.DB.prepare('UPDATE bp_dns SET title=?,server_url=? WHERE id=? AND reseller_id=?').bind(title,server,id,resellerId)
        : env.DB.prepare('INSERT INTO bp_dns(id,reseller_id,title,server_url) VALUES(?,?,?,?)').bind(target,resellerId,title,server);
      await batch(env,[stmt,audit(env,account,resellerId,id?'dns.update':'dns.create',target)]);
      return json({ ok: true, id: target }, id ? 200 : 201);
    }
    if (id && method === 'DELETE') {
      if (!await env.DB.prepare('SELECT id FROM bp_dns WHERE id=? AND reseller_id=?').bind(id,resellerId).first()) fail(404, 'DNS no encontrado.');
      await batch(env,[env.DB.prepare('DELETE FROM bp_dns WHERE id=? AND reseller_id=?').bind(id,resellerId),audit(env,account,resellerId,'dns.delete',id)]);
      return json({ ok: true });
    }
  }
  if (kind === 'ads') {
    if (!id && method === 'GET') return json({ items: (await env.DB.prepare('SELECT id,title,mime_type,byte_size,created_at FROM bp_ads WHERE reseller_id=? ORDER BY created_at,id').bind(resellerId).all()).results, limit: 8, max_image_bytes: MAX_IMAGE, uploads_enabled: env.ADS_STORAGE_ENABLED === 'true' });
    if (!id && method === 'POST') {
      if (env.ADS_STORAGE_ENABLED !== 'true') fail(503, 'La subida de imágenes todavía no está activada.');
      const title = text(u.searchParams.get('title'));
      const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const bytes = await readBytes(request,MAX_IMAGE);
      if (!validImage(bytes,type)) fail(400, 'Imagen inválida. Usa JPG, PNG o WebP.');
      const target = crypto.randomUUID();
      await batch(env,[env.DB.prepare('INSERT INTO bp_ads(id,reseller_id,title,mime_type,image,byte_size) VALUES(?,?,?,?,?,?)').bind(target,resellerId,title,type,bytes.buffer,bytes.length),audit(env,account,resellerId,'ads.create',target)]);
      return json({ ok: true, id: target },201);
    }
    if (id && method === 'GET') {
      const ad = await env.DB.prepare('SELECT image,mime_type FROM bp_ads WHERE id=? AND reseller_id=?').bind(id,resellerId).first();
      if (!ad) fail(404, 'Anuncio no encontrado.');
      return new Response(ad.image instanceof ArrayBuffer ? ad.image : new Uint8Array(ad.image),{ headers:{ 'content-type':ad.mime_type,'cache-control':'private, no-store','x-content-type-options':'nosniff' } });
    }
    if (id && method === 'DELETE') {
      if (!await env.DB.prepare('SELECT id FROM bp_ads WHERE id=? AND reseller_id=?').bind(id,resellerId).first()) fail(404,'Anuncio no encontrado.');
      await batch(env,[env.DB.prepare('DELETE FROM bp_ads WHERE id=? AND reseller_id=?').bind(id,resellerId),audit(env,account,resellerId,'ads.delete',id)]);
      return json({ ok: true });
    }
  }
  fail(405,'Método no permitido.');
}
