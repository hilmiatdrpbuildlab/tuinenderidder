<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import Save from '@lucide/svelte/icons/save';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';

	let { data, form } = $props();

	let hydrated = $state(false);
	let savingCompany = $state(false);
	let savingBooking = $state(false);
	onMount(() => (hydrated = true));

	const companyForm = $derived(form?.form === 'company' ? form : null);
	const bookingForm = $derived(form?.form === 'booking' ? form : null);
	const companyFail = $derived(companyForm && 'errors' in companyForm ? companyForm : null);
	const bookingFail = $derived(bookingForm && 'errors' in bookingForm ? bookingForm : null);

	/** Submitted value on failure, otherwise the stored setting. */
	function c(key: keyof typeof data.company) {
		return companyFail?.values?.[key] ?? data.company[key];
	}
	function b(key: Exclude<keyof typeof data.booking, 'servicePostcodes'>) {
		return bookingFail?.values?.[key] ?? data.booking[key];
	}
	const postcodes = $derived(bookingFail?.values?.servicePostcodes ?? data.booking.servicePostcodes.join(', '));
	const ce = (key: string) => companyFail?.errors?.[key];
	const be = (key: string) => bookingFail?.errors?.[key];
</script>

<PageHeader title="Instellingen" description="Bedrijfsgegevens voor de website en regels voor online boeken." />

<div class="stack">
	<Panel title="Bedrijfsgegevens" description="Verschijnen in de footer, op de contactpagina en in e-mails.">
		{#if !hydrated && companyForm?.message}
			<Alert tone={companyFail ? 'error' : 'success'}>{companyForm.message}</Alert>
		{/if}
		<form method="POST" action="?/company" novalidate use:enhance={enhanceToast({ pending: (v) => (savingCompany = v) })}>
			<fieldset>
				<legend>Algemeen</legend>
				<div class="grid">
					<TextField label="Bedrijfsnaam" name="name" required value={c('name')} error={ce('name')} autocomplete="organization" />
					<TextField label="Btw-nummer" name="vat" value={c('vat')} error={ce('vat')} helper="Bv. BE0676.915.587" />
					<TextField label="Straat en nummer" name="street" required value={c('street')} error={ce('street')} autocomplete="street-address" />
					<div class="grid inner">
						<TextField label="Postcode" name="postcode" required inputmode="numeric" maxlength={4} value={c('postcode')} error={ce('postcode')} autocomplete="postal-code" />
						<TextField label="Gemeente" name="town" required value={c('town')} error={ce('town')} autocomplete="address-level2" />
					</div>
				</div>
			</fieldset>

			<fieldset>
				<legend>Contact</legend>
				<div class="grid">
					<TextField label="Telefoon (zoals getoond)" name="phone" type="tel" required value={c('phone')} error={ce('phone')} helper="Bv. 0470 80 71 34" />
					<TextField label="Telefoon (internationaal)" name="phoneIntl" type="tel" required value={c('phoneIntl')} error={ce('phoneIntl')} helper="Voor bel-links, bv. +32470807134" />
					<TextField label="E-mailadres" name="email" type="email" required value={c('email')} error={ce('email')} />
				</div>
			</fieldset>

			<fieldset>
				<legend>Openingsuren</legend>
				<div class="grid">
					<TextField label="Openingsuren (Nederlands)" name="openingHoursNl" value={c('openingHoursNl')} error={ce('openingHoursNl')} />
					<TextField label="Openingsuren (Engels)" name="openingHoursEn" value={c('openingHoursEn')} error={ce('openingHoursEn')} />
				</div>
			</fieldset>

			<fieldset>
				<legend>Links</legend>
				<div class="grid">
					<TextField label="Facebook" name="facebookUrl" type="url" value={c('facebookUrl')} error={ce('facebookUrl')} placeholder="https://" />
					<TextField label="Instagram" name="instagramUrl" type="url" value={c('instagramUrl')} error={ce('instagramUrl')} placeholder="https://" />
					<TextField label="Google-reviews" name="googleReviewsUrl" type="url" value={c('googleReviewsUrl')} error={ce('googleReviewsUrl')} placeholder="https://" />
					<TextField label="Kaart (embed-link)" name="mapsEmbedUrl" type="url" value={c('mapsEmbedUrl')} error={ce('mapsEmbedUrl')} placeholder="https://" helper="Link voor de kaart op de contactpagina." />
				</div>
			</fieldset>

			<div class="submit">
				<Button type="submit" loading={savingCompany}>
					{#snippet iconStart()}<Save size={18} />{/snippet}
					Bedrijfsgegevens opslaan
				</Button>
			</div>
		</form>
	</Panel>

	<Panel title="Boekingsinstellingen" description="Bepalen welke dagen en postcodes klanten online kunnen boeken.">
		{#if !hydrated && bookingForm?.message}
			<Alert tone={bookingFail ? 'error' : 'success'}>{bookingForm.message}</Alert>
		{/if}
		<form method="POST" action="?/booking" novalidate use:enhance={enhanceToast({ pending: (v) => (savingBooking = v) })}>
			<fieldset>
				<legend>Planning</legend>
				<div class="grid four">
					<TextField label="Aanlooptijd (dagen)" name="leadTimeDays" type="number" inputmode="numeric" min={0} max={60} required value={b('leadTimeDays')} error={be('leadTimeDays')} helper="Vroegst boekbare dag = vandaag + dit aantal." />
					<TextField label="Horizon (weken)" name="horizonWeeks" type="number" inputmode="numeric" min={1} max={52} required value={b('horizonWeeks')} error={be('horizonWeeks')} helper="Hoe ver vooruit klanten kunnen boeken." />
					<TextField label="Reservatie vasthouden (min.)" name="holdMinutes" type="number" inputmode="numeric" min={2} max={60} required value={b('holdMinutes')} error={be('holdMinutes')} helper="Hoe lang een gekozen moment vrij blijft." />
					<TextField label="Herinnering (uur vooraf)" name="reminderHours" type="number" inputmode="numeric" min={1} max={336} required value={b('reminderHours')} error={be('reminderHours')} />
				</div>
			</fieldset>

			<fieldset>
				<legend>Werkgebied</legend>
				<TextField
					label="Postcodes (prefixen)"
					name="servicePostcodes"
					inputmode="numeric"
					value={postcodes}
					error={be('servicePostcodes')}
					helper="Begin van de postcode, gescheiden door komma’s, bv. 35, 36, 3680. Leeg = alle Belgische postcodes."
				/>
			</fieldset>

			<fieldset>
				<legend>Btw-vermelding</legend>
				<div class="grid">
					<Textarea label="Btw-tekst (Nederlands)" name="vatNoteNl" rows={2} value={String(b('vatNoteNl'))} error={be('vatNoteNl')} />
					<Textarea label="Btw-tekst (Engels)" name="vatNoteEn" rows={2} value={String(b('vatNoteEn'))} error={be('vatNoteEn')} />
				</div>
			</fieldset>

			<fieldset>
				<legend>Meldingen en privacy</legend>
				<div class="grid">
					<TextField label="Meldingen naar" name="notifyEmail" type="email" required value={b('notifyEmail')} error={be('notifyEmail')} helper="Ontvangt een interne melding bij elke nieuwe boeking." />
					<TextField label="Bewaartermijn (maanden)" name="retentionMonths" type="number" inputmode="numeric" min={6} max={120} required value={b('retentionMonths')} error={be('retentionMonths')} helper="Afgesloten boekingen worden daarna geanonimiseerd." />
				</div>
			</fieldset>

			<div class="submit">
				<Button type="submit" loading={savingBooking}>
					{#snippet iconStart()}<Save size={18} />{/snippet}
					Boekingsinstellingen opslaan
				</Button>
			</div>
		</form>
	</Panel>
</div>

<style>
	.stack {
		display: grid;
		gap: var(--space-6);
		max-width: 960px;
	}
	form {
		display: grid;
		gap: var(--space-5);
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
		display: grid;
		gap: var(--space-3);
	}
	fieldset + fieldset {
		padding-top: var(--space-5);
		border-top: 1px solid var(--color-border);
	}
	legend {
		padding: 0;
		margin-bottom: var(--space-3);
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-heading);
	}
	.grid {
		display: grid;
		gap: var(--space-4);
		align-items: start;
	}
	.grid.inner {
		grid-template-columns: minmax(5.5rem, 1fr) minmax(0, 2fr);
		gap: var(--space-3);
	}
	@media (min-width: 720px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1024px) {
		.grid.four {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	.submit {
		display: flex;
		justify-content: flex-end;
	}
</style>
