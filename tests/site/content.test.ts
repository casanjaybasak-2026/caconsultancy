import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTable, mergeSiteConfig } from '../../src/lib/content';
import { renderText } from '../../src/lib/text';

afterEach(() => vi.unstubAllGlobals());

describe('content layer', () => {
  it('fetchTable throws on a failed response so the build fails loudly', async () => {
    const f = vi.fn(async () => new Response('x', { status: 404 }));
    vi.stubGlobal('fetch', f);
    await expect(fetchTable('faqs', 'select=*', { url: 'https://sb.test', key: 'k' })).rejects.toThrow(/404/);
    expect(f).toHaveBeenCalledTimes(1); // no pointless retries on client errors
  });
  it('fetchTable retries a transient failure and then succeeds', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (++n === 1 ? new Response('x', { status: 503 }) : new Response('[{"id":1}]'))));
    await expect(fetchTable('faqs', 'select=*', { url: 'https://sb.test', key: 'k' })).resolves.toEqual([{ id: 1 }]);
    expect(n).toBe(2);
  });
  it('empty site_config values keep the fallback', () => {
    const c = mergeSiteConfig([{ key: 'office_address', value: '' }, { key: 'contact_phone', value: ' 98300 ' }]);
    expect(c.office_address).toBe('Kolkata, West Bengal, India');
    expect(c.contact_phone).toBe('98300');
  });
  it('renderText escapes HTML and builds lists/headings', () => {
    const html = renderText('## Title\n\nA <b>x</b>\n\n- one\n- two');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('A &lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
  });
});
