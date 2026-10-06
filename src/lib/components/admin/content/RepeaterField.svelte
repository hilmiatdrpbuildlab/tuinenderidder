<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import { useEditor } from './editor.svelte';

	/**
	 * List of rows with add / remove / reorder (drag handle + keyboard-friendly up/down buttons).
	 * Rows render their own inputs via the `row` snippet; repeated input names keep document order,
	 * so the server zips them back together.
	 */
	interface Props {
		label: string;
		items?: T[];
		create: () => T;
		row: Snippet<[T, number]>;
		/** Short label used in button names, e.g. "punt" → "Punt 2 verwijderen" */
		itemLabel?: string;
		addLabel?: string;
		max?: number;
		helper?: string;
		error?: string | null;
		emptyText?: string;
	}

	let {
		label,
		items = $bindable([]),
		create,
		row,
		itemLabel = 'rij',
		addLabel = 'Toevoegen',
		max = 20,
		helper,
		error,
		emptyText = 'Nog niets toegevoegd.'
	}: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	let announce = $state('');
	let dragIndex = $state<number | null>(null);
	let overIndex = $state<number | null>(null);
	let listEl: HTMLOListElement | undefined = $state();

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	// Stable keys for each row so inputs keep their state while reordering.
	// svelte-ignore state_referenced_locally
	let keys: number[] = $state(items.map((_, i) => i));
	// svelte-ignore state_referenced_locally
	let nextKey = items.length;
	$effect.pre(() => {
		while (keys.length < items.length) keys.push(nextKey++);
		if (keys.length > items.length) keys.length = items.length;
	});

	function move(from: number, to: number, focus = true) {
		if (to < 0 || to >= items.length || from === to) return;
		const next = [...items];
		const [it] = next.splice(from, 1);
		next.splice(to, 0, it);
		const k = [...keys];
		const [kk] = k.splice(from, 1);
		k.splice(to, 0, kk);
		keys = k;
		items = next;
		editor?.markDirty();
		announce = `${cap(itemLabel)} verplaatst naar positie ${to + 1} van ${items.length}.`;
		if (focus) {
			queueMicrotask(() => {
				const btn = listEl?.querySelectorAll<HTMLButtonElement>(`[data-move='${to > from ? 'down' : 'up'}']`)[to];
				(btn && !btn.disabled ? btn : listEl?.querySelectorAll<HTMLElement>('.row')[to])?.focus();
			});
		}
	}

	function add() {
		if (items.length >= max) return;
		keys = [...keys, nextKey++];
		items = [...items, create()];
		editor?.markDirty();
		announce = `${cap(itemLabel)} toegevoegd.`;
		queueMicrotask(() => {
			const rows = listEl?.querySelectorAll<HTMLElement>('.row');
			rows?.[rows.length - 1]?.querySelector<HTMLElement>('input, textarea, select')?.focus();
		});
	}

	function remove(i: number) {
		keys = keys.filter((_, j) => j !== i);
		items = items.filter((_, j) => j !== i);
		editor?.markDirty();
		announce = `${cap(itemLabel)} ${i + 1} verwijderd.`;
	}
</script>

<fieldset class="repeater" aria-describedby={error ? `${uid}-err` : helper ? `${uid}-help` : undefined}>
	<legend>{label}</legend>
	{#if helper}<p class="helper" id="{uid}-help">{helper}</p>{/if}

	{#if items.length === 0}
		<p class="empty">{emptyText}</p>
	{:else}
		<ol bind:this={listEl}>
			{#each items as item, i (keys[i] ?? i)}
				<li
					class="row"
					tabindex="-1"
					class:dragging={dragIndex === i}
					class:over={overIndex === i && dragIndex !== i}
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
					<span
						class="handle"
						draggable="true"
						role="presentation"
						title="Sleep om te verplaatsen"
						ondragstart={(e) => {
							dragIndex = i;
							e.dataTransfer?.setData('text/plain', String(i));
							if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
						}}
						ondragend={() => (dragIndex = overIndex = null)}
					>
						<GripVertical size={16} aria-hidden="true" />
					</span>
					<div class="body">{@render row(item, i)}</div>
					<div class="tools">
						<button type="button" data-move="up" aria-label="{cap(itemLabel)} {i + 1} omhoog" disabled={i === 0} onclick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
						<button type="button" data-move="down" aria-label="{cap(itemLabel)} {i + 1} omlaag" disabled={i === items.length - 1} onclick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
						<button type="button" class="danger" aria-label="{cap(itemLabel)} {i + 1} verwijderen" onclick={() => remove(i)}><Trash2 size={16} /></button>
					</div>
				</li>
			{/each}
		</ol>
	{/if}

	{#if error}<p class="error" id="{uid}-err">{error}</p>{/if}

	<button type="button" class="add" onclick={add} disabled={items.length >= max}>
		<Plus size={16} aria-hidden="true" />{addLabel}
	</button>
	<p class="visually-hidden" aria-live="polite">{announce}</p>
</fieldset>

<style>
	.repeater {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.helper,
	.empty {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.empty {
		padding: var(--space-3);
		border: 1.5px dashed var(--color-border);
		border-radius: var(--radius-sm);
		text-align: center;
	}
	ol {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}
	.row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: start;
		gap: var(--space-2);
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		transition: border-color var(--dur-fast) var(--ease-out);
	}
	.row:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.row.dragging {
		opacity: 0.5;
	}
	.row.over {
		border-color: var(--color-primary);
		box-shadow: 0 -3px 0 var(--color-primary);
	}
	.handle {
		display: grid;
		place-items: center;
		width: 24px;
		height: var(--control-h);
		color: var(--color-text-muted);
		cursor: grab;
	}
	.body {
		min-width: 0;
	}
	.tools {
		display: flex;
		gap: 2px;
		padding-top: 2px;
	}
	.tools button {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
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
	.tools button:focus-visible,
	.add:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}
	.add {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 var(--space-3);
		border: 1.5px dashed var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-primary);
		font-weight: 600;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.add:hover:not(:disabled) {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	.add:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		color: var(--color-error);
		font-size: var(--text-sm);
		font-weight: 500;
	}
</style>
