<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type'> {
		name: string;
		label: string;
		checked?: boolean;
		description?: string;
	}

	let { name, label, checked = $bindable(false), description, value = 'on', ...rest }: Props = $props();
	const uid = $props.id();
	const id = $derived(`${name}-${uid}`);
</script>

<div class="toggle">
	<input {id} type="checkbox" role="switch" {name} {value} bind:checked aria-describedby={description ? `${id}-desc` : undefined} {...rest} />
	<label for={id}>
		<span class="label">{label}</span>
		{#if description}<span class="desc" id="{id}-desc">{description}</span>{/if}
	</label>
</div>

<style>
	.toggle {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}
	input {
		appearance: none;
		flex-shrink: 0;
		position: relative;
		width: 40px;
		height: 24px;
		margin: 0;
		border-radius: var(--radius-pill);
		background: var(--neutral-500);
		cursor: pointer;
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	input::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--white);
		box-shadow: var(--shadow-1);
		transition: transform var(--dur-fast) var(--ease-out);
	}
	input:checked {
		background: var(--color-primary);
	}
	input:checked::after {
		transform: translateX(16px);
	}
	input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	label {
		display: grid;
		gap: 2px;
		cursor: pointer;
		font-size: var(--text-sm);
	}
	.label {
		font-weight: 600;
	}
	.desc {
		color: var(--color-text-muted);
	}
</style>
