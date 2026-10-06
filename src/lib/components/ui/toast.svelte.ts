/** CMS toast store. `toast.success('Opgeslagen')` from anywhere; <Toaster/> lives in the admin layout. */
export type ToastTone = 'success' | 'error' | 'info';
export type ToastItem = { id: number; tone: ToastTone; message: string };

let nextId = 1;

class ToastStore {
	items = $state<ToastItem[]>([]);

	push(tone: ToastTone, message: string, ms = 4000) {
		const id = nextId++;
		this.items.push({ id, tone, message });
		setTimeout(() => this.dismiss(id), ms);
	}
	success(message: string) {
		this.push('success', message);
	}
	error(message: string) {
		this.push('error', message, 6000);
	}
	info(message: string) {
		this.push('info', message);
	}
	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();
