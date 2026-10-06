<script lang="ts">
	import ProjectCard from './ProjectCard.svelte';
	import { localizePath, type Locale } from '$lib/i18n';
	import type { ProjectSummary } from '$lib/server/content/projects';

	/** Masonry of portfolio tiles: portrait covers get 4:5, landscape covers 1:1 (1 / 2 / 3 columns). */
	interface Props {
		locale: Locale;
		projects: ProjectSummary[];
		headingLevel?: 2 | 3;
		columns?: 2 | 3;
	}

	let { locale, projects, headingLevel = 3, columns = 3 }: Props = $props();
</script>

<ul class="masonry" data-cols={columns}>
	{#each projects as p (p.id)}
		<li>
			<ProjectCard
				{locale}
				href={localizePath(`/realisaties/${p.slug}`, locale)}
				title={p.title}
				town={p.town}
				year={p.year}
				serviceTitle={p.service?.title}
				cover={p.cover}
				beforeAfter={p.hasBeforeAfter}
				ratio={p.portrait ? '4 / 5' : '1 / 1'}
				{headingLevel}
			/>
		</li>
	{/each}
</ul>

<style>
	.masonry {
		columns: 1;
		column-gap: var(--space-6);
		padding: 0;
		list-style: none;
	}
	.masonry li {
		break-inside: avoid;
		margin-bottom: var(--space-6);
	}
	@media (min-width: 640px) {
		.masonry {
			columns: 2;
		}
	}
	@media (min-width: 1024px) {
		.masonry[data-cols='3'] {
			columns: 3;
		}
	}
</style>
