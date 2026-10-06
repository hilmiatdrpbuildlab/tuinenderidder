<script lang="ts">
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Toggle from '$lib/components/form/Toggle.svelte';
	import EditorLayout from '$lib/components/admin/content/EditorLayout.svelte';
	import LanguageTabs from '$lib/components/admin/content/LanguageTabs.svelte';
	import RichText from '$lib/components/admin/content/RichText.svelte';
	import SlugField from '$lib/components/admin/content/SlugField.svelte';
	import MediaField from '$lib/components/admin/content/MediaField.svelte';
	import GalleryManager from '$lib/components/admin/content/GalleryManager.svelte';
	import PublishPanel from '$lib/components/admin/content/PublishPanel.svelte';
	import SaveBar from '$lib/components/admin/content/SaveBar.svelte';
	import UnsavedChangesGuard from '$lib/components/admin/content/UnsavedChangesGuard.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';
	import { createEditor } from '$lib/components/admin/content/editor.svelte';
	import { plainText, type Lang, type MediaItem } from '$lib/components/admin/content/shared';
	import type { ProjectInput } from '$lib/server/admin/content';

	interface Props {
		project: {
			id: number | null;
			status: 'draft' | 'published';
			publishedAt: string | null;
			updatedAt: string | null;
			values: ProjectInput;
			media: Record<number, MediaItem>;
		};
		services: { value: number; label: string }[];
		form: { values?: ProjectInput | null; errors?: Record<string, string> | null; message?: string } | null;
		action?: string;
	}

	let { project, services, form, action = '' }: Props = $props();

	const editor = createEditor();
	// svelte-ignore state_referenced_locally
	let v = $state<ProjectInput>(structuredClone(form?.values ?? project.values));
	// svelte-ignore state_referenced_locally
	let media = $state<Record<number, MediaItem>>(structuredClone(project.media));
	// svelte-ignore state_referenced_locally
	let cover = $state<MediaItem | null>(v.coverMediaId ? (media[v.coverMediaId] ?? null) : null);
	let confirmDelete = $state(false);

	const errors = $derived(form?.errors ?? {});
	const err = (k: string) => errors[k] ?? null;
	const langErr = (l: Lang) => Object.keys(errors).some((k) => k.startsWith(`${l}.`));

	const complete = $derived({
		nl: !!(v.nl.title.trim() && v.nl.summary.trim() && plainText(v.nl.story)),
		en: !!(v.en.title.trim() && v.en.summary.trim() && plainText(v.en.story))
	});

	const allImages = $derived(
		[...new Set([v.coverMediaId, ...v.gallery.map((g) => g.mediaId)].filter((x): x is number => typeof x === 'number'))]
			.map((id) => (id === cover?.id ? cover : media[id]))
			.filter((x): x is MediaItem => !!x)
	);
	const missingAlt = $derived(allImages.filter((m) => !m.altNl.trim()).length);
	const befores = $derived(v.gallery.filter((g) => g.kind === 'before').length);
	const afters = $derived(v.gallery.filter((g) => g.kind === 'after').length);

	const blockers = $derived.by(() => {
		const out: string[] = [];
		if (!v.nl.title.trim()) out.push('Nederlandse titel ontbreekt.');
		if (!cover) out.push('Kies een omslagfoto.');
		if (missingAlt) out.push(`${missingAlt} foto('s) zonder Nederlandse alt-tekst.`);
		if (befores !== afters) out.push('Voor/na-foto’s zijn niet in paren.');
		return out;
	});

	const seo = $derived({
		title: v.nl.title ? `${v.nl.title} | Realisaties | Tuinen De Ridder` : '',
		desc: v.nl.summary,
		url: `/realisaties/${v.slug || '…'}`
	});

	const folder = $derived(`projects/${v.slug || 'nieuw'}`);
	const isNew = $derived(project.id === null);
	const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 1 - i);

	function onCover(item: MediaItem | null) {
		if (item) {
			if (!media[item.id]) media[item.id] = item;
			cover = media[item.id];
			v.coverMediaId = item.id;
		} else {
			cover = null;
			v.coverMediaId = null;
		}
	}

	function discard() {
		v = structuredClone(project.values);
		media = structuredClone(project.media);
		cover = v.coverMediaId ? (media[v.coverMediaId] ?? null) : null;
		editor.reset();
	}

	const formId = 'project-form';
</script>

<UnsavedChangesGuard {editor} />
<FormMessage {form} />

<PageHeader title={isNew ? 'Nieuwe realisatie' : v.nl.title || 'Realisatie'} description={isNew ? 'Bewaar eerst als concept; publiceren kan zodra titel, omslagfoto en alt-teksten in orde zijn.' : undefined}>
	{#snippet meta()}
		{#if !isNew}<StatusBadge status={project.status} />{/if}
		{#if editor.dirty}<span class="dirty">Niet-opgeslagen wijzigingen</span>{/if}
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/realisaties" variant="ghost" size="sm">
			{#snippet iconStart()}<ArrowLeft size={16} />{/snippet}
			Alle realisaties
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
		maxlength={140}
		error={err(`${l}.title`)}
		placeholder={l === 'en' ? v.nl.title : 'bv. Nieuw terras met border in Ophoven'}
	/>
	<Textarea
		label="Samenvatting"
		name="{l}.summary"
		bind:value={t.summary}
		rows={3}
		maxlength={400}
		error={err(`${l}.summary`)}
		helper="{t.summary.length}/400 · Korte intro op de overzichtspagina."
	/>
	<RichText label="Verhaal" name="{l}.story" bind:value={t.story} error={err(`${l}.story`)} helper="Wat was de vraag, wat hebben we gedaan, wat was het resultaat?" />
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
			<Panel title="Inhoud" description="Nederlands is verplicht; Engels valt terug op Nederlands.">
				<LanguageTabs {complete} errors={{ nl: langErr('nl'), en: langErr('en') }}>
					{#snippet nl()}{@render langFields('nl')}{/snippet}
					{#snippet en()}{@render langFields('en')}{/snippet}
				</LanguageTabs>
			</Panel>

			<Panel title="Foto’s" description="Telefoonfoto’s in staand of vierkant formaat werken prima. Elke foto heeft een Nederlandse alt-tekst nodig.">
				<div class="photos">
					<MediaField
						name="coverMediaId"
						label="Omslagfoto"
						bind:item={cover}
						onchange={onCover}
						ratio="4 / 5"
						{folder}
						required
						error={err('coverMediaId')}
						helper="Wordt getoond in het overzicht (4:5 en 1:1). Zet het focuspunt in de mediabibliotheek."
					/>
					<GalleryManager bind:entries={v.gallery} bind:media coverId={v.coverMediaId} {folder} error={err('gallery')} oncover={(item) => onCover(item)} />
				</div>
			</Panel>
		{/snippet}

		{#snippet aside()}
			<PublishPanel
				status={project.status}
				publishedAt={project.publishedAt}
				updatedAt={project.updatedAt}
				{complete}
				{blockers}
				{seo}
				saving={editor.saving}
				viewHref={project.id ? `/realisaties/${project.values.slug}` : null}
			/>

			<Panel title="Gegevens">
				<div class="settings">
					<SlugField
						bind:value={v.slug}
						source={v.nl.title}
						prefix="/realisaties/"
						checkUrl="/admin/realisaties/slug"
						excludeId={project.id}
						locked={!isNew}
						error={err('slug')}
					/>
					<Select label="Dienst" name="serviceId" options={services} placeholder="— Geen dienst —" bind:value={v.serviceId} error={err('serviceId')} />
					<TextField label="Gemeente" name="town" bind:value={v.town} maxlength={80} placeholder="bv. Ophoven" error={err('town')} />
					<Select label="Jaar" name="year" options={years.map((y) => ({ value: y, label: String(y) }))} bind:value={v.year} error={err('year')} />
					<Toggle name="isFeatured" label="Uitgelicht" description="Toon deze realisatie op de homepagina." bind:checked={v.isFeatured} />
				</div>
			</Panel>

			{#if !isNew}
				<Panel title="Verwijderen">
					<p class="muted-text">Verwijdert de realisatie en de koppeling met de foto’s. De foto’s zelf blijven in de mediabibliotheek.</p>
					<Button variant="outline" size="sm" onclick={() => (confirmDelete = true)}>
						{#snippet iconStart()}<Trash2 size={16} />{/snippet}
						Realisatie verwijderen
					</Button>
					<noscript>
						<p class="muted-text">Zonder JavaScript: gebruik de knop hieronder (geen extra bevestiging).</p>
						<button type="submit" form="delete-project-nojs" class="nojs-delete">Definitief verwijderen</button>
					</noscript>
				</Panel>
			{/if}
		{/snippet}
	</EditorLayout>

	<SaveBar {editor} form={formId} label={isNew ? 'Opslaan als concept' : 'Opslaan'} onDiscard={isNew ? undefined : discard} />
</form>

{#if !isNew}
	<form id="delete-project-nojs" method="POST" action="?/delete" hidden></form>
	<Dialog bind:open={confirmDelete} title="Realisatie verwijderen?" description="“{v.nl.title}” verdwijnt van de website. Dit kan niet ongedaan gemaakt worden." size="sm">
		<form
			id="delete-project"
			method="POST"
			action="?/delete"
			use:enhance={() => {
				editor.submitting = true;
				editor.reset();
				return async ({ update }) => {
					await update();
				};
			}}
		></form>
		<p>De foto’s blijven bewaard in de mediabibliotheek.</p>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Annuleren</Button>
			<Button type="submit" variant="danger" form="delete-project">Definitief verwijderen</Button>
		{/snippet}
	</Dialog>
{/if}

<style>
	.dirty {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-warning-text);
	}
	.photos,
	.settings {
		display: grid;
		gap: var(--space-5);
	}
	.settings {
		gap: var(--space-4);
	}
	.muted-text {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
	}
	.nojs-delete {
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
