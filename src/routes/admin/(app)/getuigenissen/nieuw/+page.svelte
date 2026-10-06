<script lang="ts">
	import TestimonialEditor from '../TestimonialEditor.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Nieuwe getuigenis · CMS</title></svelte:head>

<TestimonialEditor testimonial={data.testimonial} services={data.services} {form} />
