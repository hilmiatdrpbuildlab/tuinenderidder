<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Checkbox from '$lib/components/form/Checkbox.svelte';
	import PhoneField from '$lib/components/booking/PhoneField.svelte';
	import StepHeader from '$lib/components/booking/StepHeader.svelte';
	import StepActions from '$lib/components/booking/StepActions.svelte';
	import { stepEnhance } from '$lib/components/booking/enhance';
	import { useWizard } from '$lib/components/booking/context';
	import { FREQUENCY_LABELS, GARDEN_SIZE_LABELS, SLOT_LABELS, TYPE_LABELS } from '$lib/domain';
	import { formatLongDate, localizePath, translator } from '$lib/i18n';

	let { data, form } = $props();

	const t = $derived(translator(data.locale));
	const wizard = useWizard();
	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form && 'errors' in form ? form.errors : undefined);
	const s = $derived(data.summary);
	const isQuote = $derived(s.type === 'quote');
	const backHref = $derived(localizePath(isQuote ? '/boeken/details' : '/boeken/datum', data.locale));
	const datumHref = $derived(localizePath('/boeken/datum', data.locale));
	const stepError = $derived(
		form && 'message' in form && form.message ? form.message : errors ? t('booking.errorSummary') : null
	);
</script>

<svelte:head>
	<title>{t('booking.step.bevestigen')} · {t('booking.metaTitle')} · {t('meta.siteName')}</title>
</svelte:head>

<StepHeader title={t('booking.bevestigen.title')} intro={t('booking.bevestigen.intro')} error={form && 'slotFull' in form ? null : stepError} />

{#if form && 'slotFull' in form}
	<div class="slotfull" data-step-error tabindex="-1">
		<Alert tone="error" assertive title={t('booking.bevestigen.errorSlotFull')}>
			<a href={datumHref}>{t('booking.bevestigen.pickOther')}</a>
		</Alert>
	</div>
{/if}

<form id="booking-step-form" method="POST" novalidate use:enhance={stepEnhance({ pending: (b) => (wizard.busy = b) })}>
	<div class="sections">
		<fieldset class="block">
			<legend>{t('booking.contact.legend')}</legend>
			<TextField
				name="name"
				label={t('booking.contact.name')}
				value={values.name}
				error={errors?.name}
				required
				autocomplete="name"
				maxlength={120}
			/>
			<TextField
				name="email"
				type="email"
				label={t('booking.contact.email')}
				helper={t('booking.contact.emailHelper')}
				value={values.email}
				error={errors?.email}
				required
				autocomplete="email"
				inputmode="email"
				maxlength={200}
			/>
			<PhoneField
				label={t('booking.contact.phone')}
				helper={t('booking.contact.phoneHelper')}
				value={values.phone}
				error={errors?.phone}
			/>

			<!-- Honeypot: hidden from people and assistive tech; bots tend to fill every field. -->
			<div class="hp" aria-hidden="true">
				<label for="hp-website">{t('booking.honeypot')}</label>
				<input id="hp-website" type="text" name="website" tabindex="-1" autocomplete="off" />
			</div>
		</fieldset>

		<section class="block review" aria-labelledby="review-title">
			<h2 id="review-title">{t('booking.review.title')}</h2>
			<dl>
				<div class="row">
					<dt>{t('booking.review.type')}</dt>
					<dd>{s.type ? TYPE_LABELS[s.type][data.locale] : ''}</dd>
					<dd class="edit"><a href={s.links.dienst} aria-label={t('booking.summary.editLabel', { section: t('booking.review.type').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.services')}</dt>
					<dd>
						<ul class="services">
							{#each s.services as svc (svc.id)}
								<li><Icon name={svc.icon} size={18} /> {svc.title}</li>
							{/each}
						</ul>
					</dd>
					<dd class="edit"><a href={s.links.dienst} aria-label={t('booking.summary.editLabel', { section: t('booking.review.services').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.size')}</dt>
					<dd>
						{s.gardenSize ? GARDEN_SIZE_LABELS[s.gardenSize] : ''}
						{#if s.type === 'maintenance' && s.frequency}· {FREQUENCY_LABELS[s.frequency][data.locale]}{/if}
					</dd>
					<dd class="edit"><a href={s.links.details} aria-label={t('booking.summary.editLabel', { section: t('booking.review.size').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.date')}</dt>
					<dd>
						{#if isQuote}
							{t('booking.summary.noVisit')}
						{:else if s.slot}
							<span class="cap">{formatLongDate(s.slot.date, data.locale)}</span><br />
							{SLOT_LABELS[s.slot.slotKind][data.locale]} · {s.slot.start}–{s.slot.end}
						{/if}
					</dd>
					<dd class="edit">
						{#if s.links.datum}
							<a href={s.links.datum} aria-label={t('booking.summary.editLabel', { section: t('booking.review.date').toLowerCase() })}>{t('common.edit')}</a>
						{/if}
					</dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.address')}</dt>
					<dd>
						{#if s.address}{s.address.street}<br />{s.address.postcode} {s.address.municipality}{/if}
					</dd>
					<dd class="edit"><a href={s.links.details} aria-label={t('booking.summary.editLabel', { section: t('booking.review.address').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.photos')}</dt>
					<dd>
						{#if data.review.photos.length}
							<ul class="thumbs">
								{#each data.review.photos as photo, i (photo.id)}
									<li><img src={photo.src} alt={t('booking.photos.alt', { n: i + 1 })} width="56" height="56" loading="lazy" /></li>
								{/each}
							</ul>
						{:else}
							<span class="muted">{t('booking.review.none')}</span>
						{/if}
					</dd>
					<dd class="edit"><a href={s.links.details} aria-label={t('booking.summary.editLabel', { section: t('booking.review.photos').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
				<div class="row">
					<dt>{t('booking.review.notes')}</dt>
					<dd class="notes">
						{#if data.review.notes}{data.review.notes}{:else}<span class="muted">{t('booking.review.none')}</span>{/if}
					</dd>
					<dd class="edit"><a href={s.links.details} aria-label={t('booking.summary.editLabel', { section: t('booking.review.notes').toLowerCase() })}>{t('common.edit')}</a></dd>
				</div>
			</dl>
		</section>

		<div class="block consent">
			<Checkbox name="consent" checked={values.consent} error={errors?.consent} required>
				{t('booking.consent.before')}
				<a href={localizePath('/privacy', data.locale)} target="_blank" rel="noopener">{t('booking.consent.link')}</a>{t('booking.consent.after')}
				<span class="req" aria-hidden="true">*</span>
			</Checkbox>
			<Checkbox name="marketingOptIn" checked={values.marketingOptIn}>
				{t('booking.marketing.label')}
			</Checkbox>
		</div>
	</div>

	<StepActions
		{backHref}
		backLabel={t('booking.prevStep')}
		submitLabel={isQuote ? t('booking.confirmQuote') : t('booking.confirm')}
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
		gap: var(--space-5);
		margin: 0;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
		min-width: 0;
	}
	@media (min-width: 640px) {
		.block {
			padding: var(--space-8);
		}
	}
	legend,
	h2 {
		float: left;
		width: 100%;
		padding: 0;
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-heading);
	}
	legend + :global(*) {
		clear: both;
	}
	.slotfull {
		margin-bottom: var(--space-6);
		border-radius: var(--radius-md);
	}
	.slotfull:focus {
		outline: 2px solid var(--color-error);
		outline-offset: 2px;
	}

	/* review list */
	dl {
		display: grid;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2px var(--space-4);
		padding: var(--space-3) 0;
		border-top: 1px solid var(--color-border);
	}
	.row:first-child {
		border-top: 0;
	}
	@media (min-width: 640px) {
		.row {
			grid-template-columns: 10rem minmax(0, 1fr) auto;
		}
	}
	dt {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	dd {
		margin: 0;
		font-size: var(--text-sm);
		min-width: 0;
	}
	@media (max-width: 639px) {
		dt {
			grid-column: 1;
		}
		dd:not(.edit) {
			grid-column: 1;
		}
		dd.edit {
			grid-column: 2;
			grid-row: 1 / span 2;
		}
	}
	.edit a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-block: -12px;
		font-weight: 600;
	}
	.services {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.services li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
	}
	.services :global(svg) {
		color: var(--forest-700);
	}
	.cap {
		display: inline-block;
		font-weight: 600;
	}
	.cap::first-letter {
		text-transform: uppercase;
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.thumbs img {
		width: 56px;
		height: 56px;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}
	.notes {
		white-space: pre-line;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.consent {
		gap: var(--space-4);
	}
	.req {
		color: var(--color-error);
	}
	.hp {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
