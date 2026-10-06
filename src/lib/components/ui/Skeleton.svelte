<script lang="ts">
	let { width = '100%', height = '1em', radius = 'var(--radius-sm)' }: { width?: string; height?: string; radius?: string } = $props();
</script>

<span class="skeleton" style:width style:height style:border-radius={radius} aria-hidden="true"></span>

<style>
	.skeleton {
		display: block;
		background: linear-gradient(90deg, var(--linen-100) 0%, var(--linen-50) 50%, var(--linen-100) 100%);
		background-size: 200% 100%;
		animation: shimmer 1.4s ease-in-out infinite;
	}
	@keyframes shimmer {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: -100% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton {
			animation: none;
		}
	}
</style>
