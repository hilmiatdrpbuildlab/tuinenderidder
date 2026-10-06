import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { createUser, emailTaken, listUsers } from '$lib/server/admin/users';
import { createSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

type FieldErrors = Record<string, string[] | undefined>;

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'users');
	return { title: 'Gebruikers', users: await listUsers(), meId: user.id };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireRole(locals, 'users');
		const form = Object.fromEntries(await request.formData());
		const values = {
			name: String(form.name ?? ''),
			email: String(form.email ?? ''),
			role: String(form.role ?? '')
		};
		const parsed = createSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, {
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors as FieldErrors,
				values
			});
		}
		if (await emailTaken(parsed.data.email)) {
			return fail(400, {
				message: 'Dit e-mailadres is al in gebruik.',
				errors: { email: ['Dit e-mailadres is al in gebruik.'] } as FieldErrors,
				values
			});
		}
		await createUser(parsed.data);
		return { message: `Gebruiker ${parsed.data.name} aangemaakt.`, created: true };
	}
};
