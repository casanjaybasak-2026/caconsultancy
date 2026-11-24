import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import worker from '../../worker/index';
import { insertPendingBooking, markPaid, insertEnquiry } from '../../worker/db';
import { freshEnv, mockFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

const b64url = (b: ArrayBuffer | Uint8Array | string) =>
  Buffer.from(typeof b === 'string' ? b : b instanceof Uint8Array ? b : new Uint8Array(b)).toString('base64url');

let keys: CryptoKeyPair;
let jwk: JsonWebKey;
beforeAll(async () => {
  keys = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1' } as any;
});

async function token(over: Record<string, unknown> = {}, signer?: CryptoKey) {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ aud: ['aud123'], iss: 'https://skb.cloudflareaccess.com', email: 'owner@test.in', exp: Math.floor(Date.now() / 1000) + 600, ...over }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer ?? keys.privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

const get = (e: any, path: string, jwt?: string) =>
  worker.fetch(new Request('https://site.test' + path, { headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} }), e);

const certs = () => mockFetch({ 'skb.cloudflareaccess.com/cdn-cgi/access/certs': () => ({ keys: [jwk] }) });
const input = { name: 'Asha <Roy>', email: 'asha@example.com', phone: '+919830012345', client_type: 'Individual', service: '=HYPERLINK("x")', preferred_date: null, preferred_time: null, communication_method: 'Video Call', description: null };

describe('/manage', () => {
  it('403 without an Access token', async () => {
    certs();
    const res = await get(freshEnv(), '/manage');
    expect(res.status).toBe(403);
  });
  it('403 when Access is not configured (fails closed)', async () => {
    certs();
    const res = await get({ ...freshEnv(), ACCESS_AUD: '' }, '/manage', await token());
    expect(res.status).toBe(403);
  });
  it('403 for wrong audience, expired token or a token signed by another key', async () => {
    certs();
    const e = freshEnv();
    expect((await get(e, '/manage', await token({ aud: ['other'] }))).status).toBe(403);
    expect((await get(e, '/manage', await token({ exp: 1 }))).status).toBe(403);
    const other = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    expect((await get(e, '/manage', await token({}, other.privateKey))).status).toBe(403);
  });
  it('lists bookings (escaped) for a valid token, noindex and no-store', async () => {
    certs();
    const e = freshEnv();
    await insertPendingBooking(e, input, 'order_1', 100000);
    await markPaid(e, 'order_1', 'pay_1');
    const res = await get(e, '/manage', await token());
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const html = await res.text();
    expect(html).toContain('Asha &lt;Roy&gt;');
    expect(html).toContain('pay_1');
    expect(html).toContain('owner@test.in');
  });
  it('CSV export neutralises spreadsheet formulas; enquiries view works', async () => {
    certs();
    const e = freshEnv();
    await insertPendingBooking(e, input, 'order_1', 100000);
    await insertEnquiry(e, { name: 'Bina', email: 'b@x.in', phone: '9830012345', service: null, message: 'Hi there' });
    const csv = await (await get(e, '/manage?format=csv', await token())).text();
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    const enq = await (await get(e, '/manage?view=enquiries', await token())).text();
    expect(enq).toContain('Hi there');
  });
});
