<script lang="ts">
	import { initials } from './format';

	/** Initials avatar. The name is always available to assistive tech (title + visually hidden text when `labelled`). */
	interface Props {
		name: string;
		size?: number;
		/** Render the name as screen-reader text (when no visible name sits next to it). */
		labelled?: boolean;
	}

	let { name, size = 28, labelled = false }: Props = $props();
</script>

<span class="avatar" style:--size="{size}px" title={name}>
	<span aria-hidden="true">{initials(name)}</span>
	{#if labelled}<span class="visually-hidden">{name}</span>{/if}
</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		flex-shrink: 0;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: var(--color-primary-subtle);
		color: var(--color-primary-hover);
		font-size: calc(var(--size) * 0.4);
		font-weight: 700;
		line-height: 1;
	}
</style>
