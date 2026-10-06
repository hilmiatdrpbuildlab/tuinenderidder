import { getProjects } from '$lib/server/content/projects';
import { getServices } from '$lib/server/content/services';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const locale = locals.locale;
	const [services, all] = await Promise.all([getServices(locale), getProjects(locale)]);

	// Only offer chips for services that actually have published projects.
	const counts = new Map<string, number>();
	for (const p of all) if (p.service) counts.set(p.service.slug, (counts.get(p.service.slug) ?? 0) + 1);
	const filters = services.filter((s) => counts.has(s.slug)).map((s) => ({ slug: s.slug, title: s.title, count: counts.get(s.slug) ?? 0 }));

	const requested = url.searchParams.get('dienst');
	const active = services.find((s) => s.slug === requested) ?? null;
	const projects = active ? all.filter((p) => p.service?.slug === active.slug) : all;

	return {
		filters,
		total: all.length,
		active: active ? { slug: active.slug, title: active.title } : null,
		projects
	};
};
