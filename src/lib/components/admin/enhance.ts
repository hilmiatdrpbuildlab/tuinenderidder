import type { SubmitFunction } from '@sveltejs/kit';
import { toast } from '$lib/components/ui/toast.svelte';

/**
 * Standard `use:enhance` handler for CMS forms: toasts `data.message` on success/failure,
 * keeps form values (reset: false) and re-runs loads. Actions return `{ message }` on success and
 * `fail(4xx, { message, errors?, values? })` on failure.
 */
export function enhanceToast(opts: {
	success?: string;
	pending?: (busy: boolean) => void;
	reset?: boolean;
	after?: (ok: boolean) => void;
} = {}): SubmitFunction {
	return () => {
		opts.pending?.(true);
		return async ({ result, update }) => {
			opts.pending?.(false);
			const data = 'data' in result ? (result.data as { message?: string } | undefined) : undefined;
			if (result.type === 'success') {
				const msg = data?.message ?? opts.success;
				if (msg) toast.success(msg);
				opts.after?.(true);
			} else if (result.type === 'redirect') {
				if (opts.success) toast.success(opts.success);
				opts.after?.(true);
			} else if (result.type === 'failure') {
				toast.error(data?.message ?? 'Controleer de gemarkeerde velden.');
				opts.after?.(false);
			} else if (result.type === 'error') {
				toast.error(result.error?.message ?? 'Er ging iets mis. Probeer het opnieuw.');
				opts.after?.(false);
			}
			await update({ reset: opts.reset ?? false, invalidateAll: true });
		};
	};
}
