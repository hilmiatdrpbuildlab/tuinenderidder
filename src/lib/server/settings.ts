import { eq } from 'drizzle-orm';
import { db } from './db';
import { settings } from './db/schema';

export type CompanySettings = {
	name: string;
	street: string;
	postcode: string;
	town: string;
	phone: string;
	phoneIntl: string;
	email: string;
	vat: string;
	facebookUrl: string;
	instagramUrl: string;
	googleReviewsUrl: string;
	mapsEmbedUrl: string;
	openingHoursNl: string;
	openingHoursEn: string;
};

export type BookingSettings = {
	/** Earliest bookable day = today + leadTimeDays. */
	leadTimeDays: number;
	/** How far ahead slots are generated and offered. */
	horizonWeeks: number;
	holdMinutes: number;
	reminderHours: number;
	/** Postcode prefixes we serve; empty = accept all Belgian postcodes. */
	servicePostcodes: string[];
	vatNoteNl: string;
	vatNoteEn: string;
	/** Internal address that receives "new booking" alerts. */
	notifyEmail: string;
	/** Months after which closed bookings are anonymised. */
	retentionMonths: number;
};

export const defaultCompany: CompanySettings = {
	name: 'Tuinen De Ridder',
	street: 'Bergerstraat 55',
	postcode: '3680',
	town: 'Neeroeteren',
	phone: '0470 80 71 34',
	phoneIntl: '+32470807134',
	email: 'info@tuinen-deridder.be',
	vat: 'BE0676.915.587',
	facebookUrl: 'https://www.facebook.com/p/Tuinen-De-Ridder-100083383500349/',
	instagramUrl: '',
	googleReviewsUrl: '',
	mapsEmbedUrl:
		'https://www.openstreetmap.org/export/embed.html?bbox=5.6236%2C51.0721%2C5.6636%2C51.0921&layer=mapnik&marker=51.0821%2C5.6436',
	openingHoursNl: 'Ma–vr 08:00–17:00 · Za op afspraak',
	openingHoursEn: 'Mon–Fri 08:00–17:00 · Sat by appointment'
};

export const defaultBooking: BookingSettings = {
	leadTimeDays: 2,
	horizonWeeks: 12,
	holdMinutes: 10,
	reminderHours: 48,
	servicePostcodes: ['35', '36', '37', '38', '39'],
	vatNoteNl: 'Prijzen incl. 21 % btw. 6 % btw voor woningen ouder dan 10 jaar.',
	vatNoteEn: 'Prices incl. 21% VAT. 6% VAT for homes older than 10 years.',
	notifyEmail: 'info@tuinen-deridder.be',
	retentionMonths: 24
};

async function read<T extends object>(key: string, fallback: T): Promise<T> {
	const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
	return { ...fallback, ...((row?.value as Partial<T>) ?? {}) };
}

export const getCompany = () => read('company', defaultCompany);
export const getBookingSettings = () => read('booking', defaultBooking);

export async function saveSetting(key: 'company' | 'booking', value: object) {
	await db
		.insert(settings)
		.values({ key, value })
		.onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}
