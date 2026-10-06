<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { translator, type Locale } from '$lib/i18n';

	/** Header block for inner pages: breadcrumb, eyebrow, H1, lead and optional actions/aside. */
	interface Props {
		locale: Locale;
		title: string;
		eyebrow?: string;
		lead?: string;
		crumbs?: { href?: string; label: string }[];
		narrow?: boolean;
		actions?: Snippet;
		aside?: Snippet;
	}

	let { locale, title, eyebrow, lead, crumbs = [], narrow = false, actions, aside }: Props = $props();
	const t = $derived(translator(locale));
</script>

<section class="page-hero" class:has-aside={!!aside}>
	<svg class="texture" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
		<defs>
			<pattern id="ph-leaves" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
				<path d="M20 50c0-14 10-24 26-24 0 16-10 24-26 24Z" fill="currentColor" />
				<path d="M64 22c-8 0-14-6-14-16 10 0 14 6 14 16Z" fill="currentColor" />
			</pattern>
		</defs>
		<rect width="400" height="200" fill="url(#ph-leaves)" />
	</svg>
	<div class={narrow ? 'container-narrow' : 'container'}>
		<div class="grid">
			<div class="copy">
				{#if crumbs.length}
					<nav aria-label={t('breadcrumb.label')}>
						<ol class="crumbs">
							{#each crumbs as c, i (i)}
								<li>
									{#if c.href && i < crumbs.length - 1}
										<a href={c.href}>{c.label}</a>
										<ChevronRight size={14} strokeWidth={2.25} aria-hidden="true" />
									{:else}
										<span aria-current="page">{c.label}</span>
									{/if}
								</li>
							{/each}
						</ol>
					</nav>
				{/if}
				{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
				<h1>{title}</h1>
				{#if lead}<p class="lead">{lead}</p>{/if}
				{#if actions}<div class="actions">{@render actions()}</div>{/if}
			</div>
			{#if aside}<div class="aside">{@render aside()}</div>{/if}
		</div>
	</div>
</section>

<style>
	.page-hero {
		position: relative;
		overflow: hidden;
		padding-block: var(--space-12) var(--space-16);
		background: var(--color-bg-alt);
		border-bottom: 1px solid var(--color-border);
	}
	.texture {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: var(--forest-600);
		opacity: 0.045;
		pointer-events: none;
	}
	.grid {
		position: relative;
		display: grid;
		gap: var(--space-10);
		align-items: center;
	}
	.copy {
		display: grid;
		gap: var(--space-4);
		justify-items: start;
	}
	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
		padding: 0;
		margin-bottom: var(--space-2);
		list-style: none;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.crumbs li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}
	.crumbs a {
		color: var(--color-text-muted);
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		min-height: 24px;
	}
	.crumbs a:hover {
		color: var(--color-primary);
	}
	.crumbs [aria-current] {
		color: var(--color-text);
		font-weight: 600;
	}
	h1 {
		max-width: 20ch;
		hyphens: auto;
	}
	.lead {
		max-width: 62ch;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}
	@media (min-width: 1024px) {
		.page-hero {
			padding-block: var(--space-16) var(--space-20);
		}
		.has-aside .grid {
			grid-template-columns: 1.05fr 1fr;
			gap: var(--space-16);
		}
	}
</style>
