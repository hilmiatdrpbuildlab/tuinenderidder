<script lang="ts">
	import LegalPage from '$lib/components/marketing/LegalPage.svelte';
	import { translator } from '$lib/i18n';

	let { data } = $props();
	const t = $derived(translator(data.locale));
</script>

<LegalPage
	locale={data.locale}
	title={data.legal.title}
	fallbackTitle={t('footer.privacy')}
	seoTitle={data.legal.seoTitle}
	seoDesc={data.legal.seoDesc}
	blocks={data.legal.blocks}
/>
