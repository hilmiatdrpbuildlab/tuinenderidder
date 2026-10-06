<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<EmptyState
	title={page.status === 403 ? 'Geen toegang' : 'De boekingen konden niet geladen worden'}
	text={page.error?.message ?? 'Er ging iets mis. Probeer het opnieuw.'}
>
	{#snippet actions()}
		{#if page.status !== 403}<Button size="sm" onclick={() => invalidateAll()}>Opnieuw proberen</Button>{/if}
		<Button href="/admin" variant="outline" size="sm">Naar dashboard</Button>
	{/snippet}
</EmptyState>
