import { getContext, setContext } from 'svelte';
import type { SubmitFunction } from '@sveltejs/kit';
import { toast } from '$lib/components/ui/toast.svelte';

/** Dirty/saving state shared by an editor form and its child components (pickers, repeaters…). */
export class EditorState {
	dirty = $state(false);
	saving = $state(false);
	/** Set while our own submit/redirect navigates, so the unsaved-changes guard stays quiet. */
	submitting = false;

	markDirty = () => {
		this.dirty = true;
	};
	reset = () => {
		this.dirty = false;
	};

	/**
	 * `use:enhance` handler: toasts on success/failure, keeps typed values (no form reset),
	 * clears the dirty flag after a successful save.
	 */
	enhance = (opts: { success?: string; onSuccess?: () => void } = {}): SubmitFunction => {
		return () => {
			this.saving = true;
			this.submitting = true;
			return async ({ result, update }) => {
				this.saving = false;
				if (result.type === 'success' || result.type === 'redirect') {
					this.dirty = false;
					const m = (result.type === 'success' && (result.data?.message as string | undefined)) || opts.success;
					if (m) toast.success(m);
					opts.onSuccess?.();
				} else if (result.type === 'failure') {
					toast.error((result.data?.message as string | undefined) ?? 'Controleer de gemarkeerde velden.');
				} else if (result.type === 'error') {
					toast.error('Er ging iets mis. Probeer opnieuw.');
				}
				await update({ reset: false, invalidateAll: true });
				this.submitting = false;
			};
		};
	};
}

const KEY = Symbol('content-editor');

export function createEditor() {
	const e = new EditorState();
	setContext(KEY, e);
	return e;
}

export function useEditor(): EditorState | undefined {
	return getContext<EditorState | undefined>(KEY);
}
