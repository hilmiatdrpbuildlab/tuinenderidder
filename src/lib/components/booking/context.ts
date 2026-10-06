import { getContext } from 'svelte';

import type { BookingType } from '$lib/domain';

/** `preview` lets step 1 show its unsaved selection in the summary while the visitor clicks. */
export type WizardState = { busy: boolean; preview: { type: BookingType | null; serviceIds: number[] } | null };

/** Shared wizard flag set by the booking layout (submit spinner in the summary + mobile bar). */
export function useWizard(): WizardState {
	return getContext<WizardState | undefined>('booking-wizard') ?? { busy: false, preview: null };
}
