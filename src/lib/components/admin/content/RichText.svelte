<script lang="ts">
	import { onMount } from 'svelte';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import LinkIcon from '@lucide/svelte/icons/link';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Heading3 from '@lucide/svelte/icons/heading-3';
	import Field from '$lib/components/form/Field.svelte';
	import { useEditor } from './editor.svelte';

	/**
	 * Lightweight rich-text editor (bold, italic, link, lists, H3) on contenteditable.
	 * A hidden input carries the HTML so the form posts normally; the server runs sanitizeHtml().
	 * Without JavaScript it degrades to a plain HTML textarea.
	 */
	interface Props {
		name: string;
		label: string;
		value?: string;
		helper?: string;
		error?: string | null;
		required?: boolean;
		minHeight?: string;
	}

	let { name, label, value = $bindable(''), helper, error, required = false, minHeight = '200px' }: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	const fieldId = $derived(`${name.replace(/\W/g, '-')}-${uid}`);
	let enhanced = $state(false);
	let el: HTMLDivElement | undefined = $state();
	let active = $state<Record<string, boolean>>({});

	onMount(() => {
		enhanced = true;
	});

	// Seed the editable area once it exists (and when the value is replaced from outside).
	$effect(() => {
		if (el && el.innerHTML !== value && document.activeElement !== el) el.innerHTML = value || '<p></p>';
	});

	function sync() {
		if (!el) return;
		const html = el.innerHTML.replace(/<p><br><\/p>/g, '').trim();
		value = html === '<p></p>' ? '' : html;
		editor?.markDirty();
		refreshState();
	}

	function refreshState() {
		try {
			const block = String(document.queryCommandValue('formatBlock')).toLowerCase();
			active = {
				bold: document.queryCommandState('bold'),
				italic: document.queryCommandState('italic'),
				ul: document.queryCommandState('insertUnorderedList'),
				ol: document.queryCommandState('insertOrderedList'),
				h3: block === 'h3'
			};
		} catch {
			/* not supported */
		}
	}

	function exec(cmd: string, arg?: string) {
		el?.focus();
		document.execCommand(cmd, false, arg);
		sync();
	}

	function toggleH3() {
		exec('formatBlock', active.h3 ? 'p' : 'h3');
	}

	function link() {
		const sel = window.getSelection();
		const current = sel?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? 'https://';
		const url = prompt('Link (https://…, /pagina of mailto:)', current);
		if (url === null) return;
		if (url.trim() === '') exec('unlink');
		else if (/^(https?:|mailto:|tel:|\/|#)/i.test(url.trim())) exec('createLink', url.trim());
		else alert('Gebruik een link die begint met https://, / of mailto:');
	}

	function onKeydown(e: KeyboardEvent) {
		if (!(e.ctrlKey || e.metaKey)) return;
		const k = e.key.toLowerCase();
		if (k === 'b') {
			e.preventDefault();
			exec('bold');
		} else if (k === 'i') {
			e.preventDefault();
			exec('italic');
		} else if (k === 'k') {
			e.preventDefault();
			link();
		}
	}

	function onPaste(e: ClipboardEvent) {
		// Paste as plain text paragraphs; the server sanitizer is the final gate anyway.
		const text = e.clipboardData?.getData('text/plain');
		if (text == null) return;
		e.preventDefault();
		const html = text
			.split(/\n{2,}/)
			.map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
			.join('');
		document.execCommand('insertHTML', false, html);
		sync();
	}

	const tools = [
		{ key: 'bold', label: 'Vet (Ctrl+B)', Icon: Bold, run: () => exec('bold') },
		{ key: 'italic', label: 'Cursief (Ctrl+I)', Icon: Italic, run: () => exec('italic') },
		{ key: 'link', label: 'Link (Ctrl+K)', Icon: LinkIcon, run: link },
		{ key: 'ul', label: 'Opsomming', Icon: List, run: () => exec('insertUnorderedList') },
		{ key: 'ol', label: 'Genummerde lijst', Icon: ListOrdered, run: () => exec('insertOrderedList') },
		{ key: 'h3', label: 'Tussenkop (H3)', Icon: Heading3, run: toggleH3 }
	];
</script>

<Field id={fieldId} {label} {helper} {error} {required}>
	{#snippet control({ id, describedby, invalid })}
		{#if enhanced}
			<div class="rte" class:invalid>
				<div class="toolbar" role="toolbar" aria-label="Opmaak {label}" aria-controls={id}>
					{#each tools as t (t.key)}
						<button
							type="button"
							class="tool"
							title={t.label}
							aria-label={t.label}
							aria-pressed={t.key === 'link' ? undefined : !!active[t.key]}
							onmousedown={(e) => e.preventDefault()}
							onclick={t.run}
						>
							<t.Icon size={16} strokeWidth={2} aria-hidden="true" />
						</button>
					{/each}
				</div>
				<div
					bind:this={el}
					{id}
					class="area prose"
					style:min-height={minHeight}
					contenteditable="true"
					role="textbox"
					aria-multiline="true"
					aria-labelledby="{id}-label"
					aria-describedby={describedby}
					aria-invalid={invalid || undefined}
					tabindex="0"
					oninput={sync}
					onkeyup={refreshState}
					onmouseup={refreshState}
					onfocus={refreshState}
					onkeydown={onKeydown}
					onpaste={onPaste}
				></div>
				<span id="{id}-label" class="visually-hidden">{label}</span>
			</div>
			<input type="hidden" {name} {value} />
		{:else}
			<textarea {id} {name} class="control mono-area" rows="10" aria-describedby={describedby} aria-invalid={invalid || undefined}>{value}</textarea>
		{/if}
	{/snippet}
</Field>

<style>
	.rte {
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		overflow: hidden;
	}
	.rte:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.rte.invalid {
		border-color: var(--color-error);
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 4px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-sunken);
	}
	.tool {
		display: inline-grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.tool:hover {
		background: var(--color-surface);
		color: var(--color-text);
	}
	.tool[aria-pressed='true'] {
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.tool:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}
	.area {
		padding: var(--space-3);
		max-height: 520px;
		overflow-y: auto;
		outline: none;
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--color-text);
	}
	.area :global(h3) {
		font-family: var(--font-body);
		font-size: 1.05rem;
		font-weight: 700;
		margin-top: var(--space-3);
	}
	.area :global(h2) {
		font-family: var(--font-body);
		font-size: 1.15rem;
		font-weight: 700;
		margin-top: var(--space-3);
	}
	.area :global(ul),
	.area :global(ol) {
		padding-left: 1.4em;
	}
	.area :global(a) {
		color: var(--color-link);
		text-decoration: underline;
	}
	.mono-area {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
</style>
