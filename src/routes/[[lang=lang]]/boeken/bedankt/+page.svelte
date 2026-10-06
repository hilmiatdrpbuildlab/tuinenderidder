<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import Check from '@lucide/svelte/icons/check';
	import Button from '$lib/components/ui/Button.svelte';
	import { SLOT_LABELS } from '$lib/domain';
	import { formatLongDate, localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const b = $derived(data.booking);
	const steps = $derived.by(() => {
		const list = [t('booking.bedankt.next1')];
		if (b?.slot) {
			list.push(
				t('booking.bedankt.next2Visit', {
					date: formatLongDate(b.slot.date, data.locale),
					time: `${SLOT_LABELS[b.slot.slotKind][data.locale].toLowerCase()} ${b.slot.start}–${b.slot.end}`
				})
			);
		} else if (b?.type === 'quote') {
			list.push(t('booking.bedankt.next2Quote'));
		}
		list.push(t('booking.bedankt.next3', { phone: data.company.phone }));
		return list;
	});
</script>

<svelte:head>
	<title>{t('booking.bedankt.titleGeneric')} · {t('meta.siteName')}</title>
</svelte:head>

<div class="thanks">
	<!-- Sprouting plant: decorative -->
	<svg class="art" viewBox="0 0 160 140" aria-hidden="true">
		<ellipse cx="80" cy="122" rx="56" ry="10" fill="var(--linen-100)" />
		<path d="M44 112c0-8 16-14 36-14s36 6 36 14Z" fill="var(--bark-400)" />
		<path d="M50 110c6-5 18-8 30-8s24 3 30 8" fill="none" stroke="var(--bark-600)" stroke-width="2" stroke-linecap="round" />
		<g class="sprout">
			<path d="M80 104V58" stroke="var(--forest-600)" stroke-width="5" stroke-linecap="round" />
			<path class="leaf l" d="M80 74c-20 0-32-12-32-32 20 0 32 12 32 32Z" fill="var(--forest-400)" />
			<path class="leaf r" d="M80 64c0-22 13-35 35-35 0 22-13 35-35 35Z" fill="var(--forest-300)" />
			<path d="M80 74c-10-4-18-12-22-22" fill="none" stroke="var(--forest-600)" stroke-width="2" stroke-linecap="round" />
			<path d="M80 64c6-10 14-18 26-24" fill="none" stroke="var(--forest-600)" stroke-width="2" stroke-linecap="round" />
		</g>
		<circle cx="128" cy="30" r="4" fill="var(--harvest)" />
		<circle cx="34" cy="50" r="3" fill="var(--harvest)" />
	</svg>

	<h1 id="step-title" tabindex="-1">{b ? t('booking.bedankt.title') : t('booking.bedankt.titleGeneric')}</h1>

	{#if b}
		<div class="ref">
			<span class="ref-label">{t('booking.bedankt.reference')}</span>
			<span class="ref-value">{b.reference}</span>
		</div>
		<p class="sent">{t('booking.bedankt.emailSent', { email: b.email })}</p>
	{:else}
		<p class="sent">{t('booking.bedankt.textGeneric')}</p>
	{/if}

	<section class="next" aria-labelledby="next-title">
		<h2 id="next-title">{t('booking.bedankt.nextTitle')}</h2>
		<ol>
			{#each steps as step, i (i)}
				<li>
					<span class="num" aria-hidden="true">{#if i === 0}<Check size={16} strokeWidth={3} />{:else}{i + 1}{/if}</span>
					<span>{step}</span>
				</li>
			{/each}
		</ol>
	</section>

	<div class="actions">
		{#if b?.icsHref}
			<Button href={b.icsHref} size="lg" download="{b.reference.toLowerCase()}.ics">
				{#snippet iconStart()}<CalendarPlus size={20} />{/snippet}
				{t('booking.bedankt.addToCalendar')}
			</Button>
		{/if}
		<Button href={localizePath('/', data.locale)} variant="outline" size="lg">{t('booking.bedankt.home')}</Button>
	</div>
	<p class="again"><a href={localizePath('/boeken/dienst', data.locale)}>{t('booking.bedankt.newBooking')}</a></p>
</div>

<style>
	.thanks {
		display: grid;
		justify-items: center;
		gap: var(--space-5);
		max-width: 640px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-5);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
		border: 1px solid var(--color-border);
		text-align: center;
	}
	@media (min-width: 640px) {
		.thanks {
			padding: var(--space-12) var(--space-10);
		}
	}
	.art {
		width: 160px;
		height: 140px;
	}
	@media (prefers-reduced-motion: no-preference) {
		.sprout {
			transform-origin: 80px 104px;
			animation: grow 900ms var(--ease-out) both;
		}
		.leaf {
			transform-box: fill-box;
			animation: unfurl 700ms 500ms var(--ease-out) both;
		}
		.leaf.l {
			transform-origin: right bottom;
		}
		.leaf.r {
			transform-origin: left bottom;
		}
	}
	@keyframes grow {
		from {
			transform: scaleY(0.2);
			opacity: 0;
		}
	}
	@keyframes unfurl {
		from {
			transform: scale(0.2);
			opacity: 0;
		}
	}
	h1 {
		font-size: clamp(2rem, 1.7rem + 1.4vw, 3rem);
	}
	h1:focus {
		outline: none;
	}
	.ref {
		display: grid;
		gap: 4px;
		padding: var(--space-3) var(--space-6);
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
	}
	.ref-label {
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--forest-800);
	}
	.ref-value {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		letter-spacing: 0.04em;
		color: var(--forest-900);
	}
	.sent {
		color: var(--color-text-muted);
	}
	.next {
		width: 100%;
		text-align: left;
		margin-top: var(--space-2);
	}
	.next h2 {
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
		margin-bottom: var(--space-3);
	}
	ol {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: 32px minmax(0, 1fr);
		gap: var(--space-3);
		align-items: start;
	}
	.num {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--forest-50);
		color: var(--forest-700);
		font-weight: 700;
		font-size: var(--text-sm);
	}
	li:first-child .num {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}
	.again {
		font-size: var(--text-sm);
	}
	.again a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
</style>
