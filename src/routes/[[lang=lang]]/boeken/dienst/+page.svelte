<script lang="ts">
	import { enhance } from '$app/forms';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import ServiceTileGroup, { type TileOption } from '$lib/components/booking/ServiceTileGroup.svelte';
	import StepHeader from '$lib/components/booking/StepHeader.svelte';
	import StepActions from '$lib/components/booking/StepActions.svelte';
	import { stepEnhance } from '$lib/components/booking/enhance';
	import { useWizard } from '$lib/components/booking/context';
	import { BOOKING_TYPES, type BookingType } from '$lib/domain';
	import { formatPrice, localizePath, translator } from '$lib/i18n';

	let { data, form } = $props();

	const t = $derived(translator(data.locale));
	const wizard = useWizard();
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors);

	// Live summary while choosing; cleared when leaving the step (the saved draft takes over).
	let pickedType = $derived(values.type ?? null);
	let pickedServices = $derived(values.serviceIds.map(String));
	$effect(() => {
		wizard.preview = { type: pickedType, serviceIds: pickedServices.map(Number) };
		return () => (wizard.preview = null);
	});

	const typeIcons = { consultation: MessagesSquare, maintenance: CalendarCheck, quote: FileText };
	const typeOptions: TileOption[] = $derived(
		BOOKING_TYPES.map((type) => ({
			value: type,
			title: t(`booking.type.${type}.title`),
			description: t(`booking.type.${type}.text`),
			meta: t(`booking.type.${type}.meta`),
			iconComponent: typeIcons[type]
		}))
	);
	const serviceOptions: TileOption[] = $derived(
		data.services.map((s) => ({
			value: String(s.id),
			title: s.title,
			description: s.summary,
			meta:
				s.priceMode === 'fixed' && s.priceFrom != null
					? t('common.priceFrom', { price: formatPrice(s.priceFrom, data.locale) })
					: t('common.priceOnQuote'),
			icon: s.icon
		}))
	);
</script>

<svelte:head>
	<title>{t('booking.step.dienst')} · {t('booking.metaTitle')} · {t('meta.siteName')}</title>
	<meta name="description" content={t('booking.metaDescription')} />
</svelte:head>

<StepHeader
	title={t('booking.dienst.title')}
	intro={t('booking.dienst.intro')}
	error={errors ? t('booking.errorSummary') : null}
/>

<form
	id="booking-step-form"
	method="POST"
	novalidate
	use:enhance={stepEnhance({ pending: (b) => (wizard.busy = b) })}
>
	<div class="stack-lg">
		<ServiceTileGroup
			mode="single"
			name="type"
			legend={t('booking.dienst.typeLegend')}
			options={typeOptions}
			value={values.type ? [values.type] : []}
			error={errors?.type}
			columns={3}
			onchange={(v) => (pickedType = (v[0] as BookingType) ?? null)}
		/>
		<ServiceTileGroup
			mode="multi"
			name="services"
			legend={t('booking.dienst.servicesLegend')}
			helper={t('booking.dienst.servicesHelper')}
			options={serviceOptions}
			value={values.serviceIds.map(String)}
			error={errors?.services}
			columns={2}
			onchange={(v) => (pickedServices = v)}
		/>
	</div>

	<StepActions
		backHref={localizePath('/', data.locale)}
		backLabel={t('booking.backToSite')}
		submitLabel={t('booking.next')}
		busy={wizard.busy}
	/>
</form>

<style>
	.stack-lg {
		display: grid;
		gap: var(--space-10);
	}
</style>
