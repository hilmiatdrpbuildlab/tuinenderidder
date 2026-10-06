<script lang="ts">
	import { page } from '$app/state';
	import ErrorView from '$lib/components/marketing/ErrorView.svelte';
	import { delocalizePath, isLocale } from '$lib/i18n';

	const locale = $derived(isLocale(page.data.locale) ? page.data.locale : delocalizePath(page.url.pathname).locale);
</script>

<ErrorView {locale} status={page.status} />
