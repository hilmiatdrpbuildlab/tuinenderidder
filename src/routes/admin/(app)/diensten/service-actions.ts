import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { intentOf, saveInlineAltTexts, saveService, serviceFromForm } from '$lib/server/admin/content';

/** Shared save action for /admin/diensten/nieuw and /admin/diensten/[id]. */
export async function saveServiceAction(event: RequestEvent, id: number | null) {
	requireRole(event.locals, 'content');
	const fd = await event.request.formData();
	const values = serviceFromForm(fd);
	const intent = intentOf(fd);
	await saveInlineAltTexts(fd, [values.coverMediaId]);
	const result = await saveService(id, values, intent);
	if (!result.ok) return fail(400, { values, errors: result.errors, message: 'Controleer de gemarkeerde velden.' });
	const message =
		intent === 'publish' ? 'Dienst gepubliceerd.' : intent === 'unpublish' ? 'Dienst teruggezet naar concept.' : 'Wijzigingen opgeslagen.';
	if (!id) redirect(303, `/admin/diensten/${result.id}?saved=1`);
	return { message, values: null, errors: null };
}
