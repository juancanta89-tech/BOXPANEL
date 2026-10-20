import { fail } from './common.js';
const keyCache = new Map();
function decode(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export async function verifyAccess(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const domain = env.ACCESS_TEAM_DOMAIN || '';
  if (!token || !/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(domain) || !env.ACCESS_AUD || env.ACCESS_AUD.startsWith('REPLACE_')) return null;
  try {
    const parts = token.split('.'); if (parts.length !== 3) return null;
    const [head, body, signature] = parts;
    const h = JSON.parse(new TextDecoder().decode(decode(head)));
    const p = JSON.parse(new TextDecoder().decode(decode(body)));
    const now = Date.now() / 1000, issuer = 'https://' + domain;
    if (h.alg !== 'RS256' || typeof h.kid !== 'string' || !h.kid || h.kid.length > 200 || p.iss !== issuer ||
        !(p.aud === env.ACCESS_AUD || (Array.isArray(p.aud) && p.aud.includes(env.ACCESS_AUD))) ||
        !Number.isFinite(p.exp) || p.exp <= now || !Number.isFinite(p.iat) || p.iat > now + 60 ||
        (p.nbf !== undefined && (!Number.isFinite(p.nbf) || p.nbf > now + 30)) || typeof p.sub !== 'string' || !p.sub || p.sub.length > 256) return null;
    let cached = keyCache.get(issuer);
    if (!cached || cached.expires <= Date.now()) {
      const response = await fetch(issuer + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(8000), redirect: 'manual' });
      if (!response.ok) return null;
      const jwks = await response.json(); if (!Array.isArray(jwks.keys)) return null;
      cached = { keys: jwks.keys, expires: Date.now() + 300000 };
      // A Worker has a single configured issuer; avoid unbounded cache growth.
      keyCache.clear(); keyCache.set(issuer, cached);
    }
    const jwk = cached.keys.find(k => k.kid === h.kid && k.kty === 'RSA'); if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(signature), new TextEncoder().encode(head + '.' + body)) ? p : null;
  } catch { return null; }
}
export async function authenticate(request, env) {
  const claims = await verifyAccess(request, env); if (!claims) fail(401, 'Inicia sesión para continuar.');
  const account = await env.DB.prepare('SELECT id,role,reseller_id FROM bp_panel_accounts WHERE access_identity=? AND active=1').bind(claims.sub).first();
  if (!account) fail(403, 'Tu identidad todavía no tiene una cuenta autorizada en BOXPANEL.');
  if (account.role !== 'super_admin' && account.role !== 'reseller') fail(403, 'Cuenta sin permisos.');
  if (account.role === 'reseller') {
    const reseller = await env.DB.prepare('SELECT id,status,display_name FROM bp_resellers WHERE id=?').bind(account.reseller_id).first();
    if (!reseller || reseller.status !== 'active') fail(403, 'Tu cuenta reseller está suspendida.');
    account.display_name = reseller.display_name;
  }
  return account;
}
export async function resellerScope(request, env, account) {
  const requested = new URL(request.url).searchParams.get('reseller_id');
  if (account.role !== 'super_admin' && requested && requested !== account.reseller_id) fail(403, 'No puedes acceder a otro reseller.');
  const id = account.role === 'super_admin' ? requested : account.reseller_id;
  if (!id) fail(400, 'Selecciona un reseller.');
  if (!await env.DB.prepare('SELECT id FROM bp_resellers WHERE id=?').bind(id).first()) fail(404, 'Reseller no encontrado.');
  return id;
}
