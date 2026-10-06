import type { Reroute } from '@sveltejs/kit';
import { rerouteEnglish } from '$lib/i18n';

/** Map translated English URLs (/en/services/pruning) onto the Dutch route tree. */
export const reroute: Reroute = ({ url }) => rerouteEnglish(url.pathname);
