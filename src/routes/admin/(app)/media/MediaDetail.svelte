<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Save from '@lucide/svelte/icons/save';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import AltTextFields from '$lib/components/admin/content/AltTextFields.svelte';
	import FocalPointPicker from '$lib/components/admin/content/FocalPointPicker.svelte';
	import { replaceImage } from '$lib/components/admin/content/upload';
	import { formatBytes, formatDateTime, type MediaItem, type MediaUsage } from '$lib/components/admin/content/shared';

	interface Props {
		item: MediaItem;
		usages: MediaUsage[];
		folders: string[];
		ondeleted?: () => void;
	}

	let { item, usages, folders, ondeleted }: Props = $props();

	// svelte-ignore state_referenced_locally
	let altNl = $state(item.altNl);
	// svelte-ignore state_referenced_locally
	let altEn = $state(item.altEn);
	// svelte-ignore state_referenced_locally
	let fx = $state(item.focalX);
	// svelte-ignore state_referenced_locally
	let fy = $state(item.focalY);
	// svelte-ignore state_referenced_locally
	let folder = $state(item.folder);
	let saving = $state(false);
	let replacing = $state<number | null>(null);
	let force = $state(false);
	let enhanced = $state(false);
	const uid = $props.id();
	onMount(() => (enhanced = true));

	const dirty = $derived(altNl !== item.altNl || altEn !== item.altEn || fx !== item.focalX || fy !== item.focalY || folder !== item.folder);
	const inBooking = $derived(usages.some((u) => u.kind === 'Boeking'));

	const onSave: SubmitFunction = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') toast.success(String(result.data?.message ?? 'Opgeslagen.'));
			else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Opslaan mislukt.'));
			await update({ reset: false });
		};
	};

	const onReplace: SubmitFunction = ({ formData, cancel }) => {
		// With JavaScript: presigned upload straight to storage instead of posting the file here.
		const file = formData.get('file');
		cancel();
		if (!(file instanceof File) || !file.size) {
			toast.error('Kies een bestand.');
			return;
		}
		replacing = 0;
		replaceImage(item.id, file, { folder: item.folder, onProgress: (f) => (replacing = f) })
			.then(async () => {
				toast.success('Bestand vervangen. Alle pagina’s tonen nu de nieuwe foto.');
				await invalidateAll();
			})
			.catch((e: Error) => toast.error(e.message || 'Vervangen mislukt.'))
			.finally(() => (replacing = null));
	};

	const onDelete: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Afbeelding verwijderd.');
				ondeleted?.();
			} else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Verwijderen mislukt.'));
			await update();
		};
	};
</script>

<div class="detail">
	<div class="preview">
		<FocalPointPicker src={item.src} alt={altNl} bind:x={fx} bind:y={fy} width={item.width} height={item.height} nameX="focalX" nameY="focalY" />
	</div>

	<dl class="meta">
		<div><dt>Bestand</dt><dd class="fn" title={item.filename}>{item.filename || '—'}</dd></div>
		<div><dt>Afmetingen</dt><dd>{item.width} × {item.height} px</dd></div>
		<div><dt>Grootte</dt><dd>{formatBytes(item.bytes)} · {item.mime.replace('image/', '').toUpperCase()}</dd></div>
		<div><dt>Geüpload</dt><dd>{formatDateTime(item.createdAt)}</dd></div>
		<div><dt>Origineel</dt><dd><a href={item.src} target="_blank" rel="noopener">Openen <ExternalLink size={12} aria-hidden="true" /></a></dd></div>
	</dl>

	<form method="POST" action="?/update" use:enhance={onSave} class="card" id="{uid}-meta">
		<input type="hidden" name="id" value={item.id} />
		<input type="hidden" name="focalX" value={fx} />
		<input type="hidden" name="focalY" value={fy} />
		<AltTextFields id={item.id} bind:altNl bind:altEn nameNl="altNl" nameEn="altEn" />
		<div class="f">
			<label for="{uid}-folder">Map</label>
			<input id="{uid}-folder" name="folder" class="control" list="{uid}-folders" bind:value={folder} maxlength="120" />
			<datalist id="{uid}-folders">{#each folders as f (f)}<option value={f}></option>{/each}</datalist>
		</div>
		<div class="save">
			{#if dirty}<span class="dirty">Niet-opgeslagen wijzigingen</span>{/if}
			<Button type="submit" size="sm" loading={saving}>
				{#snippet iconStart()}<Save size={16} />{/snippet}
				Opslaan
			</Button>
		</div>
	</form>

	<section class="card" aria-labelledby="{uid}-use">
		<h3 id="{uid}-use"><Link2 size={16} aria-hidden="true" /> Gebruikt in {usages.length} {usages.length === 1 ? 'plaats' : 'plaatsen'}</h3>
		{#if usages.length}
			<ul class="usages">
				{#each usages as u (u.href + u.label)}
					<li><span class="kind">{u.kind}</span> <a href={u.href}>{u.label}</a></li>
				{/each}
			</ul>
		{:else}
			<p class="muted">Nog nergens gebruikt.</p>
		{/if}
	</section>

	<form method="POST" action="?/replace" enctype="multipart/form-data" use:enhance={onReplace} class="card">
		<input type="hidden" name="id" value={item.id} />
		<h3><RefreshCw size={16} aria-hidden="true" /> Bestand vervangen</h3>
		<p class="muted">Behoudt alt-teksten, focuspunt en alle koppelingen (zelfde media-ID).</p>
		<label class="visually-hidden" for="{uid}-file">Nieuw bestand</label>
		<input id="{uid}-file" type="file" name="file" accept="image/jpeg,image/png,image/webp" class="file" />
		{#if replacing !== null}
			<div class="bar" role="progressbar" aria-label="Voortgang vervangen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(replacing * 100)}>
				<span style:width="{Math.round(replacing * 100)}%"></span>
			</div>
		{/if}
		<Button type="submit" size="sm" variant="outline" loading={replacing !== null}>Vervangen</Button>
	</form>

	<form method="POST" action="?/delete" use:enhance={onDelete} class="card danger">
		<input type="hidden" name="id" value={item.id} />
		<h3><Trash2 size={16} aria-hidden="true" /> Verwijderen</h3>
		{#if inBooking}
			<Alert tone="warning">Deze foto hoort bij een boeking (klantfoto) en kan hier niet verwijderd worden.</Alert>
		{:else if usages.length}
			<Alert tone="warning" title="Deze afbeelding wordt gebruikt op {usages.length} {usages.length === 1 ? 'plaats' : 'plaatsen'}">
				Na verwijderen verdwijnt ze daar; omslagfoto’s worden leeg.
			</Alert>
			<label class="force"><input type="checkbox" name="force" bind:checked={force} required={!enhanced} /> Toch verwijderen</label>
		{:else}
			<p class="muted">Het origineel en alle verkleinde versies worden definitief verwijderd.</p>
		{/if}
		{#if !inBooking}
			<Button type="submit" size="sm" variant="danger" disabled={usages.length > 0 && !force && enhanced}>Definitief verwijderen</Button>
		{/if}
	</form>
</div>

<style>
	.detail {
		display: grid;
		gap: var(--space-4);
	}
	.meta {
		display: grid;
		gap: 4px;
		margin: 0;
		font-size: var(--text-sm);
	}
	.meta div {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
	}
	dt {
		color: var(--color-text-muted);
	}
	dd {
		margin: 0;
		font-weight: 500;
		text-align: right;
		min-width: 0;
	}
	.fn {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	dd a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.card {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.card.danger {
		border-color: color-mix(in srgb, var(--color-error) 35%, var(--color-border));
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 700;
	}
	.f {
		display: grid;
		gap: 4px;
	}
	.f label {
		font-size: var(--text-sm);
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
	.control:focus-visible {
		outline: none;
		border-color: var(--color-primary);
	}
	.save {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--space-3);
	}
	.dirty {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-warning-text);
	}
	.muted {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.usages {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 4px;
		font-size: var(--text-sm);
	}
	.kind {
		display: inline-block;
		min-width: 76px;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.file {
		font-size: var(--text-sm);
	}
	.bar {
		height: 4px;
		border-radius: 2px;
		background: var(--color-surface-sunken);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--color-primary);
	}
	.force {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	:global([data-theme='dark']) .dirty {
		color: var(--harvest);
	}
</style>
