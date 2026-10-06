<script lang="ts">
	import { page } from '$app/state';
	import SiteHeader from '$lib/components/marketing/SiteHeader.svelte';
	import SiteFooter from '$lib/components/marketing/SiteFooter.svelte';
	import CtaBand from '$lib/components/marketing/CtaBand.svelte';

	let { data, children } = $props();

	/** Pages opt in to a transparent header over their hero with `heroOverlay: true` in their load. */
	const overlay = $derived(Boolean((page.data as { heroOverlay?: boolean }).heroOverlay));
	const hideCta = $derived(Boolean((page.data as { hideCta?: boolean }).hideCta));
</script>

<SiteHeader
	locale={data.locale}
	services={data.navServices}
	phone={data.company.phone}
	phoneIntl={data.company.phoneIntl}
	{overlay}
/>

<main id="main" tabindex="-1">
	{@render children()}
</main>

{#if !hideCta}
	<CtaBand locale={data.locale} phone={data.company.phone} phoneIntl={data.company.phoneIntl} />
{/if}

<SiteFooter locale={data.locale} services={data.navServices} company={data.company} />

<style>
	main:focus {
		outline: none;
	}
</style>
