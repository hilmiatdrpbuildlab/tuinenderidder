<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import Spinner from './Spinner.svelte';

	type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'inverse' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		loading?: boolean;
		disabled?: boolean;
		fullWidth?: boolean;
		/** Icon-only buttons must pass aria-label. */
		iconOnly?: boolean;
		iconStart?: Snippet;
		iconEnd?: Snippet;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		type = 'button',
		loading = false,
		disabled = false,
		fullWidth = false,
		iconOnly = false,
		iconStart,
		iconEnd,
		children,
		...rest
	}: Props = $props();
</script>

{#snippet content()}
	{#if loading}
		<span class="icon"><Spinner size={18} /></span>
	{:else if iconStart}
		<span class="icon">{@render iconStart()}</span>
	{/if}
	{#if children}<span class="label">{@render children()}</span>{/if}
	{#if iconEnd}<span class="icon end">{@render iconEnd()}</span>{/if}
{/snippet}

{#if href && !disabled}
	<a
		{href}
		class="btn"
		data-variant={variant}
		data-size={size}
		data-full={fullWidth || undefined}
		data-icon-only={iconOnly || undefined}
		{...rest as HTMLAnchorAttributes}
	>
		{@render content()}
	</a>
{:else}
	<button
		{type}
		class="btn"
		data-variant={variant}
		data-size={size}
		data-full={fullWidth || undefined}
		data-icon-only={iconOnly || undefined}
		disabled={disabled && !loading ? true : undefined}
		aria-disabled={disabled || loading ? 'true' : undefined}
		aria-busy={loading ? 'true' : undefined}
		{...rest as HTMLButtonAttributes}
	>
		{@render content()}
	</button>
{/if}

<style>
	.btn {
		--btn-bg: var(--color-primary);
		--btn-fg: var(--color-on-primary);
		--btn-border: transparent;
		--btn-bg-hover: var(--color-primary-hover);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--control-h);
		padding: 0 var(--space-5);
		border-radius: var(--radius-md);
		border: 1.5px solid var(--btn-border);
		background: var(--btn-bg);
		color: var(--btn-fg);
		font-family: var(--font-body);
		font-weight: 600;
		font-size: var(--text-base);
		line-height: 1.2;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			box-shadow var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
		-webkit-tap-highlight-color: transparent;
	}
	.btn:hover {
		background: var(--btn-bg-hover);
		text-decoration: none;
	}
	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		box-shadow: 0 0 0 2px var(--linen-25);
	}
	.btn[data-size='sm'] {
		min-height: var(--control-h-sm);
		padding: 0 var(--space-3);
		font-size: var(--text-sm);
		border-radius: 10px;
	}
	.btn[data-size='lg'] {
		min-height: var(--control-h-lg);
		padding: 0 var(--space-8);
		font-size: var(--text-lg);
	}
	.btn[data-full] {
		display: flex;
		width: 100%;
	}
	.btn[data-icon-only] {
		padding: 0;
		width: var(--control-h);
	}
	.btn[data-icon-only][data-size='sm'] {
		width: var(--control-h-sm);
	}

	.btn[data-variant='primary']:hover {
		box-shadow: var(--shadow-2);
	}
	.btn[data-variant='primary']:hover .icon.end {
		transform: translateX(2px);
	}
	.btn[data-variant='secondary'] {
		--btn-bg: var(--color-secondary);
		--btn-fg: var(--white);
		--btn-bg-hover: var(--color-secondary-hover);
	}
	.btn[data-variant='outline'] {
		--btn-bg: transparent;
		--btn-fg: var(--color-primary);
		--btn-border: var(--color-primary);
		--btn-bg-hover: var(--color-primary-subtle);
	}
	.btn[data-variant='ghost'] {
		--btn-bg: transparent;
		--btn-fg: var(--color-primary-hover);
		--btn-bg-hover: var(--color-primary-subtle);
	}
	.btn[data-variant='inverse'] {
		--btn-bg: var(--linen-25);
		--btn-fg: var(--forest-900);
		--btn-bg-hover: var(--white);
	}
	.btn[data-variant='danger'] {
		--btn-bg: var(--color-error);
		--btn-fg: var(--white);
		--btn-bg-hover: var(--color-error-hover);
	}

	.btn[aria-disabled='true']:not([aria-busy='true']),
	.btn:disabled {
		--btn-bg: var(--linen-100);
		--btn-bg-hover: var(--linen-100);
		--btn-fg: var(--neutral-500);
		--btn-border: transparent;
		box-shadow: none;
		cursor: not-allowed;
	}
	.btn[aria-busy='true'] {
		cursor: progress;
	}

	.icon {
		display: inline-flex;
		flex-shrink: 0;
		transition: transform var(--dur-fast) var(--ease-out);
	}
	.icon :global(svg) {
		width: 1.15em;
		height: 1.15em;
	}
	.label {
		padding-block: 0.35em;
		overflow-wrap: anywhere;
	}
</style>
