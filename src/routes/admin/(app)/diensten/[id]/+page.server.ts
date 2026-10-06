import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { deleteService, getServiceForEdit, parseId } from '$lib/server/admin/content';
import { saveServiceAction } from '../service-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'content');
	const id = parseId(params.id);
	const service = id ? await getServiceForEdit(id) : null;
	if (!service) error(404, 'Dienst niet gevonden.');
	return {
		title: service.values.nl.title || service.values.slug,
		crumbs: [{ href: '/admin/diensten', label: 'Diensten' }],
		service
	};
};

export const actions: Actions = {
	save: (event) => {
		const id = parseId(event.params.id);
		if (!id) error(404, 'Dienst niet gevonden.');
		return saveServiceAction(event, id);
	},
	delete: async ({ locals, params }) => {
		requireRole(locals, 'content');
		const id = parseId(params.id);
		if (!id) error(404, 'Dienst niet gevonden.');
		const result = await deleteService(id);
		if (!result.ok)
			return fail(409, {
				message: `Deze dienst zit in ${result.bookings} boeking(en) en kan niet verwijderd worden. Zet hem op concept om hem te verbergen.`,
				values: null,
				errors: null
			});
		redirect(303, '/admin/diensten?verwijderd=1');
	}
};
