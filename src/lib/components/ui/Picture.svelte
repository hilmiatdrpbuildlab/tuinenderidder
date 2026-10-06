<script lang="ts">
	import Leaf from '@lucide/svelte/icons/leaf';
	import type { MediaRef } from '$lib/media';

	/**
	 * The one way to render an image: srcset from stored WebP derivatives, width/height to avoid
	 * layout shift, blurred placeholder while loading, focal point drives object-position.
	 * With `ratio` the image fills a fixed-ratio box (object-fit: cover).
	 */
	interface Props {
		media: MediaRef | null | undefined;
		sizes?: string;
		/** CSS aspect-ratio, e.g. '4 / 3'. Omit to use the image's own ratio. */
		ratio?: string;
		/** Hero image: eager + high fetch priority. */
		priority?: boolean;
		/** Override alt (use '' for decorative images). */
		alt?: string;
		class?: string;
		/** Text shown in the placeholder when media is missing. */
		placeholderLabel?: string;
	}

	let { media, sizes = '100vw', ratio, priority = false, alt, class: className = '', placeholderLabel }: Props = $props();

	let loaded = $state(false);
</script>

{#if media}
	<div
		class="picture {className}"
		style:aspect-ratio={ratio ?? `${media.width} / ${media.height}`}
		style:background-image={media.lqip && !loaded ? `url(${media.lqip})` : undefined}
	>
		<img
			src={media.src}
			srcset={media.srcset || undefined}
			{sizes}
			width={media.width}
			height={media.height}
			alt={alt ?? media.alt}
			loading={priority ? 'eager' : 'lazy'}
			decoding={priority ? 'sync' : 'async'}
			fetchpriority={priority ? 'high' : undefined}
			style:object-position="{media.focalX * 100}% {media.focalY * 100}%"
			onload={() => (loaded = true)}
		/>
	</div>
{:else}
	<div class="picture placeholder {className}" style:aspect-ratio={ratio ?? '4 / 3'} role="img" aria-label={alt ?? placeholderLabel ?? ''}>
		<Leaf size={32} strokeWidth={1.5} aria-hidden="true" />
		{#if ratio}<span aria-hidden="true">{ratio.replace(/\s/g, '')}</span>{/if}
	</div>
{/if}

<style>
	.picture {
		position: relative;
		overflow: hidden;
		background-color: var(--linen-100);
		background-size: cover;
		background-position: center;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.placeholder {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--space-2);
		color: var(--neutral-500);
		font-size: var(--text-xs);
		font-weight: 600;
	}
</style>
