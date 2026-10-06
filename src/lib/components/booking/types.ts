/** Shapes shared between the wizard's server loads and its components (client-safe). */
import type { BookingType, Frequency, GardenSize, SlotKind } from '$lib/domain';

export type StepKey = 'dienst' | 'details' | 'datum' | 'bevestigen';

export type StepItem = {
	key: StepKey;
	label: string;
	href: string;
	state: 'complete' | 'current' | 'upcoming';
	/** reachable = every earlier step is complete */
	reachable: boolean;
};

export type SummaryService = {
	id: number;
	title: string;
	icon: string;
	priceFrom: number | null;
	priceMode: 'fixed' | 'quote';
};

export type BookingSummaryData = {
	type: BookingType | null;
	services: SummaryService[];
	frequency: Frequency | null;
	gardenSize: GardenSize | null;
	slot: { date: string; slotKind: SlotKind; start: string; end: string } | null;
	address: { street: string; postcode: string; municipality: string } | null;
	photoCount: number;
	vatNote: string;
	/** step hrefs for the edit links */
	links: { dienst: string; details: string; datum: string | null };
};
