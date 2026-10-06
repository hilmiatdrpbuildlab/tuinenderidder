<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { useEditor } from './editor.svelte';

	/**
	 * Alt text for one image: NL required, EN optional (falls back to NL).
	 * Input names default to `alt.<id>.nl` / `alt.<id>.en` (editors save them with the entity).
	 */
	interface Props {
		id: number;
		altNl?: string;
		altEn?: string;
		nameNl?: string;
		nameEn?: string;
		compact?: boolean;
		error?: string | null;
		oninput?: () => void;
	}

	let {
		id,
		altNl = $bindable(''),
		altEn = $bindable(''),
		nameNl,
		nameEn,
		compact = false,
		error,
		oninput
	}: Props = $props();

	const editor = useEditor();
	const uid = $props.id();
	const missing = $derived(!altNl.trim());
	const changed = () => {
		editor?.markDirty();
		oninput?.();
	};
</script>

<div class="alt" class:compact>
	<div class="f">
		<label for="{uid}-nl">Alt-tekst NL <span class="req" aria-hidden="true">*</span></label>
		<input
			id="{uid}-nl"
			name={nameNl ?? `alt.${id}.nl`}
			class="control"
			class:missing
			bind:value={altNl}
			maxlength="250"
			placeholder="Beschrijf wat er op de foto staat"
			aria-invalid={missing || undefined}
			aria-describedby="{uid}-nl-help"
			oninput={changed}
		/>
		<p id="{uid}-nl-help" class="help" class:warn={missing}>
			{#if error}<CircleAlert size={14} aria-hidden="true" /> {error}
			{:else if missing}<CircleAlert size={14} aria-hidden="true" /> Verplicht om te publiceren.
			{:else if !compact}Kort en concreet, bv. “Terras in blauwe hardsteen met border”.{/if}
		</p>
	</div>
	<div class="f">
		<label for="{uid}-en">Alt-tekst EN <span class="opt">(optioneel)</span></label>
		<input
			id="{uid}-en"
			name={nameEn ?? `alt.${id}.en`}
			class="control"
			bind:value={altEn}
			maxlength="250"
			placeholder={altNl || 'Describe what is in the photo'}
			oninput={changed}
		/>
	</div>
</div>

<style>
	.alt {
		display: grid;
		gap: var(--space-3);
	}
	.alt.compact {
		gap: var(--space-2);
	}
	.f {
		display: grid;
		gap: 4px;
	}
	label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.compact label {
		font-size: var(--text-xs);
	}
	.req {
		color: var(--color-error);
	}
	.opt {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.control {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.compact .control {
		min-height: 32px;
	}
	.control:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.control.missing {
		border-color: var(--color-warning);
	}
	.control::placeholder {
		color: var(--color-text-placeholder);
	}
	.help {
		display: flex;
		align-items: center;
		gap: 4px;
		min-height: 0;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.help:empty {
		display: none;
	}
	.help.warn {
		color: var(--color-warning-text);
		font-weight: 600;
	}
	:global([data-theme='dark']) .help.warn {
		color: var(--harvest);
	}
</style>
