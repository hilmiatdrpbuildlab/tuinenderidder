<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/Button.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import SectionHeading from '$lib/components/marketing/SectionHeading.svelte';
	import ServiceCard from '$lib/components/marketing/ServiceCard.svelte';
	import { priceLabel } from '$lib/components/marketing/format';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const steps = $derived([
		{ title: t('services.step1Title'), text: t('services.step1Text') },
		{ title: t('services.step2Title'), text: t('services.step2Text') },
		{ title: t('services.step3Title'), text: t('services.step3Text') }
	]);
</script>

<Seo
	locale={data.locale}
	title={t('seo.servicesTitle')}
	description={t('seo.servicesDescription')}
	image={data.services[0]?.image}
/>

<PageHero
	locale={data.locale}
	eyebrow={t('services.eyebrow')}
	title={t('services.title')}
	lead={t('services.lead')}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { label: t('nav.services') }]}
>
	{#snippet actions()}
		<Button href={l('/boeken/dienst')} size="lg">
			{t('cta.book')}
			{#snippet iconEnd()}<ArrowRight />{/snippet}
		</Button>
		<Button href={l('/contact')} variant="outline" size="lg">{t('cta.quote')}</Button>
	{/snippet}
</PageHero>

<section class="section">
	<div class="container">
		<ul class="grid">
			{#each data.services as s (s.id)}
				<li>
					<ServiceCard
						locale={data.locale}
						href={l(`/diensten/${s.slug}`)}
						title={s.title}
						summary={s.summary}
						icon={s.icon}
						image={s.image}
						highlights={s.highlights}
						price={priceLabel(s, data.locale)}
						headingLevel={2}
					/>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section process" aria-labelledby="process-title">
	<div class="container">
		<SectionHeading id="process-title" eyebrow={t('services.processEyebrow')} title={t('services.processTitle')} align="center" />
		<ol class="steps">
			{#each steps as step, i (i)}
				<li>
					<span class="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
					<h3>{step.title}</h3>
					<p>{step.text}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>

<style>
	.grid {
		display: grid;
		gap: var(--space-6);
		padding: 0;
		list-style: none;
	}
	@media (min-width: 640px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.process {
		background: var(--color-bg-alt);
	}
	.steps {
		display: grid;
		gap: var(--space-6);
		padding: 0;
		list-style: none;
		counter-reset: step;
	}
	.steps li {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-1);
	}
	.num {
		font-family: var(--font-display);
		font-size: 3.5rem;
		font-weight: 700;
		line-height: 0.9;
		color: var(--bark-300);
	}
	.steps p {
		color: var(--color-text-muted);
	}
	@media (min-width: 900px) {
		.steps {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
