<script lang="ts">
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Toggle from '$lib/components/form/Toggle.svelte';
	import SegmentedControl from '$lib/components/form/SegmentedControl.svelte';
	import EditorLayout from '$lib/components/admin/content/EditorLayout.svelte';
	import LanguageTabs from '$lib/components/admin/content/LanguageTabs.svelte';
	import PublishPanel from '$lib/components/admin/content/PublishPanel.svelte';
	import SaveBar from '$lib/components/admin/content/SaveBar.svelte';
	import UnsavedChangesGuard from '$lib/components/admin/content/UnsavedChangesGuard.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';
	import { createEditor } from '$lib/components/admin/content/editor.svelte';
	import type { TestimonialInput } from '$lib/server/admin/content';

	interface Props {
		testimonial: { id: number | null; updatedAt: string | null; values: TestimonialInput };
		services: { value: number; label: string }[];
		form: { values?: TestimonialInput | null; errors?: Record<string, string> | null; message?: string } | null;
		action?: string;
	}

	let { testimonial, services, form, action = '' }: Props = $props();

	const editor = createEditor();
	// svelte-ignore state_referenced_locally
	let v = $state<TestimonialInput>(structuredClone(form?.values ?? testimonial.values));
	let confirmDelete = $state(false);

	const errors = $derived(form?.errors ?? {});
	const err = (k: string) => errors[k] ?? null;
	const isNew = $derived(testimonial.id === null);
	const complete = $derived({ nl: v.quoteNl.trim().length >= 10, en: v.quoteEn.trim().length >= 10 });
	const today = new Date().toISOString().slice(0, 10);
	const formId = 'testimonial-form';

	const sourceHelp = $derived(
		v.source === 'google'
			? 'Link naar de review op Google (Deel → Link kopiëren).'
			: v.source === 'facebook'
				? 'Link naar de aanbeveling op de Facebook-pagina.'
				: 'Rechtstreeks ontvangen (mail, kaartje…). Bewaar het origineel en vraag toestemming om te publiceren.'
	);
</script>

<UnsavedChangesGuard {editor} />
<FormMessage {form} />

<PageHeader title={isNew ? 'Nieuwe getuigenis' : v.authorName || 'Getuigenis'}>
	{#snippet meta()}
		{#if !isNew}
			{#if testimonial.values.isVisible}<Badge tone="success" dot>Zichtbaar</Badge>{:else}<Badge dot>Verborgen</Badge>{/if}
		{/if}
		{#if editor.dirty}<span class="dirty">Niet-opgeslagen wijzigingen</span>{/if}
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/getuigenissen" variant="ghost" size="sm">
			{#snippet iconStart()}<ArrowLeft size={16} />{/snippet}
			Alle getuigenissen
		</Button>
	{/snippet}
</PageHeader>

<form
	id={formId}
	method="POST"
	action={action || undefined}
	novalidate
	use:enhance={editor.enhance({ success: isNew ? undefined : 'Getuigenis opgeslagen.' })}
	oninput={editor.markDirty}
	onchange={editor.markDirty}
>
	<button type="submit" name="intent" value="save" class="visually-hidden" tabindex="-1" aria-hidden="true">Opslaan</button>

	<EditorLayout>
		{#snippet main()}
			<Alert tone="info" title="Enkel echte reviews">
				Toon alleen getuigenissen die een klant echt gegeven heeft, met een bron (Google, Facebook of een bewaard bericht). Pas de inhoud niet aan behalve
				tikfouten — verzonnen of bewerkte reviews zijn misleidend en wettelijk verboden.
			</Alert>

			<Panel title="Klant">
				<div class="grid2">
					<TextField label="Naam" name="authorName" bind:value={v.authorName} required maxlength={80} error={err('authorName')} helper="Zoals de klant tekende, bv. “Marleen V.”" />
					<TextField label="Gemeente" name="town" bind:value={v.town} maxlength={80} error={err('town')} placeholder="bv. Maaseik" />
					<Select label="Dienst" name="serviceId" options={services} placeholder="— Geen dienst —" bind:value={v.serviceId} error={err('serviceId')} />
					<fieldset class="rating" aria-describedby={err('rating') ? 'rating-err' : undefined}>
						<legend>Score <span class="req" aria-hidden="true">*</span></legend>
						<div class="stars">
							{#each [1, 2, 3, 4, 5] as n (n)}
								<label class:on={v.rating >= n} title="{n} {n === 1 ? 'ster' : 'sterren'}">
									<input type="radio" name="rating" value={n} bind:group={v.rating} />
									<Star size={22} aria-hidden="true" />
									<span class="visually-hidden">{n} {n === 1 ? 'ster' : 'sterren'}</span>
								</label>
							{/each}
						</div>
						{#if err('rating')}<p class="err" id="rating-err">{err('rating')}</p>{/if}
					</fieldset>
				</div>
			</Panel>

			<Panel title="Getuigenis">
				<LanguageTabs {complete} errors={{ nl: !!err('quoteNl'), en: !!err('quoteEn') }} fallbackNote="Zonder Engelse vertaling tonen we de Nederlandse tekst.">
					{#snippet nl()}
						<Textarea
							label="Citaat (Nederlands)"
							name="quoteNl"
							bind:value={v.quoteNl}
							required
							rows={5}
							maxlength={300}
							error={err('quoteNl')}
							helper="{v.quoteNl.length}/300 tekens"
						/>
					{/snippet}
					{#snippet en()}
						<Textarea
							label="Citaat (Engels)"
							name="quoteEn"
							bind:value={v.quoteEn}
							optionalLabel="optioneel"
							rows={5}
							maxlength={300}
							error={err('quoteEn')}
							helper="{v.quoteEn.length}/300 tekens · Vermeld dat het een vertaling is als de klant in het Nederlands schreef."
						/>
					{/snippet}
				</LanguageTabs>
				{#if v.quoteNl.length > 300}<p class="err">Het citaat is te lang.</p>{/if}
			</Panel>

			<Panel title="Bron">
				<div class="stack">
					<SegmentedControl
						name="source"
						legend="Waar komt de review vandaan?"
						size="sm"
						options={[
							{ value: 'google', label: 'Google' },
							{ value: 'facebook', label: 'Facebook' },
							{ value: 'direct', label: 'Rechtstreeks' }
						]}
						bind:value={v.source}
					/>
					<div class="grid2">
						<TextField
							label="Link naar de review"
							name="sourceUrl"
							type="url"
							bind:value={v.sourceUrl}
							optionalLabel={v.source === 'direct' ? 'optioneel' : 'aanbevolen'}
							placeholder="https://…"
							error={err('sourceUrl')}
							helper={sourceHelp}
						/>
						<TextField label="Datum van de review" name="reviewDate" type="date" max={today} bind:value={v.reviewDate} required error={err('reviewDate')} />
					</div>
					{#if v.source !== 'direct' && !v.sourceUrl.trim()}
						<Alert tone="warning">Zonder link kan een bezoeker de review niet controleren. Voeg de link naar de originele {v.source === 'google' ? 'Google-review' : 'Facebook-aanbeveling'} toe.</Alert>
					{/if}
				</div>
			</Panel>
		{/snippet}

		{#snippet aside()}
			<PublishPanel simple updatedAt={testimonial.updatedAt} {complete} saving={editor.saving}>
				{#snippet extra()}
					<div class="vis">
						<Toggle name="isVisible" label="Zichtbaar op de website" description="Uit = bewaard, maar niet getoond." bind:checked={v.isVisible} />
						<TextField label="Volgorde" name="sort" type="number" min={0} max={9999} bind:value={v.sort} error={err('sort')} helper="Lager = eerder getoond." />
						<p class="trust"><ShieldCheck size={16} aria-hidden="true" /> Bron en datum worden bij de review getoond.</p>
					</div>
				{/snippet}
			</PublishPanel>

			{#if !isNew}
				<Panel title="Verwijderen">
					<p class="muted-text">Liever tijdelijk verbergen? Zet “Zichtbaar” uit.</p>
					<Button variant="outline" size="sm" onclick={() => (confirmDelete = true)}>
						{#snippet iconStart()}<Trash2 size={16} />{/snippet}
						Getuigenis verwijderen
					</Button>
					<noscript><button type="submit" form="delete-t-nojs" class="nojs-delete">Definitief verwijderen</button></noscript>
				</Panel>
			{/if}
		{/snippet}
	</EditorLayout>

	<SaveBar {editor} form={formId} />
</form>

{#if !isNew}
	<form id="delete-t-nojs" method="POST" action="?/delete" hidden></form>
	<Dialog bind:open={confirmDelete} title="Getuigenis verwijderen?" description="De review van {v.authorName} wordt definitief verwijderd." size="sm">
		<form
			id="delete-testimonial"
			method="POST"
			action="?/delete"
			use:enhance={() => {
				editor.submitting = true;
				editor.reset();
				return async ({ update }) => update();
			}}
		></form>
		<p>Dit kan niet ongedaan gemaakt worden.</p>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Annuleren</Button>
			<Button type="submit" variant="danger" form="delete-testimonial">Definitief verwijderen</Button>
		{/snippet}
	</Dialog>
{/if}

<style>
	.dirty {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-warning-text);
	}
	.grid2 {
		display: grid;
		gap: var(--space-4);
	}
	@media (min-width: 720px) {
		.grid2 {
			grid-template-columns: 1fr 1fr;
		}
	}
	.stack,
	.vis {
		display: grid;
		gap: var(--space-4);
	}
	.rating {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.req {
		color: var(--color-error);
	}
	.stars {
		display: flex;
		gap: 2px;
	}
	.stars label {
		position: relative;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		color: var(--color-border-strong);
		cursor: pointer;
	}
	.stars label.on {
		color: var(--harvest);
	}
	.stars label.on :global(svg) {
		fill: currentColor;
	}
	.stars label:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
	}
	.stars input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	.err {
		color: var(--color-error);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.trust {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
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
	:global([data-theme='dark']) .dirty {
		color: var(--harvest);
	}
</style>
