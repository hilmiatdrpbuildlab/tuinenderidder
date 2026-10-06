<script lang="ts">
	import { enhance } from '$app/forms';
	import SegmentedControl from '$lib/components/form/SegmentedControl.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import AddressField from '$lib/components/booking/AddressField.svelte';
	import ChoiceChips from '$lib/components/booking/ChoiceChips.svelte';
	import PhotoDrop from '$lib/components/booking/PhotoDrop.svelte';
	import StepHeader from '$lib/components/booking/StepHeader.svelte';
	import StepActions from '$lib/components/booking/StepActions.svelte';
	import { stepEnhance } from '$lib/components/booking/enhance';
	import { useWizard } from '$lib/components/booking/context';
	import { FREQUENCIES, FREQUENCY_LABELS, GARDEN_SIZES, GARDEN_SIZE_LABELS } from '$lib/domain';
	import { localizePath, translator } from '$lib/i18n';

	let { data, form } = $props();

	const t = $derived(translator(data.locale));
	const wizard = useWizard();
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
	const fieldErrors = $derived(errors && Object.keys(errors).some((k) => k !== 'photos'));

	let uploading = $state(false);
</script>

<svelte:head>
	<title>{t('booking.step.details')} · {t('booking.metaTitle')} · {t('meta.siteName')}</title>
</svelte:head>

<StepHeader
	title={t('booking.details.title')}
	intro={t('booking.details.intro')}
	error={fieldErrors ? t('booking.errorSummary') : null}
/>

<form
	id="booking-step-form"
	method="POST"
	action="?/next"
	enctype="multipart/form-data"
	novalidate
	use:enhance={(input) => {
		const isUpload = input.submitter?.getAttribute('formaction')?.includes('upload') ?? false;
		const handler = stepEnhance({
			pending: (b) => {
				if (isUpload) uploading = b;
				else wizard.busy = b;
			}
		});
		return handler(input);
	}}
>
	<!-- First submit button = implicit (Enter key) submission target: "Verder", not the photo upload. -->
	<button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true">{t('booking.next')}</button>

	<div class="sections">
		<section class="block">
			<ChoiceChips
				name="gardenSize"
				legend={t('booking.details.sizeLegend')}
				options={GARDEN_SIZES.map((s) => ({ value: s, label: GARDEN_SIZE_LABELS[s] }))}
				value={values.gardenSize}
				error={errors?.gardenSize}
				required
			/>

			{#if data.type === 'maintenance'}
				<div class="freq">
					<SegmentedControl
						name="frequency"
						legend={t('booking.details.frequencyLegend')}
						options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f][data.locale] }))}
						value={values.frequency}
					/>
				</div>
			{/if}
		</section>

		<section class="block">
			<AddressField
				locale={data.locale}
				street={values.street}
				postcode={values.postcode}
				municipality={values.municipality}
				errors={errors ?? {}}
				servicePrefixes={data.servicePrefixes}
				phone={data.company.phone}
			/>
		</section>

		<section class="block">
			<PhotoDrop
				locale={data.locale}
				photos={data.photos}
				max={data.maxPhotos}
				error={errors?.photos}
				busy={uploading}
				uploadAction="?/upload"
				removeAction="?/removePhoto"
			/>
			<Textarea
				name="notes"
				label={t('booking.details.notes')}
				optionalLabel={t('common.optional')}
				helper={t('booking.details.notesHelper')}
				value={values.notes}
				error={errors?.notes}
				maxlength={2000}
				rows={4}
			/>
		</section>
	</div>

	<StepActions
		backHref={localizePath('/boeken/dienst', data.locale)}
		backLabel={t('booking.prevStep')}
		submitLabel={t('booking.next')}
		busy={wizard.busy}
	/>
</form>

<style>
	.sections {
		display: grid;
		gap: var(--space-6);
	}
	.block {
		display: grid;
		gap: var(--space-6);
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
	}
	@media (min-width: 640px) {
		.block {
			padding: var(--space-8);
		}
	}
	.freq :global(legend) {
		font-size: var(--text-h4);
		color: var(--color-heading);
		margin-bottom: var(--space-3);
	}
</style>
