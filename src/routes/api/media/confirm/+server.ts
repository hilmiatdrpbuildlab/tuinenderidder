import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES, deleteObject, getObject } from '$lib/server/storage';
import { registerUploadedMedia } from '$lib/server/media';
import { isIssuedKey, isKeyRegistered, normalizeFolder, sniffImageMime, toMediaItem } from '$lib/server/admin/content-media';
import { readJson, requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

const schema = z.object({
	key: z.string().min(1).max(300),
	mime: z.enum(ALLOWED_IMAGE_TYPES),
	filename: z.string().trim().min(1).max(200),
	folder: z.string().max(120).optional().default('library'),
	altNl: z.string().max(250).optional(),
	altEn: z.string().max(250).optional()
});

/** Step 3: the object is in storage — strip EXIF, build WebP derivatives + LQIP, insert the media row. */
export const POST: RequestHandler = async (event) => {
	const user = requireApiRole(event, 'media');
	const parsed = schema.safeParse(await readJson(event.request));
	if (!parsed.success) error(400, 'Ongeldige aanvraag.');
	const { key, mime, filename, folder, altNl, altEn } = parsed.data;

	if (!isIssuedKey(key)) error(400, 'Ongeldige sleutel.');
	if (await isKeyRegistered(key)) error(409, 'Dit bestand is al geregistreerd.');
	const head = await getObject(key);
	if (!head) error(404, 'Bestand niet gevonden — upload opnieuw.');
	if (sniffImageMime(head) !== mime) {
		await deleteObject(key);
		error(415, 'Het bestand is geen geldige afbeelding.');
	}

	try {
		const row = await registerUploadedMedia({
			storageKey: key,
			mime,
			filename: filename.replace(/[\\/]/g, '_'),
			folder: normalizeFolder(folder),
			altNl,
			altEn,
			userId: user.id
		});
		return json(toMediaItem(row), { status: 201 });
	} catch (e) {
		console.error('[media] processing failed', e);
		await deleteObject(key);
		error(422, 'De afbeelding kon niet verwerkt worden.');
	}
};
