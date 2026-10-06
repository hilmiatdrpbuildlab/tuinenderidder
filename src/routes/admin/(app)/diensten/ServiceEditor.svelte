<script lang="ts">
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import Toggle from '$lib/components/form/Toggle.svelte';
	import SegmentedControl from '$lib/components/form/SegmentedControl.svelte';
	import EditorLayout from '$lib/components/admin/content/EditorLayout.svelte';
	import LanguageTabs from '$lib/components/admin/content/LanguageTabs.svelte';
	import RichText from '$lib/components/admin/content/RichText.svelte';
	import RepeaterField from '$lib/components/admin/content/RepeaterField.svelte';
	import SlugField from '$lib/components/admin/content/SlugField.svelte';
	import IconPicker from '$lib/components/admin/content/IconPicker.svelte';
	import MediaField from '$lib/components/admin/content/MediaField.svelte';
	import PublishPanel from '$lib/components/admin/content/PublishPanel.svelte';
	import SaveBar from '$lib/components/admin/content/SaveBar.svelte';
	import UnsavedChangesGuard from '$lib/components/admin/content/UnsavedChangesGuard.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';
	import { createEditor } from '$lib/components/admin/content/editor.svelte';
	import { plainText, type Lang, type MediaItem } from '$lib/components/admin/content/shared';
	import type { ServiceInput } from '$lib/server/admin/content';

	interface Props {
		service: {
			id: number | null;
			status: 'draft' | 'published';
			updatedAt: string | null;
			values: ServiceInput;
			cover: MediaItem | null;
		};
		form: { values?: ServiceInput | null; errors?: Record<string, string> | null; message?: string } | null;
		action?: string;
	}

	let { service, form, action = '' }: Props = $props();
	let confirmDelete = $state(false);

	const editor = createEditor();
	// svelte-ignore state_referenced_locally
	let v = $state<ServiceInput>(structuredClone(form?.values ?? service.values));
	// svelte-ignore state_referenced_locally
	let cover = $state<MediaItem | null>(service.cover ? { ...service.cover } : null);

	const errors = $derived(form?.errors ?? {});
	const err = (k: string) => errors[k] ?? null;
	const langErr = (l: Lang) => Object.keys(errors).some((k) => k.startsWith(`${l}.`));

	const complete = $derived({
		nl: !!(v.nl.title.trim() && v.nl.summary.trim() && plainText(v.nl.body)),
		en: !!(v.en.title.trim() && v.en.summary.trim() && plainText(v.en.body))
	});

	const blockers = $derived.by(() => {
		const out: string[] = [];
		if (!v.nl.title.trim()) out.push('Nederlandse titel ontbreekt.');
		if (!v.slug.trim()) out.push('Slug ontbreekt.');
		if (cover && !cover.altNl.trim()) out.push('Omslagfoto heeft nog geen Nederlandse alt-tekst.');
		if (v.priceMode === 'fixed' && (v.priceFrom === null || v.priceFrom === undefined || String(v.priceFrom) === '')) out.push('Vul een vanafprijs in.');
		return out;
	});

	const seo = $derived({
		title: v.nl.seoTitle || (v.nl.title ? `${v.nl.title} | Tuinen De Ridder` : ''),
		desc: v.nl.seoDesc || v.nl.summary,
		url: `/diensten/${v.slug || '…'}`
	});

	const formId = 'service-form';
	const isNew = $derived(service.id === null);

	function discard() {
		v = structuredClone(service.values);
		cover = service.cover ? { ...service.cover } : null;
		editor.reset();
	}
</script>

<UnsavedChangesGuard {editor} />
<FormMessage {form} />

<PageHeader title={isNew ? 'Nieuwe dienst' : v.nl.title || 'Dienst'} description={isNew ? 'Vul minstens de Nederlandse titel in; je kunt de dienst eerst als concept bewaren.' : undefined}>
	{#snippet meta()}
		{#if !isNew}<StatusBadge status={service.status} />{/if}
		{#if editor.dirty}<span class="dirty">Niet-opgeslagen wijzigingen</span>{/if}
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/diensten" variant="ghost" size="sm">
			{#snippet iconStart()}<ArrowLeft size={16} />{/snippet}
			Alle diensten
		</Button>
	{/snippet}
</PageHeader>

{#snippet langFields(l: Lang)}
	{@const t = v[l]}
	<TextField
		label="Titel"
		name="{l}.title"
		bind:value={t.title}
		required={l === 'nl'}
		optionalLabel={l === 'en' ? 'optioneel' : undefined}
		error={err(`${l}.title`)}
		maxlength={120}
		placeholder={l === 'en' ? v.nl.title : 'bv. Snoeiwerken'}
	/>
	<Textarea
		label="Samenvatting"
		name="{l}.summary"
		bind:value={t.summary}
		rows={3}
		maxlength={300}
		error={err(`${l}.summary`)}
		helper="{t.summary.length}/300 · Verschijnt op de dienstkaart en in zoekresultaten."
	/>
	<RichText label="Beschrijving" name="{l}.body" bind:value={t.body} error={err(`${l}.body`)} />
	<RepeaterField
		label="Wat zit erin (punten)"
		bind:items={t.highlights}
		create={() => ''}
		itemLabel="punt"
		addLabel="Punt toevoegen"
		max={12}
		error={err(`${l}.highlights`)}
		emptyText="Nog geen punten. Bijvoorbeeld: “Hagen tot 3 meter hoog”."
	>
		{#snippet row(item, i)}
			<label class="visually-hidden" for="hl-{l}-{i}">Punt {i + 1}</label>
			<input id="hl-{l}-{i}" class="row-input" name="{l}.highlights" value={item} maxlength="140" oninput={(e) => (t.highlights[i] = e.currentTarget.value)} />
		{/snippet}
	</RepeaterField>
	<details class="seo" open={!!(err(`${l}.seoTitle`) || err(`${l}.seoDesc`))}>
		<summary>SEO ({l.toUpperCase()})</summary>
		<div class="seo-fields">
			<TextField label="SEO-titel" name="{l}.seoTitle" bind:value={t.seoTitle} maxlength={70} error={err(`${l}.seoTitle`)} helper="{t.seoTitle.length}/60 · Leeg = titel + bedrijfsnaam." />
			<Textarea label="SEO-omschrijving" name="{l}.seoDesc" bind:value={t.seoDesc} rows={2} maxlength={170} error={err(`${l}.seoDesc`)} helper="{t.seoDesc.length}/160 · Leeg = samenvatting." />
		</div>
	</details>
{/snippet}

<form
	id={formId}
	method="POST"
	action={action || undefined}
	novalidate
	use:enhance={editor.enhance({ success: isNew ? undefined : 'Wijzigingen opgeslagen.' })}
	oninput={editor.markDirty}
	onchange={editor.markDirty}
>
	<button type="submit" name="intent" value="save" class="visually-hidden" tabindex="-1" aria-hidden="true">Opslaan</button>

	<EditorLayout>
		{#snippet main()}
			<Panel title="Inhoud" description="Nederlands is verplicht; Engels is optioneel en valt terug op Nederlands.">
				<LanguageTabs {complete} errors={{ nl: langErr('nl'), en: langErr('en') }}>
					{#snippet nl()}{@render langFields('nl')}{/snippet}
					{#snippet en()}{@render langFields('en')}{/snippet}
				</LanguageTabs>
			</Panel>

			<Panel title="Omslagfoto">
				<MediaField
					name="coverMediaId"
					label="Omslagfoto"
					bind:item={cover}
					ratio="4 / 3"
					folder="services"
					helper="4:3, minstens 1200 px breed. Eén representatieve klus voor deze dienst."
					error={err('coverMediaId')}
				/>
			</Panel>
		{/snippet}

		{#snippet aside()}
			<PublishPanel
				status={service.status}
				updatedAt={service.updatedAt}
				{complete}
				{blockers}
				{seo}
				saving={editor.saving}
				viewHref={service.id ? `/diensten/${service.values.slug}` : null}
			/>

			<Panel title="Instellingen">
				<div class="settings">
					<SlugField
						bind:value={v.slug}
						source={v.nl.title}
						prefix="/diensten/"
						checkUrl="/admin/diensten/slug"
						excludeId={service.id}
						locked={!isNew}
						error={err('slug')}
					/>
					<IconPicker name="icon" label="Icoon" bind:value={v.icon} />
					<Toggle name="isBookable" label="Online boekbaar" description="Klanten kunnen deze dienst kiezen in de boekingsmodule." bind:checked={v.isBookable} />
					<TextField
						label="Standaardduur (minuten)"
						name="baseDurationMin"
						type="number"
						min={15}
						max={1440}
						step={15}
						bind:value={v.baseDurationMin}
						error={err('baseDurationMin')}
						helper="Gebruikt voor de planning, bv. 240 = halve dag."
					/>
					<SegmentedControl
						name="priceMode"
						legend="Prijs"
						size="sm"
						options={[
							{ value: 'quote', label: 'Op offerte' },
							{ value: 'fixed', label: 'Vanafprijs' }
						]}
						bind:value={v.priceMode}
					/>
					<TextField
						label="Vanafprijs (€, incl. btw)"
						name="priceFrom"
						type="number"
						min={0}
						step={1}
						bind:value={v.priceFrom}
						optionalLabel={v.priceMode === 'quote' ? 'optioneel' : undefined}
						required={v.priceMode === 'fixed'}
						error={err('priceFrom')}
						helper={v.priceMode === 'quote' ? 'Bij “Op offerte” tonen we “Prijs op aanvraag”.' : 'Getoond als “vanaf € …”.'}
					/>
				</div>
			</Panel>

			{#if !isNew}
				<Panel title="Verwijderen">
					<p class="muted-text">Kan alleen als de dienst in geen enkele boeking voorkomt. Verbergen kan altijd via “Depubliceren”.</p>
					<Button variant="outline" size="sm" onclick={() => (confirmDelete = true)}>
						{#snippet iconStart()}<Trash2 size={16} />{/snippet}
						Dienst verwijderen
					</Button>
					<noscript><button type="submit" form="delete-s-nojs" class="nojs-delete">Definitief verwijderen</button></noscript>
				</Panel>
			{/if}
		{/snippet}
	</EditorLayout>

	<SaveBar {editor} form={formId} label={isNew ? 'Opslaan als concept' : 'Opslaan'} onDiscard={isNew ? undefined : discard} />
</form>

{#if !isNew}
	<form id="delete-s-nojs" method="POST" action="?/delete" hidden></form>
	<Dialog bind:open={confirmDelete} title="Dienst verwijderen?" description="“{v.nl.title}” verdwijnt van de website en uit de boekingsmodule." size="sm">
		<form
			id="delete-service"
			method="POST"
			action="?/delete"
			use:enhance={() => {
				editor.submitting = true;
				return async ({ result, update }) => {
					editor.submitting = false;
					if (result.type === 'failure') {
						confirmDelete = false;
						toast.error(String(result.data?.message ?? 'Verwijderen mislukt.'));
						return;
					}
					editor.reset();
					await update();
				};
			}}
		></form>
		<p>Realisaties en getuigenissen van deze dienst blijven bestaan, zonder dienst.</p>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Annuleren</Button>
			<Button type="submit" variant="danger" form="delete-service">Definitief verwijderen</Button>
		{/snippet}
	</Dialog>
{/if}

<style>
	.muted-text {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
	}
	.nojs-delete {
		margin-top: var(--space-2);
		min-height: 32px;
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-error);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-error);
		font-weight: 600;
	}
	.dirty {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-warning-text);
	}
	.settings {
		display: grid;
		gap: var(--space-4);
	}
	.row-input {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.row-input:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.seo {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-3);
	}
	.seo summary {
		cursor: pointer;
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-text);
	}
	.seo-fields {
		display: grid;
		gap: var(--space-4);
		margin-top: var(--space-3);
	}
	:global([data-theme='dark']) .dirty {
		color: var(--harvest);
	}
</style>
