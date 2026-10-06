<script lang="ts">
	import ProjectEditor from '../ProjectEditor.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Nieuwe realisatie · CMS</title></svelte:head>

<ProjectEditor project={data.project} services={data.services} {form} />
