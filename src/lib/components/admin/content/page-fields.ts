/**
 * Form specification per CMS page key. Drives both the Pages editor UI and server-side parsing,
 * and mirrors the block shapes in $lib/content/pages.ts exactly.
 */
import type { PageKey } from '$lib/content/pages';

export type PageFieldType = 'text' | 'textarea' | 'rich' | 'stats' | 'features';
/** Shared fields hold one value for both languages (images, dates). */
export type SharedFieldType = 'image' | 'date';

export type PageField = { name: string; label: string; type: PageFieldType; required?: boolean; helper?: string; max?: number };
export type SharedField = { name: string; label: string; type: SharedFieldType; helper?: string; ratio?: string };
export type PageSection = { title: string; description?: string; fields: PageField[]; shared?: SharedField[] };

const legal: PageSection[] = [
	{
		title: 'Inhoud',
		fields: [{ name: 'body', label: 'Tekst', type: 'rich', required: true, helper: 'Gebruik tussenkoppen (H3) en lijsten voor leesbaarheid.' }],
		shared: [{ name: 'updated', label: 'Laatst bijgewerkt', type: 'date', helper: 'Wordt onderaan de pagina getoond.' }]
	}
];

export const PAGE_SECTIONS: Record<PageKey, PageSection[]> = {
	home: [
		{
			title: 'Hero',
			description: 'Het eerste wat bezoekers zien. Houd de titel kort (max. 6 woorden).',
			fields: [
				{ name: 'heroEyebrow', label: 'Bovenregel', type: 'text', max: 80 },
				{ name: 'heroTitle', label: 'Titel', type: 'text', required: true, max: 80 },
				{ name: 'heroText', label: 'Intro', type: 'textarea', max: 300 }
			],
			shared: [{ name: 'heroImageId', label: 'Hero-afbeelding', type: 'image', ratio: '16 / 9', helper: 'Liggend, minstens 2400 px breed.' }]
		},
		{ title: 'Kerncijfers', description: 'Drie of vier cijfers onder de hero.', fields: [{ name: 'stats', label: 'Cijfers', type: 'stats' }] },
		{
			title: 'Diensten-sectie',
			fields: [
				{ name: 'servicesEyebrow', label: 'Bovenregel', type: 'text', max: 80 },
				{ name: 'servicesTitle', label: 'Titel', type: 'text', required: true, max: 100 },
				{ name: 'servicesText', label: 'Intro', type: 'textarea', max: 300 }
			]
		},
		{
			title: 'Waarom De Ridder',
			fields: [
				{ name: 'whyEyebrow', label: 'Bovenregel', type: 'text', max: 80 },
				{ name: 'whyTitle', label: 'Titel', type: 'text', required: true, max: 100 },
				{ name: 'whyText', label: 'Tekst', type: 'textarea', max: 500 },
				{ name: 'features', label: 'Troeven', type: 'features' }
			],
			shared: [{ name: 'whyImageId', label: 'Afbeelding', type: 'image', ratio: '4 / 5', helper: 'Staand werkt het best.' }]
		},
		{
			title: 'Realisaties & getuigenissen',
			fields: [
				{ name: 'projectsEyebrow', label: 'Bovenregel realisaties', type: 'text', max: 80 },
				{ name: 'projectsTitle', label: 'Titel realisaties', type: 'text', required: true, max: 100 },
				{ name: 'testimonialsEyebrow', label: 'Bovenregel getuigenissen', type: 'text', max: 80 },
				{ name: 'testimonialsTitle', label: 'Titel getuigenissen', type: 'text', required: true, max: 100 }
			]
		}
	],
	about: [
		{
			title: 'Intro',
			fields: [
				{ name: 'eyebrow', label: 'Bovenregel', type: 'text', max: 80 },
				{ name: 'intro', label: 'Intro', type: 'textarea', required: true, max: 500 }
			],
			shared: [{ name: 'imageId', label: 'Afbeelding', type: 'image', ratio: '3 / 2' }]
		},
		{ title: 'Ons verhaal', fields: [{ name: 'story', label: 'Verhaal', type: 'rich', required: true }] },
		{
			title: 'Waarden',
			fields: [
				{ name: 'valuesTitle', label: 'Titel', type: 'text', max: 100 },
				{ name: 'values', label: 'Waarden', type: 'features' }
			]
		},
		{ title: 'Kerncijfers', fields: [{ name: 'stats', label: 'Cijfers', type: 'stats' }] }
	],
	contact: [
		{
			title: 'Intro',
			fields: [
				{ name: 'eyebrow', label: 'Bovenregel', type: 'text', max: 80 },
				{ name: 'intro', label: 'Intro', type: 'textarea', required: true, max: 500 }
			]
		}
	],
	privacy: legal,
	cookies: legal,
	terms: legal
};

/** Public URL per page (for the SEO preview + "bekijk pagina"). */
export const PAGE_PATHS: Record<PageKey, string> = {
	home: '/',
	about: '/over-ons',
	contact: '/contact',
	privacy: '/privacy',
	cookies: '/cookies',
	terms: '/algemene-voorwaarden'
};

export type { Stat, Feature } from '$lib/content/pages';
