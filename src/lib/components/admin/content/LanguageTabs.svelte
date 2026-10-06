<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { Lang } from './shared';

	/**
	 * NL / EN tabs for a translatable field group. Both panels stay in the DOM so every field posts;
	 * without JavaScript both are shown one after the other. `NL ●` filled = complete.
	 */
	interface Props {
		complete: Record<Lang, boolean>;
		/** Languages with validation errors — shown in red and auto-selected. */
		errors?: Partial<Record<Lang, boolean>>;
		active?: Lang;
		label?: string;
		/** Note shown in the EN panel when it is incomplete. */
		fallbackNote?: string;
		nl: Snippet;
		en: Snippet;
	}

	let {
		complete,
		errors = {},
		active = $bindable('nl'),
		label = 'Taal',
		fallbackNote = 'Lege Engelse velden vallen terug op de Nederlandse tekst.',
		nl,
		en
	}: Props = $props();

	const uid = $props.id();
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	const langs: { code: Lang; label: string; long: string }[] = [
		{ code: 'nl', label: 'NL', long: 'Nederlands' },
		{ code: 'en', label: 'EN', long: 'Engels' }
	];

	// Jump to the language that has errors after a failed save.
	$effect(() => {
		if (errors.nl) active = 'nl';
		else if (errors.en) active = 'en';
	});

	let tabEls: HTMLButtonElement[] = $state([]);

	function onKeydown(e: KeyboardEvent, i: number) {
		let next = -1;
		if (e.key === 'ArrowRight') next = (i + 1) % langs.length;
		else if (e.key === 'ArrowLeft') next = (i - 1 + langs.length) % langs.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = langs.length - 1;
		if (next < 0) return;
		e.preventDefault();
		active = langs[next].code;
		tabEls[next]?.focus();
	}
</script>

<div class="lang-tabs" class:enhanced>
	{#if enhanced}
		<div class="tablist" role="tablist" aria-label={label}>
			{#each langs as l, i (l.code)}
				{@const selected = active === l.code}
				<button
					bind:this={tabEls[i]}
					type="button"
					role="tab"
					id="{uid}-tab-{l.code}"
					aria-controls="{uid}-panel-{l.code}"
					aria-selected={selected}
					tabindex={selected ? 0 : -1}
					class:error={errors[l.code]}
					onclick={() => (active = l.code)}
					onkeydown={(e) => onKeydown(e, i)}
				>
					<span>{l.label}</span>
					<span class="dot" class:filled={complete[l.code]} aria-hidden="true"></span>
					<span class="visually-hidden">
						{l.long}{complete[l.code] ? ', volledig' : ', onvolledig'}{errors[l.code] ? ', bevat fouten' : ''}
					</span>
				</button>
			{/each}
			{#if !complete.en}
				<span class="fallback" title={fallbackNote}><TriangleAlert size={14} aria-hidden="true" /> EN valt terug op NL</span>
			{/if}
		</div>
	{/if}

	{#each langs as l (l.code)}
		<div
			class="panel"
			id="{uid}-panel-{l.code}"
			role={enhanced ? 'tabpanel' : undefined}
			aria-labelledby={enhanced ? `${uid}-tab-${l.code}` : undefined}
			hidden={enhanced && active !== l.code}
			lang={l.code}
		>
			{#if !enhanced}<p class="panel-title">{l.long}</p>{/if}
			{#if l.code === 'en' && !complete.en}
				<p class="note"><TriangleAlert size={14} aria-hidden="true" /> {fallbackNote}</p>
			{/if}
			<div class="fields">
				{#if l.code === 'nl'}{@render nl()}{:else}{@render en()}{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.lang-tabs {
		display: grid;
		gap: var(--space-4);
	}
	.tablist {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}
	[role='tab'] {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 var(--space-3);
		margin-bottom: -1px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	[role='tab']:hover {
		color: var(--color-text);
	}
	[role='tab'][aria-selected='true'] {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}
	[role='tab'].error {
		color: var(--color-error);
	}
	[role='tab']:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid currentColor;
	}
	.dot.filled {
		background: currentColor;
	}
	.fallback {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--color-warning-subtle);
		color: var(--color-warning-text);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.panel-title {
		font-weight: 700;
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
	}
	.note {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		color: var(--color-warning-text);
	}
	.fields {
		display: grid;
		gap: var(--space-4);
	}
	:global([data-theme='dark']) .fallback,
	:global([data-theme='dark']) .note {
		background: transparent;
		color: var(--harvest);
	}
</style>
