<script lang="ts">
	import Phone from '@lucide/svelte/icons/phone';
	import Field from '$lib/components/form/Field.svelte';
	import { normalizePhone } from './phone';

	/**
	 * Phone input, Belgian (+32) by default. Accepts 04xx… / 0xx… / +32… / 00… and normalises on
	 * blur to "+32 470 12 34 56" (the server normalises again, so it works without JS).
	 */
	interface Props {
		label: string;
		name?: string;
		value?: string;
		helper?: string;
		error?: string | string[] | null;
		required?: boolean;
	}

	let { label, name = 'phone', value = '', helper, error, required = true }: Props = $props();
	const uid = $props.id();

	let current = $derived(value);

	function onblur() {
		const n = normalizePhone(current);
		if (n) current = n;
	}
</script>

<Field id="phone-{uid}" {label} {helper} {error} {required}>
	{#snippet control({ id, describedby, invalid })}
		<div class="phone">
			<span class="icon" aria-hidden="true"><Phone size={18} /></span>
			<input
				{id}
				{name}
				type="tel"
				class="control"
				bind:value={current}
				{onblur}
				{required}
				placeholder="+32 4xx xx xx xx"
				autocomplete="tel"
				inputmode="tel"
				maxlength="30"
				aria-describedby={describedby}
				aria-invalid={invalid || undefined}
			/>
		</div>
	{/snippet}
</Field>

<style>
	.phone {
		position: relative;
	}
	.icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}
	.phone :global(.control) {
		padding-left: 40px;
		font-variant-numeric: tabular-nums;
	}
</style>
