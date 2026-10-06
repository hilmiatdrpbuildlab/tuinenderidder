<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { toast } from '$lib/components/ui/toast.svelte';
	import ServiceEditor from '../ServiceEditor.svelte';

	let { data, form } = $props();

	onMount(() => {
		if (page.url.searchParams.has('saved')) {
			toast.success('Dienst aangemaakt.');
			const url = new URL(page.url);
			url.searchParams.delete('saved');
			replaceState(url, {});
		}
	});
</script>

<svelte:head><title>{data.title} · Diensten · CMS</title></svelte:head>

{#key data.service.id}
	<ServiceEditor service={data.service} {form} action="?/save" />
{/key}
