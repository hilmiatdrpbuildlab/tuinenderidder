/**
 * Browser side of the presigned upload flow: presign → PUT (XMLHttpRequest for progress) → confirm.
 * The PUT target is whatever URL the server signs (local stand-in now, object storage later).
 */
import { ACCEPTED_MIME, MAX_BYTES, type MediaItem } from './shared';

export class UploadError extends Error {}

export function validateFile(file: File): string | null {
	if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) return 'Alleen JPEG, PNG of WebP.';
	if (file.size > MAX_BYTES) return 'Groter dan 25 MB.';
	if (file.size === 0) return 'Leeg bestand.';
	return null;
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal
	});
	if (!res.ok) throw new UploadError(await errorMessage(res));
	return (await res.json()) as T;
}

async function errorMessage(res: Response) {
	try {
		const data = await res.json();
		return data?.message ?? `Fout ${res.status}`;
	} catch {
		return `Fout ${res.status}`;
	}
}

function put(url: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.setRequestHeader('content-type', file.type);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else {
				let message = `Upload mislukt (${xhr.status})`;
				try {
					message = JSON.parse(xhr.responseText).message ?? message;
				} catch {
					/* not JSON */
				}
				reject(new UploadError(message));
			}
		};
		xhr.onerror = () => reject(new UploadError('Netwerkfout tijdens upload.'));
		xhr.onabort = () => reject(new DOMException('Geannuleerd', 'AbortError'));
		signal?.addEventListener('abort', () => xhr.abort(), { once: true });
		xhr.send(file);
	});
}

type Presigned = { url: string; key: string };

/** Upload a new image into the library. Progress is 0…1 for the PUT; confirm runs after 1. */
export async function uploadImage(
	file: File,
	opts: { folder: string; onProgress?: (f: number) => void; signal?: AbortSignal }
): Promise<MediaItem> {
	const problem = validateFile(file);
	if (problem) throw new UploadError(problem);
	const { url, key } = await postJson<Presigned>(
		'/api/media/presign',
		{ filename: file.name, mime: file.type, bytes: file.size, folder: opts.folder },
		opts.signal
	);
	await put(url, file, opts.onProgress ?? (() => {}), opts.signal);
	return postJson<MediaItem>('/api/media/confirm', { key, mime: file.type, filename: file.name, folder: opts.folder }, opts.signal);
}

/** Replace the file behind an existing media row (same id). */
export async function replaceImage(id: number, file: File, opts: { folder: string; onProgress?: (f: number) => void; signal?: AbortSignal }) {
	const problem = validateFile(file);
	if (problem) throw new UploadError(problem);
	const { url, key } = await postJson<Presigned>(
		'/api/media/presign',
		{ filename: file.name, mime: file.type, bytes: file.size, folder: opts.folder },
		opts.signal
	);
	await put(url, file, opts.onProgress ?? (() => {}), opts.signal);
	return postJson<{ item: MediaItem }>(`/api/media/${id}/replace`, { key, mime: file.type, filename: file.name }, opts.signal);
}

export async function patchMedia(id: number, patch: Partial<Pick<MediaItem, 'altNl' | 'altEn' | 'focalX' | 'focalY' | 'folder'>>) {
	const res = await fetch(`/api/media/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(patch)
	});
	if (!res.ok) throw new UploadError(await errorMessage(res));
	return (await res.json()) as MediaItem;
}

export async function fetchLibrary(): Promise<{ items: MediaItem[]; folders: string[] }> {
	const res = await fetch('/api/media');
	if (!res.ok) throw new UploadError(await errorMessage(res));
	return res.json();
}
