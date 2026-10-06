import {
	pgTable,
	serial,
	integer,
	text,
	boolean,
	timestamp,
	date,
	real,
	jsonb,
	primaryKey,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';

export type Locale = 'nl' | 'en';
export type Role = 'admin' | 'planner' | 'editor';
export type PriceMode = 'fixed' | 'quote';
export type ContentStatus = 'draft' | 'published';
export type BookingType = 'consultation' | 'maintenance' | 'quote';
export type BookingStatus =
	| 'new'
	| 'pending'
	| 'scheduled'
	| 'in_progress'
	| 'completed'
	| 'rescheduled'
	| 'cancelled';
export type SlotKind = 'morning' | 'afternoon' | 'consult';
export type Frequency = 'once' | 'weekly' | 'monthly' | 'yearly';
export type GardenSize = 'xs' | 'sm' | 'md' | 'lg';
export type BookingSource = 'website' | 'phone' | 'facebook' | 'email' | 'walk_in';
export type MediaKind = 'gallery' | 'before' | 'after';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
};

/* ------------------------------------------------------------------ System */

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	role: text('role').$type<Role>().notNull().default('editor'),
	locale: text('locale').$type<Locale>().notNull().default('nl'),
	passwordHash: text('password_hash').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	...timestamps
});

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 hash of the session token; the raw token only lives in the cookie. */
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

/** Key/value settings: company info, booking lead time, email copy overrides… */
export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Atomic counters, e.g. booking reference numbers per year. */
export const counters = pgTable('counters', {
	key: text('key').primaryKey(),
	value: integer('value').notNull().default(0)
});

/* ------------------------------------------------------------------- Media */

export const media = pgTable('media', {
	id: serial('id').primaryKey(),
	storageKey: text('storage_key').notNull().unique(),
	filename: text('filename').notNull().default(''),
	mime: text('mime').notNull(),
	bytes: integer('bytes').notNull().default(0),
	width: integer('width').notNull().default(0),
	height: integer('height').notNull().default(0),
	/** Tiny blurred placeholder (data URL) shown while the image loads. */
	lqip: text('lqip'),
	/** Widths of generated WebP derivatives, e.g. [480, 960, 1600]. */
	variants: jsonb('variants').$type<number[]>().notNull().default([]),
	focalX: real('focal_x').notNull().default(0.5),
	focalY: real('focal_y').notNull().default(0.5),
	altNl: text('alt_nl').notNull().default(''),
	altEn: text('alt_en').notNull().default(''),
	folder: text('folder').notNull().default('library'),
	createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
	...timestamps
});

/* ----------------------------------------------------------------- Content */

export const services = pgTable('services', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	icon: text('icon').notNull().default('leaf'),
	sort: integer('sort').notNull().default(0),
	isBookable: boolean('is_bookable').notNull().default(true),
	baseDurationMin: integer('base_duration_min').notNull().default(240),
	/** Starting price in whole euros incl. VAT; null when price_mode = quote. */
	priceFrom: integer('price_from'),
	priceMode: text('price_mode').$type<PriceMode>().notNull().default('quote'),
	coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
	status: text('status').$type<ContentStatus>().notNull().default('published'),
	...timestamps
});

export const serviceTranslations = pgTable(
	'service_translations',
	{
		serviceId: integer('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'cascade' }),
		locale: text('locale').$type<Locale>().notNull(),
		title: text('title').notNull(),
		summary: text('summary').notNull().default(''),
		body: text('body').notNull().default(''),
		highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
		seoTitle: text('seo_title').notNull().default(''),
		seoDesc: text('seo_desc').notNull().default('')
	},
	(t) => [primaryKey({ columns: [t.serviceId, t.locale] })]
);

export const projects = pgTable('projects', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
	town: text('town').notNull().default(''),
	year: integer('year').notNull(),
	coverMediaId: integer('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
	isFeatured: boolean('is_featured').notNull().default(false),
	status: text('status').$type<ContentStatus>().notNull().default('draft'),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	...timestamps
});

export const projectTranslations = pgTable(
	'project_translations',
	{
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		locale: text('locale').$type<Locale>().notNull(),
		title: text('title').notNull(),
		summary: text('summary').notNull().default(''),
		story: text('story').notNull().default('')
	},
	(t) => [primaryKey({ columns: [t.projectId, t.locale] })]
);

export const projectMedia = pgTable(
	'project_media',
	{
		id: serial('id').primaryKey(),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		mediaId: integer('media_id')
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		sort: integer('sort').notNull().default(0),
		kind: text('kind').$type<MediaKind>().notNull().default('gallery')
	},
	(t) => [index('project_media_project_idx').on(t.projectId)]
);

export const testimonials = pgTable('testimonials', {
	id: serial('id').primaryKey(),
	authorName: text('author_name').notNull(),
	town: text('town').notNull().default(''),
	serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
	rating: integer('rating').notNull().default(5),
	quoteNl: text('quote_nl').notNull(),
	quoteEn: text('quote_en').notNull().default(''),
	source: text('source').$type<'google' | 'facebook' | 'direct'>().notNull().default('google'),
	sourceUrl: text('source_url').notNull().default(''),
	reviewDate: date('review_date', { mode: 'string' }).notNull(),
	isVisible: boolean('is_visible').notNull().default(true),
	sort: integer('sort').notNull().default(0),
	...timestamps
});

export const pages = pgTable('pages', {
	id: serial('id').primaryKey(),
	/** home, about, contact, privacy, cookies, terms */
	key: text('key').notNull().unique(),
	...timestamps
});

export const pageTranslations = pgTable(
	'page_translations',
	{
		pageId: integer('page_id')
			.notNull()
			.references(() => pages.id, { onDelete: 'cascade' }),
		locale: text('locale').$type<Locale>().notNull(),
		title: text('title').notNull().default(''),
		/** Free-form content blocks; shape depends on the page key (see $lib/content/pages.ts). */
		blocks: jsonb('blocks').$type<Record<string, unknown>>().notNull().default({}),
		seoTitle: text('seo_title').notNull().default(''),
		seoDesc: text('seo_desc').notNull().default('')
	},
	(t) => [primaryKey({ columns: [t.pageId, t.locale] })]
);

/* ----------------------------------------------------------------- Booking */

export const customers = pgTable(
	'customers',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		phone: text('phone').notNull().default(''),
		street: text('street').notNull().default(''),
		postcode: text('postcode').notNull().default(''),
		municipality: text('municipality').notNull().default(''),
		locale: text('locale').$type<Locale>().notNull().default('nl'),
		consentAt: timestamp('consent_at', { withTimezone: true }),
		marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
		...timestamps
	},
	(t) => [index('customers_email_idx').on(t.email)]
);

export const availabilityRules = pgTable('availability_rules', {
	id: serial('id').primaryKey(),
	/** ISO weekday: 1 = Monday … 7 = Sunday */
	weekday: integer('weekday').notNull(),
	slotKind: text('slot_kind').$type<SlotKind>().notNull(),
	start: text('start').notNull(),
	end: text('end').notNull(),
	capacity: integer('capacity').notNull().default(1),
	isActive: boolean('is_active').notNull().default(true)
});

export const blackoutDates = pgTable('blackout_dates', {
	id: serial('id').primaryKey(),
	date: date('date', { mode: 'string' }).notNull().unique(),
	reason: text('reason').notNull().default('')
});

export const slots = pgTable(
	'slots',
	{
		id: serial('id').primaryKey(),
		date: date('date', { mode: 'string' }).notNull(),
		slotKind: text('slot_kind').$type<SlotKind>().notNull(),
		start: text('start').notNull(),
		end: text('end').notNull(),
		capacity: integer('capacity').notNull().default(1),
		bookedCount: integer('booked_count').notNull().default(0),
		/** Manually closed by the planner (e.g. weather) without a blackout for the whole day. */
		isClosed: boolean('is_closed').notNull().default(false)
	},
	(t) => [
		uniqueIndex('slots_date_kind_start_uq').on(t.date, t.slotKind, t.start),
		index('slots_date_idx').on(t.date)
	]
);

/**
 * A 10-minute hold placed when a customer picks a slot, so nobody else can take the
 * last place while they fill in their details. Expired holds are ignored and purged by cron.
 */
export const slotHolds = pgTable(
	'slot_holds',
	{
		id: serial('id').primaryKey(),
		slotId: integer('slot_id')
			.notNull()
			.references(() => slots.id, { onDelete: 'cascade' }),
		draftId: text('draft_id').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('slot_holds_slot_idx').on(t.slotId), uniqueIndex('slot_holds_draft_uq').on(t.draftId)]
);

/** Wizard state kept server-side between steps (works without JavaScript). */
export const bookingDrafts = pgTable('booking_drafts', {
	id: text('id').primaryKey(),
	data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
	...timestamps
});

export const bookings = pgTable(
	'bookings',
	{
		id: serial('id').primaryKey(),
		/** TDR-YYYY-NNNN */
		reference: text('reference').notNull().unique(),
		customerId: integer('customer_id')
			.notNull()
			.references(() => customers.id, { onDelete: 'restrict' }),
		type: text('type').$type<BookingType>().notNull(),
		frequency: text('frequency').$type<Frequency>().notNull().default('once'),
		gardenSize: text('garden_size').$type<GardenSize>(),
		slotId: integer('slot_id').references(() => slots.id, { onDelete: 'set null' }),
		status: text('status').$type<BookingStatus>().notNull().default('new'),
		assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
		notesCustomer: text('notes_customer').notNull().default(''),
		notesInternal: text('notes_internal').notNull().default(''),
		source: text('source').$type<BookingSource>().notNull().default('website'),
		locale: text('locale').$type<Locale>().notNull().default('nl'),
		reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		index('bookings_status_idx').on(t.status),
		index('bookings_slot_idx').on(t.slotId),
		index('bookings_created_idx').on(t.createdAt)
	]
);

export const bookingServices = pgTable(
	'booking_services',
	{
		bookingId: integer('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		serviceId: integer('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'restrict' })
	},
	(t) => [primaryKey({ columns: [t.bookingId, t.serviceId] })]
);

/** Audit trail of every status change / reschedule / note. */
export const bookingEvents = pgTable(
	'booking_events',
	{
		id: serial('id').primaryKey(),
		bookingId: integer('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		fromStatus: text('from_status').$type<BookingStatus>(),
		toStatus: text('to_status').$type<BookingStatus>(),
		actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
		note: text('note').notNull().default(''),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('booking_events_booking_idx').on(t.bookingId)]
);

export const bookingAttachments = pgTable(
	'booking_attachments',
	{
		bookingId: integer('booking_id')
			.notNull()
			.references(() => bookings.id, { onDelete: 'cascade' }),
		mediaId: integer('media_id')
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.bookingId, t.mediaId] })]
);

/**
 * Email outbox. No mail provider is connected yet, so every email the system would send
 * (confirmation, reminder, status change, internal alert) is stored here and readable in the CMS.
 */
export const emails = pgTable(
	'emails',
	{
		id: serial('id').primaryKey(),
		to: text('to').notNull(),
		subject: text('subject').notNull(),
		html: text('html').notNull(),
		text: text('text').notNull().default(''),
		kind: text('kind').notNull(),
		bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
		locale: text('locale').$type<Locale>().notNull().default('nl'),
		status: text('status').$type<'queued' | 'sent' | 'failed'>().notNull().default('queued'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('emails_created_idx').on(t.createdAt)]
);

/** Contact-form messages from the public site. */
export const contactMessages = pgTable('contact_messages', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull().default(''),
	message: text('message').notNull(),
	locale: text('locale').$type<Locale>().notNull().default('nl'),
	isRead: boolean('is_read').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
