<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Panel from './Panel.svelte';
	import BookingDetail from './BookingDetail.svelte';
	import type { BookingDetail as Detail, SlotOption } from '$lib/server/admin/bookings';

	/**
	 * Right-side booking drawer (480px) driven by `?open=<id>`, so it is linkable and survives reloads.
	 * Without JavaScript the same detail renders inline as a panel (a <dialog> can't open without JS).
	 */
	interface Props {
		booking: Detail | null;
		assignees: { id: number; name: string }[];
		slots: SlotOption[];
	}

	let { booking, assignees, slots }: Props = $props();

	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	let open = $state(false);
	$effect(() => {
		open = !!booking;
	});

	const closeHref = $derived.by(() => {
		const u = new URL(page.url);
		u.searchParams.delete('open');
		return u.pathname + u.search;
	});

	/** `?open=12&<filters>&/status` keeps the drawer + filters after a no-JS POST. */
	function action(name: string) {
		const u = new URL(page.url);
		const qs = u.searchParams.toString();
		return `${u.pathname}?${qs ? qs + '&' : ''}/${name}`;
	}

	function onclose() {
		if (page.url.searchParams.has('open')) goto(closeHref, { noScroll: true, keepFocus: true, replaceState: false });
	}
</script>

<svelte:head>
	{@html '<noscript><style>.bd-nojs{display:block!important}</style></noscript>'}
</svelte:head>

{#if booking}
	{#if mounted}
		<Drawer bind:open title={booking.reference} {onclose} closeLabel="Detail sluiten">
			{#snippet header()}<span class="who">{booking.customer.name}</span>{/snippet}
			<BookingDetail {booking} {assignees} {slots} {action} />
		</Drawer>
	{:else}
		<div class="inline bd-nojs">
			<Panel title="{booking.reference} · {booking.customer.name}">
				{#snippet actions()}<a href={closeHref}>Sluiten</a>{/snippet}
				<BookingDetail {booking} {assignees} {slots} {action} />
			</Panel>
		</div>
	{/if}
{/if}

<style>
	.who {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	.inline {
		display: none;
		margin-bottom: var(--space-6);
	}
	.inline :global(h2) {
		font-family: var(--font-mono);
	}
</style>
