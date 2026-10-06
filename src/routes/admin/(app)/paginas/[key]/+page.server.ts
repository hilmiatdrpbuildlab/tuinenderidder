import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/permissions';
import { getPageForEdit, isPageKey, pageFromForm, savePage, validatePage } from '$lib/server/admin/content-pages';
import { saveInlineAltTexts } from '$lib/server/admin/content';
import { PAGE_SECTIONS } from '$lib/components/admin/content/page-fields';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'content');
	if (!isPageKey(params.key)) error(404, 'Pagina niet gevonden.');
	const page = await getPageForEdit(params.key);
	return {
		title: page.label,
		crumbs: [{ href: '/admin/paginas', label: "Pagina's" }],
		page
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		requireRole(locals, 'content');
		if (!isPageKey(params.key)) error(404, 'Pagina niet gevonden.');
		const fd = await request.formData();
		const values = pageFromForm(params.key, fd);
		const imageIds = PAGE_SECTIONS[params.key]
			.flatMap((s) => s.shared ?? [])
			.filter((f) => f.type === 'image')
			.map((f) => values.shared[f.name] as number | null);
		await saveInlineAltTexts(fd, imageIds);
		const errors = validatePage(params.key, values);
		if (Object.keys(errors).length) return fail(400, { values, errors, message: 'Controleer de gemarkeerde velden.' });
		await savePage(params.key, values);
		return { message: 'Pagina opgeslagen.', values: null, errors: null };
	}
};
