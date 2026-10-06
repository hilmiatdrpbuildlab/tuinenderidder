<script lang="ts">
	import { enhance } from '$app/forms';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Logo from '$lib/components/marketing/Logo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import TextField from '$lib/components/form/TextField.svelte';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Aanmelden · CMS Tuinen De Ridder</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="page">
	<div class="art" aria-hidden="true">
		<div class="art-inner">
			<Logo inverse />
			<p class="quote">U hoeft enkel te genieten.</p>
			<p class="sub">Beheer boekingen, planning en de inhoud van de website op één plek.</p>
		</div>
	</div>

	<main class="panel">
		<div class="card">
			<div class="mobile-logo"><Logo /></div>
			<h1>Aanmelden</h1>
			<p class="muted">Meld je aan met je e-mailadres en wachtwoord.</p>

			{#if data.loggedOut}
				<Alert tone="success">Je bent afgemeld.</Alert>
			{/if}
			{#if form?.message}
				<Alert tone="error" assertive>{form.message}</Alert>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update({ reset: false });
						loading = false;
					};
				}}
				novalidate
			>
				<TextField
					label="E-mailadres"
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? ''}
					error={form?.errors?.email}
				/>
				<TextField
					label="Wachtwoord"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					error={form?.errors?.password}
				/>
				<Button type="submit" size="lg" fullWidth {loading}>
					{#snippet iconStart()}<LogIn />{/snippet}
					Aanmelden
				</Button>
			</form>

			<p class="help">Wachtwoord vergeten? Vraag een beheerder om het opnieuw in te stellen via <em>Beheer → Gebruikers</em>.</p>
		</div>
	</main>
</div>

<style>
	.page {
		min-height: 100dvh;
		display: grid;
		grid-template-columns: 1fr;
		background: var(--color-bg);
	}
	.art {
		display: none;
		position: relative;
		background:
			radial-gradient(circle at 20% 80%, rgb(91 152 88 / 0.35), transparent 50%),
			radial-gradient(circle at 80% 20%, rgb(227 167 47 / 0.15), transparent 40%),
			var(--forest-900);
		color: var(--linen-25);
	}
	.art-inner {
		position: absolute;
		inset: auto var(--space-12) var(--space-12);
		display: grid;
		gap: var(--space-4);
	}
	.quote {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 4vw, 4rem);
		font-weight: 700;
		line-height: 0.95;
		text-transform: uppercase;
		max-width: 12ch;
		margin-top: var(--space-6);
	}
	.sub {
		color: var(--color-on-inverse-muted);
		max-width: 40ch;
	}
	.panel {
		display: grid;
		place-items: center;
		padding: var(--space-8) var(--space-4);
	}
	.card {
		width: 100%;
		max-width: 420px;
		display: grid;
		gap: var(--space-5);
	}
	.mobile-logo {
		margin-bottom: var(--space-4);
	}
	h1 {
		font-size: var(--text-h2);
	}
	.muted {
		margin-top: calc(var(--space-4) * -1);
	}
	form {
		display: grid;
		gap: var(--space-4);
	}
	.help {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	@media (min-width: 1024px) {
		.page {
			grid-template-columns: 1fr 1fr;
		}
		.art {
			display: block;
		}
		.mobile-logo {
			display: none;
		}
	}
</style>
