<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { FREQUENCY_LABELS, GARDEN_SIZE_LABELS, SLOT_LABELS, TYPE_LABELS } from '$lib/domain';
	import { formatLongDate, formatPrice, translator, type Locale } from '$lib/i18n';
	import type { BookingSummaryData } from './types';

	/** Order summary (design §4.5): sticky card on desktop, content of the bottom sheet on mobile. */
	interface Props {
		locale: Locale;
		summary: BookingSummaryData;
		/** primary CTA for the current step */
		cta?: Snippet;
		/** hide the heading (the mobile sheet has its own) */
		showTitle?: boolean;
	}

	let { locale, summary, cta, showTitle = true }: Props = $props();
	const t = $derived(translator(locale));

	const price = $derived.by(() => {
		if (!summary.type) return null;
		if (summary.type === 'consultation') return { main: t('booking.summary.free'), sub: null };
		if (summary.type === 'quote') return { main: t('booking.summary.freeQuote'), sub: null };
		const fixed = summary.services.filter((s) => s.priceMode === 'fixed' && s.priceFrom != null);
		if (fixed.length === 0) return { main: t('booking.summary.freeQuote'), sub: null };
		const total = fixed.reduce((sum, s) => sum + (s.priceFrom ?? 0), 0);
		return {
			main: t('booking.summary.priceFrom', { price: formatPrice(total, locale) }),
			sub: fixed.length < summary.services.length ? t('booking.summary.plusQuote') : null
		};
	});

	const sizeLine = $derived(
		[
			summary.gardenSize ? GARDEN_SIZE_LABELS[summary.gardenSize] : null,
			summary.type === 'maintenance' && summary.frequency ? FREQUENCY_LABELS[summary.frequency][locale] : null
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

{#snippet edit(href: string | null, section: string)}
	{#if href}
		<a class="edit" {href}>
			<span aria-hidden="true">{t('booking.summary.edit')}</span>
			<span class="visually-hidden">{t('booking.summary.editLabel', { section: section.toLowerCase() })}</span>
		</a>
	{/if}
{/snippet}

<section class="summary" aria-labelledby={showTitle ? 'booking-summary-title' : undefined}>
	{#if showTitle}<h2 class="title" id="booking-summary-title">{t('booking.summary.title')}</h2>{/if}

	<dl class="rows">
		<div class="row">
			<dt>{t('booking.summary.type')}</dt>
			<dd>
				<div class="val">{summary.type ? TYPE_LABELS[summary.type][locale] : t('booking.summary.notChosen')}</div>
				{#if summary.type}{@render edit(summary.links.dienst, t('booking.summary.type'))}{/if}
			</dd>
		</div>

		<div class="row">
			<dt>{t('booking.summary.services')}</dt>
			<dd>
				<div class="val">
				{#if summary.services.length}
					<ul class="services">
						{#each summary.services as s (s.id)}
							<li>
								<span class="sicon" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
								<span class="sname">{s.title}</span>
								{#if summary.type === 'maintenance'}
									<span class="sprice">
										{s.priceMode === 'fixed' && s.priceFrom != null
											? t('common.priceFrom', { price: formatPrice(s.priceFrom, locale) })
											: t('common.priceOnQuote')}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<span class="muted">{t('booking.summary.notChosen')}</span>
				{/if}
				</div>
				{#if summary.services.length}{@render edit(summary.links.dienst, t('booking.summary.services'))}{/if}
			</dd>
		</div>

		{#if sizeLine}
			<div class="row">
				<dt>{t('booking.summary.details')}</dt>
				<dd>
					<div class="val">{sizeLine}</div>
					{@render edit(summary.links.details, t('booking.summary.details'))}
				</dd>
			</div>
		{/if}

		{#if summary.type}
			<div class="row">
				<dt>{t('booking.summary.date')}</dt>
				<dd>
					<div class="val">
					{#if summary.type === 'quote'}
						<span class="muted">{t('booking.summary.noVisit')}</span>
					{:else if summary.slot}
						<span class="date">{formatLongDate(summary.slot.date, locale)}</span>
						<span class="time">{SLOT_LABELS[summary.slot.slotKind][locale]} · {summary.slot.start}–{summary.slot.end}</span>
					{:else}
						<span class="muted">{t('booking.summary.notChosen')}</span>
					{/if}
				</div>
					{#if summary.slot}{@render edit(summary.links.datum, t('booking.summary.date'))}{/if}
				</dd>
			</div>
		{/if}

		{#if summary.address}
			<div class="row">
				<dt>{t('booking.summary.address')}</dt>
				<dd>
					<div class="val">
					{summary.address.street}<br />
					{summary.address.postcode}
					{summary.address.municipality}
				</div>
					{@render edit(summary.links.details, t('booking.summary.address'))}
				</dd>
			</div>
		{/if}
	</dl>

	{#if price}
		<div class="price">
			<span class="plabel">{t('booking.summary.price')}</span>
			<span class="pvalue">{price.main}</span>
			{#if price.sub}<span class="psub">{price.sub}</span>{/if}
		</div>
		{#if summary.type === 'maintenance'}<p class="vat">{summary.vatNote}</p>{/if}
	{/if}

	{#if cta}<div class="cta">{@render cta()}</div>{/if}

	<p class="reassure">
		<ShieldCheck size={16} aria-hidden="true" />
		<span>{t('booking.reassurance')}</span>
	</p>
</section>

<style>
	.summary {
		display: grid;
		gap: var(--space-4);
	}
	.title {
		font-size: var(--text-h3);
		font-weight: 600;
	}
	.rows {
		display: grid;
	}
	.row {
		padding: var(--space-3) 0;
		border-top: 1px solid var(--color-border);
	}
	.row:first-child {
		border-top: 0;
		padding-top: 0;
	}
	dt {
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}
	dd {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-3);
		align-items: start;
		margin: 2px 0 0;
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.val {
		display: grid;
		min-width: 0;
	}
	.edit {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-top: -14px;
		margin-bottom: -10px;
		padding: 0 4px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-link);
	}
	.services {
		display: grid;
		gap: 6px;
		padding: 0;
		margin: 4px 0 0;
		list-style: none;
	}
	.services li {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		align-items: center;
		column-gap: var(--space-2);
	}
	.sicon {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: var(--forest-50);
		color: var(--forest-700);
	}
	.sname {
		font-weight: 600;
	}
	.sprice {
		grid-column: 2;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.date {
		font-weight: 600;
	}
	.date::first-letter {
		text-transform: uppercase;
	}
	.time {
		color: var(--color-text-muted);
	}
	.muted {
		color: var(--color-text-muted);
	}
	.price {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: baseline;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
	}
	.plabel {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--forest-800);
	}
	.pvalue {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--forest-800);
	}
	.psub {
		grid-column: 1 / -1;
		justify-self: end;
		font-size: var(--text-xs);
		color: var(--forest-800);
	}
	.vat {
		margin-top: calc(var(--space-2) * -1);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.reassure {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.reassure :global(svg) {
		flex-shrink: 0;
		color: var(--color-primary);
	}
</style>
