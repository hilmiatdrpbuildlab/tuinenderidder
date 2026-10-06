<script lang="ts">
	import { enhance } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash from '@lucide/svelte/icons/trash';
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import Lock from '@lucide/svelte/icons/lock';
	import CalendarOff from '@lucide/svelte/icons/calendar-off';
	import Settings from '@lucide/svelte/icons/settings';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import ConfirmForm from '$lib/components/admin/ConfirmForm.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { shortDay } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Toggle from '$lib/components/form/Toggle.svelte';
	import { SLOT_KINDS, SLOT_LABELS } from '$lib/domain';
	import { formatLongDate } from '$lib/i18n';

	let { data, form } = $props();

	const kindOptions = SLOT_KINDS.map((k) => ({ value: k, label: SLOT_LABELS[k].nl }));
	const closeKindOptions = [{ value: '', label: 'Alle dagdelen' }, ...kindOptions];

	/** Error for field `key` when the last submitted form was `name`. */
	function err(name: string, key: string): string | undefined {
		return form?.form === name ? (form.errors as Record<string, string> | undefined)?.[key] : undefined;
	}
	/** Re-submitted value (no-JS round trip after a validation error), else the fallback. */
	function val(name: string, key: string, fallback: string | number): string | number {
		return form?.form === name && form.values ? (form.values[key] ?? fallback) : fallback;
	}
	function active(name: string, id: number, fallback: boolean) {
		return form?.form === name && form.values ? form.values[`active-${id}`] === 'on' : fallback;
	}

	let busy = $state<string | null>(null);
	let blackoutForm: HTMLFormElement | undefined = $state();
	const pending = (key: string) => (b: boolean) => (busy = b ? key : null);
</script>

<PageHeader
	title="Beschikbaarheid"
	description="Het weekschema bepaalt welke dagdelen klanten online kunnen boeken. Wijzigingen worden meteen toegepast op de komende weken."
/>

<div class="layout">
	<div class="main">
		<Panel title="Weekschema" description="Begin- en einduur, capaciteit (aantal boekingen per dagdeel) en of het dagdeel actief is.">
			<div class="days">
				{#each data.weekdays as day (day.value)}
					{@const formName = `day-${day.value}`}
					{@const addName = `add-${day.value}`}
					<section class="day" aria-labelledby="day-{day.value}">
						<div class="day-head">
							<h3 id="day-{day.value}">{day.label}</h3>
							{#if day.rules.length === 0}
								<Badge tone="neutral">Gesloten</Badge>
							{:else}
								<span class="day-meta">
									{day.rules.filter((r) => r.isActive).length} van {day.rules.length} actief
								</span>
							{/if}
						</div>

						{#if day.rules.length > 0}
							<form method="POST" action="?/saveDay" use:enhance={enhanceToast({ pending: pending(formName) })}>
								<input type="hidden" name="weekday" value={day.value} />
								<table class="rules">
									<caption class="visually-hidden">Dagdelen op {day.label.toLowerCase()}</caption>
									<thead>
										<tr>
											<th scope="col">Dagdeel</th>
											<th scope="col">Begin</th>
											<th scope="col">Einde</th>
											<th scope="col">Capaciteit</th>
											<th scope="col">Actief</th>
											<th scope="col"><span class="visually-hidden">Acties</span></th>
										</tr>
									</thead>
									<tbody>
										{#each day.rules as rule (rule.id)}
											{@const label = `${SLOT_LABELS[rule.slotKind].nl} ${rule.start}, ${day.label.toLowerCase()}`}
											<tr data-inactive={!rule.isActive || undefined}>
												<th scope="row" class="kind" data-kind={rule.slotKind}>{SLOT_LABELS[rule.slotKind].nl}</th>
												<td data-label="Begin">
													<TextField
														label="Begin {label}"
														hideLabel
														name="start-{rule.id}"
														type="time"
														value={val(formName, `start-${rule.id}`, rule.start)}
														error={err(formName, `start-${rule.id}`)}
														required
													/>
												</td>
												<td data-label="Einde">
													<TextField
														label="Einde {label}"
														hideLabel
														name="end-{rule.id}"
														type="time"
														value={val(formName, `end-${rule.id}`, rule.end)}
														error={err(formName, `end-${rule.id}`)}
														required
													/>
												</td>
												<td data-label="Capaciteit">
													<TextField
														label="Capaciteit {label}"
														hideLabel
														name="capacity-{rule.id}"
														type="number"
														inputmode="numeric"
														min="1"
														max="20"
														value={val(formName, `capacity-${rule.id}`, rule.capacity)}
														error={err(formName, `capacity-${rule.id}`)}
														required
													/>
												</td>
												<td data-label="Actief">
													<Toggle
														name="active-{rule.id}"
														label="Actief"
														aria-label="Actief: {label}"
														checked={active(formName, rule.id, rule.isActive)}
													/>
												</td>
												<td class="row-actions">
													<Button
														type="submit"
														variant="ghost"
														size="sm"
														iconOnly
														formaction="?/removeRule"
														formnovalidate
														name="ruleId"
														value={rule.id}
														aria-label="Verwijder {label}"
														title="Verwijderen"
													>
														<Trash size={16} aria-hidden="true" />
													</Button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
								<div class="day-save">
									<Button type="submit" size="sm" loading={busy === formName}>{day.label} opslaan</Button>
								</div>
							</form>
						{:else}
							<p class="muted">Geen dagdelen — klanten kunnen op {day.label.toLowerCase()} niet boeken.</p>
						{/if}

						<details class="add" open={form?.form === addName}>
							<summary><Plus size={16} aria-hidden="true" /> Dagdeel of adviesuur toevoegen</summary>
							<form
								method="POST"
								action="?/addRule"
								class="add-form"
								use:enhance={enhanceToast({ pending: pending(addName) })}
							>
								<input type="hidden" name="weekday" value={day.value} />
								<Select
									label="Soort"
									name="slotKind"
									options={kindOptions}
									value={val(addName, 'slotKind', 'consult')}
									error={err(addName, 'slotKind')}
								/>
								<TextField
									label="Begin"
									name="start"
									type="time"
									value={val(addName, 'start', day.value === 6 ? '12:00' : '17:00')}
									error={err(addName, 'start')}
									required
								/>
								<TextField
									label="Einde"
									name="end"
									type="time"
									value={val(addName, 'end', day.value === 6 ? '13:00' : '18:00')}
									error={err(addName, 'end')}
									required
								/>
								<TextField
									label="Capaciteit"
									name="capacity"
									type="number"
									inputmode="numeric"
									min="1"
									max="20"
									value={val(addName, 'capacity', 1)}
									error={err(addName, 'capacity')}
									required
								/>
								<div class="add-submit">
									<Button type="submit" variant="secondary" size="sm" loading={busy === addName}>Toevoegen</Button>
								</div>
							</form>
						</details>
					</section>
				{/each}
			</div>
		</Panel>

		<Panel
			title="Gesloten dagdelen"
			description="Komende dagdelen die niet meer online boekbaar zijn, bv. door slecht weer of een sluitingsdag."
		>
			{#if data.closedSlots.length === 0}
				<EmptyState compact title="Geen gesloten dagdelen" text="Alle komende dagdelen volgen het weekschema." />
			{:else}
				<table class="closed">
					<caption class="visually-hidden">Gesloten dagdelen</caption>
					<thead>
						<tr>
							<th scope="col">Datum</th>
							<th scope="col">Dagdeel</th>
							<th scope="col">Geboekt</th>
							<th scope="col"><span class="visually-hidden">Acties</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.closedSlots as s (s.id)}
							<tr>
								<th scope="row">
									<time datetime={s.date} title={formatLongDate(s.date, 'nl')}>{shortDay(s.date)}</time>
								</th>
								<td data-label="Dagdeel">
									{SLOT_LABELS[s.slotKind].nl} <span class="muted mono">{s.start}–{s.end}</span>
								</td>
								<td data-label="Geboekt">
									<span class="num">{s.bookedCount} / {s.capacity}</span>
									{#if s.bookedCount > 0}<span class="visually-hidden">boekingen</span>{/if}
								</td>
								<td class="row-actions">
									{#if s.isBlackout}
										<Badge tone="warning">Sluitingsdag{s.blackoutReason ? ` · ${s.blackoutReason}` : ''}</Badge>
									{:else}
										<form method="POST" action="?/reopen" use:enhance={enhanceToast({ pending: pending(`reopen-${s.id}`) })}>
											<input type="hidden" name="slotId" value={s.id} />
											<Button
												type="submit"
												variant="outline"
												size="sm"
												loading={busy === `reopen-${s.id}`}
												aria-label="Heropenen: {SLOT_LABELS[s.slotKind].nl} {formatLongDate(s.date, 'nl')}"
											>
												{#snippet iconStart()}<LockOpen size={16} aria-hidden="true" />{/snippet}
												Heropenen
											</Button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}

			{#snippet footer()}
				<form
					method="POST"
					action="?/closeSlots"
					class="close-form"
					use:enhance={enhanceToast({ pending: pending('close') })}
				>
					<TextField
						label="Dagdeel sluiten op"
						name="date"
						type="date"
						min={data.today}
						max={data.booking.horizonUntil}
						value={val('close', 'date', '')}
						error={err('close', 'date')}
						required
					/>
					<Select
						label="Dagdeel"
						name="slotKind"
						options={closeKindOptions}
						value={val('close', 'slotKind', '')}
						error={err('close', 'slotKind')}
					/>
					<div class="add-submit">
						<Button type="submit" variant="secondary" size="sm" loading={busy === 'close'}>
							{#snippet iconStart()}<Lock size={16} aria-hidden="true" />{/snippet}
							Sluiten
						</Button>
					</div>
				</form>
				<p class="hint">Bestaande boekingen blijven staan; plan ze zo nodig zelf om.</p>
			{/snippet}
		</Panel>
	</div>

	<aside class="side" aria-label="Sluitingsdagen en instellingen">
		<Panel title="Sluitingsdagen" description="Feestdagen en verlof: op deze dagen kan niemand boeken.">
			<form
				method="POST"
				action="?/addBlackout"
				class="blackout-form"
				use:enhance={enhanceToast({ pending: pending('blackout'), after: (ok) => ok && blackoutForm?.reset() })}
				bind:this={blackoutForm}
			>
				<TextField
					label="Van"
					name="from"
					type="date"
					min={data.today}
					value={val('blackout', 'from', '')}
					error={err('blackout', 'from')}
					required
				/>
				<TextField
					label="Tot en met"
					name="to"
					type="date"
					min={data.today}
					optionalLabel="optioneel"
					helper="Leeg = één dag"
					value={val('blackout', 'to', '')}
					error={err('blackout', 'to')}
				/>
				<TextField
					label="Reden"
					name="reason"
					class="span-2"
					optionalLabel="optioneel"
					maxlength={120}
					placeholder="bv. Bouwverlof"
					value={val('blackout', 'reason', '')}
					error={err('blackout', 'reason')}
				/>
				<div class="span-2">
					<Button type="submit" size="sm" loading={busy === 'blackout'}>
						{#snippet iconStart()}<CalendarOff size={16} aria-hidden="true" />{/snippet}
						Sluitingsdag(en) toevoegen
					</Button>
				</div>
			</form>

			{#if data.blackouts.length === 0}
				<EmptyState compact title="Geen komende sluitingsdagen" />
			{:else}
				<ul class="blackouts" aria-label="Komende sluitingsdagen">
					{#each data.blackouts as b (b.id)}
						<li>
							<div class="b-text">
								<time datetime={b.date}>{formatLongDate(b.date, 'nl')}</time>
								{#if b.reason}<span class="muted">{b.reason}</span>{/if}
							</div>
							<ConfirmForm
								action="?/deleteBlackout"
								fields={{ id: b.id }}
								title="Sluitingsdag verwijderen?"
								description="{formatLongDate(b.date, 'nl')} wordt weer boekbaar volgens het weekschema."
								iconOnly
								aria-label="Sluitingsdag {formatLongDate(b.date, 'nl')} verwijderen"
							>
								<Trash size={16} aria-hidden="true" />
							</ConfirmForm>
						</li>
					{/each}
				</ul>
			{/if}
		</Panel>

		<Panel title="Boekingsregels">
			<dl class="settings">
				<div>
					<dt>Minimale doorlooptijd</dt>
					<dd>{data.booking.leadTimeDays} {data.booking.leadTimeDays === 1 ? 'dag' : 'dagen'}</dd>
				</div>
				<div>
					<dt>Boekbaar tot</dt>
					<dd>{data.booking.horizonWeeks} weken vooruit <span class="muted">(t/m {formatLongDate(data.booking.horizonUntil, 'nl')})</span></dd>
				</div>
				<div>
					<dt>Dagdeel vasthouden</dt>
					<dd>{data.booking.holdMinutes} minuten tijdens het boeken</dd>
				</div>
			</dl>
			{#snippet footer()}
				{#if data.canEditSettings}
					<Button href="/admin/instellingen" variant="ghost" size="sm">
						{#snippet iconStart()}<Settings size={16} aria-hidden="true" />{/snippet}
						Wijzigen in Instellingen
					</Button>
				{:else}
					<p class="hint">Alleen een beheerder kan deze regels wijzigen.</p>
				{/if}
			{/snippet}
		</Panel>
	</aside>
</div>

<style>
	.layout {
		display: grid;
		gap: var(--space-6);
		align-items: start;
	}
	@media (min-width: 1100px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
		}
	}
	.main,
	.side {
		display: grid;
		gap: var(--space-6);
		min-width: 0;
	}
	.days {
		display: grid;
	}
	.day {
		display: grid;
		gap: var(--space-3);
		padding-block: var(--space-4);
	}
	.day + .day {
		border-top: 1px solid var(--color-border);
	}
	.day:first-child {
		padding-top: 0;
	}
	.day-head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	h3 {
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--color-heading);
	}
	.day-meta,
	.muted,
	.hint {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	.hint {
		margin-top: var(--space-2);
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
	.num {
		font-variant-numeric: tabular-nums;
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
		color: var(--color-text-muted);
		padding: 0 var(--space-2) var(--space-1);
		border-bottom: 1px solid var(--color-border);
	}
	tbody th,
	tbody td {
		text-align: left;
		vertical-align: top;
		padding: var(--space-2);
		min-height: var(--row-h);
	}
	tbody tr + tr > * {
		border-top: 1px solid var(--color-border);
	}
	.rules tbody th {
		padding-top: calc(var(--space-2) + 8px);
		font-weight: 600;
		white-space: nowrap;
	}
	.rules tr[data-inactive] th {
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.kind::before {
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-right: var(--space-2);
		border-radius: 2px;
		background: var(--color-primary);
		vertical-align: middle;
	}
	.kind[data-kind='afternoon']::before {
		background: var(--color-secondary);
	}
	.kind[data-kind='consult']::before {
		background: var(--color-info);
		border-radius: 50%;
	}
	.rules td:nth-of-type(1),
	.rules td:nth-of-type(2) {
		width: 9rem;
	}
	.rules td:nth-of-type(3) {
		width: 7rem;
	}
	.rules td[data-label='Actief'] {
		padding-top: calc(var(--space-2) + 6px);
		width: 6rem;
	}
	.row-actions {
		text-align: right;
		width: 1%;
		white-space: nowrap;
	}
	.closed tbody th,
	.closed tbody td {
		vertical-align: middle;
	}
	.closed .row-actions form {
		display: inline-flex;
	}
	.day-save {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-2);
	}

	.add summary {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--control-h-sm);
		cursor: pointer;
		color: var(--color-link);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.add summary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.add-form,
	.close-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: var(--space-3);
		align-items: start;
		margin-top: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}
	.close-form {
		margin-top: 0;
		padding: 0;
		background: none;
		border: 0;
	}
	.add-submit {
		align-self: end;
		padding-bottom: 2px;
	}

	.blackout-form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	.blackout-form :global(.span-2),
	.span-2 {
		grid-column: 1 / -1;
	}
	.blackouts {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 28rem;
		overflow-y: auto;
	}
	.blackouts li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: var(--row-h);
		padding-block: var(--space-1);
		font-size: var(--text-sm);
	}
	.blackouts li + li {
		border-top: 1px solid var(--color-border);
	}
	.b-text {
		display: grid;
		min-width: 0;
	}
	.b-text time::first-letter {
		text-transform: uppercase;
	}

	.settings {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		font-size: var(--text-sm);
	}
	.settings dt {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.settings dd {
		margin: 0;
		color: var(--color-text);
	}

	@media (max-width: 639px) {
		table,
		tbody,
		tr,
		tbody th,
		tbody td {
			display: block;
			width: auto !important;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		tbody tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-2) var(--space-3);
			padding: var(--space-3) 0;
		}
		tbody tr + tr {
			border-top: 1px solid var(--color-border);
		}
		tbody tr + tr > * {
			border-top: 0;
		}
		tbody th,
		tbody td {
			padding: 0 !important;
		}
		tbody th {
			grid-column: 1 / -1;
		}
		td[data-label]::before {
			content: attr(data-label);
			display: block;
			margin-bottom: 2px;
			font-size: var(--text-xs);
			font-weight: 600;
			color: var(--color-text-muted);
		}
		.rules .row-actions {
			grid-column: 2;
			text-align: right;
			align-self: end;
		}
		.closed .row-actions {
			grid-column: 1 / -1;
			text-align: left;
		}
		.blackout-form {
			grid-template-columns: 1fr;
		}
	}
</style>
