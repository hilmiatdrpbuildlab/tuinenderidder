<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { toast } from '$lib/components/ui/toast.svelte';
	import ProjectEditor from '../ProjectEditor.svelte';

	let { data, form } = $props();

	onMount(() => {
		if (page.url.searchParams.has('saved')) {
			toast.success('Realisatie aangemaakt.');
			const url = new URL(page.url);
			url.searchParams.delete('saved');
			replaceState(url, {});
		}
	});
</script>

<svelte:head><title>{data.title} · Realisaties · CMS</title></svelte:head>

{#key data.project.id}
	<ProjectEditor project={data.project} services={data.services} {form} action="?/save" />
{/key}
