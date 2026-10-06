import { error, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { deleteProject, getProjectForEdit, parseId, serviceOptions } from '$lib/server/admin/content';
import { saveProjectAction } from '../project-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'content');
	const id = parseId(params.id);
	const project = id ? await getProjectForEdit(id) : null;
	if (!project) error(404, 'Realisatie niet gevonden.');
	return {
		title: project.values.nl.title || project.values.slug,
		crumbs: [{ href: '/admin/realisaties', label: 'Realisaties' }],
		services: await serviceOptions(),
		project
	};
};

export const actions: Actions = {
	save: (event) => {
		const id = parseId(event.params.id);
		if (!id) error(404, 'Realisatie niet gevonden.');
		return saveProjectAction(event, id);
	},
	delete: async ({ locals, params }) => {
		requireRole(locals, 'content');
		const id = parseId(params.id);
		if (!id) error(404, 'Realisatie niet gevonden.');
		await deleteProject(id);
		redirect(303, '/admin/realisaties?verwijderd=1');
	}
};
