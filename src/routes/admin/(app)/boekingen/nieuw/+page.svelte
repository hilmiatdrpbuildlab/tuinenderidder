<script lang="ts">
	import { enhance } from '$app/forms';
	import Save from '@lucide/svelte/icons/save';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { shortDay } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Checkbox from '$lib/components/form/Checkbox.svelte';
	import SegmentedControl from '$lib/components/form/SegmentedControl.svelte';
	import {
		BOOKING_TYPES,
		FREQUENCIES,
		FREQUENCY_LABELS,
		GARDEN_SIZES,
		GARDEN_SIZE_LABELS,
		POSTCODES,
		SLOT_KINDS_FOR_TYPE,
		SLOT_LABELS,
		SOURCES,
		SOURCE_LABELS,
		TYPE_LABELS,
		type BookingType
	} from '$lib/domain';

	let { data, form } = $props();

	type Values = Record<string, string | string[] | boolean | undefined>;
	const v = $derived((form?.values ?? {}) as Values);
	const errors = $derived((form?.errors ?? {}) as Record<string, string[] | undefined>);

	let type = $state<BookingType>('maintenance');
	let postcode = $state('');
	let municipality = $state('');
	let slotId = $state('');
	let force = $state(false);
	let busy = $state(false);

	$effect.pre(() => {
		if (form?.values) {
			type = (v.type as BookingType) || 'maintenance';
			postcode = String(v.postcode ?? '');
			municipality = String(v.municipality ?? '');
			slotId = String(v.slotId ?? '');
			force = !!v.force;
		}
	});

	function onPostcode() {
		const town = POSTCODES[postcode.trim()];
		if (town && !municipality) municipality = town.replace(/\s*\(.*\)$/, '');
	}

	const kinds = $derived(SLOT_KINDS_FOR_TYPE[type].length ? SLOT_KINDS_FOR_TYPE[type] : (['morning', 'afternoon', 'consult'] as const));
	const groups = $derived.by(() => {
		const map = new Map<string, typeof data.slots>();
		for (const s of data.slots) {
			if (!(kinds as readonly string[]).includes(s.kind)) continue;
			const list = map.get(s.date) ?? [];
			list.push(s);
			map.set(s.date, list);
		}
		return [...map.entries()];
	});
	const chosen = $derived(data.slots.find((s) => String(s.id) === slotId));
	const chosenFull = $derived(!!chosen && (chosen.closed || chosen.booked >= chosen.capacity));
	const selectedServices = $derived(((v.serviceIds as string[] | undefined) ?? []).map(String));
</script>

<svelte:head><title>Nieuwe boeking · CMS Tuinen De Ridder</title></svelte:head>

<PageHeader title="Nieuwe boeking" description="Voor afspraken die telefonisch, via Facebook of ter plaatse binnenkomen." />

{#if form?.message}
	<div class="alert"><Alert tone="error" assertive>{form.message}</Alert></div>
{/if}

<form
	method="POST"
	novalidate
	use:enhance={enhanceToast({ success: 'Boeking aangemaakt', pending: (b) => (busy = b) })}
	class="layout"
>
	<div class="main">
		<Panel title="Opdracht">
			<div class="stack">
				<SegmentedControl
					name="type"
					legend="Type"
					bind:value={type}
					options={BOOKING_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t].nl }))}
				/>
				<fieldset class="services" aria-describedby={errors.serviceIds ? 'svc-err' : undefined}>
					<legend>Diensten <span class="req" aria-hidden="true">*</span></legend>
					<div class="svc-grid">
						{#each data.services as s (s.id)}
							<label class="svc">
								<input type="checkbox" name="serviceIds" value={s.id} checked={selectedServices.includes(String(s.id))} />
								<Icon name={s.icon} size={18} />
								<span>{s.title}</span>
							</label>
						{/each}
					</div>
					{#if errors.serviceIds}<p class="err" id="svc-err">{errors.serviceIds[0]}</p>{/if}
				</fieldset>
				<div class="grid-2">
					<Select label="Frequentie" name="frequency" value={String(v.frequency ?? 'once')} options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f].nl }))} />
					<Select label="Tuinoppervlakte" name="gardenSize" value={String(v.gardenSize ?? '')} placeholder="Niet opgegeven" options={GARDEN_SIZES.map((g) => ({ value: g, label: GARDEN_SIZE_LABELS[g] }))} />
				</div>
			</div>
		</Panel>

		<Panel title="Datum & slot" description={type === 'quote' ? 'Optioneel voor een offerteaanvraag: plan een plaatsbezoek in of laat leeg.' : 'Alle slots binnen de boekingshorizon; volzette slots kan je overboeken.'}>
			<div class="stack">
				<div class="field">
					<label for="slot">Slot {#if type !== 'quote'}<span class="req" aria-hidden="true">*</span>{/if}</label>
					<select id="slot" name="slotId" class="control" bind:value={slotId} aria-invalid={errors.slotId ? true : undefined} aria-describedby={errors.slotId ? 'slot-err' : undefined}>
						<option value="">{type === 'quote' ? 'Geen plaatsbezoek' : 'Kies een dag en slot…'}</option>
						{#each groups as [date, list] (date)}
							<optgroup label={shortDay(date)}>
								{#each list as s (s.id)}
									<option value={String(s.id)}>
										{SLOT_LABELS[s.kind].nl} {s.start}–{s.end} · {s.booked}/{s.capacity}{s.closed ? ' · gesloten' : s.booked >= s.capacity ? ' · volzet' : ''}
									</option>
								{/each}
							</optgroup>
						{/each}
					</select>
					{#if errors.slotId}<p class="err" id="slot-err">{errors.slotId[0]}</p>{/if}
				</div>
				{#if chosenFull}
					<Alert tone="warning">Dit slot is {chosen?.closed ? 'gesloten' : 'volzet'}. Vink “Overboeken” aan om de boeking toch in te plannen.</Alert>
				{/if}
				<Checkbox name="force" bind:checked={force} helper="De capaciteit van het slot wordt met één verhoogd.">Overboeken (ook als het slot volzet of gesloten is)</Checkbox>
				<Checkbox name="confirm" checked={v.confirm === undefined ? true : !!v.confirm}>Meteen bevestigen (status “Gepland”)</Checkbox>
			</div>
		</Panel>

		<Panel title="Klant">
			<div class="stack">
				<TextField label="Naam" name="name" required autocomplete="off" value={String(v.name ?? '')} error={errors.name} />
				<div class="grid-2">
					<TextField label="Telefoon" name="phone" type="tel" required value={String(v.phone ?? '')} error={errors.phone} />
					<TextField label="E-mailadres" name="email" type="email" required value={String(v.email ?? '')} error={errors.email} helper="Nodig voor de bevestiging en herinnering." />
				</div>
				<TextField label="Straat en huisnummer" name="street" value={String(v.street ?? '')} error={errors.street} />
				<div class="grid-2">
					<TextField label="Postcode" name="postcode" inputmode="numeric" maxlength={4} bind:value={postcode} oninput={onPostcode} error={errors.postcode} />
					<TextField label="Gemeente" name="municipality" bind:value={municipality} error={errors.municipality} />
				</div>
				<Select label="Taal van de klant" name="locale" value={String(v.locale ?? 'nl')} options={[{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'Engels' }]} />
			</div>
		</Panel>

		<Panel title="Notities">
			<div class="stack">
				<Textarea label="Wens van de klant" name="notesCustomer" rows={3} value={String(v.notesCustomer ?? '')} error={errors.notesCustomer} />
				<Textarea label="Interne notitie" name="notesInternal" rows={3} value={String(v.notesInternal ?? '')} helper="Alleen zichtbaar voor het team." error={errors.notesInternal} />
			</div>
		</Panel>
	</div>

	<aside class="side">
		<Panel title="Afhandeling">
			<div class="stack">
				<Select label="Bron" name="source" value={String(v.source ?? 'phone')} options={SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))} />
				<Select label="Toewijzen aan" name="assignedTo" value={String(v.assignedTo ?? '')} placeholder="Niemand" options={data.assignees.map((a) => ({ value: String(a.id), label: a.name }))} />
				<Checkbox name="sendEmail" checked={v.sendEmail === undefined ? true : !!v.sendEmail} helper="Er is nog geen mailprovider: de e-mail komt in Beheer → E-mails.">Bevestiging naar de klant sturen</Checkbox>
				<div class="actions">
					<Button type="submit" loading={busy} fullWidth>
						{#snippet iconStart()}<Save />{/snippet}
						Boeking aanmaken
					</Button>
					<Button href="/admin/boekingen" variant="ghost" fullWidth>Annuleren</Button>
				</div>
			</div>
		</Panel>
	</aside>
</form>

<style>
	.alert {
		margin-bottom: var(--space-4);
	}
	.layout {
		display: grid;
		gap: var(--space-6);
		align-items: start;
	}
	.main {
		display: grid;
		gap: var(--space-6);
		min-width: 0;
	}
	.side {
		position: sticky;
		top: calc(64px + var(--space-6));
	}
	.stack {
		display: grid;
		gap: var(--space-4);
	}
	.grid-2 {
		display: grid;
		gap: var(--space-4);
	}
	.actions {
		display: grid;
		gap: var(--space-2);
	}
	.services {
		border: 0;
		padding: 0;
		min-width: 0;
	}
	legend,
	.field label {
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: 6px;
		padding: 0;
	}
	.req {
		color: var(--color-error);
	}
	.svc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: var(--space-2);
	}
	.svc {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.svc:hover {
		border-color: var(--color-border-strong);
	}
	.svc:has(input:checked) {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
	}
	.svc input {
		accent-color: var(--color-primary);
	}
	.svc :global(svg) {
		color: var(--color-primary);
	}
	.field {
		display: grid;
		gap: 6px;
	}
	.control {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}
	.control[aria-invalid='true'] {
		border-color: var(--color-error);
	}
	.err {
		color: var(--color-error);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	@media (min-width: 640px) {
		.grid-2 {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1100px) {
		.layout {
			grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
		}
	}
</style>
