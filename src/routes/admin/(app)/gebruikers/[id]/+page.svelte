<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { formatDateTime, relativeTime } from '$lib/components/admin/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Toggle from '$lib/components/form/Toggle.svelte';
	import { ROLE_LABELS } from '$lib/domain';

	let { data, form } = $props();

	let hydrated = $state(false);
	let savingUpdate = $state(false);
	let savingPassword = $state(false);
	onMount(() => (hydrated = true));

	const t = $derived(data.target);
	const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
	const updateForm = $derived(form?.form === 'update' ? form : null);
	const passwordForm = $derived(form?.form === 'password' ? form : null);
	const updateFail = $derived(updateForm && 'errors' in updateForm ? updateForm : null);
	const passwordFail = $derived(passwordForm && 'errors' in passwordForm ? passwordForm : null);
</script>

<PageHeader title={t.name}>
	{#snippet meta()}
		<Badge tone={t.role === 'admin' ? 'forest' : t.role === 'planner' ? 'info' : 'bark'}>{ROLE_LABELS[t.role]}</Badge>
		{#if t.isActive}
			<Badge tone="success" dot>Actief</Badge>
		{:else}
			<Badge tone="neutral" dot>Inactief</Badge>
		{/if}
		{#if data.isMe}<Badge>Jouw account</Badge>{/if}
	{/snippet}
	{#snippet actions()}
		<Button href="/admin/gebruikers" variant="ghost" size="sm">
			{#snippet iconStart()}<ArrowLeft size={16} />{/snippet}
			Alle gebruikers
		</Button>
	{/snippet}
</PageHeader>

<div class="layout">
	<Panel title="Gegevens">
		<div class="summary">
			<Avatar name={t.name} size={44} />
			<dl>
				<div><dt>E-mailadres</dt><dd>{t.email}</dd></div>
				<div>
					<dt>Laatst aangemeld</dt>
					<dd>
						{#if t.lastLoginAt}
							<time datetime={t.lastLoginAt.toISOString()} title={formatDateTime(t.lastLoginAt)}>{relativeTime(t.lastLoginAt)}</time>
						{:else}Nooit{/if}
					</dd>
				</div>
				<div><dt>Aangemaakt</dt><dd>{formatDateTime(t.createdAt)}</dd></div>
			</dl>
		</div>

		{#if !hydrated && updateForm?.message}
			<Alert tone={updateFail ? 'error' : 'success'}>{updateForm.message}</Alert>
		{/if}

		<form method="POST" action="?/update" novalidate use:enhance={enhanceToast({ pending: (b) => (savingUpdate = b) })}>
			<TextField
				label="Naam"
				name="name"
				required
				autocomplete="off"
				value={updateFail?.values?.name ?? t.name}
				error={updateFail?.errors?.name}
			/>
			<Select
				label="Rol"
				name="role"
				required
				options={roleOptions}
				value={updateFail?.values?.role ?? t.role}
				error={updateFail?.errors?.role}
				helper={data.isMe && t.role === 'admin' ? 'Je kunt je eigen rol niet verlagen.' : undefined}
			/>
			<div class="toggle-field">
				<Toggle
					name="isActive"
					label="Account actief"
					checked={updateFail?.values ? updateFail.values.isActive : t.isActive}
					description={data.isMe
						? 'Je kunt je eigen account niet deactiveren.'
						: 'Een gedeactiveerde gebruiker kan niet meer aanmelden en wordt meteen overal afgemeld.'}
				/>
				{#if updateFail?.errors && 'isActive' in updateFail.errors}
					<p class="error" role="alert">{updateFail.errors.isActive?.[0]}</p>
				{/if}
			</div>
			<div class="submit">
				<Button type="submit" loading={savingUpdate}>
					{#snippet iconStart()}<Save size={18} />{/snippet}
					Opslaan
				</Button>
			</div>
		</form>
	</Panel>

	<Panel
		title="Wachtwoord opnieuw instellen"
		description="Typ een nieuw wachtwoord en geef het zelf door aan de gebruiker. Alle bestaande sessies worden afgemeld."
	>
		{#if !hydrated && passwordForm?.message}
			<Alert tone={passwordFail ? 'error' : 'success'}>{passwordForm.message}</Alert>
		{/if}
		<form
			method="POST"
			action="?/password"
			novalidate
			use:enhance={enhanceToast({ pending: (b) => (savingPassword = b), reset: true })}
		>
			<TextField
				label="Nieuw wachtwoord"
				name="password"
				type="password"
				required
				minlength={10}
				autocomplete="new-password"
				helper="Minstens 10 tekens."
				error={passwordFail?.errors?.password}
			/>
			<TextField
				label="Herhaal wachtwoord"
				name="repeat"
				type="password"
				required
				autocomplete="new-password"
				error={passwordFail?.errors?.repeat}
			/>
			<div class="submit">
				<Button type="submit" variant="secondary" loading={savingPassword}>
					{#snippet iconStart()}<KeyRound size={18} />{/snippet}
					Wachtwoord instellen
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
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
	.summary {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		padding-bottom: var(--space-4);
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	dl {
		display: grid;
		gap: var(--space-2);
		font-size: var(--text-sm);
		min-width: 0;
	}
	dl div {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr);
		gap: var(--space-2);
	}
	dt {
		color: var(--color-text-muted);
	}
	dd {
		overflow-wrap: anywhere;
	}
	@media (max-width: 479px) {
		dl div {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
	form {
		display: grid;
		gap: var(--space-4);
	}
	.toggle-field {
		display: grid;
		gap: var(--space-1);
	}
	.error {
		color: var(--color-error-text);
		font-size: var(--text-sm);
	}
	.submit {
		display: flex;
		justify-content: flex-end;
	}
</style>
