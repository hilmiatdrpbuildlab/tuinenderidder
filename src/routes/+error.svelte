<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/marketing/Logo.svelte';
	import ErrorView from '$lib/components/marketing/ErrorView.svelte';
	import { delocalizePath, localizePath } from '$lib/i18n';

	/** Fallback outside the public layout (no header/footer data): locale comes from the URL. */
	const locale = $derived(delocalizePath(page.url.pathname).locale);
</script>

<header class="bar">
	<div class="container">
		<a href={localizePath('/', locale)} aria-label="Tuinen De Ridder"><Logo /></a>
	</div>
</header>
<main id="main">
	<ErrorView {locale} status={page.status} />
</main>

<style>
	.bar {
		display: flex;
		align-items: center;
		height: var(--header-h);
		border-bottom: 1px solid var(--color-border);
	}
	.bar a {
		display: inline-flex;
		text-decoration: none;
	}
</style>
