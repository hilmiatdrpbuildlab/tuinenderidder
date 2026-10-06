<script lang="ts">
	import type { Snippet } from 'svelte';
	import Info from '@lucide/svelte/icons/info';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		tone?: 'info' | 'success' | 'warning' | 'error';
		title?: string;
		dismissible?: boolean;
		dismissLabel?: string;
		/** role="alert" for errors that appear after an action; default is a polite status */
		assertive?: boolean;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		tone = 'info',
		title,
		dismissible = false,
		dismissLabel = 'Sluiten',
		assertive = false,
		children,
		...rest
	}: Props = $props();

	let open = $state(true);
	const Icon = $derived({ info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleX }[tone]);
</script>

{#if open}
	<div class="alert" data-tone={tone} role={assertive ? 'alert' : 'status'} {...rest}>
		<span class="icon" aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
		<div class="body">
			{#if title}<p class="title">{title}</p>{/if}
			{#if children}<div class="text">{@render children()}</div>{/if}
		</div>
		{#if dismissible}
			<button type="button" class="close" aria-label={dismissLabel} onclick={() => (open = false)}>
				<X size={18} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.alert {
		--bg: var(--color-info-subtle);
		--fg: var(--color-info-text);
		--accent: var(--color-info);
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--bg);
		color: var(--fg);
		border-left: 4px solid var(--accent);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.alert[data-tone='success'] {
		--bg: var(--color-success-subtle);
		--fg: var(--color-success-text);
		--accent: var(--color-success);
	}
	.alert[data-tone='warning'] {
		--bg: var(--color-warning-subtle);
		--fg: var(--color-warning-text);
		--accent: var(--color-warning);
	}
	.alert[data-tone='error'] {
		--bg: var(--color-error-subtle);
		--fg: var(--color-error-text);
		--accent: var(--color-error);
	}
	.icon {
		color: var(--accent);
		flex-shrink: 0;
		padding-top: 1px;
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-weight: 600;
	}
	.title + .text {
		margin-top: var(--space-1);
	}
	.text :global(a) {
		color: inherit;
	}
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin: -6px -6px 0 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
	}
	.close:hover {
		background: rgb(0 0 0 / 0.06);
	}
</style>
