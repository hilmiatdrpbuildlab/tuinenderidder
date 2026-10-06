<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { relativeTime, formatDateTime } from '$lib/components/admin/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import { ROLE_LABELS } from '$lib/domain';

	let { data, form } = $props();

	let hydrated = $state(false);
	let busy = $state(false);
	onMount(() => (hydrated = true));

	const roleTone = { admin: 'forest', planner: 'info', editor: 'bark' } as const;
	const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
	const failed = $derived(form && 'errors' in form ? form : null);
</script>

<PageHeader title="Gebruikers" description="Wie heeft toegang tot het CMS, met welke rol." />

<div class="layout">
	<Panel title="Alle gebruikers" description="{data.users.length} accounts" flush>
		{#if data.users.length === 0}
			<EmptyState title="Nog geen gebruikers" compact />
		{:else}
			<table aria-label="Gebruikers">
				<thead>
					<tr>
						<th scope="col">Naam</th>
						<th scope="col">Rol</th>
						<th scope="col">Status</th>
						<th scope="col">Laatst aangemeld</th>
						<th scope="col"><span class="visually-hidden">Acties</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as u (u.id)}
						<tr class:inactive={!u.isActive}>
							<th scope="row" class="who">
								<Avatar name={u.name} size={32} />
								<span class="who-text">
									<a href="/admin/gebruikers/{u.id}" class="name">
										{u.name}{#if u.id === data.meId}<span class="me"> (jij)</span>{/if}
									</a>
									<span class="email">{u.email}</span>
								</span>
							</th>
							<td data-label="Rol"><Badge tone={roleTone[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
							<td data-label="Status">
								{#if u.isActive}
									<Badge tone="success" dot>Actief</Badge>
								{:else}
									<Badge tone="neutral" dot>Inactief</Badge>
								{/if}
							</td>
							<td data-label="Laatst aangemeld" class="muted-cell">
								{#if u.lastLoginAt}
									<time datetime={u.lastLoginAt.toISOString()} title={formatDateTime(u.lastLoginAt)}>
										{relativeTime(u.lastLoginAt)}
									</time>
								{:else}
									Nooit
								{/if}
							</td>
							<td class="action">
								<Button href="/admin/gebruikers/{u.id}" variant="ghost" size="sm" aria-label="{u.name} bewerken">
									Bewerken
									{#snippet iconEnd()}<ChevronRight size={16} />{/snippet}
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</Panel>

	<Panel title="Nieuwe gebruiker" description="Maak een account aan en geef het wachtwoord zelf door.">
		{#if !hydrated && form?.message}
			<Alert tone={failed ? 'error' : 'success'}>{form.message}</Alert>
		{/if}
		<form
			method="POST"
			action="?/create"
			novalidate
			use:enhance={enhanceToast({ pending: (b) => (busy = b), reset: true })}
		>
			<TextField
				label="Naam"
				name="name"
				required
				autocomplete="off"
				value={failed?.values?.name ?? ''}
				error={failed?.errors?.name}
			/>
			<TextField
				label="E-mailadres"
				name="email"
				type="email"
				required
				autocomplete="off"
				value={failed?.values?.email ?? ''}
				error={failed?.errors?.email}
			/>
			<Select
				label="Rol"
				name="role"
				required
				options={roleOptions}
				value={failed?.values?.role ?? 'editor'}
				error={failed?.errors?.role}
				helper="Beheerder: alles · Planner: boekingen en planning · Redacteur: inhoud en media."
			/>
			<TextField
				label="Startwachtwoord"
				name="password"
				type="password"
				required
				minlength={10}
				autocomplete="new-password"
				error={failed?.errors?.password}
				helper="Minstens 10 tekens. Er wordt geen uitnodiging gemaild (er is nog geen e-maildienst gekoppeld): geef het wachtwoord zelf veilig door."
			/>
			<div class="submit">
				<Button type="submit" loading={busy}>
					{#snippet iconStart()}<UserPlus size={18} />{/snippet}
					Gebruiker aanmaken
				</Button>
			</div>
		</form>
	</Panel>
</div>

<style>
	.layout {
		display: grid;
		gap: var(--space-6);
		align-items: start;
	}
	@media (min-width: 1200px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 380px;
		}
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	thead th {
		text-align: left;
		font-weight: 600;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
	thead th:first-child,
	tbody th {
		padding-left: var(--space-5);
	}
	tbody th,
	tbody td {
		height: var(--row-h);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
		text-align: left;
		font-weight: 400;
	}
	tbody tr:last-child > * {
		border-bottom: 0;
	}
	tbody tr:hover {
		background: var(--color-bg-alt);
	}
	tr.inactive .who-text {
		opacity: 0.7;
	}
	.who {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}
	.who-text {
		display: grid;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
	}
	.name:hover {
		text-decoration: underline;
	}
	.name:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.me {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.email {
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.muted-cell {
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	.action {
		text-align: right;
		padding-right: var(--space-4);
	}

	form {
		display: grid;
		gap: var(--space-4);
	}
	.submit {
		display: flex;
		justify-content: flex-end;
	}

	@media (max-width: 639px) {
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		table,
		tbody,
		tr {
			display: block;
		}
		tbody tr {
			display: grid;
			gap: var(--space-2);
			padding: var(--space-3) var(--space-4);
			border-bottom: 1px solid var(--color-border);
		}
		tbody tr:last-child {
			border-bottom: 0;
		}
		tbody th,
		tbody td {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-3);
			height: auto;
			padding: 0;
			border: 0;
		}
		tbody th {
			justify-content: flex-start;
		}
		tbody td[data-label]::before {
			content: attr(data-label);
			color: var(--color-text-muted);
			font-size: var(--text-xs);
		}
		.action {
			justify-content: flex-end;
		}
	}
</style>
