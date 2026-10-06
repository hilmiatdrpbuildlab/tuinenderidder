import { requireRole } from '$lib/server/permissions';
import { EMAIL_KIND_LABELS, getEmail, isEmailKind, listEmails } from '$lib/server/admin/emails';
import type { PageServerLoad } from './$types';

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'emails');
	const soort = url.searchParams.get('soort');
	const kind = isEmailKind(soort) ? soort : undefined;
	const requested = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));

	let result = await listEmails({ page: requested, perPage: PER_PAGE, kind });
	const pages = Math.max(1, Math.ceil(result.total / PER_PAGE));
	const page = Math.min(requested, pages);
	if (page !== requested) result = await listEmails({ page, perPage: PER_PAGE, kind });

	const idParam = Number(url.searchParams.get('id'));
	const selected = Number.isInteger(idParam) && idParam > 0 ? await getEmail(idParam) : null;

	return {
		title: 'E-mails',
		emails: result.rows,
		total: result.total,
		page,
		pages,
		perPage: PER_PAGE,
		kind: kind ?? null,
		kinds: EMAIL_KIND_LABELS,
		selected,
		selectedMissing: url.searchParams.has('id') && !selected
	};
};
