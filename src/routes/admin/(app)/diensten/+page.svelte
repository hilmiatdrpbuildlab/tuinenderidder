<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { tick } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import FormMessage from '$lib/components/admin/content/FormMessage.svelte';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let order = $state(data.services.map((s) => s.id));
	$effect(() => {
		order = data.services.map((s) => s.id);
	});
	const rows = $derived(order.map((id) => data.services.find((s) => s.id === id)!).filter(Boolean));

	onMount(() => {
		if (page.url.searchParams.has('verwijderd')) {
			toast.success('Dienst verwijderd.');
			const url = new URL(page.url);
			url.searchParams.delete('verwijderd');
			replaceState(url, {});
		}
	});

	let dragId = $state<number | null>(null);
	let overId = $state<number | null>(null);
	let reorderForm: HTMLFormElement | undefined = $state();
	let announce = $state('');

	const notify: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success' && result.data?.message) toast.success(String(result.data.message));
			else if (result.type === 'failure') toast.error(String(result.data?.message ?? 'Er ging iets mis.'));
			await update();
		};
	};

	async function drop(targetId: number) {
		if (dragId === null || dragId === targetId) return;
		const next = order.filter((id) => id !== dragId);
		next.splice(next.indexOf(targetId) + (order.indexOf(dragId) < order.indexOf(targetId) ? 1 : 0), 0, dragId);
		order = next;
		announce = `Volgorde gewijzigd.`;
		dragId = overId = null;
		await tick();
		reorderForm?.requestSubmit();
	}

	const price = (s: (typeof data.services)[number]) =>
		s.priceMode === 'fixed' && s.priceFrom != null ? `vanaf € ${s.priceFrom.toLocaleString('nl-BE')}` : 'Op offerte';
</script>

<svelte:head><title>Diensten · CMS</title></svelte:head>

<PageHeader title="Diensten" description="De diensten op de website en in de boekingsmodule. Sleep om de volgorde te wijzigen.">
	{#snippet actions()}
		<Button href="/admin/diensten/nieuw" size="sm">
			{#snippet iconStart()}<Plus size={16} />{/snippet}
			Nieuwe dienst
		</Button>
	{/snippet}
</PageHeader>

<FormMessage {form} />

{#if rows.length === 0}
	<EmptyState title="Nog geen diensten" text="Voeg je eerste dienst toe, bijvoorbeeld Tuinonderhoud of Snoeiwerken.">
		{#snippet actions()}<Button href="/admin/diensten/nieuw">Nieuwe dienst</Button>{/snippet}
	</EmptyState>
{:else}
	<Panel flush>
		<form method="POST" action="?/reorder" use:enhance={notify} bind:this={reorderForm} hidden>
			{#each order as id (id)}<input type="hidden" name="ids" value={id} />{/each}
		</form>
		<ol class="list">
			{#each rows as s, i (s.id)}
				<li
					class="row"
					class:dragging={dragId === s.id}
					class:over={overId === s.id && dragId !== s.id}
					ondragover={(e) => {
						if (dragId === null) return;
						e.preventDefault();
						overId = s.id;
					}}
					ondrop={(e) => {
						e.preventDefault();
						drop(s.id);
					}}
				>
					<span
						class="handle"
						role="presentation"
						draggable="true"
						title="Sleep om te verplaatsen"
						ondragstart={(e) => {
							dragId = s.id;
							e.dataTransfer?.setData('text/plain', String(s.id));
						}}
						ondragend={() => (dragId = overId = null)}
					>
						<GripVertical size={16} aria-hidden="true" />
					</span>
					<span class="pos" aria-hidden="true">{i + 1}</span>
					<div class="thumb">
						{#if s.cover}<img src={s.cover.thumb} alt="" style:object-position="{s.cover.focalX * 100}% {s.cover.focalY * 100}%" />
						{:else}<span class="ico"><Icon name={s.icon} size={22} /></span>{/if}
					</div>
					<div class="main">
						<a class="title" href="/admin/diensten/{s.id}">
							<Icon name={s.icon} size={16} />
							{s.title}
						</a>
						<p class="sub">
							<span class="mono">/diensten/{s.slug}</span> · {price(s)}
							{#if !s.hasEn}· <span class="warn">EN ontbreekt</span>{/if}
						</p>
					</div>
					<div class="badges">
						{#if s.isBookable}
							<Badge tone="forest">{#snippet icon()}<CalendarCheck size={14} />{/snippet}Boekbaar</Badge>
						{/if}
						<StatusBadge status={s.status} />
					</div>
					<div class="actions">
						<form method="POST" action="?/move" use:enhance={notify} class="inline">
							<input type="hidden" name="id" value={s.id} />
							<button type="submit" name="dir" value="up" class="icon-btn" disabled={i === 0} aria-label="{s.title} omhoog"><ArrowUp size={16} /></button>
							<button type="submit" name="dir" value="down" class="icon-btn" disabled={i === rows.length - 1} aria-label="{s.title} omlaag"><ArrowDown size={16} /></button>
						</form>
						<form method="POST" action="?/status" use:enhance={notify} class="inline">
							<input type="hidden" name="id" value={s.id} />
							{#if s.status === 'published'}
								<button type="submit" name="status" value="draft" class="icon-btn" aria-label="{s.title} verbergen (concept)" title="Verbergen"><EyeOff size={16} /></button>
							{:else}
								<button type="submit" name="status" value="published" class="icon-btn" aria-label="{s.title} publiceren" title="Publiceren"><Eye size={16} /></button>
							{/if}
						</form>
						<a class="icon-btn" href="/admin/diensten/{s.id}" aria-label="{s.title} bewerken" title="Bewerken"><Pencil size={16} /></a>
					</div>
				</li>
			{/each}
		</ol>
		<p class="visually-hidden" aria-live="polite">{announce}</p>
	</Panel>
{/if}

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.row {
		display: grid;
		grid-template-columns: auto auto 56px 1fr auto auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 72px;
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--color-border);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.row:first-child {
		border-top: 0;
	}
	.row:hover {
		background: var(--color-bg-alt);
	}
	.row.dragging {
		opacity: 0.5;
	}
	.row.over {
		box-shadow: inset 0 3px 0 var(--color-primary);
	}
	.handle {
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
		cursor: grab;
	}
	.pos {
		width: 20px;
		text-align: center;
		font-weight: 700;
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
	.thumb {
		width: 56px;
		height: 56px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-surface-sunken);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.ico {
		display: grid;
		place-items: center;
		height: 100%;
		color: var(--color-primary);
	}
	.main {
		min-width: 0;
	}
	.title {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
	}
	.title:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.sub {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.mono {
		font-family: var(--font-mono);
	}
	.warn {
		color: var(--color-warning-text);
		font-weight: 600;
	}
	.badges {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.inline {
		display: flex;
		gap: 2px;
	}
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.icon-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.icon-btn:focus-visible {
		outline: 2px solid var(--color-focus);
	}
	@media (max-width: 760px) {
		.row {
			grid-template-columns: auto 48px 1fr;
		}
		.pos {
			display: none;
		}
		.thumb {
			width: 48px;
			height: 48px;
		}
		.badges,
		.actions {
			grid-column: 2 / -1;
			justify-content: flex-start;
		}
	}
	:global([data-theme='dark']) .warn {
		color: var(--harvest);
	}
</style>
