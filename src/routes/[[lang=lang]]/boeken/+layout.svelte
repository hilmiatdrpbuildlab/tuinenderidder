<script lang="ts">
	import { setContext, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Phone from '@lucide/svelte/icons/phone';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Logo from '$lib/components/marketing/Logo.svelte';
	import LanguageSwitcher from '$lib/components/marketing/LanguageSwitcher.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Stepper from '$lib/components/booking/Stepper.svelte';
	import BookingSummary from '$lib/components/booking/BookingSummary.svelte';
	import { localizePath, translator } from '$lib/i18n';
	import type { WizardState } from '$lib/components/booking/context';

	let { data, children } = $props();

	const t = $derived(translator(data.locale));
	const inFlow = $derived(!!data.currentStep && data.currentStep !== 'bedankt');
	const stepIndex = $derived(data.steps.findIndex((s) => s.state === 'current'));
	/** Shared "a step form is submitting" flag + unsaved step-1 selection for a live summary. */
	const wizard: WizardState = $state({ busy: false, preview: null });
	setContext('booking-wizard', wizard);

	const summary = $derived.by(() => {
		const p = wizard.preview;
		if (!p) return data.summary;
		const byId = new Map(data.catalog.map((s) => [s.id, s]));
		return {
			...data.summary,
			type: p.type,
			services: p.serviceIds.map((id) => byId.get(id)).filter((s) => !!s)
		};
	});
	const serviceCount = $derived(summary.services.length);
	const ctaLabel = $derived(
		data.currentStep === 'bevestigen'
			? t(summary.type === 'quote' ? 'booking.confirmQuote' : 'booking.confirm')
			: t('booking.next')
	);

	let sheetOpen = $state(false);

	// Move focus to the new step's <h1> after navigating between steps (design §4.1).
	afterNavigate(({ from, to }) => {
		sheetOpen = false;
		if (!from || !to || from.url.pathname === to.url.pathname) return;
		void tick().then(() => document.getElementById('step-title')?.focus());
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<a class="skip" href="#main">{t('a11y.skipToContent')}</a>

<header class="wiz-header">
	<div class="bar">
		<a class="home" href={localizePath('/', data.locale)} aria-label="{t('meta.siteName')}, {t('nav.home')}">
			<Logo compact />
		</a>
		<div class="tools">
			<a class="phone" href="tel:{data.company.phoneIntl}">
				<Phone size={18} aria-hidden="true" />
				<span class="phone-number">{data.company.phone}</span>
				<span class="visually-hidden phone-sr">{t('a11y.callUs')} {data.company.phone}</span>
			</a>
			<LanguageSwitcher locale={data.locale} />
			<a class="back" href={localizePath('/', data.locale)}>
				<ArrowLeft size={18} aria-hidden="true" />
				<span class="back-text">{t('booking.backToSite')}</span>
			</a>
		</div>
	</div>
</header>

<div class="wiz" class:with-summary={inFlow}>
	<main id="main" tabindex="-1">
		{#if inFlow}
			<Stepper
				steps={data.steps}
				label={t('booking.progress')}
				compactLabel={t('booking.stepOf', { n: stepIndex + 1, total: data.steps.length })}
				stateLabels={{
					complete: t('booking.stepState.complete'),
					current: t('booking.stepState.current'),
					upcoming: t('booking.stepState.upcoming')
				}}
			/>
		{/if}
		{@render children()}
	</main>

	{#if inFlow}
		<aside class="aside" aria-label={t('booking.summary.title')}>
			<div class="card">
				<BookingSummary locale={data.locale} {summary}>
					{#snippet cta()}
						<Button type="submit" form="booking-step-form" fullWidth size="lg" loading={wizard.busy}>
							{ctaLabel}
							{#snippet iconEnd()}<ArrowRight size={18} />{/snippet}
						</Button>
					{/snippet}
				</BookingSummary>
			</div>
		</aside>
	{/if}
</div>

<footer class="wiz-footer">
	<div class="bar">
		<p>© {new Date().getFullYear()} {data.company.name}</p>
		<nav aria-label={t('a11y.footerNav')}>
			<a href={localizePath('/privacy', data.locale)}>{t('footer.privacy')}</a>
			<a href={localizePath('/algemene-voorwaarden', data.locale)}>{t('footer.terms')}</a>
			<a href="tel:{data.company.phoneIntl}">{data.company.phone}</a>
		</nav>
	</div>
</footer>

{#if inFlow}
	<div class="mobilebar">
		<details class="sheet" bind:open={sheetOpen}>
			<summary>
				<span>
					{t('booking.summary.open')}
					{#if serviceCount}
						<span class="count">
							({serviceCount === 1
								? t('booking.summary.servicesOne')
								: t('booking.summary.servicesMany', { n: serviceCount })})
						</span>
					{/if}
				</span>
				<ChevronUp size={20} aria-hidden="true" class="chev" />
			</summary>
			<div class="sheet-body">
				<BookingSummary locale={data.locale} {summary} showTitle={false} />
			</div>
		</details>
		<Button type="submit" form="booking-step-form" fullWidth size="lg" loading={wizard.busy}>
			{ctaLabel}
			{#snippet iconEnd()}<ArrowRight size={18} />{/snippet}
		</Button>
	</div>
{/if}

<style>
	:global(body) {
		background: var(--color-bg);
	}
	.skip {
		position: absolute;
		left: var(--space-4);
		top: -100px;
		z-index: 100;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-weight: 600;
	}
	.skip:focus {
		top: var(--space-2);
	}

	/* ---------- header */
	.wiz-header {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		max-width: calc(1180px + var(--gutter) * 2);
		margin: 0 auto;
		padding: 0 var(--gutter);
	}
	.wiz-header .bar {
		min-height: 72px;
	}
	.home {
		display: inline-flex;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-md);
	}
	.tools {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.phone,
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		min-width: 44px;
		justify-content: center;
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-primary-hover);
		text-decoration: none;
		white-space: nowrap;
	}
	.phone:hover,
	.back:hover {
		background: var(--color-primary-subtle);
	}
	.phone-number,
	.back-text {
		display: none;
	}
	@media (min-width: 900px) {
		.phone-number,
		.back-text {
			display: inline;
		}
		.phone-sr {
			display: none;
		}
	}
	@media (max-width: 899px) {
		.back {
			position: relative;
		}
		.back-text {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			display: inline;
		}
	}

	/* ---------- body */
	.wiz {
		max-width: calc(800px + var(--gutter) * 2);
		margin: 0 auto;
		padding: var(--space-8) var(--gutter) var(--space-16);
	}
	.wiz.with-summary {
		/* room for the fixed mobile bar */
		padding-bottom: 168px;
	}
	main:focus {
		outline: none;
	}
	main {
		min-width: 0;
	}
	.aside {
		display: none;
	}
	@media (min-width: 1024px) {
		.wiz.with-summary {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: var(--space-12);
			align-items: start;
			max-width: calc(1180px + var(--gutter) * 2);
			padding-bottom: var(--space-16);
		}
		.aside {
			display: block;
			position: sticky;
			top: 104px;
			/* the sticky card doesn't obscure focused content (WCAG 2.4.11): it sits beside it */
		}
		.card {
			padding: var(--space-6);
			border-radius: var(--radius-lg);
			background: var(--color-surface);
			box-shadow: var(--shadow-3);
		}
	}

	/* ---------- footer */
	.wiz-footer {
		border-top: 1px solid var(--color-border);
		background: var(--color-bg-alt);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.wiz-footer .bar {
		flex-wrap: wrap;
		padding-block: var(--space-5);
	}
	.wiz-footer nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
	}
	.wiz-footer a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--color-text-muted);
	}
	.wiz-footer a:hover {
		color: var(--color-text);
	}
	@media (max-width: 1023px) {
		:global(body:has(.mobilebar)) .wiz-footer {
			padding-bottom: 150px;
		}
	}

	/* ---------- mobile bottom sheet + sticky CTA */
	.mobilebar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 40;
		display: grid;
		gap: var(--space-3);
		padding: var(--space-3) var(--gutter) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		box-shadow: 0 -8px 24px rgb(28 26 23 / 0.1);
	}
	@media (min-width: 1024px) {
		.mobilebar {
			display: none;
		}
	}
	.sheet summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}
	.sheet summary::-webkit-details-marker {
		display: none;
	}
	.count {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.sheet :global(.chev) {
		transition: transform var(--dur-panel) var(--ease-out);
	}
	.sheet[open] :global(.chev) {
		transform: rotate(180deg);
	}
	.sheet-body {
		max-height: min(60vh, 520px);
		overflow-y: auto;
		padding: var(--space-3) 0 var(--space-2);
		border-top: 1px solid var(--color-border);
	}
</style>
