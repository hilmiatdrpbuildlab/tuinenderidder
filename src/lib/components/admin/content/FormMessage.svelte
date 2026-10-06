<script lang="ts">
	import { onMount } from 'svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	/**
	 * Result message of a form action for the no-JavaScript path (with JS the editors show a toast).
	 * Only rendered until hydration, so it never duplicates a toast.
	 */
	interface Props {
		form: { message?: string; errors?: Record<string, string> | null } | null | undefined;
	}

	let { form }: Props = $props();
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const failed = $derived(!!form?.errors && Object.keys(form.errors).length > 0);
</script>

{#if !mounted && form?.message}
	<div class="msg">
		<Alert tone={failed ? 'error' : 'success'} assertive={failed}>{form.message}</Alert>
	</div>
{/if}

<style>
	.msg {
		margin-bottom: var(--space-4);
	}
</style>
