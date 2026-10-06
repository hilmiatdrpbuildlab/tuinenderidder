<script lang="ts">
	import type { Snippet } from 'svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import type { MediaRef } from '$lib/media';

	/**
	 * Full-bleed photo hero (4:5 mobile → 16:9 desktop) with a Forest 900 gradient overlay.
	 * It extends under the fixed, transparent header (page load returns `heroOverlay: true`).
	 */
	interface Props {
		image: MediaRef | null;
		eyebrow?: string;
		title: string;
		text?: string;
		actions?: Snippet;
		/** Content below the copy, e.g. a stats strip overlapping the bottom edge. */
		children?: Snippet;
	}

	let { image, eyebrow, title, text, actions, children }: Props = $props();
</script>

<section class="hero" aria-labelledby="hero-title">
	<div class="bg">
		<Picture media={image} priority sizes="100vw" class="hero-img" />
		<div class="shade" aria-hidden="true"></div>
	</div>
	<div class="container inner">
		<div class="copy">
			{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
			<h1 id="hero-title" class="display">{title}</h1>
			{#if text}<p class="text">{text}</p>{/if}
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</div>
	</div>
	{#if children}<div class="after">{@render children()}</div>{/if}
</section>

<style>
	.hero {
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-rows: 1fr auto;
		min-height: max(100svh - 120px, 600px);
		color: var(--linen-25);
		background: var(--color-inverse);
	}
	.bg {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
	}
	.bg :global(.hero-img) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		aspect-ratio: auto !important;
	}
	.shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, color-mix(in srgb, var(--forest-900) 55%, transparent) 0, transparent calc(var(--header-h) * 2.2)),
			linear-gradient(to top, color-mix(in srgb, var(--forest-900) 70%, transparent) 0%, color-mix(in srgb, var(--forest-900) 35%, transparent) 55%, color-mix(in srgb, var(--forest-900) 10%, transparent) 100%),
			linear-gradient(to right, color-mix(in srgb, var(--forest-900) 45%, transparent) 0%, transparent 70%);
	}
	.inner {
		display: flex;
		align-items: flex-end;
		padding-top: calc(var(--header-h) + var(--space-16));
		padding-bottom: var(--space-16);
	}
	.copy {
		display: grid;
		gap: var(--space-5);
		max-width: 820px;
	}
	.eyebrow {
		color: var(--forest-100);
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.eyebrow::before {
		content: '';
		width: 28px;
		height: 2px;
		background: var(--harvest);
		border-radius: 2px;
	}
	h1 {
		color: var(--linen-25);
		text-shadow: 0 2px 24px rgb(19 42 22 / 0.35);
	}
	.text {
		max-width: 56ch;
		font-size: var(--text-lg);
		color: var(--linen-50);
		text-shadow: 0 1px 12px rgb(19 42 22 / 0.4);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}
	.after {
		position: relative;
	}
	@media (min-width: 640px) {
		.hero {
			min-height: max(min(100svh - 40px, 56.25vw), 640px);
		}
	}
	@media (min-width: 1024px) {
		.inner {
			padding-bottom: var(--space-24);
		}
	}
</style>
