<script lang="ts">
	import Upload from '@lucide/svelte/icons/upload';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import MediaLibrary from './MediaLibrary.svelte';
	import MediaUploader from './MediaUploader.svelte';
	import { fetchLibrary } from './upload';
	import type { MediaItem } from './shared';

	/** Dialog to choose one or more images from the library, or upload new ones on the spot. */
	interface Props {
		open?: boolean;
		multiple?: boolean;
		title?: string;
		/** Upload folder for new files, e.g. 'projects/terras-ophoven' */
		folder?: string;
		/** Ids already used (shown as selected in multiple mode? no — just excluded from count) */
		exclude?: number[];
		onselect: (items: MediaItem[]) => void;
	}

	let { open = $bindable(false), multiple = false, title, folder = 'library', exclude = [], onselect }: Props = $props();

	let items = $state<MediaItem[]>([]);
	let folders = $state<string[]>([]);
	let loading = $state(false);
	let failed = $state('');
	let selected = $state<number[]>([]);
	let showUpload = $state(false);
	let view = $state<'grid' | 'list'>('grid');
	let loadedOnce = false;

	async function load() {
		loading = !loadedOnce;
		failed = '';
		try {
			const data = await fetchLibrary();
			items = data.items;
			folders = data.folders;
			loadedOnce = true;
		} catch (e) {
			failed = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open) {
			selected = [];
			showUpload = false;
			void load();
		}
	});

	const available = $derived(items.filter((i) => !exclude.includes(i.id)));

	function uploaded(item: MediaItem) {
		items = [item, ...items.filter((i) => i.id !== item.id)];
		selected = multiple ? [...selected, item.id] : [item.id];
	}

	function confirm() {
		const chosen = selected.map((id) => items.find((i) => i.id === id)).filter((x): x is MediaItem => !!x);
		onselect(chosen);
		open = false;
	}
</script>

<Dialog bind:open title={title ?? (multiple ? 'Foto’s kiezen' : 'Foto kiezen')} size="lg">
	<div class="picker">
		<div class="up">
			<Button variant="outline" size="sm" onclick={() => (showUpload = !showUpload)} aria-expanded={showUpload}>
				{#snippet iconStart()}<Upload size={16} />{/snippet}
				{showUpload ? 'Upload verbergen' : 'Nieuwe foto’s uploaden'}
			</Button>
			{#if showUpload}
				<MediaUploader {folder} compact paste={open} onuploaded={uploaded} />
			{/if}
		</div>

		{#if failed}
			<Alert tone="error" title="Bibliotheek kon niet geladen worden">{failed}</Alert>
		{:else if loading}
			<div class="sk">
				{#each Array(8) as _, i (i)}<Skeleton height="140px" />{/each}
			</div>
		{:else}
			<MediaLibrary items={available} {folders} mode={multiple ? 'multiple' : 'single'} bind:selected bind:view />
		{/if}
	</div>

	{#snippet footer()}
		<span class="count">{selected.length ? `${selected.length} gekozen` : 'Nog niets gekozen'}</span>
		<Button variant="ghost" onclick={() => (open = false)}>Annuleren</Button>
		<Button onclick={confirm} disabled={selected.length === 0}>
			{multiple ? `Toevoegen${selected.length ? ` (${selected.length})` : ''}` : 'Kiezen'}
		</Button>
	{/snippet}
</Dialog>

<style>
	.picker {
		display: grid;
		gap: var(--space-4);
		min-height: 320px;
	}
	.up {
		display: grid;
		gap: var(--space-3);
		justify-items: start;
	}
	.up :global(.uploader) {
		width: 100%;
	}
	.sk {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
		gap: var(--space-3);
	}
	.count {
		margin-right: auto;
		align-self: center;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
