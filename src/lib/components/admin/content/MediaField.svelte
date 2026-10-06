<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MediaPicker from './MediaPicker.svelte';
	import AltTextFields from './AltTextFields.svelte';
	import { useEditor } from './editor.svelte';
	import type { MediaItem } from './shared';

	/**
	 * One image slot (cover, hero…): preview + choose/replace/remove via MediaPicker, with the
	 * image's alt texts editable inline. Posts the media id in a hidden input.
	 */
	interface Props {
		name: string;
		label: string;
		item?: MediaItem | null;
		ratio?: string;
		folder?: string;
		helper?: string;
		error?: string | null;
		required?: boolean;
		showAlt?: boolean;
		onchange?: (item: MediaItem | null) => void;
	}

	let {
		name,
		label,
		item = $bindable(null),
		ratio = '4 / 3',
		folder = 'library',
		helper,
		error,
		required = false,
		showAlt = true,
		onchange
	}: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	let open = $state(false);

	function choose(items: MediaItem[]) {
		item = items[0] ?? null;
		editor?.markDirty();
		onchange?.(item);
	}
	function clear() {
		item = null;
		editor?.markDirty();
		onchange?.(null);
	}
</script>

<div class="media-field" role="group" aria-labelledby="{uid}-l" aria-describedby={error ? `${uid}-e` : helper ? `${uid}-h` : undefined}>
	<p class="label" id="{uid}-l">{label}{#if required}<span class="req" aria-hidden="true"> *</span>{/if}</p>
	<input type="hidden" {name} value={item?.id ?? ''} />

	{#if item}
		<div class="chosen" class:invalid={!!error}>
			<div class="preview">
				<Picture media={item.ref} {ratio} sizes="320px" alt="" />
			</div>
			<div class="side">
				<p class="fn" title={item.filename}>{item.filename || `Afbeelding #${item.id}`}</p>
				<p class="dim">{item.width} × {item.height}px</p>
				<div class="btns">
					<Button size="sm" variant="outline" onclick={() => (open = true)}>
						{#snippet iconStart()}<RefreshCw size={14} />{/snippet}
						Wijzigen
					</Button>
					<Button size="sm" variant="ghost" onclick={clear} aria-label="{label} verwijderen">
						{#snippet iconStart()}<Trash2 size={14} />{/snippet}
						Verwijderen
					</Button>
				</div>
				{#if showAlt}
					<AltTextFields id={item.id} bind:altNl={item.altNl} bind:altEn={item.altEn} compact />
				{/if}
			</div>
		</div>
	{:else}
		<button type="button" class="empty" class:invalid={!!error} style:aspect-ratio={ratio} onclick={() => (open = true)}>
			<ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />
			<span>Kies of upload een foto</span>
		</button>
	{/if}

	{#if error}
		<p class="error" id="{uid}-e"><CircleAlert size={14} aria-hidden="true" /> {error}</p>
	{:else if helper}
		<p class="helper" id="{uid}-h">{helper}</p>
	{/if}
</div>

<MediaPicker bind:open {folder} title={label} onselect={choose} />

<style>
	.media-field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.req {
		color: var(--color-error);
	}
	.chosen {
		display: grid;
		grid-template-columns: minmax(120px, 200px) 1fr;
		gap: var(--space-4);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.chosen.invalid,
	.empty.invalid {
		border-color: var(--color-error);
	}
	.preview :global(.picture) {
		border-radius: var(--radius-sm);
	}
	.side {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-width: 0;
	}
	.fn {
		font-weight: 600;
		font-size: var(--text-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dim {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.btns {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.empty {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--space-2);
		width: 100%;
		max-height: 220px;
		border: 2px dashed var(--forest-300);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-primary);
		font-weight: 600;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.empty:hover {
		background: var(--color-primary-subtle);
	}
	.empty:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.helper {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.error {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-error);
	}
	@media (max-width: 560px) {
		.chosen {
			grid-template-columns: 1fr;
		}
	}
</style>
