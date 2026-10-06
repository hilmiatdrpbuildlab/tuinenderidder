<script lang="ts">
	import ServiceEditor from '../ServiceEditor.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Nieuwe dienst · CMS</title></svelte:head>

<ServiceEditor service={data.service} {form} />
