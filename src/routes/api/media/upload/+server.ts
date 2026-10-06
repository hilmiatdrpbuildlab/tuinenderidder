import { error } from '@sveltejs/kit';
import { putObject, verifyUploadToken } from '$lib/server/storage';
import { sniffImageMime } from '$lib/server/admin/content-media';
import { can } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

/**
 * Step 2: the browser PUTs the raw file to the signed URL. In production this request goes
 * straight to object storage; this route is the local stand-in with the same guarantees:
 * signature + expiry, declared type, size limit on the actual body, and file signature check.
 */
export const PUT: RequestHandler = async ({ request, url, locals }) => {
	const claims = verifyUploadToken(url.searchParams.get('token') ?? '');
	if (!claims) error(403, 'Upload-link ongeldig of verlopen.');
	if (!locals.user || locals.user.id !== claims.uid || !can(locals.user.role, 'media')) error(403, 'Geen toegang.');

	const declared = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	if (declared && declared !== claims.mime) error(415, 'Bestandstype komt niet overeen.');

	const length = Number(request.headers.get('content-length') ?? '0');
	if (length > claims.maxBytes) error(413, 'Bestand is groter dan 25 MB.');
	if (!request.body) error(400, 'Leeg bestand.');

	// Stream the body with a hard cap so a lying Content-Length cannot exhaust memory.
	const chunks: Uint8Array[] = [];
	let total = 0;
	const reader = request.body.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > claims.maxBytes) {
			await reader.cancel().catch(() => {});
			error(413, 'Bestand is groter dan 25 MB.');
		}
		chunks.push(value);
	}
	if (total === 0) error(400, 'Leeg bestand.');
	const body = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		body.set(c, offset);
		offset += c.byteLength;
	}

	const sniffed = sniffImageMime(body);
	if (!sniffed || sniffed !== claims.mime) error(415, 'Het bestand is geen geldige JPEG, PNG of WebP.');

	await putObject(claims.key, body);
	return new Response(null, { status: 200, headers: { etag: `"${total}"` } });
};
