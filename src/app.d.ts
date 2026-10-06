import type { Locale } from '$lib/i18n';
import type { SessionUser } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			locale: Locale;
			user: SessionUser | null;
		}
		interface PageData {
			locale: Locale;
		}
		interface Error {
			message: string;
		}
	}
}

export {};
