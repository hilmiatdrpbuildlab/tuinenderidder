import { getPage } from '$lib/server/content/pages';
import { getServices } from '$lib/server/content/services';
import { getFeaturedProjects } from '$lib/server/content/projects';
import { getTestimonials } from '$lib/server/content/testimonials';
import { getMediaRefs } from '$lib/server/media';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const locale = locals.locale;
	const [home, services, projects, testimonials] = await Promise.all([
		getPage('home', locale),
		getServices(locale),
		getFeaturedProjects(locale, 5),
		getTestimonials(locale, 6)
	]);
	const media = await getMediaRefs([home.blocks.heroImageId, home.blocks.whyImageId], locale);
	const ref = (id: number | null | undefined) => (id ? (media.get(id) ?? null) : null);

	return {
		heroOverlay: true,
		home,
		heroImage: ref(home.blocks.heroImageId),
		whyImage: ref(home.blocks.whyImageId),
		services,
		projects,
		testimonials
	};
};
