import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/permissions';
import { intentOf, projectFromForm, projectPublishBlockers, saveInlineAltTexts, saveProject } from '$lib/server/admin/content';

/** Shared save action for /admin/realisaties/nieuw and /admin/realisaties/[id]. */
export async function saveProjectAction(event: RequestEvent, id: number | null) {
	requireRole(event.locals, 'content');
	const fd = await event.request.formData();
	const values = projectFromForm(fd);
	const intent = intentOf(fd);
	await saveInlineAltTexts(fd, [values.coverMediaId, ...values.gallery.map((g) => g.mediaId)]);

	let willBePublished = intent === 'publish';
	if (id && intent === 'save') {
		const [cur] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, id));
		willBePublished = cur?.status === 'published';
	}
	if (willBePublished) {
		const blockers = await projectPublishBlockers(values);
		if (blockers.length)
			return fail(400, {
				values,
				errors: { publish: blockers.join(' '), ...(values.coverMediaId ? {} : { coverMediaId: 'Kies een omslagfoto om te publiceren.' }) },
				message: `Publiceren kan nog niet: ${blockers.join(' ')}`
			});
	}

	const result = await saveProject(id, values, intent);
	if (!result.ok) return fail(400, { values, errors: result.errors, message: 'Controleer de gemarkeerde velden.' });
	if (!id) redirect(303, `/admin/realisaties/${result.id}?saved=1`);
	const message =
		intent === 'publish' ? 'Realisatie gepubliceerd — staat nu op de website.' : intent === 'unpublish' ? 'Realisatie teruggezet naar concept.' : 'Wijzigingen opgeslagen.';
	return { message, values: null, errors: null };
}
