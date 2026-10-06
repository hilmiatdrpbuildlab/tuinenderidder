<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Phone from '@lucide/svelte/icons/phone';
	import Button from '$lib/components/ui/Button.svelte';
	import { localizePath, translator, type Locale } from '$lib/i18n';

	let { locale, phone, phoneIntl }: { locale: Locale; phone: string; phoneIntl: string } = $props();
	const t = $derived(translator(locale));
</script>

<section class="cta-wrap" aria-labelledby="cta-band-title">
	<div class="container">
		<div class="band">
			<svg class="texture" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
				<defs>
					<pattern id="leaves" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
						<path d="M20 50c0-14 10-24 26-24 0 16-10 24-26 24Z" fill="currentColor" />
						<path d="M60 20c-8 0-14-6-14-16 10 0 14 6 14 16Z" fill="currentColor" />
					</pattern>
				</defs>
				<rect width="400" height="200" fill="url(#leaves)" />
			</svg>
			<div class="content">
				<h2 id="cta-band-title" class="display">{t('ctaBand.title')}</h2>
				<p>{t('ctaBand.text')}</p>
			</div>
			<div class="buttons">
				<Button href={localizePath('/boeken/dienst', locale)} size="lg">
					{t('cta.book')}
					{#snippet iconEnd()}<ArrowRight />{/snippet}
				</Button>
				<Button href="tel:{phoneIntl}" variant="inverse" size="lg">
					{#snippet iconStart()}<Phone />{/snippet}
					{phone}
				</Button>
			</div>
		</div>
	</div>
</section>

<style>
	.cta-wrap {
		padding-block: var(--space-16) var(--space-12);
	}
	.band {
		position: relative;
		overflow: hidden;
		display: grid;
		gap: var(--space-8);
		align-items: center;
		padding: clamp(2rem, 1rem + 4vw, 4.5rem);
		border-radius: var(--radius-xl);
		background: var(--color-inverse);
		color: var(--color-on-inverse);
	}
	.texture {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: var(--forest-300);
		opacity: 0.06;
		pointer-events: none;
	}
	.content,
	.buttons {
		position: relative;
	}
	h2 {
		color: var(--linen-25);
		font-size: clamp(2.25rem, 1.6rem + 2.8vw, 4rem);
	}
	p {
		margin-top: var(--space-4);
		max-width: 52ch;
		font-size: var(--text-lg);
		color: var(--color-on-inverse-muted);
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.buttons :global(.btn[data-variant='primary']) {
		--btn-bg: var(--forest-500);
		--btn-bg-hover: var(--forest-600);
	}
	@media (min-width: 1024px) {
		.band {
			grid-template-columns: 1fr auto;
		}
		.buttons {
			flex-direction: column;
		}
	}
</style>
