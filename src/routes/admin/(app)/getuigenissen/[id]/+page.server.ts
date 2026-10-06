import { error, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { deleteTestimonial, getTestimonial, parseId, serviceOptions } from '$lib/server/admin/content';
import { saveTestimonialAction } from '../testimonial-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'content');
	const id = parseId(params.id);
	const testimonial = id ? await getTestimonial(id) : null;
	if (!testimonial) error(404, 'Getuigenis niet gevonden.');
	return {
		title: testimonial.values.authorName,
		crumbs: [{ href: '/admin/getuigenissen', label: 'Getuigenissen' }],
		services: await serviceOptions(),
		testimonial
	};
};

export const actions: Actions = {
	save: (event) => {
		const id = parseId(event.params.id);
		if (!id) error(404, 'Getuigenis niet gevonden.');
		return saveTestimonialAction(event, id);
	},
	delete: async ({ locals, params }) => {
		requireRole(locals, 'content');
		const id = parseId(params.id);
		if (!id) error(404, 'Getuigenis niet gevonden.');
		await deleteTestimonial(id);
		redirect(303, '/admin/getuigenissen?verwijderd=1');
	}
};
