<script lang="ts">
	// Self-hosted fonts (no Google CDN call — GDPR-friendly). unicode-range keeps downloads to latin/latin-ext.
	import '@fontsource/barlow-condensed/600.css';
	import '@fontsource/barlow-condensed/700.css';
	import '@fontsource/figtree/400.css';
	import '@fontsource/figtree/500.css';
	import '@fontsource/figtree/600.css';
	import '@fontsource/fraunces/400-italic.css';
	import '@fontsource/jetbrains-mono/400.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/base.css';

	let { children } = $props();
</script>

{@render children()}
