<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/Button.svelte';

	/**
	 * In-form step navigation: back link + primary submit. On small screens the primary button
	 * lives in the sticky bottom bar instead (it targets the same form via form="booking-step-form").
	 */
	interface Props {
		backHref?: string | null;
		backLabel: string;
		submitLabel: string;
		busy?: boolean;
	}

	let { backHref, backLabel, submitLabel, busy = false }: Props = $props();
</script>

<div class="actions">
	{#if backHref}
		<a class="back" href={backHref}>
			<ArrowLeft size={18} aria-hidden="true" />
			{backLabel}
		</a>
	{:else}
		<span></span>
	{/if}
	<span class="submit">
		<Button type="submit" size="lg" loading={busy}>
			{submitLabel}
			{#snippet iconEnd()}<ArrowRight size={18} />{/snippet}
		</Button>
	</span>
</div>

<style>
	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		margin-top: var(--space-10);
		padding-top: var(--space-6);
		border-top: 1px solid var(--color-border);
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		font-weight: 600;
		color: var(--color-primary-hover);
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
	/* Small screens use the sticky bottom-bar button (same form). */
	.submit {
		display: none;
	}
	@media (min-width: 1024px) {
		.submit {
			display: inline-flex;
		}
	}
</style>
