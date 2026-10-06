<script lang="ts">
	import Link2 from '@lucide/svelte/icons/link-2';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Field from '$lib/components/form/Field.svelte';
	import { slugify } from './shared';
	import { useEditor } from './editor.svelte';

	/**
	 * URL slug: follows the Dutch title until edited by hand, normalised with slugify(),
	 * availability checked against `checkUrl` (server enforces uniqueness on save too).
	 */
	interface Props {
		value?: string;
		/** NL title the slug follows while untouched */
		source: string;
		/** Public path prefix, e.g. '/diensten/' */
		prefix: string;
		/** GET endpoint returning { available: boolean } for ?slug=&exclude= */
		checkUrl: string;
		excludeId?: number | null;
		/** Existing content: never auto-change the slug. */
		locked?: boolean;
		error?: string | null;
		name?: string;
	}

	let { value = $bindable(''), source, prefix, checkUrl, excludeId = null, locked = false, error, name = 'slug' }: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	// svelte-ignore state_referenced_locally
	let touched = $state(locked || !!value);
	let status = $state<'idle' | 'checking' | 'ok' | 'taken'>('idle');

	$effect(() => {
		if (!touched) value = slugify(source);
	});

	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const slug = value;
		clearTimeout(timer);
		if (!slug || slug.length < 2) {
			status = 'idle';
			return;
		}
		status = 'checking';
		timer = setTimeout(async () => {
			try {
				const res = await fetch(`${checkUrl}?slug=${encodeURIComponent(slug)}${excludeId ? `&exclude=${excludeId}` : ''}`);
				const data = (await res.json()) as { available: boolean };
				if (slug === value) status = data.available ? 'ok' : 'taken';
			} catch {
				status = 'idle';
			}
		}, 350);
		return () => clearTimeout(timer);
	});

	const message = $derived(error ?? (status === 'taken' ? 'Deze slug is al in gebruik.' : null));
</script>

<Field
	id="{name}-{uid}"
	label="Slug (URL)"
	required
	error={message}
	helper={locked ? 'Let op: een gewijzigde slug breekt bestaande links naar deze pagina.' : 'Wordt automatisch gemaakt uit de Nederlandse titel.'}
>
	{#snippet control({ id, describedby, invalid })}
		<div class="slug" class:invalid>
			<span class="prefix" aria-hidden="true"><Link2 size={14} />{prefix}</span>
			<input
				{id}
				{name}
				class="input"
				bind:value
				spellcheck="false"
				autocomplete="off"
				aria-describedby="{describedby ?? ''} {id}-status"
				aria-invalid={invalid || undefined}
				oninput={() => {
					touched = true;
					editor?.markDirty();
				}}
				onblur={() => (value = slugify(value))}
			/>
			<span class="state" id="{id}-status" aria-live="polite">
				{#if status === 'ok'}<Check size={16} aria-hidden="true" /><span class="visually-hidden">Beschikbaar</span>
				{:else if status === 'taken'}<CircleAlert size={16} aria-hidden="true" /><span class="visually-hidden">Al in gebruik</span>{/if}
			</span>
		</div>
		{#if touched && !locked && source}
			<button type="button" class="reset" onclick={() => { touched = false; editor?.markDirty(); }}>Opnieuw uit titel maken</button>
		{/if}
	{/snippet}
</Field>

<style>
	.slug {
		display: flex;
		align-items: center;
		min-height: var(--control-h);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		overflow: hidden;
	}
	.slug:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.slug.invalid {
		border-color: var(--color-error);
	}
	.prefix {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		align-self: stretch;
		padding: 0 var(--space-2) 0 var(--space-3);
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
	.input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0 var(--space-2);
		border: 0;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}
	.state {
		display: inline-flex;
		padding-right: var(--space-2);
		color: var(--color-success);
	}
	.invalid .state {
		color: var(--color-error);
	}
	.reset {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-link);
		font-size: var(--text-xs);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
