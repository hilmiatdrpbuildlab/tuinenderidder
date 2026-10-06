<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Picture from '$lib/components/ui/Picture.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import type { MediaRef } from '$lib/media';

	/**
	 * Full-screen photo viewer on the native <dialog>: focus is trapped and Esc closes (browser),
	 * ←/→ switch photos, focus returns to the thumbnail that opened it.
	 */
	interface Props {
		locale: Locale;
		images: MediaRef[];
		open?: boolean;
		index?: number;
	}

	let { locale, images, open = $bindable(false), index = $bindable(0) }: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();
	let el: HTMLDialogElement | undefined = $state();
	let opener: Element | null = null;

	const current = $derived(images[index]);

	$effect(() => {
		if (!el) return;
		if (open && !el.open) {
			opener = document.activeElement;
			el.showModal();
		}
		if (!open && el.open) el.close();
	});

	function step(dir: -1 | 1) {
		if (images.length === 0) return;
		index = (index + dir + images.length) % images.length;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			step(-1);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			step(1);
		}
	}

	function onclose() {
		open = false;
		if (opener instanceof HTMLElement) opener.focus();
	}
</script>

<dialog
	bind:this={el}
	class="lightbox"
	aria-labelledby="{uid}-title"
	{onclose}
	{onkeydown}
	onclick={(e) => e.target === el && el?.close()}
>
	<h2 id="{uid}-title" class="visually-hidden">{t('lightbox.label')}</h2>
	<div class="top">
		<p class="count" aria-live="polite">{t('project.imageCount', { n: index + 1, total: images.length })}</p>
		<button type="button" class="btn close" aria-label={t('a11y.close')} onclick={() => el?.close()}>
			<X size={24} aria-hidden="true" />
		</button>
	</div>
	{#if current}
		<figure class="frame">
			{#key current.id}
				<Picture media={current} sizes="100vw" class="photo" />
			{/key}
			{#if current.alt}<figcaption>{current.alt}</figcaption>{/if}
		</figure>
	{/if}
	{#if images.length > 1}
		<button type="button" class="btn prev" aria-label={t('a11y.previous')} onclick={() => step(-1)}>
			<ChevronLeft size={28} aria-hidden="true" />
		</button>
		<button type="button" class="btn next" aria-label={t('a11y.next')} onclick={() => step(1)}>
			<ChevronRight size={28} aria-hidden="true" />
		</button>
	{/if}
</dialog>

<style>
	.lightbox {
		width: 100vw;
		max-width: 100vw;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: var(--space-4);
		border: 0;
		background: color-mix(in srgb, var(--forest-900) 96%, transparent);
		color: var(--linen-25);
		overflow: hidden;
	}
	.lightbox[open] {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: var(--space-3);
		animation: fade var(--dur-panel) var(--ease-out);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.lightbox::backdrop {
		background: var(--forest-900);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.count {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-on-inverse-muted);
	}
	.frame {
		display: grid;
		grid-template-rows: 1fr auto;
		gap: var(--space-3);
		min-height: 0;
		justify-items: center;
		padding-inline: 0;
	}
	.frame :global(.photo) {
		max-width: 100%;
		max-height: 100%;
		min-height: 0;
		height: 100%;
		width: auto;
		border-radius: var(--radius-md);
		background: transparent;
	}
	.frame :global(.photo img) {
		object-fit: contain;
	}
	figcaption {
		font-size: var(--text-sm);
		color: var(--color-on-inverse-muted);
		text-align: center;
	}
	.btn {
		display: inline-grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.12);
		color: var(--linen-25);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.btn:hover {
		background: rgb(255 255 255 / 0.24);
	}
	.btn:focus-visible {
		outline: 2px solid var(--harvest);
		outline-offset: 2px;
	}
	.prev,
	.next {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}
	.prev {
		left: var(--space-3);
	}
	.next {
		right: var(--space-3);
	}
	@media (min-width: 1024px) {
		.lightbox {
			padding: var(--space-6) var(--space-20);
		}
		.prev {
			left: var(--space-6);
		}
		.next {
			right: var(--space-6);
		}
	}
</style>
