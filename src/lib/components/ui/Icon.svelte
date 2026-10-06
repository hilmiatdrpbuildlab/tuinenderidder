<script lang="ts" module>
	import Shovel from '@lucide/svelte/icons/shovel';
	import Scissors from '@lucide/svelte/icons/scissors';
	import TreeDeciduous from '@lucide/svelte/icons/tree-deciduous';
	import TreePine from '@lucide/svelte/icons/tree-pine';
	import Sprout from '@lucide/svelte/icons/sprout';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Fence from '@lucide/svelte/icons/fence';
	import Flower from '@lucide/svelte/icons/flower-2';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Hammer from '@lucide/svelte/icons/hammer';
	import Axe from '@lucide/svelte/icons/axe';
	import Sun from '@lucide/svelte/icons/sun';

	/** Data-driven icons (services, features) by name. Garden-specific ones are drawn below on the same 24px grid. */
	const lucide = {
		shovel: Shovel,
		shears: Scissors,
		scissors: Scissors,
		tree: TreeDeciduous,
		'tree-pine': TreePine,
		sprout: Sprout,
		leaf: Leaf,
		fence: Fence,
		flower: Flower,
		droplets: Droplets,
		hammer: Hammer,
		axe: Axe,
		sun: Sun
	} as const;

	export const iconNames = [...Object.keys(lucide), 'lawnmower', 'grass', 'hedge'] as const;
	export type IconName = (typeof iconNames)[number];
</script>

<script lang="ts">
	interface Props {
		name: IconName | string;
		size?: number;
		strokeWidth?: number;
		class?: string;
		'aria-label'?: string;
	}

	let { name, size = 24, strokeWidth = 1.75, class: className, 'aria-label': ariaLabel }: Props = $props();

	const Lucide = $derived(lucide[name as keyof typeof lucide]);
</script>

{#if Lucide}
	<Lucide {size} {strokeWidth} class={className} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : 'true'} />
{:else}
	<svg
		class={className}
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		role={ariaLabel ? 'img' : undefined}
		aria-label={ariaLabel}
		aria-hidden={ariaLabel ? undefined : 'true'}
	>
		{#if name === 'lawnmower'}
			<path d="M3 8l4 6" />
			<path d="M7 14h11a2 2 0 0 1 2 2v1H5v-1a2 2 0 0 1 2-2Z" />
			<path d="M10 14v-3h6l2 3" />
			<circle cx="7.5" cy="19" r="2" />
			<circle cx="17.5" cy="19" r="2" />
		{:else if name === 'grass'}
			<path d="M3 20h18" />
			<path d="M6 20c0-5-1.5-8-3-10" />
			<path d="M9 20c0-6 1-10 3-13" />
			<path d="M12 20c0-4 1.5-7 4-9" />
			<path d="M16 20c0-3 1.5-6 5-8" />
		{:else if name === 'hedge'}
			<path d="M3 20h18" />
			<path d="M4 20v-7a4 4 0 0 1 4-4 4 4 0 0 1 8 0 4 4 0 0 1 4 4v7" />
			<path d="M9 15h.01M14 13h.01M12 17h.01M17 16h.01M7 17h.01" />
		{:else}
			<circle cx="12" cy="12" r="8" />
		{/if}
	</svg>
{/if}
