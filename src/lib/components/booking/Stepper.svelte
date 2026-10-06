<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import type { StepItem } from './types';

	/**
	 * Wizard progress (design §4.1). Horizontal numbered steps on ≥ md; compact
	 * "Stap 2 van 4 · Details" + segmented bar on mobile. Complete, reachable steps are links.
	 */
	interface Props {
		steps: StepItem[];
		label: string;
		/** "Stap {n} van {total}" already filled in */
		compactLabel: string;
		stateLabels: { complete: string; current: string; upcoming: string };
	}

	let { steps, label, compactLabel, stateLabels }: Props = $props();

	const current = $derived(steps.find((s) => s.state === 'current'));
</script>

<nav class="stepper" aria-label={label}>
	<p class="compact" aria-hidden="true">
		<span class="compact-text"><strong>{compactLabel}</strong> · {current?.label}</span>
		<span class="bar">
			{#each steps as step (step.key)}
				<span class="seg" data-state={step.state}></span>
			{/each}
		</span>
	</p>
	<ol>
		{#each steps as step, i (step.key)}
			<li data-state={step.state}>
				{#if step.state !== 'current' && step.reachable && step.state === 'complete'}
					<a href={step.href} class="step">
						<span class="dot" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
						<span class="name">{step.label}</span>
						<span class="visually-hidden">({stateLabels.complete})</span>
					</a>
				{:else}
					<span class="step" aria-current={step.state === 'current' ? 'step' : undefined}>
						<span class="dot" aria-hidden="true">
							{#if step.state === 'complete'}<Check size={16} strokeWidth={3} />{:else}{i + 1}{/if}
						</span>
						<span class="name">{step.label}</span>
						<span class="visually-hidden">({stateLabels[step.state]})</span>
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.stepper {
		margin-bottom: var(--space-8);
	}

	/* ---------- mobile: compact bar */
	.compact {
		display: grid;
		gap: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.compact strong {
		color: var(--color-text);
		font-weight: 600;
	}
	.bar {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 4px;
	}
	.seg {
		height: 6px;
		border-radius: var(--radius-pill);
		background: var(--linen-200);
	}
	.seg[data-state='complete'],
	.seg[data-state='current'] {
		background: var(--color-primary);
	}
	.seg[data-state='current'] {
		background: linear-gradient(90deg, var(--color-primary) 50%, var(--forest-200) 50%);
	}

	/* Below md the list stays available to screen readers; the compact bar is its visual stand-in. */
	ol {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	/* ---------- ≥ md: numbered steps on a track */
	@media (min-width: 640px) {
		.compact {
			display: none;
		}
		ol {
			position: static;
			width: auto;
			height: auto;
			margin: 0;
			overflow: visible;
			clip: auto;
			white-space: normal;
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 1fr;
			list-style: none;
			padding: 0;
		}
		li {
			position: relative;
			display: flex;
			justify-content: center;
		}
		/* 2px track joining the circles */
		li + li::before {
			content: '';
			position: absolute;
			top: 19px;
			right: calc(50% + 22px);
			left: calc(-50% + 22px);
			height: 2px;
			background: var(--linen-200);
		}
		li[data-state='complete'] + li::before,
		li[data-state='complete'] + li[data-state='current']::before {
			background: var(--color-primary);
		}
		.step {
			display: grid;
			justify-items: center;
			gap: var(--space-2);
			min-width: 44px;
			min-height: 44px;
			padding: 4px var(--space-2);
			border-radius: var(--radius-md);
			color: var(--color-text-muted);
			text-decoration: none;
			font-size: var(--text-sm);
			text-align: center;
		}
		a.step:hover .name {
			color: var(--color-primary-hover);
			text-decoration: underline;
		}
		.dot {
			display: grid;
			place-items: center;
			width: 32px;
			height: 32px;
			border-radius: 50%;
			border: 2px solid var(--linen-200);
			background: var(--color-surface);
			font-weight: 600;
			font-size: var(--text-sm);
			color: var(--color-text-muted);
			transition:
				background-color var(--dur-fast) var(--ease-out),
				border-color var(--dur-fast) var(--ease-out);
		}
		[data-state='complete'] .dot {
			background: var(--color-primary);
			border-color: var(--color-primary);
			color: var(--color-on-primary);
		}
		[data-state='current'] .dot {
			border-color: var(--color-primary);
			color: var(--color-primary-hover);
			box-shadow: 0 0 0 4px var(--forest-50);
		}
		[data-state='current'] .name {
			color: var(--color-text);
			font-weight: 700;
		}
		[data-state='complete'] .name {
			color: var(--color-text);
		}
	}
</style>
