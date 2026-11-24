const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** Renders the plain-text/light-markdown article and legal content to safe HTML. */
export function renderText(src: string): string {
  const blocks = src.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split('\n');
      if (/^#{2,3} /.test(b)) {
        const [h, ...rest] = lines;
        const lvl = h.startsWith('### ') ? 3 : 2;
        const head = `<h${lvl}>${inline(h.replace(/^#+ /, ''))}</h${lvl}>`;
        return rest.length ? head + renderText(rest.join('\n')) : head;
      }
      if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
        const ordered = /^\s*\d/.test(lines[0]);
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>`).join('');
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}

export const readingMinutes = (s: string) => Math.max(1, Math.round(s.split(/\s+/).length / 200));
export const plainExcerpt = (s: string, n = 155) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)) + '…';
};
