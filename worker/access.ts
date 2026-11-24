import type { Env } from './env';

/** Verifies the Cloudflare Access JWT (RS256) on requests to /manage. Fails closed when not configured. */
const jwksCache = new Map<string, { keys: (JsonWebKey & { kid: string })[]; at: number }>();

const b64urlToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getKeys(team: string, force = false) {
  const hit = jwksCache.get(team);
  if (hit && !force && Date.now() - hit.at < 3600_000) return hit.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Access certs fetch failed ' + res.status);
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  jwksCache.set(team, { keys, at: Date.now() });
  return keys;
}

export async function verifyAccess(req: Request, env: Env): Promise<{ ok: true; email: string } | { ok: false; reason: string }> {
  const team = (env.ACCESS_TEAM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!team || !env.ACCESS_AUD) return { ok: false, reason: 'Access not configured' };
  const token = req.headers.get('cf-access-jwt-assertion');
  if (!token) return { ok: false, reason: 'Missing Access token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'Malformed token' };
  try {
    const header = b64urlJson(parts[0]);
    const payload = b64urlJson(parts[1]);
    if (header.alg !== 'RS256') return { ok: false, reason: 'Bad alg' };
    let jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await getKeys(team, true)).find((k) => k.kid === header.kid);
    if (!jwk) return { ok: false, reason: 'Unknown key' };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return { ok: false, reason: 'Bad signature' };
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return { ok: false, reason: 'Wrong audience' };
    if (payload.iss !== `https://${team}`) return { ok: false, reason: 'Wrong issuer' };
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return { ok: false, reason: 'Expired' };
    return { ok: true, email: String(payload.email ?? '') };
  } catch {
    return { ok: false, reason: 'Invalid token' };
  }
}
