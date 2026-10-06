import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { deleteMessage, listMessages, messageCounts, setMessageRead } from '$lib/server/admin/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'messages');
	const filter = url.searchParams.get('filter') === 'ongelezen' ? 'unread' : 'all';
	const [messages, counts] = await Promise.all([listMessages(filter), messageCounts()]);
	return { title: 'Berichten', filter, messages, counts };
};

const idSchema = z.coerce.number().int().positive();
const toggleSchema = z.object({ id: idSchema, read: z.enum(['0', '1']) });

export const actions: Actions = {
	toggle: async ({ locals, request }) => {
		requireRole(locals, 'messages');
		const parsed = toggleSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: 'Ongeldig bericht.' });
		const read = parsed.data.read === '1';
		if (!(await setMessageRead(parsed.data.id, read))) return fail(404, { message: 'Bericht niet gevonden.' });
		return { message: read ? 'Gemarkeerd als gelezen' : 'Gemarkeerd als ongelezen' };
	},
	delete: async ({ locals, request }) => {
		requireRole(locals, 'messages');
		const parsed = idSchema.safeParse((await request.formData()).get('id'));
		if (!parsed.success) return fail(400, { message: 'Ongeldig bericht.' });
		if (!(await deleteMessage(parsed.data))) return fail(404, { message: 'Bericht niet gevonden.' });
		return { message: 'Bericht verwijderd' };
	}
};
