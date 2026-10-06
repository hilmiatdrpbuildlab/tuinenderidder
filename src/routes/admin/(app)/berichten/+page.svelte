<script lang="ts">
	import { enhance } from '$app/forms';
	import Mail from '@lucide/svelte/icons/mail';
	import MailOpen from '@lucide/svelte/icons/mail-open';
	import Phone from '@lucide/svelte/icons/phone';
	import Reply from '@lucide/svelte/icons/reply';
	import Trash2 from '@lucide/svelte/icons/trash';
	import Inbox from '@lucide/svelte/icons/inbox';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import ConfirmForm from '$lib/components/admin/ConfirmForm.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { formatDateTime, relativeTime } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let { data } = $props();

	const SUBJECT = encodeURIComponent('Uw bericht aan Tuinen De Ridder');
	const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

	const tabs = $derived([
		{ key: 'all', href: '/admin/berichten', label: 'Alle', count: data.counts.all },
		{ key: 'unread', href: '/admin/berichten?filter=ongelezen', label: 'Ongelezen', count: data.counts.unread }
	]);

	let busyId = $state<number | null>(null);
</script>

<PageHeader
	title="Berichten"
	description="Vragen via het contactformulier op de website. Antwoord per e-mail of telefoon."
/>

<Panel flush>
	<nav class="tabs" aria-label="Filter berichten">
		{#each tabs as tab (tab.key)}
			<a href={tab.href} aria-current={data.filter === tab.key ? 'page' : undefined}>
				{tab.label}
				<span class="count">{tab.count}</span>
			</a>
		{/each}
	</nav>

	{#if data.messages.length === 0}
		<div class="empty">
			<EmptyState
				title={data.filter === 'unread' ? 'Geen ongelezen berichten' : 'Nog geen berichten'}
				text={data.filter === 'unread'
					? 'Alles is gelezen. Nieuwe berichten van het contactformulier verschijnen hier.'
					: 'Berichten van het contactformulier op de website verschijnen hier.'}
			>
				{#snippet icon()}<Inbox size={40} strokeWidth={1.5} />{/snippet}
				{#snippet actions()}
					{#if data.filter === 'unread' && data.counts.all > 0}
						<Button href="/admin/berichten" variant="outline" size="sm">Alle berichten tonen</Button>
					{/if}
				{/snippet}
			</EmptyState>
		</div>
	{:else}
		<ul class="list" aria-label={data.filter === 'unread' ? 'Ongelezen berichten' : 'Alle berichten'}>
			{#each data.messages as m (m.id)}
				<li>
					<article class="msg" data-unread={!m.isRead || undefined} aria-labelledby="msg-{m.id}-name">
						<div class="head">
							<Avatar name={m.name} size={36} />
							<div class="who">
								<h2 id="msg-{m.id}-name" class="name">
									{#if !m.isRead}<span class="dot" aria-hidden="true"></span>{/if}
									{m.name}
								</h2>
								<p class="contact">
									<a href="mailto:{m.email}?subject={SUBJECT}">{m.email}</a>
									{#if m.phone}<span aria-hidden="true">·</span> <a href={telHref(m.phone)}>{m.phone}</a>{/if}
								</p>
							</div>
							<div class="meta">
								{#if !m.isRead}<Badge tone="info" dot>Ongelezen</Badge>{/if}
								<time datetime={new Date(m.createdAt).toISOString()} title={formatDateTime(m.createdAt)}>
									{relativeTime(m.createdAt)}
								</time>
							</div>
						</div>

						<p class="body">{m.message}</p>

						<div class="actions">
							<Button href="mailto:{m.email}?subject={SUBJECT}" variant="secondary" size="sm">
								{#snippet iconStart()}<Reply size={16} aria-hidden="true" />{/snippet}
								Beantwoorden
							</Button>
							{#if m.phone}
								<Button href={telHref(m.phone)} variant="outline" size="sm">
									{#snippet iconStart()}<Phone size={16} aria-hidden="true" />{/snippet}
									Bellen
								</Button>
							{/if}
							<form
								method="POST"
								action="?/toggle"
								use:enhance={enhanceToast({ pending: (b) => (busyId = b ? m.id : null) })}
							>
								<input type="hidden" name="id" value={m.id} />
								<input type="hidden" name="read" value={m.isRead ? '0' : '1'} />
								<Button type="submit" variant="ghost" size="sm" loading={busyId === m.id}>
									{#snippet iconStart()}
										{#if m.isRead}<Mail size={16} aria-hidden="true" />{:else}<MailOpen size={16} aria-hidden="true" />{/if}
									{/snippet}
									{m.isRead ? 'Markeer als ongelezen' : 'Markeer als gelezen'}
								</Button>
							</form>
							<span class="spacer"></span>
							<ConfirmForm
								action="?/delete"
								fields={{ id: m.id }}
								title="Bericht verwijderen?"
								description="Het bericht van {m.name} wordt definitief verwijderd."
								aria-label="Bericht van {m.name} verwijderen"
							>
								<Trash2 size={16} aria-hidden="true" /> Verwijderen
							</ConfirmForm>
						</div>
					</article>
				</li>
			{/each}
		</ul>
	{/if}
</Panel>

<style>
	.tabs {
		display: flex;
		gap: var(--space-1);
		padding: 0 var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}
	.tabs a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--control-h-sm);
		padding: var(--space-2) var(--space-3);
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--text-sm);
		text-decoration: none;
	}
	.tabs a:hover {
		color: var(--color-text);
	}
	.tabs a[aria-current='page'] {
		color: var(--color-text);
		border-bottom-color: var(--color-primary);
	}
	.count {
		min-width: 1.5rem;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-sunken);
		color: var(--color-text);
		font-size: var(--text-xs);
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.empty {
		padding: var(--space-8) var(--space-5);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list > li + li {
		border-top: 1px solid var(--color-border);
	}
	.msg {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-left: 3px solid transparent;
	}
	.msg[data-unread] {
		border-left-color: var(--color-info);
		background: var(--color-bg);
	}
	.head {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}
	.who {
		flex: 1;
		min-width: 0;
	}
	.name {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 500;
		line-height: 1.4;
		color: var(--color-heading);
	}
	.msg[data-unread] .name {
		font-weight: 700;
	}
	.dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-info);
	}
	.contact {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.contact a {
		color: var(--color-link);
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
		flex-shrink: 0;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.body {
		white-space: pre-line;
		overflow-wrap: anywhere;
		max-width: 75ch;
		color: var(--color-text);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.actions form {
		display: inline-flex;
	}
	.spacer {
		flex: 1;
	}
	@media (max-width: 639px) {
		.head {
			flex-wrap: wrap;
		}
		.meta {
			flex-direction: row;
			align-items: center;
			width: 100%;
			padding-left: calc(36px + var(--space-3));
		}
		.spacer {
			display: none;
		}
	}
</style>
