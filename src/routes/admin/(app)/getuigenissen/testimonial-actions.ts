import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { saveTestimonial, testimonialFromForm } from '$lib/server/admin/content';

export async function saveTestimonialAction(event: RequestEvent, id: number | null) {
	requireRole(event.locals, 'content');
	const fd = await event.request.formData();
	const values = testimonialFromForm(fd);
	const result = await saveTestimonial(id, values);
	if (!result.ok) return fail(400, { values, errors: result.errors, message: 'Controleer de gemarkeerde velden.' });
	if (!id) redirect(303, `/admin/getuigenissen/${result.id}?saved=1`);
	return { message: 'Getuigenis opgeslagen.', values: null, errors: null };
}
