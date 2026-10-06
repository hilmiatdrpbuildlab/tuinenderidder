<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import { toast } from './toast.svelte';

	const icons = { success: CircleCheck, error: CircleX, info: Info };
</script>

<div class="toaster" role="status" aria-live="polite">
	{#each toast.items as t (t.id)}
		{@const Icon = icons[t.tone]}
		<div class="toast" data-tone={t.tone}>
			<Icon size={18} strokeWidth={2} aria-hidden="true" />
			<span>{t.message}</span>
			<button type="button" aria-label="Sluiten" onclick={() => toast.dismiss(t.id)}><X size={16} /></button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		z-index: 100;
		right: var(--space-4);
		bottom: var(--space-4);
		display: grid;
		gap: var(--space-2);
		width: min(380px, calc(100vw - 32px));
	}
	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--forest-900);
		color: var(--linen-25);
		box-shadow: var(--shadow-3);
		font-size: var(--text-sm);
		animation: in var(--dur-panel) var(--ease-out);
	}
	.toast[data-tone='success'] :global(svg:first-child) {
		color: var(--forest-300);
	}
	.toast[data-tone='error'] {
		background: var(--color-error-text);
	}
	.toast span {
		flex: 1;
	}
	button {
		display: inline-flex;
		padding: 6px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
	}
	button:hover {
		background: rgb(255 255 255 / 0.12);
	}
	@keyframes in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
