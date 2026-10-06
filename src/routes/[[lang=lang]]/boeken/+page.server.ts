import { redirect } from '@sveltejs/kit';
import { stepPath } from '$lib/server/booking-draft';
import type { PageServerLoad } from './$types';

/** /boeken (deep links like /boeken?dienst=snoeiwerken) → first step, keeping the query. */
export const load: PageServerLoad = async ({ locals, url }) => {
	redirect(307, stepPath('dienst', locals.locale, url.search));
};
