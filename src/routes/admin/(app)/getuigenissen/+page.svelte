<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';
	import { SOURCE_LABELS, formatDay } from '$lib/components/admin/content/shared';

	let { data, form } = $props();

	onMount(() => {
		if (page.url.searchParams.has('verwijderd')) {
			toast.success('Getuigenis verwijderd.');
			const url = new URL(page.url);
			url.searchParams.delete('verwijderd');
			replaceState(url, {});
		}
	});

	const notify: SubmitFunction = () => async ({ result, update }) => {
		if (result.type === 'success' && result.data?.message) toast.success(String(result.data.message));
		else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Er ging iets mis.'));
		await update();
	};

	const visibleCount = $derived(data.testimonials.filter((t) => t.isVisible).length);
</script>

<svelte:head><title>Getuigenissen · CMS</title></svelte:head>

<PageHeader title="Getuigenissen" description="Reviews van klanten op de website. Enkel echte reviews met een bron.">
	{#snippet meta()}
		<Badge tone="success" dot>{visibleCount} zichtbaar</Badge>
		<Badge dot>{data.testimonials.length - visibleCount} verborgen</Badge>
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/getuigenissen/nieuw" size="sm">
			{#snippet iconStart()}<Plus size={16} />{/snippet}
			Nieuwe getuigenis
		</Button>
	{/snippet}
</PageHeader>

<FormMessage {form} />

{#if data.testimonials.length === 0}
	<EmptyState title="Nog geen getuigenissen" text="Kopieer een review van Google of Facebook en voeg de link toe als bron.">
		{#snippet icon()}<MessageSquareQuote size={40} strokeWidth={1.5} />{/snippet}
		{#snippet actions()}<Button href="/admin/getuigenissen/nieuw">Eerste getuigenis toevoegen</Button>{/snippet}
	</EmptyState>
{:else}
	<Panel flush>
		<ul class="list">
			{#each data.testimonials as t (t.id)}
				<li class="row" class:hidden-row={!t.isVisible}>
					<div class="who">
						<a href="/admin/getuigenissen/{t.id}" class="name">{t.authorName}</a>
						<span class="sub">{t.town || '—'}{t.serviceTitle ? ` · ${t.serviceTitle}` : ''}</span>
						<span class="stars" role="img" aria-label="{t.rating} van 5 sterren">
							{#each [1, 2, 3, 4, 5] as n (n)}<Star size={14} class={n <= t.rating ? 'on' : ''} aria-hidden="true" />{/each}
						</span>
					</div>
					<blockquote class="quote">“{t.quoteNl}”</blockquote>
					<div class="src">
						{#if t.sourceUrl}
							<a href={t.sourceUrl} target="_blank" rel="noopener noreferrer">{SOURCE_LABELS[t.source]} <ExternalLink size={12} aria-hidden="true" /><span class="visually-hidden">(nieuw venster)</span></a>
						{:else}
							<span>{SOURCE_LABELS[t.source]}</span>
						{/if}
						<span class="date">{formatDay(t.reviewDate)}</span>
						{#if !t.sourceUrl && t.source !== 'direct'}<span class="warn">Bron-link ontbreekt</span>{/if}
						{#if !t.quoteEn}<span class="warn">EN ontbreekt</span>{/if}
					</div>
					<div class="actions">
						{#if t.isVisible}<Badge tone="success" dot>Zichtbaar</Badge>{:else}<Badge dot>Verborgen</Badge>{/if}
						<form method="POST" action="?/visible" use:enhance={notify}>
							<input type="hidden" name="id" value={t.id} />
							{#if t.isVisible}
								<button type="submit" name="visible" value="0" class="icon-btn" aria-label="Review van {t.authorName} verbergen" title="Verbergen"><EyeOff size={16} /></button>
							{:else}
								<button type="submit" name="visible" value="1" class="icon-btn" aria-label="Review van {t.authorName} tonen" title="Tonen"><Eye size={16} /></button>
							{/if}
						</form>
						<a class="icon-btn" href="/admin/getuigenissen/{t.id}" aria-label="Review van {t.authorName} bewerken" title="Bewerken"><Pencil size={16} /></a>
					</div>
				</li>
			{/each}
		</ul>
	</Panel>
{/if}

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: 200px 1fr 160px auto;
		gap: var(--space-4);
		align-items: center;
		padding: var(--space-3) var(--space-5);
		border-top: 1px solid var(--color-border);
	}
	.row:first-child {
		border-top: 0;
	}
	.row:hover {
		background: var(--color-bg-alt);
	}
	.hidden-row .quote,
	.hidden-row .who {
		opacity: 0.6;
	}
	.who {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
	}
	.name:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.sub,
	.date {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.stars {
		display: flex;
		gap: 1px;
		color: var(--color-border-strong);
	}
	.stars :global(.on) {
		color: var(--harvest);
		fill: var(--harvest);
	}
	.quote {
		margin: 0;
		font-size: var(--text-sm);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.src {
		display: grid;
		gap: 2px;
		font-size: var(--text-sm);
	}
	.src a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.warn {
		font-size: var(--text-xs);
		color: var(--color-warning-text);
		font-weight: 600;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.icon-btn:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.icon-btn:focus-visible {
		outline: 2px solid var(--color-focus);
	}
	@media (max-width: 900px) {
		.row {
			grid-template-columns: 1fr auto;
		}
		.quote,
		.src {
			grid-column: 1 / -1;
		}
		.actions {
			grid-row: 1;
			grid-column: 2;
		}
	}
	:global([data-theme='dark']) .warn {
		color: var(--harvest);
	}
</style>
