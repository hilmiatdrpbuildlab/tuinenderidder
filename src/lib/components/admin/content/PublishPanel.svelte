<script lang="ts">
	import type { Snippet } from 'svelte';
	import Globe from '@lucide/svelte/icons/globe';
	import Save from '@lucide/svelte/icons/save';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Circle from '@lucide/svelte/icons/circle';
	import Lock from '@lucide/svelte/icons/lock';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { formatDateTime, type Lang } from './shared';

	/**
	 * Side-panel "Publiceren" card: status, dates, Save/Publish buttons, language completeness and
	 * a search-result preview. Buttons submit the surrounding form with name="intent".
	 */
	interface Props {
		status?: 'draft' | 'published' | null;
		publishedAt?: string | null;
		updatedAt?: string | null;
		complete: Record<Lang, boolean>;
		/** Reasons publishing is blocked; Publish stays disabled while non-empty. */
		blockers?: string[];
		seo?: { title: string; desc: string; url: string } | null;
		saving?: boolean;
		/** Pages have no draft state: one "Opslaan" button. */
		simple?: boolean;
		/** Link to the live page */
		viewHref?: string | null;
		form?: string;
		extra?: Snippet;
	}

	let {
		status = 'draft',
		publishedAt,
		updatedAt,
		complete,
		blockers = [],
		seo,
		saving = false,
		simple = false,
		viewHref,
		form,
		extra
	}: Props = $props();

	const uid = $props.id();
	const blocked = $derived(blockers.length > 0);
	const isPublished = $derived(status === 'published');
	const seoTitle = $derived((seo?.title || '').slice(0, 70));
	const seoDesc = $derived(seo?.desc || '');
</script>

<Panel title={simple ? 'Opslaan' : 'Publiceren'}>
	<div class="stack">
		{#if !simple}
			<dl class="meta">
				<div><dt>Status</dt><dd><StatusBadge status={status ?? 'draft'} /></dd></div>
				<div><dt>Gepubliceerd</dt><dd>{formatDateTime(publishedAt)}</dd></div>
				{#if updatedAt}<div><dt>Laatst opgeslagen</dt><dd>{formatDateTime(updatedAt)}</dd></div>{/if}
			</dl>
		{:else if updatedAt}
			<dl class="meta"><div><dt>Laatst opgeslagen</dt><dd>{formatDateTime(updatedAt)}</dd></div></dl>
		{/if}

		<div class="buttons">
			{#if simple}
				<Button type="submit" {form} name="intent" value="save" fullWidth loading={saving}>
					{#snippet iconStart()}<Save size={16} />{/snippet}
					Opslaan
				</Button>
			{:else if isPublished}
				<Button
					type="submit"
					{form}
					name="intent"
					value="save"
					fullWidth
					loading={saving}
					aria-disabled={blocked ? 'true' : undefined}
					aria-describedby={blocked ? `${uid}-why` : undefined}
					title={blocked ? blockers.join(' ') : undefined}
					onclick={(e: MouseEvent) => blocked && e.preventDefault()}
				>
					{#snippet iconStart()}<Save size={16} />{/snippet}
					Bijwerken
				</Button>
				<Button type="submit" {form} name="intent" value="unpublish" variant="ghost" size="sm" fullWidth>
					{#snippet iconStart()}<EyeOff size={16} />{/snippet}
					Depubliceren (terug naar concept)
				</Button>
			{:else}
				<Button
					type="submit"
					{form}
					name="intent"
					value="publish"
					fullWidth
					loading={saving}
					aria-disabled={blocked ? 'true' : undefined}
					aria-describedby={blocked ? `${uid}-why` : undefined}
					title={blocked ? blockers.join(' ') : undefined}
					onclick={(e: MouseEvent) => blocked && e.preventDefault()}
				>
					{#snippet iconStart()}{#if blocked}<Lock size={16} />{:else}<Globe size={16} />{/if}{/snippet}
					Publiceren
				</Button>
				<Button type="submit" {form} name="intent" value="save" variant="outline" fullWidth>
					{#snippet iconStart()}<Save size={16} />{/snippet}
					Opslaan als concept
				</Button>
			{/if}
		</div>

		{#if blocked && !simple}
			<div class="blockers" id="{uid}-why">
				<p>Nog nodig om te publiceren:</p>
				<ul>
					{#each blockers as b (b)}<li>{b}</li>{/each}
				</ul>
			</div>
		{/if}

		<div class="langs">
			<p class="h">Talen</p>
			<ul>
				{#each [['nl', 'Nederlands', true], ['en', 'Engels', false]] as const as [code, name, required] (code)}
					<li class:ok={complete[code]}>
						{#if complete[code]}<CircleCheck size={16} aria-hidden="true" />{:else}<Circle size={16} aria-hidden="true" />{/if}
						<span>{name}</span>
						<span class="state">
							{complete[code] ? 'Volledig' : required ? 'Onvolledig — verplicht' : 'Valt terug op NL'}
						</span>
					</li>
				{/each}
			</ul>
		</div>

		{#if seo}
			<div class="seo">
				<p class="h">Voorbeeld in Google</p>
				<div class="snippet" aria-label="Voorbeeld zoekresultaat">
					<span class="url">tuinen-deridder.be{seo.url}</span>
					<span class="title">{seoTitle || 'Paginatitel'}{seo.title.length > 70 ? '…' : ''}</span>
					<span class="desc">{seoDesc ? seoDesc.slice(0, 160) + (seoDesc.length > 160 ? '…' : '') : 'Voeg een SEO-omschrijving toe om te bepalen wat hier verschijnt.'}</span>
				</div>
				<p class="counts">Titel {seo.title.length}/60 · Omschrijving {seoDesc.length}/160</p>
			</div>
		{/if}

		{#if viewHref && (isPublished || simple)}
			<a class="view" href={viewHref} target="_blank" rel="noopener">Bekijk op de website <ExternalLink size={14} aria-hidden="true" /></a>
		{/if}

		{#if extra}{@render extra()}{/if}
	</div>
</Panel>

<style>
	.stack {
		display: grid;
		gap: var(--space-4);
	}
	.meta {
		display: grid;
		gap: var(--space-2);
		margin: 0;
	}
	.meta div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
	}
	dt {
		color: var(--color-text-muted);
	}
	dd {
		margin: 0;
		font-weight: 500;
		text-align: right;
	}
	.buttons {
		display: grid;
		gap: var(--space-2);
	}
	.blockers {
		padding: var(--space-3);
		border-radius: var(--radius-sm);
		background: var(--color-warning-subtle);
		color: var(--color-warning-text);
		font-size: var(--text-sm);
	}
	.blockers p {
		font-weight: 600;
	}
	.blockers ul {
		margin: 4px 0 0;
		padding-left: 1.2em;
	}
	.h {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin-bottom: var(--space-2);
	}
	.langs ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.langs li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
	}
	.langs li.ok {
		color: var(--color-text);
	}
	.langs li.ok :global(svg) {
		color: var(--color-success);
	}
	.langs .state {
		margin-left: auto;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.snippet {
		display: grid;
		gap: 2px;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		font-family: Arial, sans-serif;
	}
	.url {
		font-size: 12px;
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.title {
		font-size: 17px;
		line-height: 1.3;
		color: var(--color-info);
	}
	.desc {
		font-size: 13px;
		line-height: 1.45;
		color: var(--color-text-muted);
	}
	.counts {
		margin-top: 4px;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.view {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	:global([data-theme='dark']) .blockers {
		background: transparent;
		border: 1px solid var(--harvest);
		color: var(--color-text);
	}
	:global([data-theme='dark']) .title {
		color: var(--color-link);
	}
</style>
