<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import Save from '@lucide/svelte/icons/save';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import TextField from '$lib/components/form/TextField.svelte';

	let { data, form } = $props();

	let hydrated = $state(false);
	let savingName = $state(false);
	let savingPassword = $state(false);
	onMount(() => (hydrated = true));

	const nameForm = $derived(form?.form === 'name' ? form : null);
	const passwordForm = $derived(form?.form === 'password' ? form : null);
	const nameFail = $derived(nameForm && 'errors' in nameForm ? nameForm : null);
	const passwordFail = $derived(passwordForm && 'errors' in passwordForm ? passwordForm : null);
</script>

<PageHeader title="Mijn account" description="Je gegevens en wachtwoord voor het CMS." />

<div class="layout">
	<Panel title="Profiel">
		<div class="summary">
			<Avatar name={data.me.name} size={48} />
			<div class="who">
				<p class="name">{data.me.name}</p>
				<p class="email">{data.me.email}</p>
				<Badge tone={data.me.role === 'admin' ? 'forest' : data.me.role === 'planner' ? 'info' : 'bark'}>{data.me.roleLabel}</Badge>
			</div>
		</div>

		{#if !hydrated && nameForm?.message}
			<Alert tone={nameFail ? 'error' : 'success'}>{nameForm.message}</Alert>
		{/if}
		<form method="POST" action="?/name" novalidate use:enhance={enhanceToast({ pending: (b) => (savingName = b) })}>
			<TextField
				label="Naam"
				name="name"
				required
				autocomplete="name"
				value={nameFail?.values?.name ?? data.me.name}
				error={nameFail?.errors?.name}
			/>
			<p class="note">
				Je e-mailadres en rol kunnen enkel door een beheerder worden aangepast.
			</p>
			<div class="submit">
				<Button type="submit" variant="secondary" loading={savingName}>
					{#snippet iconStart()}<Save size={18} />{/snippet}
					Naam opslaan
				</Button>
			</div>
		</form>
	</Panel>

	<Panel title="Wachtwoord wijzigen" description="Na het wijzigen word je op alle andere apparaten afgemeld.">
		{#if !hydrated && passwordForm?.message}
			<Alert tone={passwordFail ? 'error' : 'success'}>{passwordForm.message}</Alert>
		{/if}
		<form
			method="POST"
			action="?/password"
			novalidate
			use:enhance={enhanceToast({ pending: (b) => (savingPassword = b), reset: true })}
		>
			<!-- Lets password managers associate the new password with the right account. -->
			<input type="text" name="username" autocomplete="username" value={data.me.email} hidden readonly />
			<TextField
				label="Huidig wachtwoord"
				name="current"
				type="password"
				required
				autocomplete="current-password"
				error={passwordFail?.errors?.current}
			/>
			<TextField
				label="Nieuw wachtwoord"
				name="password"
				type="password"
				required
				minlength={10}
				autocomplete="new-password"
				helper="Minstens 10 tekens. Een zin van enkele woorden is sterk én makkelijk te onthouden."
				error={passwordFail?.errors?.password}
			/>
			<TextField
				label="Herhaal nieuw wachtwoord"
				name="repeat"
				type="password"
				required
				autocomplete="new-password"
				error={passwordFail?.errors?.repeat}
			/>
			<div class="submit">
				<Button type="submit" loading={savingPassword}>
					{#snippet iconStart()}<KeyRound size={18} />{/snippet}
					Wachtwoord wijzigen
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
			max-width: 1100px;
		}
	}
	.summary {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		padding-bottom: var(--space-4);
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	.who {
		display: grid;
		gap: var(--space-1);
		justify-items: start;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		color: var(--color-heading);
	}
	.email {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	form {
		display: grid;
		gap: var(--space-4);
	}
	.note {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.submit {
		display: flex;
		justify-content: flex-end;
	}
</style>
