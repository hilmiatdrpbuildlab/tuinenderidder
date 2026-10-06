<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import type { EditorState } from './editor.svelte';

	/** Warns before leaving an editor with unsaved changes (client navigation + tab close/reload). */
	interface Props {
		editor: EditorState;
		message?: string;
	}

	let { editor, message = 'Niet-opgeslagen wijzigingen. Wil je deze pagina verlaten zonder op te slaan?' }: Props = $props();

	beforeNavigate((nav) => {
		if (!editor.dirty || editor.submitting) return;
		if (nav.type === 'leave') {
			// Browser shows its own native dialog for unload.
			nav.cancel();
			return;
		}
		if (!confirm(message)) nav.cancel();
		else editor.reset();
	});
</script>
