import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, createUploadUrl } from '$lib/server/storage';
import { newStorageKey } from '$lib/server/media';
import { normalizeFolder } from '$lib/server/admin/content-media';
import { readJson, requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

const schema = z.object({
	filename: z.string().trim().min(1).max(200),
	mime: z.enum(ALLOWED_IMAGE_TYPES),
	bytes: z.number().int().positive(),
	folder: z.string().max(120).optional().default('library')
});

/** Step 1 of the upload flow: validate type + size and hand out a short-lived signed PUT URL. */
export const POST: RequestHandler = async (event) => {
	const user = requireApiRole(event, 'media');
	const parsed = schema.safeParse(await readJson(event.request));
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		if (issue?.path[0] === 'mime') error(415, 'Alleen JPEG, PNG of WebP.');
		error(400, 'Ongeldige aanvraag.');
	}
	const { mime, bytes, folder } = parsed.data;
	if (bytes > MAX_UPLOAD_BYTES) error(413, 'Bestand is groter dan 25 MB.');
	const key = newStorageKey(normalizeFolder(folder), mime);
	const { url, expiresInSeconds } = createUploadUrl({ key, mime, maxBytes: MAX_UPLOAD_BYTES, uid: user.id });
	return json({ url, key, expiresInSeconds });
};
