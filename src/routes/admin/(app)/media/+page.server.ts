import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { MAX_UPLOAD_BYTES, putObject } from '$lib/server/storage';
import { createMediaFromBuffer, newStorageKey } from '$lib/server/media';
import {
	deleteMedia,
	getMediaDetail,
	getMediaUsages,
	listFolders,
	listMediaItems,
	normalizeFolder,
	replaceMediaFile,
	sniffImageMime,
	updateMediaMeta
} from '$lib/server/admin/content-media';
import { parseId } from '$lib/server/admin/content';
import type { Actions, PageServerLoad } from './$types';

const MAX_BATCH = 30;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'media');
	const id = parseId(url.searchParams.get('id') ?? '');
	const [items, folders, detail] = await Promise.all([listMediaItems(), listFolders(), id ? getMediaDetail(id) : null]);
	return { title: 'Mediabibliotheek', items, folders, detail };
};

const num = (v: FormDataEntryValue | null) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
};

export const actions: Actions = {
	/** No-JS fallback: plain multipart upload, processed server-side. */
	upload: async ({ locals, request }) => {
		const user = requireRole(locals, 'media');
		const fd = await request.formData();
		const folder = normalizeFolder(String(fd.get('folder') ?? 'library'));
		const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
		if (!files.length) return fail(400, { message: 'Kies minstens één foto.' });
		if (files.length > MAX_BATCH) return fail(400, { message: `Maximaal ${MAX_BATCH} foto’s per keer.` });
		const skipped: string[] = [];
		let ok = 0;
		for (const file of files) {
			if (file.size > MAX_UPLOAD_BYTES) {
				skipped.push(`${file.name} (groter dan 25 MB)`);
				continue;
			}
			const body = new Uint8Array(await file.arrayBuffer());
			const mime = sniffImageMime(body);
			if (!mime) {
				skipped.push(`${file.name} (geen JPEG, PNG of WebP)`);
				continue;
			}
			try {
				await createMediaFromBuffer(body, { mime, filename: file.name.replace(/[\/]/g, '_').slice(0, 200), folder, userId: user.id });
				ok++;
			} catch (e) {
				console.error('[media] upload failed', e);
				skipped.push(`${file.name} (kon niet verwerkt worden)`);
			}
		}
		if (!ok) return fail(400, { message: `Niets geüpload: ${skipped.join(', ')}` });
		return { message: `${ok} foto('s) geüpload${skipped.length ? `; overgeslagen: ${skipped.join(', ')}` : ''}. Vergeet de alt-teksten niet.` };
	},

	update: async ({ locals, request }) => {
		requireRole(locals, 'media');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		if (!id) return fail(400, { message: 'Onbekende afbeelding.' });
		const altNl = String(fd.get('altNl') ?? '').trim();
		const altEn = String(fd.get('altEn') ?? '').trim();
		if (altNl.length > 250 || altEn.length > 250) return fail(400, { message: 'Alt-tekst is te lang (max. 250 tekens).' });
		const row = await updateMediaMeta(id, {
			altNl,
			altEn,
			focalX: num(fd.get('focalX')),
			focalY: num(fd.get('focalY')),
			folder: fd.has('folder') ? String(fd.get('folder')) : undefined
		});
		if (!row) return fail(404, { message: 'Afbeelding niet gevonden.' });
		return { message: altNl ? 'Afbeelding opgeslagen.' : 'Opgeslagen — let op: de Nederlandse alt-tekst ontbreekt nog.' };
	},

	/** No-JS fallback for "Bestand vervangen" (JS uses the presigned flow). */
	replace: async ({ locals, request }) => {
		requireRole(locals, 'media');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		const file = fd.get('file');
		if (!id || !(file instanceof File) || file.size === 0) return fail(400, { message: 'Kies een bestand.' });
		if (file.size > MAX_UPLOAD_BYTES) return fail(400, { message: 'Bestand is groter dan 25 MB.' });
		const detail = await getMediaDetail(id);
		if (!detail) return fail(404, { message: 'Afbeelding niet gevonden.' });
		const body = new Uint8Array(await file.arrayBuffer());
		const mime = sniffImageMime(body);
		if (!mime) return fail(415, { message: 'Alleen JPEG, PNG of WebP.' });
		const key = newStorageKey(detail.item.folder, mime);
		await putObject(key, body);
		try {
			await replaceMediaFile(id, key, mime, file.name.replace(/[\/]/g, '_').slice(0, 200));
		} catch (e) {
			console.error('[media] replace failed', e);
			return fail(422, { message: 'De afbeelding kon niet verwerkt worden.' });
		}
		return { message: 'Bestand vervangen. Alle pagina’s tonen nu de nieuwe foto.' };
	},

	delete: async ({ locals, request }) => {
		requireRole(locals, 'media');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		if (!id) return fail(400, { message: 'Onbekende afbeelding.' });
		const result = await deleteMedia(id, fd.get('force') === 'on' || fd.get('force') === '1');
		if (result.ok) return { message: 'Afbeelding verwijderd.', deleted: id };
		if (result.reason === 'booking') return fail(409, { message: 'Deze foto hoort bij een boeking en kan hier niet verwijderd worden.' });
		if (result.reason === 'in_use')
			return fail(409, { message: `Wordt gebruikt op ${result.usages.length} plaats(en). Vink “Toch verwijderen” aan om door te gaan.`, needsForce: id });
		return fail(404, { message: 'Afbeelding niet gevonden.' });
	},

	bulk: async ({ locals, request }) => {
		requireRole(locals, 'media');
		const fd = await request.formData();
		const ids = fd
			.getAll('ids')
			.map((x) => parseId(String(x)))
			.filter((x): x is number => x !== null);
		if (!ids.length) return fail(400, { message: 'Niets geselecteerd.' });
		const op = String(fd.get('op') ?? '');
		if (op === 'folder') {
			const folder = normalizeFolder(String(fd.get('folder') ?? ''));
			for (const id of ids) await updateMediaMeta(id, { folder });
			return { message: `${ids.length} afbeelding(en) verplaatst naar “${folder}”.` };
		}
		if (op === 'delete') {
			const usages = await getMediaUsages(ids);
			let deleted = 0;
			for (const id of ids) {
				if (usages.get(id)?.length) continue;
				const r = await deleteMedia(id, false);
				if (r.ok) deleted++;
			}
			const kept = ids.length - deleted;
			return { message: `${deleted} verwijderd${kept ? `, ${kept} overgeslagen omdat ze nog gebruikt worden` : ''}.` };
		}
		return fail(400, { message: 'Onbekende actie.' });
	}
};
