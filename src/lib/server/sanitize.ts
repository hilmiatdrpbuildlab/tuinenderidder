/**
 * Allow-list HTML sanitizer for CMS rich text (bold, italic, links, lists, H2/H3, quotes).
 * Everything else is dropped; text content is kept. Runs on save, so pages render with {@html}.
 */
const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math']);

export function sanitizeHtml(input: string): string {
	let html = input.replace(/<!--[\s\S]*?-->/g, '');
	for (const tag of DROP_WITH_CONTENT) {
		html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), '');
		html = html.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
	}
	html = html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag: string, attrs: string) => {
		const tag = rawTag.toLowerCase();
		const closing = match.startsWith('</');
		if (tag === 'b') return closing ? '</strong>' : '<strong>';
		if (tag === 'i') return closing ? '</em>' : '<em>';
		if (tag === 'div') return closing ? '</p>' : '<p>';
		if (!ALLOWED.has(tag)) return '';
		if (closing) return `</${tag}>`;
		if (tag === 'br') return '<br>';
		if (tag === 'a') {
			const href = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
			const url = (href?.[2] ?? href?.[3] ?? href?.[4] ?? '').trim();
			if (!/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return '<a>';
			const external = /^https?:/i.test(url);
			return `<a href="${url.replace(/"/g, '&quot;')}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>`;
		}
		return `<${tag}>`;
	});
	return html.replace(/<p>\s*<\/p>/g, '').trim();
}

/** Plain text → minimal paragraphs (used when importing plain copy). */
export function textToHtml(text: string) {
	return text
		.split(/\n{2,}/)
		.map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
		.join('');
}
