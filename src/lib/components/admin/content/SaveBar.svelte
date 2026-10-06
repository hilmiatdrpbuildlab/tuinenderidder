<script lang="ts">
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Button from '$lib/components/ui/Button.svelte';
	import type { EditorState } from './editor.svelte';

	/** Sticky bar at the bottom of the viewport while the form has unsaved changes. */
	interface Props {
		editor: EditorState;
		/** id of the <form> the buttons submit */
		form: string;
		label?: string;
		onDiscard?: () => void;
	}

	let { editor, form, label = 'Opslaan', onDiscard }: Props = $props();
</script>

{#if editor.dirty}
	<div class="save-bar" role="region" aria-label="Niet-opgeslagen wijzigingen">
		<p><CircleDot size={16} aria-hidden="true" /> Niet-opgeslagen wijzigingen</p>
		<div class="actions">
			{#if onDiscard}
				<Button variant="ghost" size="sm" onclick={onDiscard}>Wijzigingen ongedaan maken</Button>
			{/if}
			<Button type="submit" size="sm" {form} name="intent" value="save" loading={editor.saving}>{label}</Button>
		</div>
	</div>
{/if}

<style>
	.save-bar {
		position: sticky;
		bottom: var(--space-4);
		z-index: 15;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-top: var(--space-6);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-inverse);
		color: var(--color-on-inverse);
		box-shadow: var(--shadow-3);
		animation: rise var(--dur-panel) var(--ease-out);
	}
	p {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
	}
	p :global(svg) {
		color: var(--harvest);
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
	.actions :global(.btn[data-variant='ghost']) {
		color: var(--color-on-inverse);
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
