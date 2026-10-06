import { fail, redirect } from '@sveltejs/kit';
import { getDraftPhotos, getOrCreateDraft, guardStep, saveDraft, stepPath, type DraftData } from '$lib/server/booking-draft';
import { createMediaFromBuffer } from '$lib/server/media';
import { getBookingSettings, getCompany } from '$lib/server/settings';
import { rateLimit } from '$lib/server/rate-limit';
import { FREQUENCIES, GARDEN_SIZES, POSTCODES, type Frequency, type GardenSize } from '$lib/domain';
import { translator, type Locale } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

type Values = {
	gardenSize: GardenSize | null;
	frequency: Frequency;
	street: string;
	postcode: string;
	municipality: string;
	notes: string;
};
type Errors = Partial<Record<keyof Values | 'photos', string[]>>;

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const draft = await guardStep(cookies, 'details', locals.locale);
	const [settings, photos] = await Promise.all([getBookingSettings(), getDraftPhotos(draft.data.photoIds)]);
	const d = draft.data;
	const values: Values = {
		gardenSize: d.gardenSize ?? null,
		frequency: d.frequency ?? 'once',
		street: d.street ?? '',
		postcode: d.postcode ?? '',
		municipality: d.municipality ?? '',
		notes: d.notes ?? ''
	};
	return {
		step: 'details' as const,
		type: d.type ?? null,
		values,
		photos,
		maxPhotos: MAX_PHOTOS,
		servicePrefixes: settings.servicePostcodes
	};
};

function readValues(form: FormData): Values {
	const str = (k: string) => String(form.get(k) ?? '').trim();
	const size = str('gardenSize');
	const freq = str('frequency');
	const postcode = str('postcode').replace(/\s/g, '');
	return {
		gardenSize: (GARDEN_SIZES as readonly string[]).includes(size) ? (size as GardenSize) : null,
		frequency: (FREQUENCIES as readonly string[]).includes(freq) ? (freq as Frequency) : 'once',
		street: str('street').slice(0, 200),
		postcode,
		municipality: str('municipality').slice(0, 120) || POSTCODES[postcode] || '',
		notes: str('notes').slice(0, 4000)
	};
}

function toDraft(v: Values, type: DraftData['type']): Partial<DraftData> {
	return {
		gardenSize: v.gardenSize,
		frequency: type === 'maintenance' ? v.frequency : 'once',
		street: v.street,
		postcode: v.postcode,
		municipality: v.municipality,
		notes: v.notes
	};
}

async function validate(v: Values, locale: Locale): Promise<Errors> {
	const t = translator(locale);
	const errors: Errors = {};
	if (!v.gardenSize) errors.gardenSize = [t('booking.details.errorSize')];
	if (v.street.length < 3) errors.street = [t('booking.address.errorStreet')];
	if (!/^[1-9]\d{3}$/.test(v.postcode)) {
		errors.postcode = [t('booking.address.errorPostcode')];
	} else {
		const { servicePostcodes } = await getBookingSettings();
		if (servicePostcodes.length && !servicePostcodes.some((p) => v.postcode.startsWith(p))) {
			const company = await getCompany();
			errors.postcode = [t('booking.address.outsideArea', { phone: company.phone })];
		}
	}
	if (!v.municipality) errors.municipality = [t('booking.address.errorMunicipality')];
	if (v.notes.length > 2000) errors.notes = [t('booking.details.errorNotes')];
	return errors;
}

/** Store uploaded photos for the draft. Returns the new id list or a translated error. */
async function storePhotos(
	form: FormData,
	draftId: string,
	existing: number[],
	locale: Locale,
	ip: string
): Promise<{ ids: number[]; error?: string; added: number }> {
	const t = translator(locale);
	const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
	if (files.length === 0) return { ids: existing, added: 0 };
	if (existing.length + files.length > MAX_PHOTOS) return { ids: existing, error: t('booking.photos.errorCount'), added: 0 };
	if (files.some((f) => !MIMES.includes(f.type))) return { ids: existing, error: t('booking.photos.errorType'), added: 0 };
	if (files.some((f) => f.size > MAX_BYTES)) return { ids: existing, error: t('booking.photos.errorSize'), added: 0 };
	if (!rateLimit(`booking-photos:${ip}`, 30, 60 * 60_000).ok) {
		return { ids: existing, error: t('booking.photos.errorCount'), added: 0 };
	}

	const ids = [...existing];
	for (const f of files) {
		try {
			const row = await createMediaFromBuffer(new Uint8Array(await f.arrayBuffer()), {
				mime: f.type,
				filename: f.name.slice(0, 120) || 'foto',
				folder: `bookings/${draftId}`,
				altNl: 'Foto van de tuin (klant)',
				altEn: 'Photo of the garden (customer)'
			});
			ids.push(row.id);
		} catch (e) {
			console.error('[booking] photo upload failed', e);
			return { ids, error: t('booking.photos.errorFailed'), added: ids.length - existing.length };
		}
	}
	return { ids, added: ids.length - existing.length };
}

export const actions: Actions = {
	/** "Verder": validate, keep any photos chosen at the same time, go to the next step. */
	next: async ({ request, cookies, locals, getClientAddress }) => {
		const form = await request.formData();
		const values = readValues(form);
		const draft = await getOrCreateDraft(cookies);
		const photos = await storePhotos(form, draft.id, draft.data.photoIds ?? [], locals.locale, getClientAddress());
		await saveDraft(cookies, { ...toDraft(values, draft.data.type), photoIds: photos.ids });

		const errors = await validate(values, locals.locale);
		if (photos.error) errors.photos = [photos.error];
		if (Object.keys(errors).length) return fail(400, { values, errors });

		redirect(303, stepPath(draft.data.type === 'quote' ? 'bevestigen' : 'datum', locals.locale));
	},

	/** "Foto's toevoegen" (also auto-submitted by PhotoDrop with JS): stay on the page. */
	upload: async ({ request, cookies, locals, getClientAddress }) => {
		const form = await request.formData();
		const values = readValues(form);
		const draft = await getOrCreateDraft(cookies);
		const photos = await storePhotos(form, draft.id, draft.data.photoIds ?? [], locals.locale, getClientAddress());
		await saveDraft(cookies, { ...toDraft(values, draft.data.type), photoIds: photos.ids });
		if (photos.error) return fail(400, { values, errors: { photos: [photos.error] } as Errors });
		return { values, uploaded: photos.added };
	},

	removePhoto: async ({ request, cookies }) => {
		const form = await request.formData();
		const values = readValues(form);
		const id = Number(form.get('removePhoto'));
		const draft = await getOrCreateDraft(cookies);
		await saveDraft(cookies, {
			...toDraft(values, draft.data.type),
			photoIds: (draft.data.photoIds ?? []).filter((x) => x !== id)
		});
		return { values, removed: id };
	}
};
