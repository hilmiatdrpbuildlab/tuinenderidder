<script lang="ts">
	import ChevronsLeftRight from '@lucide/svelte/icons/chevrons-left-right';
	import Picture from '$lib/components/ui/Picture.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import type { MediaRef } from '$lib/media';

	/**
	 * Comparison slider: the "after" photo is the base, the "before" photo is clipped on top.
	 * A native range input drives it, so it is keyboard operable (arrows, Home/End, PageUp/Down)
	 * and announced by screen readers; without JS it sits at 50 %.
	 */
	interface Props {
		locale: Locale;
		before: MediaRef;
		after: MediaRef;
		sizes?: string;
	}

	let { locale, before, after, sizes = '(min-width: 1280px) 1200px, 100vw' }: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();
	let pos = $state(50);
</script>

<figure class="ba" style:--pos="{pos}%">
	<div class="stage">
		<Picture media={after} ratio="3 / 2" {sizes} class="layer after" />
		<div class="before-wrap" aria-hidden="true">
			<Picture media={before} ratio="3 / 2" {sizes} alt="" class="layer" />
		</div>
		<span class="tag tag-before" aria-hidden="true">{t('common.before')}</span>
		<span class="tag tag-after" aria-hidden="true">{t('common.after')}</span>
		<span class="divider" aria-hidden="true">
			<span class="handle"><ChevronsLeftRight size={22} strokeWidth={2.25} /></span>
		</span>
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			bind:value={pos}
			aria-label={t('project.compareLabel')}
			aria-valuetext={t('project.compareValue', { n: pos })}
			aria-describedby="{uid}-help"
		/>
	</div>
	<figcaption id="{uid}-help">{t('project.beforeAfterHelp')}</figcaption>
</figure>

<style>
	.ba {
		display: grid;
		gap: var(--space-3);
	}
	.stage {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-2);
		user-select: none;
	}
	.before-wrap {
		position: absolute;
		inset: 0;
		clip-path: inset(0 calc(100% - var(--pos)) 0 0);
	}
	.before-wrap :global(.layer) {
		height: 100%;
	}
	.tag {
		position: absolute;
		top: var(--space-4);
		padding: 4px 12px;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--forest-900) 80%, transparent);
		color: var(--linen-25);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		pointer-events: none;
	}
	.tag-before {
		left: var(--space-4);
	}
	.tag-after {
		right: var(--space-4);
	}
	.divider {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--pos);
		width: 3px;
		transform: translateX(-50%);
		background: var(--linen-25);
		box-shadow: 0 0 8px rgb(28 26 23 / 0.35);
		pointer-events: none;
	}
	.handle {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--linen-25);
		color: var(--forest-800);
		box-shadow: var(--shadow-3);
		transform: translate(-50%, -50%);
	}
	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: ew-resize;
		touch-action: pan-y;
	}
	.stage:has(input:focus-visible) .handle {
		outline: 3px solid var(--harvest);
		outline-offset: 3px;
	}
	figcaption {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
</style>
