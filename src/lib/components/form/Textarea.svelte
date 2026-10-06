<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import Field from './Field.svelte';

	interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
		label: string;
		name: string;
		value?: string | null;
		helper?: string;
		error?: string | string[] | null;
		optionalLabel?: string;
		id?: string;
		class?: string;
	}

	let { label, name, value = $bindable(''), helper, error, required = false, optionalLabel, id, class: className, ...rest }: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `${name}-${uid}`);
</script>

<Field id={fieldId} {label} {helper} {error} required={!!required} {optionalLabel} class={className}>
	{#snippet control({ id, describedby, invalid })}
		<textarea
			{id}
			{name}
			class="control"
			bind:value
			required={!!required}
			aria-describedby={describedby}
			aria-invalid={invalid || undefined}
			{...rest}
		></textarea>
	{/snippet}
</Field>
