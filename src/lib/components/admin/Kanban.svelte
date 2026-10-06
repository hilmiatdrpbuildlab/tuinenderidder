<script lang="ts" module>
	import type { BookingStatus } from '$lib/domain';
	export type KanbanCard = {
		id: number;
		reference: string;
		status: BookingStatus;
		customer: string;
		town: string;
		services: string[];
		createdAt: string;
		slotDate: string | null;
		assignee: string | null;
	};
	export type KanbanColumn = { status: BookingStatus; label: string; includes: BookingStatus[] };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Avatar from './Avatar.svelte';
	import { enhanceToast } from './enhance';
	import { relativeTime, shortDay, formatDateTime } from './format';
	import { STATUS_META, STATUS_TRANSITIONS } from '$lib/domain';

	/**
	 * Status board for quote requests. Each card has form buttons for the allowed transitions (works
	 * without JS); with JS cards can also be dragged to a column whose status is an allowed transition.
	 */
	interface Props {
		columns: KanbanColumn[];
		cards: KanbanCard[];
		action?: string;
	}

	let { columns, cards, action = '?/status' }: Props = $props();

	let dragging = $state<KanbanCard | null>(null);
	let over = $state<BookingStatus | null>(null);
	let form: HTMLFormElement | undefined = $state();
	let target = $state({ id: 0, status: 'new' as BookingStatus });

	const allowed = (c: KanbanCard, to: BookingStatus) => STATUS_TRANSITIONS[c.status].includes(to);

	async function drop(col: KanbanColumn) {
		const c = dragging;
		dragging = null;
		over = null;
		if (!c || !allowed(c, col.status)) return;
		target = { id: c.id, status: col.status };
		await tick();
		form?.requestSubmit();
	}

	const short: Partial<Record<BookingStatus, string>> = {
		pending: 'In afwachting',
		scheduled: 'Inplannen',
		in_progress: 'Start',
		completed: 'Afronden',
		cancelled: 'Annuleren',
		rescheduled: 'Verplaatst'
	};
</script>

<div class="board">
	{#each columns as col (col.status)}
		{@const list = cards.filter((c) => col.includes.includes(c.status))}
		<section
			class="col"
			data-status={col.status}
			class:droppable={dragging && allowed(dragging, col.status)}
			class:over={over === col.status}
			aria-labelledby="col-{col.status}"
			ondragover={(e) => {
				if (dragging && allowed(dragging, col.status)) {
					e.preventDefault();
					over = col.status;
				}
			}}
			ondragleave={() => over === col.status && (over = null)}
			ondrop={(e) => {
				e.preventDefault();
				drop(col);
			}}
		>
			<header>
				<h2 id="col-{col.status}">{col.label}</h2>
				<span class="count" aria-label="{list.length} aanvragen">{list.length}</span>
			</header>
			<ul>
				{#each list as c (c.id)}
					<li
						class="card"
						class:dragging={dragging?.id === c.id}
						draggable="true"
						ondragstart={(e) => {
							dragging = c;
							e.dataTransfer?.setData('text/plain', String(c.id));
						}}
						ondragend={() => {
							dragging = null;
							over = null;
						}}
					>
						<div class="top">
							<a class="ref" href="/admin/boekingen?open={c.id}">{c.reference}</a>
							{#if col.includes.length > 1}<StatusBadge status={c.status} />{/if}
						</div>
						<p class="name">{c.customer}{#if c.town}<span class="muted"> · {c.town}</span>{/if}</p>
						{#if c.services.length}<p class="svc">{c.services.join(', ')}</p>{/if}
						<p class="meta">
							<time datetime={c.createdAt} title={formatDateTime(c.createdAt)}>Aangevraagd {relativeTime(c.createdAt)}</time>
							{#if c.slotDate} · bezoek {shortDay(c.slotDate)}{/if}
						</p>
						<div class="foot">
							{#if STATUS_TRANSITIONS[c.status].length}
								<form method="POST" {action} use:enhance={enhanceToast()} class="moves">
									<input type="hidden" name="id" value={c.id} />
									{#each STATUS_TRANSITIONS[c.status] as t (t)}
										<button type="submit" name="status" value={t} class="mv" data-tone={t === 'cancelled' ? 'danger' : undefined} aria-label="{c.reference}: {STATUS_META[t].nl}">{short[t] ?? STATUS_META[t].nl}</button>
									{/each}
								</form>
							{/if}
							<span class="right">
								{#if c.assignee}<Avatar name={c.assignee} size={24} labelled />{/if}
								<a class="open" href="/admin/boekingen?open={c.id}" aria-label="Details van {c.reference}"><PanelRightOpen size={16} /></a>
							</span>
						</div>
					</li>
				{:else}
					<li class="empty">Geen aanvragen</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<form bind:this={form} method="POST" {action} class="visually-hidden" aria-hidden="true" use:enhance={enhanceToast()}>
	<input type="hidden" name="id" value={target.id} />
	<input type="hidden" name="status" value={target.status} />
</form>

<style>
	.board {
		display: grid;
		gap: var(--space-4);
		align-items: start;
	}
	.col {
		--accent: var(--color-info);
		display: grid;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		background: var(--color-bg-alt);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--accent);
		min-width: 0;
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.col[data-status='pending'] {
		--accent: var(--color-warning);
	}
	.col[data-status='scheduled'] {
		--accent: var(--color-primary);
	}
	.col[data-status='completed'] {
		--accent: var(--color-success);
	}
	.col[data-status='cancelled'] {
		--accent: var(--color-error);
	}
	.col.droppable {
		outline: 2px dashed var(--color-border-strong);
		outline-offset: -2px;
	}
	.col.over {
		outline: 2px solid var(--color-primary);
		background: var(--color-primary-subtle);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-1);
	}
	h2 {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 700;
	}
	.count {
		min-width: 24px;
		padding: 0 8px;
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		text-align: center;
		font-size: var(--text-xs);
		font-weight: 700;
	}
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}
	.card {
		display: grid;
		gap: 4px;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
		cursor: grab;
		font-size: var(--text-sm);
	}
	.card:hover {
		box-shadow: var(--shadow-2);
	}
	.card.dragging {
		opacity: 0.5;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-2);
	}
	.ref {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.name {
		font-weight: 600;
	}
	.muted,
	.meta,
	.svc {
		color: var(--color-text-muted);
	}
	.meta {
		font-size: var(--text-xs);
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}
	.moves {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.mv {
		height: 28px;
		padding: 0 var(--space-2);
		border: 1px solid var(--color-border-strong);
		border-radius: 8px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.mv:hover {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	.mv[data-tone='danger'] {
		color: var(--color-error);
		border-color: transparent;
	}
	.mv[data-tone='danger']:hover {
		background: var(--color-error-subtle);
	}
	.right {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.open {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		color: var(--color-text-muted);
	}
	.open:hover {
		background: var(--color-surface-sunken);
	}
	.empty {
		padding: var(--space-4);
		border: 1.5px dashed var(--color-border);
		border-radius: var(--radius-md);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	@media (min-width: 640px) {
		.board {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1200px) {
		.board {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}
</style>
