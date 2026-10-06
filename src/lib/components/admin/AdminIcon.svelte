<script lang="ts">
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CalendarCog from '@lucide/svelte/icons/calendar-cog';
	import Inbox from '@lucide/svelte/icons/inbox';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Shovel from '@lucide/svelte/icons/shovel';
	import Images from '@lucide/svelte/icons/images';
	import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
	import FileText from '@lucide/svelte/icons/file-text';
	import Image from '@lucide/svelte/icons/image';
	import Mail from '@lucide/svelte/icons/mail';
	import Users from '@lucide/svelte/icons/users';
	import Settings from '@lucide/svelte/icons/settings';

	let { name, size = 20 }: { name: string; size?: number } = $props();

	const map: Record<string, typeof LayoutDashboard> = {
		'layout-dashboard': LayoutDashboard,
		'calendar-check': CalendarCheck,
		'calendar-days': CalendarDays,
		'calendar-cog': CalendarCog,
		inbox: Inbox,
		'message-square': MessageSquare,
		shovel: Shovel,
		images: Images,
		'message-square-quote': MessageSquareQuote,
		'file-text': FileText,
		image: Image,
		mail: Mail,
		users: Users,
		settings: Settings
	};
	const Cmp = $derived(map[name] ?? LayoutDashboard);
</script>

<Cmp {size} strokeWidth={1.75} aria-hidden="true" />
