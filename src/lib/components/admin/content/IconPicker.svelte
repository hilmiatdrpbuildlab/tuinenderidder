<script lang="ts">
	import Icon, { iconNames } from '$lib/components/ui/Icon.svelte';
	import { useEditor } from './editor.svelte';

	/** Icon choice as a native radio group (arrow keys work, posts without JS). */
	interface Props {
		name: string;
		label: string;
		value?: string;
		compact?: boolean;
		hideLabel?: boolean;
	}

	let { name, label, value = $bindable('leaf'), compact = false, hideLabel = false }: Props = $props();
	const editor = useEditor();
	const uid = $props.id();

	const labels: Record<string, string> = {
		shovel: 'Schop',
		shears: 'Snoeischaar',
		scissors: 'Schaar',
		tree: 'Loofboom',
		'tree-pine': 'Naaldboom',
		sprout: 'Kiemplant',
		leaf: 'Blad',
		fence: 'Afsluiting',
		flower: 'Bloem',
		droplets: 'Water',
		hammer: 'Hamer',
		axe: 'Bijl',
		sun: 'Zon',
		lawnmower: 'Grasmaaier',
		grass: 'Gras',
		hedge: 'Haag'
	};
</script>

<fieldset class="icons" class:compact>
	<legend class:visually-hidden={hideLabel}>{label}</legend>
	<div class="grid">
		{#each iconNames as icon (icon)}
			<label class="opt" title={labels[icon] ?? icon}>
				<input type="radio" {name} value={icon} id="{uid}-{icon}" bind:group={value} onchange={() => editor?.markDirty()} />
				<Icon name={icon} size={compact ? 18 : 22} />
				<span class="visually-hidden">{labels[icon] ?? icon}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.icons {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
		gap: 4px;
	}
	.compact .grid {
		grid-template-columns: repeat(auto-fill, 32px);
	}
	.opt {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.opt:hover {
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}
	.opt:has(input:checked) {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.opt:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
</style>
