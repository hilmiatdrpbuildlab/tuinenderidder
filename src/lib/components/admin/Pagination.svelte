<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	/** "1–25 van 312" + per-page select + prev/next. Links and a GET form, so it works without JS. */
	interface Props {
		url: URL;
		page: number;
		pages: number;
		per: number;
		total: number;
		sizes?: readonly number[];
		label?: string;
	}

	let { url, page, pages, per, total, sizes = [25, 50, 100], label = 'Paginering' }: Props = $props();
	const uid = $props.id();

	function href(params: Record<string, string | number | null>) {
		const u = new URL(url);
		for (const [k, v] of Object.entries(params)) {
			if (v === null) u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		return u.pathname + u.search;
	}

	const from = $derived(total === 0 ? 0 : (page - 1) * per + 1);
	const to = $derived(Math.min(total, page * per));
	const hidden = $derived([...url.searchParams.entries()].filter(([k]) => k !== 'per' && k !== 'page' && k !== 'open'));
</script>

<nav class="pagination" aria-label={label}>
	<p class="range"><strong>{from}–{to}</strong> van {total}</p>

	<form
		method="GET"
		class="per"
		onchange={(e) => {
			const v = new FormData(e.currentTarget).get('per');
			goto(href({ per: String(v), page: null }), { keepFocus: true, noScroll: true });
		}}
	>
		{#each hidden as [k, v], i (k + i)}<input type="hidden" name={k} value={v} />{/each}
		<label for="per-{uid}">Per pagina</label>
		<select id="per-{uid}" name="per" value={String(per)}>
			{#each sizes as s (s)}<option value={String(s)}>{s}</option>{/each}
		</select>
		<noscript><button type="submit" class="ok">OK</button></noscript>
	</form>

	<div class="steps">
		{#if page > 1}
			<a class="step" href={href({ page: page - 1 })} aria-label="Vorige pagina" data-sveltekit-noscroll><ChevronLeft size={18} /></a>
		{:else}
			<span class="step off" aria-hidden="true"><ChevronLeft size={18} /></span>
		{/if}
		<span class="of">Pagina {page} van {pages}</span>
		{#if page < pages}
			<a class="step" href={href({ page: page + 1 })} aria-label="Volgende pagina" data-sveltekit-noscroll><ChevronRight size={18} /></a>
		{:else}
			<span class="step off" aria-hidden="true"><ChevronRight size={18} /></span>
		{/if}
	</div>
</nav>

<style>
	.pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.range strong {
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}
	.per {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}
	select,
	.ok {
		height: 32px;
		padding: 0 var(--space-2);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}
	.steps {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.of {
		font-variant-numeric: tabular-nums;
	}
	.step {
		display: inline-grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		color: var(--color-text);
		background: var(--color-surface);
	}
	a.step:hover {
		background: var(--color-bg-alt);
	}
	.step.off {
		opacity: 0.4;
	}
</style>
