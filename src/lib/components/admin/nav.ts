import type { Area } from '$lib/server/permissions';

/** CMS sidebar structure (design_system.md §3.3). `badge` keys map to counts from the admin layout load. */
export type NavItem = {
	href: string;
	label: string;
	icon: string;
	area: Area;
	badge?: 'newBookings' | 'newQuotes' | 'unreadMessages';
};
export type NavSection = { label: string; items: NavItem[] };

export const adminNav: NavSection[] = [
	{
		label: 'Overzicht',
		items: [{ href: '/admin', label: 'Dashboard', icon: 'layout-dashboard', area: 'dashboard' }]
	},
	{
		label: 'Planning',
		items: [
			{ href: '/admin/boekingen', label: 'Boekingen', icon: 'calendar-check', area: 'bookings', badge: 'newBookings' },
			{ href: '/admin/kalender', label: 'Kalender', icon: 'calendar-days', area: 'calendar' },
			{ href: '/admin/aanvragen', label: 'Aanvragen & offertes', icon: 'inbox', area: 'requests', badge: 'newQuotes' },
			{ href: '/admin/berichten', label: 'Berichten', icon: 'message-square', area: 'messages', badge: 'unreadMessages' },
			{ href: '/admin/beschikbaarheid', label: 'Beschikbaarheid', icon: 'calendar-cog', area: 'availability' }
		]
	},
	{
		label: 'Inhoud',
		items: [
			{ href: '/admin/diensten', label: 'Diensten', icon: 'shovel', area: 'content' },
			{ href: '/admin/realisaties', label: 'Realisaties', icon: 'images', area: 'content' },
			{ href: '/admin/getuigenissen', label: 'Getuigenissen', icon: 'message-square-quote', area: 'content' },
			{ href: '/admin/paginas', label: "Pagina's", icon: 'file-text', area: 'content' }
		]
	},
	{
		label: 'Media',
		items: [{ href: '/admin/media', label: 'Bibliotheek', icon: 'image', area: 'media' }]
	},
	{
		label: 'Beheer',
		items: [
			{ href: '/admin/emails', label: 'E-mails', icon: 'mail', area: 'emails' },
			{ href: '/admin/gebruikers', label: 'Gebruikers', icon: 'users', area: 'users' },
			{ href: '/admin/instellingen', label: 'Instellingen', icon: 'settings', area: 'settings' }
		]
	}
];
