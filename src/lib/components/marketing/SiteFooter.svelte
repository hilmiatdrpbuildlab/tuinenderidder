<script lang="ts">
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Logo from './Logo.svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import { localizePath, translator, type Locale } from '$lib/i18n';
	import type { NavService } from '$lib/server/site';
	import type { CompanySettings } from '$lib/server/settings';

	let { locale, services, company }: { locale: Locale; services: NavService[]; company: CompanySettings } = $props();

	const t = $derived(translator(locale));
	const l = (p: string) => localizePath(p, locale);
	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="container grid">
		<div class="col brand">
			<Logo inverse />
			<p class="tagline">{t('meta.tagline')}</p>
			<p class="hours">{locale === 'en' ? company.openingHoursEn : company.openingHoursNl}</p>
			{#if company.facebookUrl || company.instagramUrl}
				<ul class="socials" aria-label={t('footer.followUs')}>
					{#if company.facebookUrl}
						<li>
							<a href={company.facebookUrl} rel="noopener noreferrer" target="_blank" aria-label="Facebook">
								<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" /></svg>
							</a>
						</li>
					{/if}
					{#if company.instagramUrl}
						<li>
							<a href={company.instagramUrl} rel="noopener noreferrer" target="_blank" aria-label="Instagram">
								<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" /></svg>
							</a>
						</li>
					{/if}
				</ul>
			{/if}
		</div>

		<nav class="col" aria-labelledby="footer-services">
			<h2 id="footer-services">{t('footer.services')}</h2>
			<ul>
				{#each services as s (s.id)}
					<li><a href={l(`/diensten/${s.slug}`)}>{s.title}</a></li>
				{/each}
			</ul>
		</nav>

		<nav class="col" aria-labelledby="footer-company">
			<h2 id="footer-company">{t('footer.company')}</h2>
			<ul>
				<li><a href={l('/over-ons')}>{t('nav.about')}</a></li>
				<li><a href={l('/realisaties')}>{t('nav.projects')}</a></li>
				<li><a href={l('/contact')}>{t('nav.contact')}</a></li>
				<li><a href={l('/boeken/dienst')}>{t('nav.book')}</a></li>
			</ul>
		</nav>

		<div class="col">
			<h2>{t('footer.contact')}</h2>
			<address>
				<p class="row"><MapPin size={18} aria-hidden="true" /><span>{company.street}<br />{company.postcode} {company.town}</span></p>
				<p class="row"><Phone size={18} aria-hidden="true" /><a href="tel:{company.phoneIntl}">{company.phone}</a></p>
				<p class="row"><Mail size={18} aria-hidden="true" /><a href="mailto:{company.email}">{company.email}</a></p>
			</address>
			<p class="vat">{t('footer.vat')} {company.vat}</p>
		</div>
	</div>

	<div class="container bottom">
		<p>© {year} {company.name}. {t('footer.rights')}</p>
		<nav aria-label={t('a11y.footerNav')}>
			<ul>
				<li><a href={l('/privacy')}>{t('footer.privacy')}</a></li>
				<li><a href={l('/cookies')}>{t('footer.cookies')}</a></li>
				<li><a href={l('/algemene-voorwaarden')}>{t('footer.terms')}</a></li>
			</ul>
		</nav>
		<LanguageSwitcher {locale} variant="inverse" />
	</div>
</footer>

<style>
	.footer {
		background: var(--color-inverse);
		color: var(--color-on-inverse-muted);
		padding-top: var(--space-16);
		font-size: var(--text-sm);
	}
	.grid {
		display: grid;
		gap: var(--space-10);
		grid-template-columns: 1fr;
	}
	@media (min-width: 640px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1024px) {
		.grid {
			grid-template-columns: 1.4fr 1fr 1fr 1.3fr;
		}
	}
	h2 {
		font-family: var(--font-body);
		font-size: var(--text-eyebrow);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--bark-200);
		margin-bottom: var(--space-4);
	}
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-1);
	}
	a {
		color: var(--linen-25);
		text-decoration: none;
	}
	.col a:not([aria-label]) {
		display: inline-flex;
		min-height: 32px;
		align-items: center;
	}
	a:hover {
		text-decoration: underline;
	}
	.tagline {
		margin-top: var(--space-4);
		font-family: var(--font-accent);
		font-style: italic;
		font-size: var(--text-lg);
		color: var(--linen-25);
	}
	.hours {
		margin-top: var(--space-2);
	}
	.socials {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}
	.socials a {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.08);
	}
	.socials a:hover {
		background: rgb(255 255 255 / 0.16);
	}
	address {
		font-style: normal;
		display: grid;
		gap: var(--space-3);
	}
	.row {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
	}
	.row :global(svg) {
		flex-shrink: 0;
		margin-top: 3px;
		color: var(--forest-300);
	}
	.vat {
		margin-top: var(--space-4);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
	.bottom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-6);
		margin-top: var(--space-12);
		padding-block: var(--space-4);
		border-top: 1px solid rgb(255 255 255 / 0.1);
	}
	.bottom ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4);
	}
	.bottom a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
</style>
