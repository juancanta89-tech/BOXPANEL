export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
export const fail = (status, message) => { throw new HttpError(status, message); };
export function text(value, max = 100, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, 'Revisa los campos obligatorios y su longitud.');
  return value.trim();
}
export function url(value, allowHttp = false) {
  try {
    const u = new URL(text(value, 1500));
    if (!(allowHttp ? ['http:', 'https:'] : ['https:']).includes(u.protocol) || u.username || u.password) throw Error();
    return u.href;
  } catch { fail(400, allowHttp ? 'Usa una dirección HTTP o HTTPS sin credenciales.' : 'Usa una dirección HTTPS sin credenciales.'); }
}
export async function readBody(request, limit = 12000) {
  const bytes = await readBytes(request, limit);
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); if (!data || Array.isArray(data) || typeof data !== 'object') throw Error(); return data; }
  catch { fail(400, 'JSON inválido.'); }
}
export async function readBytes(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) fail(413, 'Archivo o solicitud demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > limit) { await reader.cancel(); fail(413, 'Archivo o solicitud demasiado grande.'); } chunks.push(value);
  }
  const out = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; } return out;
}
export function audit(env, account, resellerId, action, targetId, details = '') {
  return env.DB.prepare('INSERT INTO bp_audit_events(id,actor_id,actor_role,reseller_id,action,target_id,details) VALUES(?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), account.id, account.role, resellerId, action, targetId, details);
}
export async function batch(env, statements) {
  try { return await env.DB.batch(statements); }
  catch (e) {
    const message = String(e?.message || '');
    if (/quota|limit|used_bytes|UNIQUE constraint/i.test(message)) fail(409, /UNIQUE/.test(message) ? 'Ese usuario o identidad ya existe.' : 'Se alcanzó el límite permitido.');
    throw e;
  }
}
