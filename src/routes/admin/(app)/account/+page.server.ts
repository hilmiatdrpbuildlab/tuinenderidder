import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { createSession, destroyUserSessions, verifyPassword } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';
import { getPasswordHash, setPassword, updateName } from '$lib/server/admin/users';
import { ROLE_LABELS } from '$lib/domain';
import type { Actions, PageServerLoad } from './$types';

const nameSchema = z.object({
	name: z.string().trim().min(2, 'Vul je naam in (minstens 2 tekens).').max(80, 'Maximaal 80 tekens.')
});

const passwordSchema = z
	.object({
		current: z.string().min(1, 'Vul je huidige wachtwoord in.'),
		password: z.string().min(10, 'Je nieuwe wachtwoord moet minstens 10 tekens lang zijn.').max(200, 'Maximaal 200 tekens.'),
		repeat: z.string()
	})
	.refine((v) => v.password === v.repeat, { path: ['repeat'], message: 'De wachtwoorden komen niet overeen.' })
	.refine((v) => v.password !== v.current, { path: ['password'], message: 'Kies een ander wachtwoord dan je huidige.' });

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'dashboard');
	return { title: 'Mijn account', me: { ...user, roleLabel: ROLE_LABELS[user.role] } };
};

export const actions: Actions = {
	name: async ({ locals, request }) => {
		const user = requireRole(locals, 'dashboard');
		const values = { name: String((await request.formData()).get('name') ?? '') };
		const parsed = nameSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				form: 'name' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors,
				values
			});
		}
		await updateName(user.id, parsed.data.name);
		return { form: 'name' as const, message: 'Je naam is bijgewerkt.' };
	},

	password: async ({ locals, request, cookies }) => {
		const user = requireRole(locals, 'dashboard');
		const parsed = passwordSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, {
				form: 'password' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors
			});
		}
		const limit = rateLimit(`account-pw:${user.id}`, 8, 15 * 60_000);
		if (!limit.ok) {
			return fail(429, {
				form: 'password' as const,
				message: `Te veel pogingen. Probeer het over ${Math.ceil(limit.retryAfter / 60)} minuten opnieuw.`,
				errors: {} as Record<string, string[] | undefined>
			});
		}
		const hash = await getPasswordHash(user.id);
		if (!hash || !(await verifyPassword(parsed.data.current, hash))) {
			return fail(400, {
				form: 'password' as const,
				message: 'Je huidige wachtwoord klopt niet.',
				errors: { current: ['Je huidige wachtwoord klopt niet.'] } as Record<string, string[] | undefined>
			});
		}
		await setPassword(user.id, parsed.data.password);
		// Sign out every other device, then start a fresh session here so you stay logged in.
		await destroyUserSessions(user.id);
		await createSession(user.id, cookies);
		return { form: 'password' as const, message: 'Je wachtwoord is gewijzigd. Andere apparaten zijn afgemeld.' };
	}
};
