import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES, deleteObject, getObject } from '$lib/server/storage';
import { getMediaDetail, isIssuedKey, isKeyRegistered, replaceMediaFile, sniffImageMime } from '$lib/server/admin/content-media';
import { readJson, requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

const schema = z.object({
	key: z.string().min(1).max(300),
	mime: z.enum(ALLOWED_IMAGE_TYPES),
	filename: z.string().trim().min(1).max(200)
});

/** Replace the file behind a media row after a presigned upload; media.id (and every usage) stays. */
export const POST: RequestHandler = async (event) => {
	requireApiRole(event, 'media');
	const id = Number(event.params.id);
	if (!Number.isInteger(id) || !(await getMediaDetail(id))) error(404, 'Niet gevonden.');
	const parsed = schema.safeParse(await readJson(event.request));
	if (!parsed.success) error(400, 'Ongeldige aanvraag.');
	const { key, mime, filename } = parsed.data;
	if (!isIssuedKey(key) || (await isKeyRegistered(key))) error(400, 'Ongeldige sleutel.');
	const body = await getObject(key);
	if (!body) error(404, 'Bestand niet gevonden — upload opnieuw.');
	if (sniffImageMime(body) !== mime) {
		await deleteObject(key);
		error(415, 'Het bestand is geen geldige afbeelding.');
	}
	try {
		await replaceMediaFile(id, key, mime, filename.replace(/[\/]/g, '_'));
	} catch (e) {
		console.error('[media] replace failed', e);
		await deleteObject(key);
		error(422, 'De afbeelding kon niet verwerkt worden.');
	}
	return json(await getMediaDetail(id));
};
