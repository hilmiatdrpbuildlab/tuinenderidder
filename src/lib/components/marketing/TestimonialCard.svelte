<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import { formatDate, translator, type Locale } from '$lib/i18n';

	/** Bark 50 card: Fraunces italic quote, Harvest stars with a text equivalent, author, source + date. */
	interface Props {
		locale: Locale;
		quote: string;
		authorName: string;
		town?: string;
		serviceTitle?: string | null;
		rating: number;
		source: 'google' | 'facebook' | 'direct';
		sourceUrl?: string;
		reviewDate: string;
	}

	let { locale, quote, authorName, town, serviceTitle, rating, source, sourceUrl, reviewDate }: Props = $props();

	const t = $derived(translator(locale));
	const sourceName = $derived(source === 'google' ? 'Google' : source === 'facebook' ? 'Facebook' : '');
	const initials = $derived(
		authorName
			.split(/\s+/)
			.filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
	const date = $derived(formatDate(reviewDate, locale, { month: 'long', year: 'numeric' }));
</script>

<figure class="card">
	<span class="mark" aria-hidden="true">“</span>
	<p class="stars" role="img" aria-label={t('common.starsLabel', { n: rating })}>
		{#each { length: 5 } as _, i (i)}
			<Star size={18} strokeWidth={1.75} class={i < rating ? 'on' : 'off'} aria-hidden="true" />
		{/each}
	</p>
	<blockquote>
		<p>{quote}</p>
	</blockquote>
	<figcaption>
		<span class="avatar" aria-hidden="true">{initials}</span>
		<span class="who">
			<span class="name">{authorName}</span>
			<span class="meta">{[town, serviceTitle].filter(Boolean).join(' · ')}</span>
			<span class="source">
				{#if sourceName}
					{#if sourceUrl}
						<a href={sourceUrl} rel="noopener noreferrer" target="_blank">{t('common.via', { source: sourceName })}</a>
					{:else}
						{t('common.via', { source: sourceName })}
					{/if}
					·
				{/if}
				<time datetime={reviewDate}>{date}</time>
			</span>
		</span>
	</figcaption>
</figure>

<style>
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		height: 100%;
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-secondary-subtle);
		overflow: hidden;
	}
	.mark {
		position: absolute;
		top: -0.15em;
		right: var(--space-5);
		font-family: var(--font-accent);
		font-size: 8rem;
		line-height: 1;
		color: var(--harvest);
		opacity: 0.55;
		pointer-events: none;
	}
	.stars {
		display: flex;
		gap: 2px;
	}
	.stars :global(.on) {
		color: var(--harvest);
		fill: var(--harvest);
	}
	.stars :global(.off) {
		color: var(--bark-300);
	}
	blockquote {
		position: relative;
		flex: 1;
		font-family: var(--font-accent);
		font-style: italic;
		font-size: 1.25rem;
		line-height: 1.5;
		color: var(--bark-800);
	}
	figcaption {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid var(--bark-100);
	}
	.avatar {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--forest-100);
		color: var(--forest-800);
		font-weight: 700;
		font-size: var(--text-sm);
	}
	.who {
		display: grid;
		min-width: 0;
		line-height: 1.35;
	}
	.name {
		font-weight: 600;
		color: var(--color-text);
	}
	.meta,
	.source {
		font-size: var(--text-sm);
		color: var(--bark-700);
	}
	.source a {
		color: inherit;
	}
</style>
