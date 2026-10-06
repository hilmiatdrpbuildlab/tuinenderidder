<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from './Field.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label: string;
		name: string;
		value?: string | number | null;
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
		value = $bindable(''),
		helper,
		error,
		required = false,
		optionalLabel,
		hideLabel,
		id,
		class: className,
		type = 'text',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `${name}-${uid}`);
</script>

<Field id={fieldId} {label} {helper} {error} required={!!required} {optionalLabel} {hideLabel} class={className}>
	{#snippet control({ id, describedby, invalid })}
		<input
			{id}
			{name}
			{type}
			class="control"
			bind:value
			required={!!required}
			aria-describedby={describedby}
			aria-invalid={invalid || undefined}
			{...rest}
		/>
	{/snippet}
</Field>
