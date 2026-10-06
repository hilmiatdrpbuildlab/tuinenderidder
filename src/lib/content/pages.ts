/**
 * Shapes of the JSON `blocks` stored per locale in `page_translations`, by page key.
 * The CMS Pages editor and the public pages both use these types.
 */

export type Stat = { value: string; label: string };
export type Feature = { icon: string; title: string; text: string };

export type HomeBlocks = {
	heroEyebrow: string;
	heroTitle: string;
	heroText: string;
	heroImageId: number | null;
	stats: Stat[];
	servicesEyebrow: string;
	servicesTitle: string;
	servicesText: string;
	whyEyebrow: string;
	whyTitle: string;
	whyText: string;
	whyImageId: number | null;
	features: Feature[];
	projectsEyebrow: string;
	projectsTitle: string;
	testimonialsEyebrow: string;
	testimonialsTitle: string;
};

export type AboutBlocks = {
	eyebrow: string;
	intro: string;
	/** sanitized rich text */
	story: string;
	imageId: number | null;
	valuesTitle: string;
	values: Feature[];
	stats: Stat[];
};

export type ContactBlocks = {
	eyebrow: string;
	intro: string;
};

export type LegalBlocks = {
	/** sanitized rich text */
	body: string;
	updated: string;
};

export type PageBlocks = {
	home: HomeBlocks;
	about: AboutBlocks;
	contact: ContactBlocks;
	privacy: LegalBlocks;
	cookies: LegalBlocks;
	terms: LegalBlocks;
};

export type PageKey = keyof PageBlocks;
export const PAGE_KEYS: PageKey[] = ['home', 'about', 'contact', 'privacy', 'cookies', 'terms'];

export const PAGE_LABELS: Record<PageKey, string> = {
	home: 'Homepagina',
	about: 'Over ons',
	contact: 'Contact',
	privacy: 'Privacybeleid',
	cookies: 'Cookiebeleid',
	terms: 'Algemene voorwaarden'
};
