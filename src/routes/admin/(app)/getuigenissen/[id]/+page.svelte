<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { toast } from '$lib/components/ui/toast.svelte';
	import TestimonialEditor from '../TestimonialEditor.svelte';

	let { data, form } = $props();

	onMount(() => {
		if (page.url.searchParams.has('saved')) {
			toast.success('Getuigenis aangemaakt.');
			const url = new URL(page.url);
			url.searchParams.delete('saved');
			replaceState(url, {});
		}
	});
</script>

<svelte:head><title>{data.title} · Getuigenissen · CMS</title></svelte:head>

{#key data.testimonial.id}
	<TestimonialEditor testimonial={data.testimonial} services={data.services} {form} action="?/save" />
{/key}
