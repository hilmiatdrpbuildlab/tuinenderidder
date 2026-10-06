<script lang="ts">
	/** Placeholder logo (final logo files pending — design_system.md §7.5). Mark + wordmark, min 120px wide. */
	let { inverse = false, compact = false }: { inverse?: boolean; compact?: boolean } = $props();
</script>

<span class="logo" class:inverse class:compact>
	<svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
		<rect width="64" height="64" rx="16" fill="var(--logo-bg)" />
		<path d="M32 52V30" stroke="var(--forest-300)" stroke-width="4" stroke-linecap="round" />
		<path d="M32 34c-9 0-15-6-15-16 10 0 15 6 15 16Z" fill="var(--forest-400)" />
		<path d="M32 30c0-10 6-16 16-16 0 10-6 16-16 16Z" fill="var(--forest-300)" />
		<path d="M18 52h28" stroke="var(--harvest)" stroke-width="4" stroke-linecap="round" />
	</svg>
	<span class="word">
		<span class="top">Tuinen</span>
		<span class="bottom">De Ridder</span>
	</span>
</span>

<style>
	.logo {
		--logo-bg: var(--forest-900);
		--logo-fg: var(--forest-900);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--logo-fg);
		min-width: 120px;
	}
	.inverse {
		--logo-bg: rgb(255 255 255 / 0.1);
		--logo-fg: var(--linen-25);
	}
	.mark {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
	}
	.compact .mark {
		width: 34px;
		height: 34px;
	}
	.word {
		display: grid;
		font-family: var(--font-display);
		text-transform: uppercase;
		line-height: 0.92;
		letter-spacing: 0.02em;
	}
	.top {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		opacity: 0.85;
	}
	.bottom {
		font-size: 1.45rem;
		font-weight: 700;
	}
	.compact .bottom {
		font-size: 1.25rem;
	}
</style>
