import sharp from 'sharp';
import { env } from '$env/dynamic/private';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from './index';
import * as s from './schema';
import {
	aboutBlocks,
	contactBlocks,
	homeBlocks,
	legalBlocks,
	seedBlackouts,
	seedCustomers,
	seedProjects,
	seedServices,
	seedTestimonials
} from './seed-data';
import { hashPassword } from '../auth';
import { createMediaFromBuffer } from '../media';
import { gardenScene, type Scene } from '../placeholder-art';
import { addDays, ensureSlots, isoWeekday, todayISO } from '../availability';
import { defaultBooking, defaultCompany, saveSetting } from '../settings';
import type { BookingStatus } from '$lib/domain';

let artSeed = 1;

async function art(scene: Scene, w: number, h: number, folder: string, altNl: string, altEn: string, userId: number) {
	const svg = gardenScene({ w, h, seed: artSeed++, scene });
	const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
	const row = await createMediaFromBuffer(jpeg, {
		mime: 'image/jpeg',
		filename: `${scene}-${w}x${h}.jpg`,
		folder,
		altNl,
		altEn,
		userId
	});
	return row.id;
}

export async function seedIfEmpty() {
	const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
	if (Number(n) > 0) return;

	const started = Date.now();
	console.log('[seed] First boot — creating demo content (images take ~30 s)…');

	/* ---------------------------------------------------------------- users */
	const adminEmail = env.ADMIN_EMAIL || 'admin@tuinen-deridder.be';
	const adminPassword = env.ADMIN_PASSWORD || 'DeRidder2026!';
	const [admin, planner] = await db
		.insert(s.users)
		.values([
			{ email: adminEmail.toLowerCase(), name: 'Kevin De Ridder', role: 'admin', passwordHash: await hashPassword(adminPassword) },
			{ email: 'planning@tuinen-deridder.be', name: 'Lotte Planning', role: 'planner', passwordHash: await hashPassword('Planner2026!') },
			{ email: 'redactie@tuinen-deridder.be', name: 'Ruben Redactie', role: 'editor', passwordHash: await hashPassword('Editor2026!') }
		])
		.returning();

	await saveSetting('company', defaultCompany);
	await saveSetting('booking', defaultBooking);

	/* ------------------------------------------------------------- services */
	const serviceIds: Record<string, number> = {};
	for (const sv of seedServices) {
		const cover = await art(sv.scene, 1600, 1200, 'services', `${sv.nl.title} — voorbeeldfoto`, `${sv.en.title} — example photo`, admin.id);
		const [row] = await db
			.insert(s.services)
			.values({
				slug: sv.slug,
				icon: sv.icon,
				sort: sv.sort,
				isBookable: sv.isBookable,
				baseDurationMin: sv.baseDurationMin,
				priceFrom: sv.priceFrom,
				priceMode: sv.priceMode,
				coverMediaId: cover,
				status: 'published'
			})
			.returning();
		serviceIds[sv.slug] = row.id;
		await db.insert(s.serviceTranslations).values([
			{ serviceId: row.id, locale: 'nl', ...sv.nl },
			{ serviceId: row.id, locale: 'en', ...sv.en }
		]);
	}

	/* ------------------------------------------------------------- projects */
	for (const [i, p] of seedProjects.entries()) {
		const coverScene = p.scenes[0];
		const cover = await art(
			coverScene,
			1600,
			p.portrait ? 2000 : 1600,
			`projects/${p.slug}`,
			p.nl.title,
			p.en.title,
			admin.id
		);
		const publishedAt = new Date(`${p.year}-${String(3 + (i % 8)).padStart(2, '0')}-15T09:00:00Z`);
		const [row] = await db
			.insert(s.projects)
			.values({
				slug: p.slug,
				serviceId: serviceIds[p.service],
				town: p.town,
				year: p.year,
				coverMediaId: cover,
				isFeatured: p.featured,
				status: 'published',
				publishedAt
			})
			.returning();
		await db.insert(s.projectTranslations).values([
			{ projectId: row.id, locale: 'nl', ...p.nl },
			{ projectId: row.id, locale: 'en', ...p.en }
		]);
		const gallery: (typeof s.projectMedia.$inferInsert)[] = [{ projectId: row.id, mediaId: cover, sort: 0, kind: 'gallery' }];
		for (const [k, scene] of p.scenes.slice(1).entries()) {
			const id = await art(scene, 1800, 1200, `projects/${p.slug}`, `${p.nl.title} — detail`, `${p.en.title} — detail`, admin.id);
			gallery.push({ projectId: row.id, mediaId: id, sort: k + 1, kind: 'gallery' });
		}
		if (p.beforeAfter) {
			const before = await art(p.beforeAfter[0], 1800, 1200, `projects/${p.slug}`, `${p.nl.title} — voor de werken`, `${p.en.title} — before`, admin.id);
			artSeed--; // same composition seed for the "after" image so the pair lines up
			const after = await art(p.beforeAfter[1], 1800, 1200, `projects/${p.slug}`, `${p.nl.title} — na de werken`, `${p.en.title} — after`, admin.id);
			gallery.push({ projectId: row.id, mediaId: before, sort: 10, kind: 'before' });
			gallery.push({ projectId: row.id, mediaId: after, sort: 11, kind: 'after' });
		}
		await db.insert(s.projectMedia).values(gallery);
	}

	/* --------------------------------------------------------- testimonials */
	await db.insert(s.testimonials).values(
		seedTestimonials.map((t, i) => ({
			authorName: t.authorName,
			town: t.town,
			serviceId: serviceIds[t.service],
			rating: t.rating,
			quoteNl: t.quoteNl,
			quoteEn: t.quoteEn,
			source: t.source,
			sourceUrl: '',
			reviewDate: t.reviewDate,
			isVisible: true,
			sort: i
		}))
	);

	/* ---------------------------------------------------------------- pages */
	const heroImageId = await art('lawn', 2400, 1350, 'pages', 'Verzorgde tuin met gazon en hagen', 'Well-kept garden with lawn and hedges', admin.id);
	const whyImageId = await art('hedge', 1600, 2000, 'pages', 'Strak gesnoeide hagen', 'Neatly pruned hedges', admin.id);
	const aboutImageId = await art('trees', 1800, 1200, 'pages', 'Het team aan het werk in een tuin', 'The team at work in a garden', admin.id);

	async function page(key: string, nl: { title: string; blocks: object }, en: { title: string; blocks: object }) {
		const [row] = await db.insert(s.pages).values({ key }).returning();
		await db.insert(s.pageTranslations).values([
			{ pageId: row.id, locale: 'nl', title: nl.title, blocks: nl.blocks as Record<string, unknown> },
			{ pageId: row.id, locale: 'en', title: en.title, blocks: en.blocks as Record<string, unknown> }
		]);
	}
	await page(
		'home',
		{ title: 'Home', blocks: { ...homeBlocks.nl, heroImageId, whyImageId } },
		{ title: 'Home', blocks: { ...homeBlocks.en, heroImageId, whyImageId } }
	);
	await page(
		'about',
		{ title: 'Over ons', blocks: { ...aboutBlocks.nl, imageId: aboutImageId } },
		{ title: 'About us', blocks: { ...aboutBlocks.en, imageId: aboutImageId } }
	);
	await page('contact', { title: 'Contact', blocks: contactBlocks.nl }, { title: 'Contact', blocks: contactBlocks.en });
	for (const key of ['privacy', 'cookies', 'terms'] as const) {
		const { title: tNl, ...bNl } = legalBlocks[key].nl;
		const { title: tEn, ...bEn } = legalBlocks[key].en;
		await page(key, { title: tNl, blocks: bNl }, { title: tEn, blocks: bEn });
	}

	/* ---------------------------------------------------------- availability */
	const rules: (typeof s.availabilityRules.$inferInsert)[] = [];
	for (let wd = 1; wd <= 5; wd++) {
		rules.push({ weekday: wd, slotKind: 'morning', start: '08:00', end: '12:00', capacity: 2 });
		rules.push({ weekday: wd, slotKind: 'afternoon', start: '13:00', end: '17:00', capacity: 2 });
		rules.push({ weekday: wd, slotKind: 'consult', start: '17:00', end: '18:00', capacity: 1 });
	}
	for (const start of ['09:00', '10:00', '11:00']) {
		rules.push({ weekday: 6, slotKind: 'consult', start, end: `${String(Number(start.slice(0, 2)) + 1).padStart(2, '0')}:00`, capacity: 1 });
	}
	await db.insert(s.availabilityRules).values(rules);
	await db.insert(s.blackoutDates).values(seedBlackouts);

	const today = todayISO();
	await ensureSlots(addDays(today, -42), 20);

	/* ------------------------------------------------------------- bookings */
	await seedBookings({ today, serviceIds, plannerId: planner.id, adminId: admin.id });

	await db.insert(s.contactMessages).values([
		{
			name: 'Pieter Lenaerts',
			email: 'pieter.lenaerts@example.be',
			phone: '+32 470 55 44 33',
			message: 'Goedemiddag, doen jullie ook het plaatsen van tuinafsluitingen (draad + palen)? Ongeveer 40 meter. Mvg, Pieter',
			locale: 'nl'
		},
		{
			name: 'Nathalie Kerkhofs',
			email: 'nathalie.k@example.be',
			phone: '',
			message: 'Is het mogelijk om in het voorjaar een offerte te krijgen voor een volledig nieuwe voortuin?',
			locale: 'nl',
			isRead: true
		}
	]);

	console.log(`[seed] Done in ${((Date.now() - started) / 1000).toFixed(1)} s. CMS login: ${adminEmail} / ${adminPassword}`);
}

async function seedBookings(ctx: { today: string; serviceIds: Record<string, number>; plannerId: number; adminId: number }) {
	const { today, serviceIds, plannerId, adminId } = ctx;
	const customers = await db
		.insert(s.customers)
		.values(seedCustomers.map((c) => ({ ...c, locale: (c.locale ?? 'nl') as 'nl' | 'en', consentAt: new Date() })))
		.returning();

	type Plan = {
		offset: number;
		kind: 'morning' | 'afternoon' | 'consult' | null;
		type: s.BookingType;
		status: BookingStatus;
		services: string[];
		frequency?: s.Frequency;
		size?: s.GardenSize;
		note?: string;
		source?: s.BookingSource;
	};
	const plans: Plan[] = [
		{ offset: -30, kind: 'morning', type: 'maintenance', status: 'completed', services: ['onderhoud'], frequency: 'monthly', size: 'md' },
		{ offset: -26, kind: 'afternoon', type: 'maintenance', status: 'completed', services: ['snoeiwerken'], size: 'sm' },
		{ offset: -22, kind: 'consult', type: 'consultation', status: 'completed', services: ['aanleg'], size: 'md', note: 'Nieuwe achtertuin, ca. 300 m², wil terras + gazon.' },
		{ offset: -19, kind: 'morning', type: 'maintenance', status: 'cancelled', services: ['gazon'], size: 'sm', note: 'Klant heeft zelf gemaaid.' },
		{ offset: -15, kind: 'afternoon', type: 'maintenance', status: 'completed', services: ['onderhoud', 'snoeiwerken'], frequency: 'yearly', size: 'lg', source: 'phone' },
		{ offset: -12, kind: 'morning', type: 'maintenance', status: 'completed', services: ['gazon'], size: 'md' },
		{ offset: -8, kind: 'consult', type: 'consultation', status: 'completed', services: ['bomen-snoeien-vellen'], note: 'Grote eik naast de oprit, takken boven het dak.' },
		{ offset: -5, kind: 'afternoon', type: 'maintenance', status: 'completed', services: ['onderhoud'], frequency: 'monthly', size: 'md' },
		{ offset: -2, kind: 'morning', type: 'maintenance', status: 'completed', services: ['snoeiwerken'], size: 'sm', source: 'facebook' },
		{ offset: 0, kind: 'morning', type: 'maintenance', status: 'in_progress', services: ['onderhoud'], frequency: 'weekly', size: 'md' },
		{ offset: 0, kind: 'afternoon', type: 'maintenance', status: 'scheduled', services: ['gazon'], size: 'sm' },
		{ offset: 1, kind: 'morning', type: 'maintenance', status: 'scheduled', services: ['snoeiwerken'], size: 'md', note: 'Haag van 2 m hoog aan de straatkant.' },
		{ offset: 2, kind: 'consult', type: 'consultation', status: 'scheduled', services: ['aanleg'], size: 'lg' },
		{ offset: 3, kind: 'afternoon', type: 'maintenance', status: 'rescheduled', services: ['onderhoud'], size: 'md', note: 'Verplaatst wegens regen.' },
		{ offset: 4, kind: 'morning', type: 'maintenance', status: 'pending', services: ['gazon', 'onderhoud'], frequency: 'monthly', size: 'md' },
		{ offset: 6, kind: 'afternoon', type: 'maintenance', status: 'new', services: ['snoeiwerken'], size: 'sm', note: 'Mag ik ook de rozen laten snoeien?' },
		{ offset: 7, kind: 'consult', type: 'consultation', status: 'new', services: ['bomen-snoeien-vellen'] },
		{ offset: 9, kind: 'morning', type: 'maintenance', status: 'new', services: ['onderhoud'], frequency: 'weekly', size: 'sm' },
		{ offset: 11, kind: 'afternoon', type: 'maintenance', status: 'scheduled', services: ['gazon'], size: 'md', source: 'phone' },
		{ offset: 14, kind: 'consult', type: 'consultation', status: 'pending', services: ['aanleg'], size: 'md', note: 'Voortuin + oprit.' },
		{ offset: 0, kind: null, type: 'quote', status: 'new', services: ['aanleg'], size: 'lg', note: 'Volledig nieuwe tuin bij nieuwbouw, plannen beschikbaar.' },
		{ offset: 0, kind: null, type: 'quote', status: 'new', services: ['bomen-snoeien-vellen'], note: 'Drie sparren van ±15 m vellen + stronken frezen.' },
		{ offset: 0, kind: null, type: 'quote', status: 'pending', services: ['aanleg', 'gazon'], size: 'md', note: 'Terras in keramiek ca. 40 m² en nieuw gazon.' },
		{ offset: 0, kind: null, type: 'quote', status: 'scheduled', services: ['aanleg'], size: 'sm', note: 'Kleine stadstuin, groendak op tuinhuis?' }
	];

	const statusPath: Record<BookingStatus, BookingStatus[]> = {
		new: [],
		pending: ['pending'],
		scheduled: ['scheduled'],
		in_progress: ['scheduled', 'in_progress'],
		completed: ['scheduled', 'in_progress', 'completed'],
		rescheduled: ['scheduled', 'rescheduled'],
		cancelled: ['cancelled']
	};

	let ref = 0;
	const year = Number(today.slice(0, 4));
	for (const [i, plan] of plans.entries()) {
		const customer = customers[i % customers.length];
		let slotId: number | null = null;
		let slotDate = addDays(today, plan.offset);
		if (plan.kind) {
			// Find the nearest slot of this kind on/after the target day (skips weekends/holidays).
			const candidates = await db
				.select()
				.from(s.slots)
				.where(and(eq(s.slots.slotKind, plan.kind), gte(s.slots.date, slotDate), lte(s.slots.date, addDays(slotDate, 10))))
				.orderBy(asc(s.slots.date));
			const slot = candidates.find((c) => c.bookedCount < c.capacity && (plan.offset !== 0 || isoWeekday(c.date) < 6));
			if (!slot) continue;
			slotId = slot.id;
			slotDate = slot.date;
			if (plan.status !== 'cancelled') {
				await db.update(s.slots).set({ bookedCount: slot.bookedCount + 1 }).where(eq(s.slots.id, slot.id));
			}
		}
		const createdAt = new Date(`${addDays(slotDate, -(5 + (i % 6)))}T${String(8 + (i % 10)).padStart(2, '0')}:1${i % 6}:00+02:00`);
		const [booking] = await db
			.insert(s.bookings)
			.values({
				reference: `TDR-${year}-${String(++ref).padStart(4, '0')}`,
				customerId: customer.id,
				type: plan.type,
				frequency: plan.frequency ?? 'once',
				gardenSize: plan.size ?? null,
				slotId,
				status: plan.status,
				assignedTo: ['scheduled', 'in_progress', 'completed', 'rescheduled'].includes(plan.status) ? (i % 3 ? plannerId : adminId) : null,
				notesCustomer: plan.note ?? '',
				source: plan.source ?? 'website',
				locale: customer.locale,
				createdAt,
				updatedAt: createdAt
			})
			.returning();
		await db
			.insert(s.bookingServices)
			.values(plan.services.map((slug) => ({ bookingId: booking.id, serviceId: serviceIds[slug] })));
		const events: (typeof s.bookingEvents.$inferInsert)[] = [
			{ bookingId: booking.id, fromStatus: null, toStatus: 'new', actorId: null, note: plan.source && plan.source !== 'website' ? 'Manueel ingevoerd' : 'Online geboekt', createdAt }
		];
		let prev: BookingStatus = 'new';
		for (const [k, st] of statusPath[plan.status].entries()) {
			events.push({
				bookingId: booking.id,
				fromStatus: prev,
				toStatus: st,
				actorId: plannerId,
				note: st === 'rescheduled' ? 'Verplaatst wegens weersomstandigheden' : '',
				createdAt: new Date(createdAt.getTime() + (k + 1) * 3600_000 * 20)
			});
			prev = st;
		}
		await db.insert(s.bookingEvents).values(events);
	}
	await db
		.insert(s.counters)
		.values({ key: `booking-${year}`, value: ref })
		.onConflictDoUpdate({ target: s.counters.key, set: { value: ref } });
}
