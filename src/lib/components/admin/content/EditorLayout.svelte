<script lang="ts">
	import type { Snippet } from 'svelte';

	/** CMS detail screen: form (8 cols) + side panel (4 cols) on lg, stacked below. */
	interface Props {
		main: Snippet;
		aside: Snippet;
	}

	let { main, aside }: Props = $props();
</script>

<div class="editor-layout">
	<div class="main">{@render main()}</div>
	<aside class="aside" aria-label="Publicatie en instellingen">{@render aside()}</aside>
</div>

<style>
	.editor-layout {
		display: grid;
		gap: var(--space-6);
		align-items: start;
	}
	.main,
	.aside {
		display: grid;
		gap: var(--space-6);
		min-width: 0;
	}
	@media (min-width: 1024px) {
		.editor-layout {
			grid-template-columns: repeat(12, minmax(0, 1fr));
		}
		.main {
			grid-column: span 8;
		}
		.aside {
			grid-column: span 4;
		}
	}
</style>
