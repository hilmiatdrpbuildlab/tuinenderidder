import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { deleteMedia, getMediaDetail, updateMediaMeta, toMediaItem } from '$lib/server/admin/content-media';
import { readJson, requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

function idOf(params: { id: string }) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Niet gevonden.');
	return id;
}

export const GET: RequestHandler = async (event) => {
	requireApiRole(event, 'media');
	const detail = await getMediaDetail(idOf(event.params));
	if (!detail) error(404, 'Niet gevonden.');
	return json(detail);
};

const patchSchema = z.object({
	altNl: z.string().max(250).optional(),
	altEn: z.string().max(250).optional(),
	focalX: z.number().min(0).max(1).optional(),
	focalY: z.number().min(0).max(1).optional(),
	folder: z.string().max(120).optional()
});

export const PATCH: RequestHandler = async (event) => {
	requireApiRole(event, 'media');
	const parsed = patchSchema.safeParse(await readJson(event.request));
	if (!parsed.success) error(400, 'Ongeldige aanvraag.');
	const row = await updateMediaMeta(idOf(event.params), parsed.data);
	if (!row) error(404, 'Niet gevonden.');
	return json(toMediaItem(row));
};

export const DELETE: RequestHandler = async (event) => {
	requireApiRole(event, 'media');
	const force = event.url.searchParams.get('force') === '1';
	const result = await deleteMedia(idOf(event.params), force);
	if (result.ok) return json({ ok: true });
	if (result.reason === 'not_found') error(404, 'Niet gevonden.');
	return json(
		{
			ok: false,
			reason: result.reason,
			usages: result.usages,
			message:
				result.reason === 'booking'
					? 'Deze foto hoort bij een boeking en kan hier niet verwijderd worden.'
					: `Deze afbeelding wordt gebruikt op ${result.usages.length} plaats(en).`
		},
		{ status: 409 }
	);
};
