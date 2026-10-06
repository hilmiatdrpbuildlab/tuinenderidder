<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import Field from './Field.svelte';

	interface Option {
		value: string | number;
		label: string;
		disabled?: boolean;
	}

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		label: string;
		name: string;
		options: Option[];
		value?: string | number | null;
		placeholder?: string;
		helper?: string;
		error?: string | string[] | null;
		optionalLabel?: string;
		hideLabel?: boolean;
		id?: string;
		class?: string;
	}

	let {
		label,
		name,
		options,
		value = $bindable(''),
		placeholder,
		helper,
		error,
		required = false,
		optionalLabel,
		hideLabel,
		id,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `${name}-${uid}`);
</script>

<Field id={fieldId} {label} {helper} {error} required={!!required} {optionalLabel} {hideLabel} class={className}>
	{#snippet control({ id, describedby, invalid })}
		<select
			{id}
			{name}
			class="control"
			bind:value
			required={!!required}
			aria-describedby={describedby}
			aria-invalid={invalid || undefined}
			{...rest}
		>
			{#if placeholder}<option value="">{placeholder}</option>{/if}
			{#each options as opt (opt.value)}
				<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
			{/each}
		</select>
	{/snippet}
</Field>
