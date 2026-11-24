import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const ref = /(?:\/assets\/|\.\/|assets\/)([\w.-]+\.(?:js|css))/g;

describe('legacy app', () => {
  it('references only files that exist', () => {
    const html = readFileSync('legacy/app.html', 'utf8');
    expect(html).toContain('/assets/index-uS2jb-ZE.js');
    const todo = [...html.matchAll(ref)].map((m) => m[1]);
    const seen = new Set<string>();
    while (todo.length) {
      const f = todo.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const p = `legacy/assets/${f}`;
      expect(existsSync(p), p).toBe(true);
      for (const m of readFileSync(p, 'utf8').matchAll(ref)) todo.push(m[1]);
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
