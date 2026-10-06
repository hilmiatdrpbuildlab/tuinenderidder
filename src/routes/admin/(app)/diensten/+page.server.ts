import { fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { listServices, moveService, parseId, reorderServices, setServiceStatus } from '$lib/server/admin/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return { title: 'Diensten', services: await listServices() };
};

export const actions: Actions = {
	move: async ({ locals, request }) => {
		requireRole(locals, 'content');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		const dir = fd.get('dir') === 'down' ? 'down' : 'up';
		if (!id) return fail(400, { message: 'Onbekende dienst.' });
		await moveService(id, dir);
		return { message: 'Volgorde aangepast.' };
	},
	reorder: async ({ locals, request }) => {
		requireRole(locals, 'content');
		const fd = await request.formData();
		const ids = fd
			.getAll('ids')
			.map((x) => parseId(String(x)))
			.filter((x): x is number => x !== null);
		if (!ids.length) return fail(400, { message: 'Geen volgorde ontvangen.' });
		await reorderServices(ids);
		return { message: 'Volgorde opgeslagen.' };
	},
	status: async ({ locals, request }) => {
		requireRole(locals, 'content');
		const fd = await request.formData();
		const id = parseId(String(fd.get('id') ?? ''));
		const status = fd.get('status') === 'published' ? 'published' : 'draft';
		if (!id) return fail(400, { message: 'Onbekende dienst.' });
		await setServiceStatus(id, status);
		return { message: status === 'published' ? 'Dienst gepubliceerd.' : 'Dienst verborgen (concept).' };
	}
};
