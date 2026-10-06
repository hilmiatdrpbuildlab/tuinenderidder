<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import DatePicker from '$lib/components/booking/DatePicker.svelte';
	import TimeSlotGrid from '$lib/components/booking/TimeSlotGrid.svelte';
	import StepHeader from '$lib/components/booking/StepHeader.svelte';
	import StepActions from '$lib/components/booking/StepActions.svelte';
	import { stepEnhance } from '$lib/components/booking/enhance';
	import { useWizard } from '$lib/components/booking/context';
	import { formatLongDate, localizePath, translator } from '$lib/i18n';

	let { data, form } = $props();

	const t = $derived(translator(data.locale));
	const wizard = useWizard();
	const errors = $derived(form?.errors);
	const hasAny = $derived(Object.values(data.days).some((n) => n > 0));
	const base = $derived(localizePath('/boeken/datum', data.locale));

	function href(month: string, day?: string) {
		return `${base}?maand=${month}${day ? `&dag=${day}` : ''}`;
	}
</script>

<svelte:head>
	<title>{t('booking.step.datum')} · {t('booking.metaTitle')} · {t('meta.siteName')}</title>
</svelte:head>

<StepHeader
	title={t('booking.datum.title')}
	intro={t('booking.datum.intro')}
	error={form && 'full' in form ? t('booking.datum.errorFull') : null}
/>

<form id="booking-step-form" method="POST" novalidate use:enhance={stepEnhance({ pending: (b) => (wizard.busy = b) })}>
	<div class="layout">
		<DatePicker
			locale={data.locale}
			month={data.month}
			days={data.days}
			selected={data.selectedDate}
			today={data.today}
			minMonth={data.minMonth}
			maxMonth={data.maxMonth}
			{href}
		/>

		{#if !hasAny}
			<EmptyState title={t('booking.datum.emptyTitle')} text={t('booking.datum.emptyText')} compact>
				{#snippet icon()}<CalendarX size={28} strokeWidth={1.5} />{/snippet}
				{#snippet actions()}
					{#if data.nextMonth}
						<Button variant="outline" href={href(data.nextMonth)} data-sveltekit-noscroll>{t('booking.datum.nextMonth')}</Button>
					{/if}
				{/snippet}
			</EmptyState>
		{:else if data.selectedDate}
			<div class="slots" aria-live="polite">
				<TimeSlotGrid
					locale={data.locale}
					legend={t('booking.slots.legend', { date: formatLongDate(data.selectedDate, data.locale) })}
					slots={data.slots}
					selected={data.selectedSlotId}
					error={form && 'full' in form ? null : errors?.slotId}
				/>
				<p class="held">{t('booking.datum.held', { minutes: data.holdMinutes })}</p>
			</div>
		{:else}
			<p class="muted">{t('booking.slots.noDay')}</p>
		{/if}

		<Alert tone="info" title={t('booking.datum.weatherTitle')}>{t('booking.datum.weather')}</Alert>
	</div>

	<StepActions
		backHref={localizePath('/boeken/details', data.locale)}
		backLabel={t('booking.prevStep')}
		submitLabel={t('booking.next')}
		busy={wizard.busy}
	/>
</form>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
	}
	.slots {
		display: grid;
		gap: var(--space-3);
	}
	.held,
	.muted {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
</style>
