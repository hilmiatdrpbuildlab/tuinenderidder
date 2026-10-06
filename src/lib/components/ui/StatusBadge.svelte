<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Clock from '@lucide/svelte/icons/clock';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Shovel from '@lucide/svelte/icons/shovel';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Globe from '@lucide/svelte/icons/globe';
	import Badge from './Badge.svelte';
	import { STATUS_META, type BookingStatus } from '$lib/domain';
	import type { Locale } from '$lib/i18n';

	/** Booking status, or a content status (draft / published). Label is always visible — never colour alone. */
	interface Props {
		status: BookingStatus | 'draft' | 'published';
		locale?: Locale;
	}

	let { status, locale = 'nl' }: Props = $props();

	const icons = {
		sparkle: Sparkles,
		clock: Clock,
		'calendar-check': CalendarCheck,
		shovel: Shovel,
		check: CircleCheck,
		rotate: RotateCw,
		x: CircleX
	};

	const content = {
		draft: { nl: 'Concept', en: 'Draft', tone: 'neutral', Icon: FileText },
		published: { nl: 'Gepubliceerd', en: 'Published', tone: 'success', Icon: Globe }
	} as const;

	const view = $derived.by(() => {
		if (status === 'draft' || status === 'published') {
			const c = content[status];
			return { label: c[locale], tone: c.tone, Icon: c.Icon };
		}
		const m = STATUS_META[status];
		return { label: m[locale], tone: m.tone, Icon: icons[m.icon] };
	});
</script>

<Badge tone={view.tone as never}>
	{#snippet icon()}<view.Icon size={14} strokeWidth={2} />{/snippet}
	{view.label}
</Badge>
