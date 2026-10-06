import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { listTestimonials, parseId, setTestimonialVisible } from '$lib/server/admin/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return { title: 'Getuigenissen', testimonials: await listTestimonials() };
};

export const actions: Actions = {
	visible: async ({ locals, request }) => {
		requireRole(locals, 'content');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		if (!id) return fail(400, { message: 'Onbekende getuigenis.' });
		const visible = fd.get('visible') === '1';
		await setTestimonialVisible(id, visible);
		return { message: visible ? 'Getuigenis zichtbaar op de website.' : 'Getuigenis verborgen.' };
	}
};
