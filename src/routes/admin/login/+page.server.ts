import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession, verifyPassword } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

/**
 * CMS login: email + password only. No OTP, magic link or email confirmation — the project is
 * not connected to a mail or SMS service yet. Brute force is limited per IP and per account.
 */

const schema = z.object({
	email: z.string().trim().toLowerCase().email('Vul een geldig e-mailadres in.'),
	password: z.string().min(1, 'Vul je wachtwoord in.')
});

function safeNext(next: string | null) {
	return next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	return { loggedOut: url.searchParams.has('uitgelogd') };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = Object.fromEntries(await request.formData());
		const parsed = schema.safeParse(form);
		const email = typeof form.email === 'string' ? form.email : '';
		if (!parsed.success) {
			return fail(400, { email, errors: z.flattenError(parsed.error).fieldErrors });
		}

		const ip = getClientAddress();
		const byIp = rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
		const byAccount = rateLimit(`login-acc:${parsed.data.email}`, 8, 15 * 60_000);
		if (!byIp.ok || !byAccount.ok) {
			return fail(429, {
				email,
				message: `Te veel pogingen. Probeer het over ${Math.ceil(Math.max(byIp.retryAfter, byAccount.retryAfter) / 60)} minuten opnieuw.`
			});
		}

		const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
		const ok = user && user.isActive && (await verifyPassword(parsed.data.password, user.passwordHash));
		if (!ok) {
			return fail(400, { email, message: 'E-mailadres of wachtwoord klopt niet.' });
		}

		await createSession(user.id, cookies);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
