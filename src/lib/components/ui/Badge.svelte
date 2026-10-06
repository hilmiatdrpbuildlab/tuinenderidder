<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'error' | 'forest' | 'bark' | 'harvest';

	interface Props {
		tone?: Tone;
		/** Leading 8px dot */
		dot?: boolean;
		icon?: Snippet;
		children: Snippet;
		[key: string]: unknown;
	}

	let { tone = 'neutral', dot = false, icon, children, ...rest }: Props = $props();
</script>

<span class="badge" data-tone={tone} {...rest}>
	{#if icon}<span class="icon" aria-hidden="true">{@render icon()}</span>{:else if dot}<span class="dot" aria-hidden="true"></span>{/if}
	{@render children()}
</span>

<style>
	.badge {
		--bg: var(--linen-100);
		--fg: var(--neutral-700);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 24px;
		padding: 0 10px;
		border-radius: var(--radius-pill);
		background: var(--bg);
		color: var(--fg);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
	}
	.badge[data-tone='info'] {
		--bg: var(--color-info-subtle);
		--fg: var(--color-info-text);
	}
	.badge[data-tone='warning'] {
		--bg: var(--color-warning-subtle);
		--fg: var(--color-warning-text);
	}
	.badge[data-tone='success'] {
		--bg: var(--color-success-subtle);
		--fg: var(--color-success-text);
	}
	.badge[data-tone='error'] {
		--bg: var(--color-error-subtle);
		--fg: var(--color-error-text);
	}
	.badge[data-tone='forest'] {
		--bg: var(--forest-50);
		--fg: var(--forest-800);
	}
	.badge[data-tone='bark'] {
		--bg: var(--bark-50);
		--fg: var(--bark-700);
	}
	.badge[data-tone='harvest'] {
		--bg: var(--harvest);
		--fg: var(--neutral-900);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}
	.icon {
		display: inline-flex;
	}
	.icon :global(svg) {
		width: 14px;
		height: 14px;
	}
</style>
