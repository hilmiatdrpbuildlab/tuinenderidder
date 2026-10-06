import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
	bookings,
	contactMessages,
	customers,
	projects,
	projectTranslations,
	services,
	serviceTranslations,
	slots
} from '../db/schema';

const LIMIT = 20;

/** `%term%` with LIKE wildcards escaped (Postgres' default escape character is a backslash). */
export function likePattern(q: string) {
	return `%${q.replace(/[\%_]/g, (c) => `\${c}`)}%`;
}

/** A short excerpt of `text` centred on the first match of `q`. */
export function excerpt(text: string, q: string, radius = 70) {
	const flat = text.replace(/\s+/g, ' ').trim();
	const i = flat.toLowerCase().indexOf(q.toLowerCase());
	if (i < 0 || flat.length <= radius * 2) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat;
	const start = Math.max(0, i - radius);
	const end = Math.min(flat.length, i + q.length + radius);
	return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

export async function searchBookings(q: string) {
	const p = likePattern(q);
	return db
		.select({
			id: bookings.id,
			reference: bookings.reference,
			type: bookings.type,
			status: bookings.status,
			customerName: customers.name,
			customerEmail: customers.email,
			municipality: customers.municipality,
			slotDate: slots.date,
			slotStart: slots.start
		})
		.from(bookings)
		.innerJoin(customers, eq(customers.id, bookings.customerId))
		.leftJoin(slots, eq(slots.id, bookings.slotId))
		.where(
			or(
				ilike(bookings.reference, p),
				ilike(customers.name, p),
				ilike(customers.email, p),
				ilike(customers.phone, p),
				ilike(customers.municipality, p)
			)
		)
		.orderBy(desc(bookings.createdAt))
		.limit(LIMIT);
}

export async function searchCustomers(q: string) {
	const p = likePattern(q);
	return db
		.select({
			id: customers.id,
			name: customers.name,
			email: customers.email,
			phone: customers.phone,
			municipality: customers.municipality,
			bookingCount: sql<number>`(select count(*)::int from "bookings" b where b."customer_id" = "customers"."id")`
		})
		.from(customers)
		.where(
			or(
				ilike(customers.name, p),
				ilike(customers.email, p),
				ilike(customers.phone, p),
				ilike(customers.municipality, p),
				ilike(customers.postcode, p)
			)
		)
		.orderBy(desc(customers.createdAt))
		.limit(LIMIT);
}

export async function searchMessages(q: string) {
	const p = likePattern(q);
	const rows = await db
		.select()
		.from(contactMessages)
		.where(
			or(
				ilike(contactMessages.name, p),
				ilike(contactMessages.email, p),
				ilike(contactMessages.phone, p),
				ilike(contactMessages.message, p)
			)
		)
		.orderBy(desc(contactMessages.createdAt))
		.limit(LIMIT);
	return rows.map((m) => ({
		id: m.id,
		name: m.name,
		email: m.email,
		isRead: m.isRead,
		createdAt: m.createdAt,
		excerpt: excerpt(m.message, q)
	}));
}

export async function searchServices(q: string) {
	const p = likePattern(q);
	return db
		.select({ id: services.id, slug: services.slug, title: serviceTranslations.title, status: services.status })
		.from(services)
		.innerJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, 'nl')))
		.where(or(ilike(serviceTranslations.title, p), ilike(services.slug, p), ilike(serviceTranslations.summary, p)))
		.orderBy(services.sort)
		.limit(LIMIT);
}

export async function searchProjects(q: string) {
	const p = likePattern(q);
	return db
		.select({
			id: projects.id,
			slug: projects.slug,
			title: projectTranslations.title,
			town: projects.town,
			year: projects.year,
			status: projects.status
		})
		.from(projects)
		.innerJoin(projectTranslations, and(eq(projectTranslations.projectId, projects.id), eq(projectTranslations.locale, 'nl')))
		.where(or(ilike(projectTranslations.title, p), ilike(projects.town, p), ilike(projects.slug, p)))
		.orderBy(desc(projects.year))
		.limit(LIMIT);
}
