<script lang="ts">
	import Sunrise from '@lucide/svelte/icons/sunrise';
	import Sunset from '@lucide/svelte/icons/sunset';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { SLOT_LABELS, type SlotKind } from '$lib/domain';
	import { translator, type Locale } from '$lib/i18n';

	/** Radio-chip grid of half-day / consultation slots for one day (24 h times). */
	interface Props {
		locale: Locale;
		legend: string;
		slots: { id: number; slotKind: SlotKind; start: string; end: string; remaining: number }[];
		selected?: number | null;
		name?: string;
		error?: string | string[] | null;
	}

	let { locale, legend, slots, selected = null, name = 'slotId', error }: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();
	const message = $derived(Array.isArray(error) ? error[0] : error);
	const icons = { morning: Sunrise, afternoon: Sunset, consult: MessagesSquare };

</script>

<fieldset class="slots" aria-describedby={message ? `${uid}-error` : undefined}>
	<legend>{legend}</legend>
	{#if message}
		<p class="error" id="{uid}-error">
			<CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
			<span>{message}</span>
		</p>
	{/if}
	<div class="grid">
		{#each slots as slot (slot.id)}
			{@const Icon = icons[slot.slotKind]}
			{@const full = slot.remaining <= 0}
			<label class="slot" data-full={full || undefined}>
				<input
					class="visually-hidden"
					type="radio"
					{name}
					value={slot.id}
					checked={selected === slot.id}
					disabled={full}
					required
				/>
				<span class="icon" aria-hidden="true"><Icon size={22} strokeWidth={1.75} /></span>
				<span class="text">
					<span class="kind">{SLOT_LABELS[slot.slotKind][locale]}</span>
					<span class="time">{slot.start}–{slot.end}</span>
					<span class="left" data-limited={slot.remaining === 1 || undefined}>
						{full
							? t('booking.slots.full')
							: slot.remaining === 1
								? t('booking.slots.remainingOne')
								: t('booking.slots.remaining', { n: slot.remaining })}
					</span>
				</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.slots {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: var(--space-3);
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-heading);
	}
	legend::first-letter {
		text-transform: uppercase;
	}
	.error {
		display: flex;
		gap: 6px;
		align-items: flex-start;
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-error);
	}
	.grid {
		display: grid;
		gap: var(--space-3);
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
	}
	.slot {
		position: relative;
		display: flex;
		gap: var(--space-3);
		align-items: center;
		min-height: 72px;
		padding: var(--space-3) var(--space-4);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		cursor: pointer;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	.slot:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
	}
	.slot:has(input:checked) {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.slot:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.slot[data-full] {
		cursor: not-allowed;
		background: var(--color-bg-alt);
		border-color: var(--color-border);
		color: var(--neutral-500);
	}
	.icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--forest-50);
		color: var(--forest-700);
	}
	.slot:has(input:checked) .icon {
		background: rgb(255 255 255 / 0.16);
		color: var(--color-on-primary);
	}
	.text {
		display: grid;
		line-height: 1.3;
	}
	.kind {
		font-weight: 600;
	}
	.time {
		font-size: 1.125rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.left {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.left[data-limited] {
		color: var(--color-warning-text);
		font-weight: 600;
	}
	.slot:has(input:checked) .left {
		color: var(--color-on-primary);
	}
</style>
