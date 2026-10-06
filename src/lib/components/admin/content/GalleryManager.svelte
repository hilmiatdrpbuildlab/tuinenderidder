<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Star from '@lucide/svelte/icons/star';
	import Images from '@lucide/svelte/icons/images';
	import Button from '$lib/components/ui/Button.svelte';
	import MediaPicker from './MediaPicker.svelte';
	import AltTextFields from './AltTextFields.svelte';
	import { useEditor } from './editor.svelte';
	import { MEDIA_KIND_LABELS, type MediaItem } from './shared';

	type Kind = 'gallery' | 'before' | 'after';
	type Entry = { mediaId: number; kind: Kind };

	/**
	 * Project photos: add via MediaPicker, reorder (drag or up/down buttons), remove, mark as
	 * Voor/Na for the before/after slider, set as cover, and fill in alt texts inline.
	 */
	interface Props {
		entries?: Entry[];
		media: Record<number, MediaItem>;
		coverId?: number | null;
		folder?: string;
		error?: string | null;
		oncover?: (item: MediaItem) => void;
	}

	let { entries = $bindable([]), media = $bindable(), coverId = null, folder = 'projects', error, oncover }: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	let open = $state(false);
	let announce = $state('');
	let dragIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);
	let listEl: HTMLOListElement | undefined = $state();

	const befores = $derived(entries.filter((e) => e.kind === 'before').length);
	const afters = $derived(entries.filter((e) => e.kind === 'after').length);

	function add(items: MediaItem[]) {
		const existing = new Set(entries.map((e) => e.mediaId));
		const fresh = items.filter((i) => !existing.has(i.id));
		for (const i of fresh) if (!media[i.id]) media[i.id] = i;
		entries = [...entries, ...fresh.map((i) => ({ mediaId: i.id, kind: 'gallery' as Kind }))];
		if (fresh.length) {
			editor?.markDirty();
			announce = `${fresh.length} foto('s) toegevoegd.`;
		}
	}

	function move(from: number, to: number, focus = true) {
		if (to < 0 || to >= entries.length || from === to) return;
		const next = [...entries];
		const [x] = next.splice(from, 1);
		next.splice(to, 0, x);
		entries = next;
		editor?.markDirty();
		announce = `Foto verplaatst naar positie ${to + 1} van ${entries.length}.`;
		if (focus)
			queueMicrotask(() => {
				const sel = `[data-move='${to > from ? 'down' : 'up'}']`;
				const btn = listEl?.querySelectorAll<HTMLButtonElement>(sel)[to];
				(btn && !btn.disabled ? btn : listEl?.querySelectorAll<HTMLElement>('.item')[to])?.focus();
			});
	}

	function remove(i: number) {
		entries = entries.filter((_, j) => j !== i);
		editor?.markDirty();
		announce = 'Foto verwijderd uit de galerij.';
	}

	function setKind(i: number, kind: Kind) {
		entries[i].kind = kind;
		editor?.markDirty();
	}
</script>

<div class="gallery" role="group" aria-labelledby="{uid}-t">
	<div class="head">
		<div>
			<p class="title" id="{uid}-t">Galerij</p>
			<p class="sub">
				{entries.length} foto('s){#if befores || afters} · {befores} voor / {afters} na{/if}. Sleep of gebruik de pijlen om te ordenen.
			</p>
		</div>
		<Button size="sm" variant="outline" onclick={() => (open = true)}>
			{#snippet iconStart()}<ImagePlus size={16} />{/snippet}
			Foto’s toevoegen
		</Button>
	</div>

	{#if entries.length === 0}
		<button type="button" class="empty" onclick={() => (open = true)}>
			<Images size={28} strokeWidth={1.5} aria-hidden="true" />
			<span>Nog geen foto’s. Kies uit de bibliotheek of upload nieuwe.</span>
		</button>
	{:else}
		<ol class="list" bind:this={listEl}>
			{#each entries as entry, i (entry.mediaId)}
				{@const item = media[entry.mediaId]}
				<li
					class="item"
					tabindex="-1"
					class:dragging={dragIndex === i}
					class:over={overIndex === i && dragIndex !== i}
					data-kind={entry.kind}
					ondragover={(e) => {
						if (dragIndex === null) return;
						e.preventDefault();
						overIndex = i;
					}}
					ondrop={(e) => {
						e.preventDefault();
						if (dragIndex !== null) move(dragIndex, i, false);
						dragIndex = overIndex = null;
					}}
				>
					<input type="hidden" name="gallery.mediaId" value={entry.mediaId} />
					<input type="hidden" name="gallery.kind" value={entry.kind} />
					<span
						class="handle"
						role="presentation"
						draggable="true"
						title="Sleep om te verplaatsen"
						ondragstart={(e) => {
							dragIndex = i;
							e.dataTransfer?.setData('text/plain', String(i));
						}}
						ondragend={() => (dragIndex = overIndex = null)}
					>
						<GripVertical size={16} aria-hidden="true" />
						<span class="pos">{i + 1}</span>
					</span>
					<div class="thumb">
						{#if item}
							<img src={item.thumb} alt="" style:object-position="{item.focalX * 100}% {item.focalY * 100}%" />
						{/if}
						{#if entry.kind !== 'gallery'}<span class="kind-tag">{MEDIA_KIND_LABELS[entry.kind]}</span>{/if}
						{#if coverId === entry.mediaId}<span class="cover-tag"><Star size={12} aria-hidden="true" /> Omslag</span>{/if}
					</div>
					<div class="fields">
						{#if item}
							<AltTextFields id={item.id} bind:altNl={item.altNl} bind:altEn={item.altEn} compact />
						{:else}
							<p class="missing">Afbeelding #{entry.mediaId} niet gevonden.</p>
						{/if}
						<div class="row">
							<label for="{uid}-k-{entry.mediaId}">Soort</label>
							<select id="{uid}-k-{entry.mediaId}" value={entry.kind} onchange={(e) => setKind(i, e.currentTarget.value as Kind)}>
								<option value="gallery">Galerij</option>
								<option value="before">Voor (voor/na-paar)</option>
								<option value="after">Na (voor/na-paar)</option>
							</select>
							{#if item && oncover && coverId !== entry.mediaId}
								<button type="button" class="link-btn" onclick={() => oncover(item)}>Als omslag gebruiken</button>
							{/if}
						</div>
					</div>
					<div class="tools">
						<button type="button" data-move="up" aria-label="Foto {i + 1} omhoog" disabled={i === 0} onclick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
						<button type="button" data-move="down" aria-label="Foto {i + 1} omlaag" disabled={i === entries.length - 1} onclick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
						<button type="button" class="danger" aria-label="Foto {i + 1} verwijderen uit galerij" onclick={() => remove(i)}><Trash2 size={16} /></button>
					</div>
				</li>
			{/each}
		</ol>
	{/if}

	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<p class="hint">Voor/na: markeer telkens één foto als “Voor” en één als “Na”; ze worden in volgorde gekoppeld.</p>
	<p class="visually-hidden" aria-live="polite">{announce}</p>
</div>

<MediaPicker bind:open multiple {folder} exclude={entries.map((e) => e.mediaId)} title="Foto’s toevoegen aan galerij" onselect={add} />

<style>
	.gallery {
		display: grid;
		gap: var(--space-3);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.title {
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.sub,
	.hint {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
		padding: var(--space-8) var(--space-4);
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
	.list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}
	.item {
		display: grid;
		grid-template-columns: auto 96px 1fr auto;
		gap: var(--space-3);
		align-items: start;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.item[data-kind='before'],
	.item[data-kind='after'] {
		border-left: 3px solid var(--color-secondary);
	}
	.item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.item.dragging {
		opacity: 0.5;
	}
	.item.over {
		box-shadow: 0 -3px 0 var(--color-primary);
	}
	.handle {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding-top: var(--space-2);
		color: var(--color-text-muted);
		cursor: grab;
	}
	.pos {
		font-size: 11px;
		font-weight: 700;
	}
	.thumb {
		position: relative;
		width: 96px;
		aspect-ratio: 1;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-surface-sunken);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kind-tag,
	.cover-tag {
		position: absolute;
		left: 4px;
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		font-size: 10px;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}
	.kind-tag {
		bottom: 4px;
		background: var(--bark-50);
		color: var(--bark-700);
	}
	.cover-tag {
		top: 4px;
		background: var(--harvest);
		color: var(--neutral-900);
	}
	.fields {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
	}
	.row label {
		font-weight: 600;
	}
	.row select {
		height: 30px;
		padding: 0 var(--space-2);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-xs);
	}
	.link-btn {
		border: 0;
		background: none;
		padding: 0;
		color: var(--color-link);
		font-size: var(--text-xs);
		text-decoration: underline;
		cursor: pointer;
	}
	.tools {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.tools button {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.tools button:hover:not(:disabled) {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.tools button.danger:hover {
		color: var(--color-error);
	}
	.tools button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	button:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}
	.missing {
		font-size: var(--text-sm);
		color: var(--color-error);
	}
	.error {
		color: var(--color-error);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	@media (max-width: 640px) {
		.item {
			grid-template-columns: auto 64px 1fr;
		}
		.thumb {
			width: 64px;
		}
		.tools {
			grid-column: 1 / -1;
			flex-direction: row;
			justify-content: flex-end;
		}
	}
</style>
