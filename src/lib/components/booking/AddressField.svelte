<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Field from '$lib/components/form/Field.svelte';
	import { POSTCODES } from '$lib/domain';
	import { translator, type Locale } from '$lib/i18n';

	/**
	 * Belgian address: street + 4-digit postcode → municipality auto-fill (editable).
	 * Warns live when the postcode is outside the service area; the server re-checks.
	 */
	interface Props {
		locale: Locale;
		street?: string;
		postcode?: string;
		municipality?: string;
		errors?: { street?: string[] | string; postcode?: string[] | string; municipality?: string[] | string };
		/** postcode prefixes we serve; empty = all */
		servicePrefixes?: string[];
		phone: string;
	}

	let { locale, street = '', postcode = '', municipality = '', errors = {}, servicePrefixes = [], phone }: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();

	let pc = $derived(postcode);
	let town = $derived(municipality);
	let autoFilled = $state(false);

	const outside = $derived(
		/^\d{4}$/.test(pc) && servicePrefixes.length > 0 && !servicePrefixes.some((p) => pc.startsWith(p))
	);

	function onPostcode(e: Event & { currentTarget: HTMLInputElement }) {
		const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
		pc = v;
		const match = POSTCODES[v];
		if (v.length === 4 && match && (!town || autoFilled)) {
			town = match;
			autoFilled = true;
		}
	}

	const postcodeError = $derived(Array.isArray(errors.postcode) ? errors.postcode[0] : errors.postcode);
</script>

<fieldset class="address">
	<legend><MapPin size={18} aria-hidden="true" /> {t('booking.address.legend')}</legend>

	<Field id="street-{uid}" label={t('booking.address.street')} required error={errors.street}>
		{#snippet control({ id, describedby, invalid })}
			<input
				{id}
				name="street"
				class="control"
				value={street}
				required
				autocomplete="street-address"
				maxlength="200"
				aria-describedby={describedby}
				aria-invalid={invalid || undefined}
			/>
		{/snippet}
	</Field>

	<div class="row">
		<Field
			id="postcode-{uid}"
			label={t('booking.address.postcode')}
			helper={t('booking.address.postcodeHelper')}
			required
			error={postcodeError}
			class="pc"
		>
			{#snippet control({ id, describedby, invalid })}
				<input
					{id}
					name="postcode"
					class="control"
					value={pc}
					oninput={onPostcode}
					required
					inputmode="numeric"
					pattern="[0-9]{'{'}4{'}'}"
					maxlength="4"
					autocomplete="postal-code"
					aria-describedby={[describedby, outside && !postcodeError ? `area-${uid}` : null].filter(Boolean).join(' ') ||
						undefined}
					aria-invalid={invalid || undefined}
				/>
			{/snippet}
		</Field>
		<Field
			id="municipality-{uid}"
			label={t('booking.address.municipality')}
			helper={autoFilled ? t('booking.address.autoFilled') : undefined}
			required
			error={errors.municipality}
			class="town"
		>
			{#snippet control({ id, describedby, invalid })}
				<input
					{id}
					name="municipality"
					class="control"
					bind:value={town}
					oninput={() => (autoFilled = false)}
					required
					maxlength="120"
					autocomplete="address-level2"
					aria-describedby={describedby}
					aria-invalid={invalid || undefined}
				/>
			{/snippet}
		</Field>
	</div>

	{#if outside && !postcodeError}
		<p class="area" id="area-{uid}" role="status">
			<CircleAlert size={18} aria-hidden="true" />
			<span>{t('booking.address.outsideArea', { phone })}</span>
		</p>
	{/if}
</fieldset>

<style>
	.address {
		display: grid;
		gap: var(--space-4);
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0;
		margin-bottom: var(--space-4);
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-heading);
	}
	.row {
		display: grid;
		align-items: start;
		gap: var(--space-4);
		grid-template-columns: minmax(0, 1fr);
	}
	@media (min-width: 480px) {
		.row {
			grid-template-columns: 9.5rem minmax(0, 1fr);
		}
	}
	.area {
		display: flex;
		gap: var(--space-2);
		align-items: flex-start;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-warning-subtle);
		color: var(--color-warning-text);
		font-size: var(--text-sm);
	}
	.area :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
	}
</style>
