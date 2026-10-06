<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Send from '@lucide/svelte/icons/send';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Textarea from '$lib/components/form/Textarea.svelte';
	import Checkbox from '$lib/components/form/Checkbox.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import { localBusinessLd, siteOrigin } from '$lib/components/marketing/seo';
	import { localizePath, translator } from '$lib/i18n';

	let { data, form } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const c = $derived(data.company);
	const b = $derived(data.contact.blocks);
	const title = $derived(data.contact.title || t('nav.contact'));
	const intro = $derived(b.intro ?? '');

	type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message' | 'consent', string>>;
	const errors = $derived(((form && 'errors' in form ? form.errors : undefined) ?? {}) as Errors);
	const values = $derived(
		(form && 'values' in form ? form.values : undefined) as
			| { name: string; email: string; phone: string; message: string; consent: boolean }
			| undefined
	);
	const success = $derived(Boolean(form && 'success' in form && form.success));
	const formMessage = $derived(form && 'message' in form ? (form.message as string | null) : null);
	const hasErrors = $derived(Object.keys(errors).length > 0);

	let submitting = $state(false);
	let statusEl: HTMLDivElement | undefined = $state();

	const mapLink = $derived.by(() => {
		try {
			const marker = new URL(c.mapsEmbedUrl).searchParams.get('marker');
			if (marker) {
				const [lat, lon] = marker.split(',');
				return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
			}
		} catch {
			/* ignore */
		}
		return null;
	});

	const ld = $derived([
		localBusinessLd(c, { origin: siteOrigin(page.url.origin), locale: data.locale, description: intro || t('meta.defaultDescription') })
	]);
</script>

<Seo locale={data.locale} title={data.contact.seoTitle || title} description={data.contact.seoDesc || intro} jsonLd={ld} />

<PageHero
	locale={data.locale}
	eyebrow={b.eyebrow}
	title={t('contact.title')}
	lead={intro}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { label: title }]}
/>

<section class="section">
	<div class="container grid">
		<div class="details">
			<div class="card">
				<h2 class="card-title">{t('contact.detailsTitle')}</h2>
				<ul class="info">
					<li>
						<span class="ico" aria-hidden="true"><MapPin size={20} /></span>
						<span>
							<span class="k">{t('contact.address')}</span>
							<address>{c.name}<br />{c.street}<br />{c.postcode} {c.town}</address>
						</span>
					</li>
					<li>
						<span class="ico" aria-hidden="true"><Phone size={20} /></span>
						<span>
							<span class="k">{t('contact.phone')}</span>
							<a href="tel:{c.phoneIntl}">{c.phone}</a>
						</span>
					</li>
					<li>
						<span class="ico" aria-hidden="true"><Mail size={20} /></span>
						<span>
							<span class="k">{t('contact.email')}</span>
							<a href="mailto:{c.email}">{c.email}</a>
						</span>
					</li>
					<li>
						<span class="ico" aria-hidden="true"><Clock size={20} /></span>
						<span>
							<span class="k">{t('contact.hours')}</span>
							<span>{data.locale === 'en' ? c.openingHoursEn : c.openingHoursNl}</span>
						</span>
					</li>
					<li>
						<span class="ico" aria-hidden="true"><Receipt size={20} /></span>
						<span>
							<span class="k">{t('contact.vat')}</span>
							<span>{c.vat}</span>
						</span>
					</li>
				</ul>
			</div>
			{#if c.mapsEmbedUrl}
				<div class="map">
					<iframe src={c.mapsEmbedUrl} title={t('contact.mapTitle')} loading="lazy" referrerpolicy="no-referrer"></iframe>
				</div>
				{#if mapLink}
					<a class="map-link" href={mapLink} rel="noopener noreferrer" target="_blank">{t('contact.mapLink')}</a>
				{/if}
			{/if}
		</div>

		<div class="form-card">
			<h2 class="form-title">{t('contact.formTitle')}</h2>
			<p class="form-intro">{t('contact.formIntro')}</p>

			<div bind:this={statusEl} tabindex="-1" class="status">
				{#if success}
					<Alert tone="success" title={t('contact.successTitle')}>{t('contact.successText')}</Alert>
				{:else if formMessage}
					<Alert tone="error" assertive title={t('contact.errorTitle')}>{formMessage}</Alert>
				{:else if hasErrors}
					<Alert tone="error" assertive title={t('contact.errorTitle')}>{t('contact.errorText')}</Alert>
				{/if}
			</div>

			<form
				method="POST"
				novalidate
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update({ reset: true });
						submitting = false;
						await tick();
						statusEl?.focus();
					};
				}}
			>
				<div class="row">
					<TextField label={t('contact.name')} name="name" autocomplete="name" required value={values?.name ?? ''} error={errors.name} />
					<TextField
						label={t('contact.emailLabel')}
						name="email"
						type="email"
						autocomplete="email"
						inputmode="email"
						required
						value={values?.email ?? ''}
						error={errors.email}
					/>
				</div>
				<TextField
					label={t('contact.phoneLabel')}
					name="phone"
					type="tel"
					autocomplete="tel"
					optionalLabel={t('common.optional')}
					value={values?.phone ?? ''}
					error={errors.phone}
				/>
				<Textarea
					label={t('contact.message')}
					name="message"
					rows={6}
					required
					helper={t('contact.messageHelp')}
					value={values?.message ?? ''}
					error={errors.message}
				/>
				<div class="hp" aria-hidden="true">
					<label for="contact-website">{t('contact.honeypot')}</label>
					<input id="contact-website" type="text" name="website" tabindex="-1" autocomplete="off" />
				</div>
				<Checkbox name="consent" checked={values?.consent ?? false} error={errors.consent} required>
					{t('contact.consent')} <a href={l('/privacy')}>{t('contact.consentLink')}</a>.
				</Checkbox>
				<div class="submit">
					<Button type="submit" size="lg" loading={submitting}>
						{#snippet iconStart()}<Send />{/snippet}
						{t('contact.submit')}
					</Button>
				</div>
			</form>

			<a class="book" href={l('/boeken/dienst')}>
				{t('contact.bookInstead')}
				<ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
			</a>
		</div>
	</div>
</section>

<style>
	.grid {
		display: grid;
		gap: var(--space-10);
		align-items: start;
	}
	@media (min-width: 1024px) {
		.grid {
			grid-template-columns: 5fr 7fr;
			gap: var(--space-16);
		}
	}
	.details {
		display: grid;
		gap: var(--space-5);
	}
	.card,
	.form-card {
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-1);
	}
	.card-title,
	.form-title {
		font-size: var(--text-h3);
	}
	.info {
		display: grid;
		gap: var(--space-5);
		margin-top: var(--space-6);
		padding: 0;
		list-style: none;
	}
	.info li {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
	}
	.info li > span:last-child {
		display: grid;
		min-width: 0;
	}
	.ico {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.k {
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	address {
		font-style: normal;
	}
	.info a {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.map {
		overflow: hidden;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		aspect-ratio: 4 / 3;
		background: var(--color-surface-sunken);
	}
	.map iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}
	.map-link {
		justify-self: start;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.form-card {
		box-shadow: var(--shadow-2);
	}
	.form-intro {
		margin-top: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.status {
		margin-top: var(--space-5);
	}
	.status:focus {
		outline: none;
	}
	form {
		display: grid;
		gap: var(--space-5);
		margin-top: var(--space-5);
	}
	.row {
		display: grid;
		gap: var(--space-5);
	}
	@media (min-width: 640px) {
		.row {
			grid-template-columns: 1fr 1fr;
		}
	}
	.hp {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.submit {
		margin-top: var(--space-2);
	}
	.book {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		margin-top: var(--space-6);
		padding-top: var(--space-5);
		border-top: 1px solid var(--color-border);
		width: 100%;
		font-weight: 600;
	}
</style>
