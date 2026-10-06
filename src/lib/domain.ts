/**
 * Shared domain constants and labels for bookings — used by the public wizard, emails and the CMS.
 * Pure module (safe on client and server).
 */
import type { Locale } from '$lib/i18n';

export const BOOKING_STATUSES = [
	'new',
	'pending',
	'scheduled',
	'in_progress',
	'completed',
	'rescheduled',
	'cancelled'
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_META: Record<
	BookingStatus,
	{ nl: string; en: string; icon: 'sparkle' | 'clock' | 'calendar-check' | 'shovel' | 'check' | 'rotate' | 'x'; tone: string }
> = {
	new: { nl: 'Nieuw', en: 'New', icon: 'sparkle', tone: 'info' },
	pending: { nl: 'In afwachting', en: 'Pending', icon: 'clock', tone: 'warning' },
	scheduled: { nl: 'Gepland', en: 'Scheduled', icon: 'calendar-check', tone: 'forest' },
	in_progress: { nl: 'Bezig', en: 'In progress', icon: 'shovel', tone: 'bark' },
	completed: { nl: 'Afgerond', en: 'Completed', icon: 'check', tone: 'success' },
	rescheduled: { nl: 'Verplaatst', en: 'Rescheduled', icon: 'rotate', tone: 'neutral' },
	cancelled: { nl: 'Geannuleerd', en: 'Cancelled', icon: 'x', tone: 'error' }
};

/** Allowed status transitions in the CMS (lifecycle diagram in design_system.md §5.4). */
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
	new: ['pending', 'scheduled', 'cancelled'],
	pending: ['scheduled', 'cancelled'],
	scheduled: ['in_progress', 'rescheduled', 'completed', 'cancelled'],
	rescheduled: ['scheduled', 'cancelled'],
	in_progress: ['completed'],
	completed: [],
	cancelled: []
};

/** Statuses that occupy capacity in a slot. */
export const ACTIVE_STATUSES: BookingStatus[] = ['new', 'pending', 'scheduled', 'in_progress', 'rescheduled'];

export const BOOKING_TYPES = ['consultation', 'maintenance', 'quote'] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];
export const TYPE_LABELS: Record<BookingType, Record<Locale, string>> = {
	consultation: { nl: 'Adviesgesprek', en: 'Consultation' },
	maintenance: { nl: 'Onderhoudsbeurt', en: 'Maintenance visit' },
	quote: { nl: 'Offerteaanvraag', en: 'Quote request' }
};

export const SLOT_KINDS = ['morning', 'afternoon', 'consult'] as const;
export type SlotKind = (typeof SLOT_KINDS)[number];
export const SLOT_LABELS: Record<SlotKind, Record<Locale, string>> = {
	morning: { nl: 'Voormiddag', en: 'Morning' },
	afternoon: { nl: 'Namiddag', en: 'Afternoon' },
	consult: { nl: 'Adviesgesprek', en: 'Consultation' }
};
/** Which slot kinds each booking type can use. */
export const SLOT_KINDS_FOR_TYPE: Record<BookingType, SlotKind[]> = {
	consultation: ['consult'],
	maintenance: ['morning', 'afternoon'],
	quote: []
};

export const FREQUENCIES = ['once', 'weekly', 'monthly', 'yearly'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABELS: Record<Frequency, Record<Locale, string>> = {
	once: { nl: 'Eenmalig', en: 'One-off' },
	weekly: { nl: 'Wekelijks', en: 'Weekly' },
	monthly: { nl: 'Maandelijks', en: 'Monthly' },
	yearly: { nl: 'Jaarlijks', en: 'Yearly' }
};

export const GARDEN_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
export type GardenSize = (typeof GARDEN_SIZES)[number];
export const GARDEN_SIZE_LABELS: Record<GardenSize, string> = {
	xs: '< 100 m²',
	sm: '100–500 m²',
	md: '500–1000 m²',
	lg: '> 1000 m²'
};

export const SOURCES = ['website', 'phone', 'facebook', 'email', 'walk_in'] as const;
export type BookingSource = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<BookingSource, string> = {
	website: 'Website',
	phone: 'Telefoon',
	facebook: 'Facebook',
	email: 'E-mail',
	walk_in: 'Ter plaatse'
};

export const ROLE_LABELS = { admin: 'Beheerder', planner: 'Planner', editor: 'Redacteur' } as const;

/** Belgian postcodes → municipality (Limburg + nearby). Used by AddressField auto-fill. */
export const POSTCODES: Record<string, string> = {
	'3500': 'Hasselt',
	'3510': 'Hasselt (Kermt)',
	'3520': 'Zonhoven',
	'3530': 'Houthalen-Helchteren',
	'3550': 'Heusden-Zolder',
	'3570': 'Alken',
	'3580': 'Beringen',
	'3590': 'Diepenbeek',
	'3600': 'Genk',
	'3620': 'Lanaken',
	'3630': 'Maasmechelen',
	'3640': 'Kinrooi',
	'3650': 'Dilsen-Stokkem',
	'3660': 'Oudsbergen (Opglabbeek)',
	'3665': 'As',
	'3668': 'Niel-bij-As',
	'3670': 'Oudsbergen (Meeuwen-Gruitrode)',
	'3680': 'Maaseik (Neeroeteren / Opoeteren)',
	'3690': 'Zutendaal',
	'3700': 'Tongeren',
	'3740': 'Bilzen',
	'3770': 'Riemst',
	'3800': 'Sint-Truiden',
	'3900': 'Pelt (Overpelt)',
	'3910': 'Pelt (Neerpelt)',
	'3920': 'Lommel',
	'3930': 'Hamont-Achel',
	'3940': 'Hechtel-Eksel',
	'3945': 'Ham',
	'3950': 'Bocholt',
	'3960': 'Bree',
	'3970': 'Leopoldsburg',
	'3980': 'Tessenderlo',
	'3990': 'Peer'
};
