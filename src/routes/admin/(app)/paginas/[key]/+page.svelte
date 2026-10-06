<script lang="ts">
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import EditorLayout from '$lib/components/admin/content/EditorLayout.svelte';
	import LanguageTabs from '$lib/components/admin/content/LanguageTabs.svelte';
	import RichText from '$lib/components/admin/content/RichText.svelte';
	import RepeaterField from '$lib/components/admin/content/RepeaterField.svelte';
	import IconPicker from '$lib/components/admin/content/IconPicker.svelte';
	import MediaField from '$lib/components/admin/content/MediaField.svelte';
	import PublishPanel from '$lib/components/admin/content/PublishPanel.svelte';
	import SaveBar from '$lib/components/admin/content/SaveBar.svelte';
	import UnsavedChangesGuard from '$lib/components/admin/content/UnsavedChangesGuard.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';
	import { createEditor } from '$lib/components/admin/content/editor.svelte';
	import { PAGE_PATHS, PAGE_SECTIONS, type Feature, type PageField, type PageSection, type Stat } from '$lib/components/admin/content/page-fields';
	import { plainText, type Lang, type MediaItem } from '$lib/components/admin/content/shared';
	import type { PageValues } from '$lib/server/admin/content-pages';

	let { data, form } = $props();

	const editor = createEditor();
	type Blocks = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	type Vals = { nl: { title: string; seoTitle: string; seoDesc: string; blocks: Blocks }; en: { title: string; seoTitle: string; seoDesc: string; blocks: Blocks }; shared: Blocks };

	// svelte-ignore state_referenced_locally
	let v = $state<Vals>(structuredClone((form?.values as PageValues | undefined) ?? data.page.values) as Vals);
	// svelte-ignore state_referenced_locally
	let images = $state<Record<string, MediaItem | null>>(initImages());
	let lang = $state<Lang>('nl');

	function initImages() {
		const out: Record<string, MediaItem | null> = {};
		for (const s of PAGE_SECTIONS[data.page.key]) for (const f of s.shared ?? []) if (f.type === 'image') {
			const id = v.shared[f.name];
			out[f.name] = typeof id === 'number' ? (data.page.media[id] ? { ...data.page.media[id] } : null) : null;
		}
		return out;
	}

	const sections = $derived(PAGE_SECTIONS[data.page.key]);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const err = (k: string) => errors[k] ?? null;

	const filled = (x: unknown) => (typeof x === 'string' ? plainText(x).length > 0 : Array.isArray(x) ? x.length > 0 : !!x);
	/** NL: required fields filled. EN: every field that has Dutch text also has an English version. */
	const sectionComplete = (s: PageSection, l: Lang) =>
		l === 'nl'
			? s.fields.every((f) => !f.required || filled(v.nl.blocks[f.name]))
			: s.fields.every((f) => !filled(v.nl.blocks[f.name]) || filled(v.en.blocks[f.name]));
	const sectionErr = (s: PageSection, l: Lang) => s.fields.some((f) => !!errors[`${l}.b.${f.name}`]);

	const complete = $derived({
		nl: !!v.nl.title.trim() && sections.every((s) => sectionComplete(s, 'nl')),
		en: !!v.en.title.trim() && sections.every((s) => sectionComplete(s, 'en'))
	});

	const seo = $derived({
		title: v.nl.seoTitle || (v.nl.title ? `${v.nl.title} | Tuinen De Ridder` : ''),
		desc: v.nl.seoDesc,
		url: PAGE_PATHS[data.page.key] === '/' ? '' : PAGE_PATHS[data.page.key]
	});

	function discard() {
		v = structuredClone(data.page.values) as Vals;
		images = initImages();
		editor.reset();
	}

	const newStat = (): Stat => ({ value: '', label: '' });
	const newFeature = (): Feature => ({ icon: 'leaf', title: '', text: '' });
</script>

<svelte:head><title>{data.page.label} · Pagina's · CMS</title></svelte:head>

<UnsavedChangesGuard {editor} />
<FormMessage {form} />

<PageHeader title={data.page.label} description="Teksten en afbeeldingen van deze pagina. Lege Engelse velden nemen de Nederlandse tekst over.">
	{#snippet meta()}
		{#if editor.dirty}<span class="dirty">Niet-opgeslagen wijzigingen</span>{/if}
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/paginas" variant="ghost" size="sm">
			{#snippet iconStart()}<ArrowLeft size={16} />{/snippet}
			Alle pagina's
		</Button>
	{/snippet}
</PageHeader>

{#snippet field(l: Lang, f: PageField)}
	{@const b = v[l].blocks}
	{@const name = `${l}.b.${f.name}`}
	{@const req = f.required && l === 'nl'}
	{@const ph = l === 'en' && typeof v.nl.blocks[f.name] === 'string' ? plainText(v.nl.blocks[f.name]).slice(0, 80) : undefined}
	{#if f.type === 'text'}
		<TextField label={f.label} {name} bind:value={b[f.name]} required={req} maxlength={f.max} error={err(name)} helper={f.helper} placeholder={ph} />
	{:else if f.type === 'textarea'}
		<Textarea
			label={f.label}
			{name}
			bind:value={b[f.name]}
			required={req}
			rows={3}
			maxlength={f.max}
			error={err(name)}
			helper={f.max ? `${String(b[f.name] ?? '').length}/${f.max}` : f.helper}
			placeholder={ph}
		/>
	{:else if f.type === 'rich'}
		<RichText label={f.label} {name} bind:value={b[f.name]} required={req} error={err(name)} helper={f.helper} minHeight="280px" />
	{:else if f.type === 'stats'}
		<RepeaterField label={f.label} bind:items={b[f.name]} create={newStat} itemLabel="cijfer" addLabel="Cijfer toevoegen" max={6} emptyText="Nog geen cijfers.">
			{#snippet row(item: Stat, i: number)}
				<div class="stat-row">
					<label class="mini">
						<span>Waarde</span>
						<input class="row-input" name="{name}.value" bind:value={item.value} maxlength="20" placeholder="650+" aria-label="Cijfer {i + 1} waarde" />
					</label>
					<label class="mini">
						<span>Label</span>
						<input class="row-input" name="{name}.label" bind:value={item.label} maxlength="60" placeholder="tuinen verzorgd" aria-label="Cijfer {i + 1} label" />
					</label>
				</div>
			{/snippet}
		</RepeaterField>
	{:else if f.type === 'features'}
		<RepeaterField label={f.label} bind:items={b[f.name]} create={newFeature} itemLabel="troef" addLabel="Toevoegen" max={8} emptyText="Nog niets toegevoegd.">
			{#snippet row(item: Feature, i: number)}
				<div class="feature-row">
					<input type="hidden" name="{name}.icon" value={item.icon} />
					<IconPicker name="_icon-{l}-{f.name}-{i}" label="Icoon" bind:value={item.icon} compact />
					<label class="mini">
						<span>Titel</span>
						<input class="row-input" name="{name}.title" bind:value={item.title} maxlength="80" aria-label="Item {i + 1} titel" />
					</label>
					<label class="mini">
						<span>Tekst</span>
						<textarea class="row-input area" name="{name}.text" bind:value={item.text} maxlength="300" rows="2" aria-label="Item {i + 1} tekst"></textarea>
					</label>
				</div>
			{/snippet}
		</RepeaterField>
	{/if}
{/snippet}

<form method="POST" novalidate use:enhance={editor.enhance({ success: 'Pagina opgeslagen.' })} oninput={editor.markDirty} onchange={editor.markDirty} id="page-form">
	<button type="submit" name="intent" value="save" class="visually-hidden" tabindex="-1" aria-hidden="true">Opslaan</button>
	<EditorLayout>
		{#snippet main()}
			<Panel title="Pagina & SEO">
				<LanguageTabs
					bind:active={lang}
					complete={{ nl: !!v.nl.title.trim(), en: !!v.en.title.trim() }}
					errors={{ nl: !!(err('nl.title') || err('nl.seoTitle') || err('nl.seoDesc')), en: !!(err('en.title') || err('en.seoTitle') || err('en.seoDesc')) }}
				>
					{#snippet nl()}{@render meta('nl')}{/snippet}
					{#snippet en()}{@render meta('en')}{/snippet}
				</LanguageTabs>
			</Panel>

			{#each sections as s (s.title)}
				<Panel title={s.title} description={s.description}>
					<div class="section">
						{#if s.shared?.length}
							<div class="shared">
								{#each s.shared as sf (sf.name)}
									{#if sf.type === 'image'}
										<MediaField
											name="shared.{sf.name}"
											label="{sf.label} (beide talen)"
											bind:item={images[sf.name]}
											ratio={sf.ratio}
											folder="pages"
											helper={sf.helper}
										/>
									{:else}
										<TextField label={sf.label} name="shared.{sf.name}" type="date" bind:value={v.shared[sf.name]} helper={sf.helper} />
									{/if}
								{/each}
							</div>
						{/if}
						<LanguageTabs
							bind:active={lang}
							complete={{ nl: sectionComplete(s, 'nl'), en: sectionComplete(s, 'en') }}
							errors={{ nl: sectionErr(s, 'nl'), en: sectionErr(s, 'en') }}
						>
							{#snippet nl()}{#each s.fields as f (f.name)}{@render field('nl', f)}{/each}{/snippet}
							{#snippet en()}{#each s.fields as f (f.name)}{@render field('en', f)}{/each}{/snippet}
						</LanguageTabs>
					</div>
				</Panel>
			{/each}
		{/snippet}

		{#snippet aside()}
			<PublishPanel simple updatedAt={data.page.updatedAt} {complete} {seo} saving={editor.saving} viewHref={PAGE_PATHS[data.page.key]} />
		{/snippet}
	</EditorLayout>

	<SaveBar {editor} form="page-form" onDiscard={discard} />
</form>

{#snippet meta(l: Lang)}
	{@const t = v[l]}
	<TextField
		label="Paginatitel"
		name="{l}.title"
		bind:value={t.title}
		required={l === 'nl'}
		maxlength={120}
		error={err(`${l}.title`)}
		placeholder={l === 'en' ? v.nl.title : undefined}
		helper="Titel in de browser en het menu."
	/>
	<TextField label="SEO-titel" name="{l}.seoTitle" bind:value={t.seoTitle} maxlength={70} error={err(`${l}.seoTitle`)} helper="{t.seoTitle.length}/60 · Leeg = paginatitel + bedrijfsnaam." />
	<Textarea label="SEO-omschrijving" name="{l}.seoDesc" bind:value={t.seoDesc} rows={2} maxlength={170} error={err(`${l}.seoDesc`)} helper="{t.seoDesc.length}/160" />
{/snippet}

<style>
	.dirty {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-warning-text);
	}
	.section,
	.shared {
		display: grid;
		gap: var(--space-5);
	}
	.shared {
		padding-bottom: var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}
	.stat-row {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: var(--space-2);
	}
	.feature-row {
		display: grid;
		gap: var(--space-2);
	}
	.mini {
		display: grid;
		gap: 2px;
	}
	.mini span {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.row-input {
		width: 100%;
		min-height: 34px;
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.row-input.area {
		padding: var(--space-2) var(--space-3);
		resize: vertical;
	}
	.row-input:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	:global([data-theme='dark']) .dirty {
		color: var(--harvest);
	}
</style>
