import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { createSession, destroyUserSessions } from '$lib/server/auth';
import { getUser, setPassword, updateUser } from '$lib/server/admin/users';
import { passwordSchema, updateSchema } from '../schema';
import type { Actions, PageServerLoad } from './$types';

function parseId(raw: string) {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Gebruiker niet gevonden.');
	return id;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireRole(locals, 'users');
	const target = await getUser(parseId(params.id));
	if (!target) error(404, 'Gebruiker niet gevonden.');
	return {
		title: target.name,
		crumbs: [{ href: '/admin/gebruikers', label: 'Gebruikers' }],
		target,
		isMe: target.id === user.id
	};
};

const resetSchema = z
	.object({ password: passwordSchema, repeat: z.string() })
	.refine((v) => v.password === v.repeat, { path: ['repeat'], message: 'De wachtwoorden komen niet overeen.' });

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireRole(locals, 'users');
		const id = parseId(params.id);
		const form = await request.formData();
		const raw = {
			name: String(form.get('name') ?? ''),
			role: String(form.get('role') ?? ''),
			isActive: form.get('isActive') === 'on'
		};
		const parsed = updateSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				form: 'update' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors,
				values: raw
			});
		}
		const result = await updateUser(user.id, id, parsed.data);
		if (!result.ok) {
			return fail(400, {
				form: 'update' as const,
				message: result.message,
				errors: (result.field ? { [result.field]: [result.message] } : {}) as Record<string, string[] | undefined>,
				values: raw
			});
		}
		return { form: 'update' as const, message: 'Gebruiker bijgewerkt.' };
	},

	password: async ({ locals, params, request, cookies }) => {
		const user = requireRole(locals, 'users');
		const id = parseId(params.id);
		const target = await getUser(id);
		if (!target) error(404, 'Gebruiker niet gevonden.');
		const form = Object.fromEntries(await request.formData());
		const parsed = resetSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, {
				form: 'password' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}
		await setPassword(id, parsed.data.password);
		await destroyUserSessions(id);
		// Resetting your own password here keeps you signed in on this device.
		if (id === user.id) await createSession(id, cookies);
		return {
			form: 'password' as const,
			message: `Nieuw wachtwoord ingesteld voor ${target.name}. Alle sessies van deze gebruiker zijn afgemeld.`
		};
	}
};
