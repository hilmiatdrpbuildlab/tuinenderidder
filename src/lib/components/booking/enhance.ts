import type { SubmitFunction } from '@sveltejs/kit';
import { invalidateAll } from '$app/navigation';
import { tick } from 'svelte';

/**
 * `use:enhance` handler for wizard steps: keeps typed values, refreshes availability after a
 * failure (e.g. a slot that just filled up), clears file inputs after an upload and moves focus
 * to the first invalid field so screen-reader users hear what went wrong.
 */
export function stepEnhance(opts: { pending?: (busy: boolean) => void } = {}): SubmitFunction {
	return ({ formElement }) => {
		opts.pending?.(true);
		return async ({ result, update }) => {
			await update({ reset: false });
			opts.pending?.(false);
			for (const input of formElement.querySelectorAll<HTMLInputElement>('input[type="file"]')) input.value = '';
			if (result.type === 'failure') {
				await invalidateAll();
				await tick();
				const target =
					formElement.querySelector<HTMLElement>('[aria-invalid="true"]') ??
					document.querySelector<HTMLElement>('[data-step-error]');
				target?.focus();
			}
		};
	};
}
