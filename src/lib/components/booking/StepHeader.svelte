<script lang="ts">
	import Alert from '$lib/components/ui/Alert.svelte';

	/**
	 * Step <h1> (focus target after navigation, id="step-title") + intro + optional error summary.
	 * The error alert gets focus after a failed submit when no single field is invalid.
	 */
	interface Props {
		title: string;
		intro?: string;
		error?: string | null;
	}

	let { title, intro, error }: Props = $props();
</script>

<div class="step-head">
	<h1 id="step-title" tabindex="-1">{title}</h1>
	{#if intro}<p class="intro">{intro}</p>{/if}
	{#if error}
		<div class="err" data-step-error tabindex="-1">
			<Alert tone="error" assertive>{error}</Alert>
		</div>
	{/if}
</div>

<style>
	.step-head {
		display: grid;
		gap: var(--space-3);
		margin-bottom: var(--space-8);
	}
	h1 {
		font-size: clamp(2rem, 1.7rem + 1.4vw, 3rem);
	}
	h1:focus {
		outline: none;
	}
	h1:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 4px;
	}
	.intro {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		max-width: 60ch;
	}
	.err {
		margin-top: var(--space-2);
		border-radius: var(--radius-md);
	}
	.err:focus {
		outline: 2px solid var(--color-error);
		outline-offset: 2px;
	}
</style>
