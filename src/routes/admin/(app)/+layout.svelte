<script lang="ts">
	import AdminShell from '$lib/components/admin/AdminShell.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<AdminShell user={data.user} areas={data.areas} counts={data.counts}>
	{@render children()}
</AdminShell>
