<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import FolderInput from '@lucide/svelte/icons/folder-input';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import MediaUploader from '$lib/components/admin/content/MediaUploader.svelte';
	import MediaLibrary from '$lib/components/admin/content/MediaLibrary.svelte';
	import { formatBytes } from '$lib/components/admin/content/shared';
	import MediaDetail from './MediaDetail.svelte';

	let { data, form } = $props();

	let enhanced = $state(false);
	let selected = $state<number[]>([]);
	let view = $state<'grid' | 'list'>('grid');
	let q = $state('');
	let folderFilter = $state('');
	let filter = $state<'all' | 'noalt' | 'unused'>('all');
	let uploadFolder = $state('library');
	let bulkFolder = $state('');
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		enhanced = true;
		try {
			const saved = localStorage.getItem('tdr-media-view');
			if (saved === 'list' || saved === 'grid') view = saved;
		} catch {
			/* ignore */
		}
	});

	$effect(() => {
		try {
			localStorage.setItem('tdr-media-view', view);
		} catch {
			/* ignore */
		}
	});

	const drawerOpen = $derived(enhanced && !!data.detail);
	const missingAlt = $derived(data.items.filter((i) => !i.altNl.trim()).length);
	const totalBytes = $derived(data.items.reduce((s, i) => s + i.bytes, 0));

	function openItem(id: number) {
		goto(`?id=${id}`, { noScroll: true, keepFocus: true });
	}

	function closeDrawer() {
		if (page.url.searchParams.has('id')) goto('/admin/media', { noScroll: true, keepFocus: true });
	}

	function uploaded() {
		// Batch refreshes while several files finish.
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => invalidateAll(), 400);
	}

	const notify: SubmitFunction = () => async ({ result, update }) => {
		if (result.type === 'success') {
			toast.success(String(result.data?.message ?? 'Klaar.'));
			selected = [];
		} else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Er ging iets mis.'));
		await update();
	};
</script>

<svelte:head><title>Mediabibliotheek · CMS</title></svelte:head>

<PageHeader title="Mediabibliotheek" description="Alle foto’s voor de website. Elke foto heeft een Nederlandse alt-tekst nodig voor ze gepubliceerd kan worden.">
	{#snippet meta()}
		<Badge>{data.items.length} foto’s · {formatBytes(totalBytes)}</Badge>
		{#if missingAlt}
			<button type="button" class="badge-btn" onclick={() => (filter = 'noalt')}>
				<Badge tone="warning">{#snippet icon()}<TriangleAlert size={14} />{/snippet}{missingAlt} zonder alt-tekst</Badge>
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if form?.message && !enhanced}
	<div class="flash"><Alert tone={form && 'deleted' in form ? 'success' : 'info'}>{form.message}</Alert></div>
{/if}

<div class="layout">
	<Panel title="Uploaden">
		{#if enhanced}
			<div class="upload">
				<div class="folder">
					<label for="upload-folder">Map</label>
					<input id="upload-folder" class="control" list="folders" bind:value={uploadFolder} />
					<datalist id="folders">{#each data.folders as f (f)}<option value={f}></option>{/each}</datalist>
				</div>
				<MediaUploader folder={uploadFolder} onuploaded={uploaded} />
			</div>
		{:else}
			<form method="POST" action="?/upload" enctype="multipart/form-data" class="fallback">
				<label for="nojs-files">Foto’s (JPEG, PNG of WebP, max. 25 MB, max. 30)</label>
				<input id="nojs-files" type="file" name="files" accept="image/jpeg,image/png,image/webp" multiple required />
				<label for="nojs-folder">Map</label>
				<input id="nojs-folder" name="folder" value="library" class="control" />
				<Button type="submit" size="sm">Uploaden</Button>
			</form>
		{/if}
	</Panel>

	{#if data.detail && !enhanced}
		<Panel title="Afbeelding bewerken">
			<MediaDetail item={data.detail.item} usages={data.detail.usages} folders={data.folders} />
			<p><a href="/admin/media">Terug naar de bibliotheek</a></p>
		</Panel>
	{/if}

	<Panel title="Bibliotheek">
		<MediaLibrary
			items={data.items}
			folders={data.folders}
			mode="browse"
			bind:selected
			bind:view
			bind:q
			bind:folder={folderFilter}
			bind:filter
			current={data.detail?.item.id ?? null}
			hrefFor={(item) => `?id=${item.id}`}
			onopen={(item) => openItem(item.id)}
		>
			{#snippet bulk(ids)}
				<form method="POST" action="?/bulk" use:enhance={notify} class="bulk">
					{#each ids as id (id)}<input type="hidden" name="ids" value={id} />{/each}
					<label class="visually-hidden" for="bulk-folder">Naar map</label>
					<input id="bulk-folder" name="folder" class="control sm" list="folders" placeholder="map, bv. projects/terras" bind:value={bulkFolder} />
					<Button type="submit" size="sm" variant="outline" name="op" value="folder" disabled={!bulkFolder.trim()}>
						{#snippet iconStart()}<FolderInput size={14} />{/snippet}
						Verplaatsen
					</Button>
					<Button
						type="submit"
						size="sm"
						variant="ghost"
						name="op"
						value="delete"
						onclick={(e: MouseEvent) => {
							if (!confirm(`${ids.length} afbeelding(en) verwijderen? Afbeeldingen die nog gebruikt worden, worden overgeslagen.`)) e.preventDefault();
						}}
					>
						{#snippet iconStart()}<Trash2 size={14} />{/snippet}
						Verwijderen
					</Button>
				</form>
			{/snippet}
		</MediaLibrary>
	</Panel>
</div>

{#if enhanced}
	<Drawer open={drawerOpen} title={data.detail?.item.filename || 'Afbeelding'} width="520px" onclose={closeDrawer}>
		{#if data.detail}
			{#key data.detail.item.id}
				<MediaDetail item={data.detail.item} usages={data.detail.usages} folders={data.folders} ondeleted={closeDrawer} />
			{/key}
		{/if}
	</Drawer>
{/if}

<style>
	.layout {
		display: grid;
		gap: var(--space-6);
	}
	.flash {
		margin-bottom: var(--space-4);
	}
	.upload {
		display: grid;
		gap: var(--space-3);
	}
	.folder {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}
	.folder label {
		font-weight: 600;
	}
	.control {
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.control.sm {
		min-height: 32px;
		width: 220px;
	}
	.control:focus-visible {
		outline: none;
		border-color: var(--color-primary);
	}
	.fallback {
		display: grid;
		gap: var(--space-2);
		justify-items: start;
		font-size: var(--text-sm);
	}
	.bulk {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}
	.badge-btn {
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		border-radius: var(--radius-pill);
	}
	.badge-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
