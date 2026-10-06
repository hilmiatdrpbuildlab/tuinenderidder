<script lang="ts">
	import { page } from '$app/state';
	import { delocalizePath, localizePath, locales, localeNames, translator, type Locale } from '$lib/i18n';

	/** NL | EN links that keep the visitor on the equivalent page. Names in their own language, never flags. */
	let { locale, variant = 'default' }: { locale: Locale; variant?: 'default' | 'inverse' } = $props();

	const t = $derived(translator(locale));
	const canonical = $derived(delocalizePath(page.url.pathname).path);
</script>

<nav class="lang" data-variant={variant} aria-label={t('a11y.language')}>
	<ul>
		{#each locales as l, i (l)}
			<li>
				{#if i > 0}<span class="sep" aria-hidden="true">|</span>{/if}
				<a
					href={localizePath(canonical, l) + page.url.search}
					hreflang={l}
					lang={l}
					aria-current={l === locale ? 'true' : undefined}
					data-sveltekit-reload
				>
					<span aria-hidden="true">{l.toUpperCase()}</span>
					<span class="visually-hidden">{localeNames[l]}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	ul {
		display: flex;
		align-items: center;
		list-style: none;
		padding: 0;
		gap: 2px;
	}
	li {
		display: flex;
		align-items: center;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 6px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
		text-decoration: none;
	}
	a:hover {
		color: var(--color-text);
	}
	a[aria-current='true'] {
		color: var(--color-primary-hover);
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 6px;
	}
	.sep {
		color: var(--color-border-strong);
	}
	[data-variant='inverse'] a {
		color: var(--color-on-inverse-muted);
	}
	[data-variant='inverse'] a:hover,
	[data-variant='inverse'] a[aria-current='true'] {
		color: var(--linen-25);
	}
</style>
