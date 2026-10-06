<script lang="ts">
	import List from '@lucide/svelte/icons/list';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Kanban, { type KanbanColumn } from '$lib/components/admin/Kanban.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();

	const columns: KanbanColumn[] = [
		{ status: 'new', label: 'Nieuw', includes: ['new'] },
		{ status: 'pending', label: 'In afwachting', includes: ['pending'] },
		{ status: 'scheduled', label: 'Gepland', includes: ['scheduled', 'rescheduled', 'in_progress'] },
		{ status: 'completed', label: 'Afgerond', includes: ['completed'] },
		{ status: 'cancelled', label: 'Geannuleerd', includes: ['cancelled'] }
	];
</script>

<svelte:head><title>Aanvragen & offertes · CMS Tuinen De Ridder</title></svelte:head>

<PageHeader
	title="Aanvragen & offertes"
	description="Offerteaanvragen per status. Sleep een kaart naar een andere kolom of gebruik de knoppen. De klant krijgt automatisch een e-mail bij elke statuswijziging."
>
	{#snippet actions()}
		<Button href="/admin/boekingen?type=quote" variant="outline" size="sm">
			{#snippet iconStart()}<List />{/snippet}
			Als lijst
		</Button>
	{/snippet}
</PageHeader>

{#if data.cards.length === 0}
	<EmptyState title="Nog geen offerteaanvragen" text="Aanvragen via het formulier op de website verschijnen hier automatisch." />
{:else}
	<Kanban {columns} cards={data.cards} />
	<p class="note">Afgeronde en geannuleerde aanvragen van de laatste 60 dagen.</p>
{/if}

<style>
	.note {
		margin-top: var(--space-4);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
</style>
