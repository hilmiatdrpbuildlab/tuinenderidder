import { getCompany } from '$lib/server/settings';
import { getNavServices } from '$lib/server/site';
import type { LayoutServerLoad } from './$types';

/** Shared by the public site and the booking wizard. */
export const load: LayoutServerLoad = async ({ locals }) => {
	const [company, navServices] = await Promise.all([getCompany(), getNavServices(locals.locale)]);
	return { company, navServices };
};
