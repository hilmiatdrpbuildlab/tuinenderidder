<script lang="ts">
	/** Big Barlow number + label ("8+ jaar ervaring"). Render inside a <dl> or list for semantics. */
	interface Props {
		value: string;
		label: string;
		tone?: 'default' | 'inverse';
	}

	let { value, label, tone = 'default' }: Props = $props();
</script>

<div class="stat" data-tone={tone}>
	<dt class="label">{label}</dt>
	<dd class="value">{value}</dd>
</div>

<style>
	.stat {
		display: flex;
		flex-direction: column-reverse;
		gap: var(--space-1);
		min-width: 0;
	}
	.value {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: clamp(2.75rem, 2.2rem + 2.4vw, 4rem);
		line-height: 0.9;
		color: var(--color-primary-hover);
		letter-spacing: -0.01em;
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	[data-tone='inverse'] .value {
		color: var(--linen-25);
	}
	[data-tone='inverse'] .label {
		color: var(--color-on-inverse-muted);
	}
</style>
