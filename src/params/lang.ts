import type { ParamMatcher } from '@sveltejs/kit';

/** Only non-default locales appear in the URL; Dutch has no prefix. */
export const match: ParamMatcher = (param) => param === 'en';
