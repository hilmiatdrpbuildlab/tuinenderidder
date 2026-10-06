<script lang="ts">
	import { onDestroy } from 'svelte';
	import UploadCloud from '@lucide/svelte/icons/cloud-upload';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { MAX_BATCH, formatBytes, type MediaItem } from './shared';
	import { uploadImage, validateFile } from './upload';

	/**
	 * Drag-and-drop / click / paste uploader. Each file: presign → PUT (progress) → confirm.
	 * Max 25 MB per file, 30 per batch, 3 uploads in parallel; cancel and retry per file.
	 */
	interface Props {
		folder?: string;
		/** Listen for Ctrl+V anywhere on the page while mounted */
		paste?: boolean;
		compact?: boolean;
		onuploaded?: (item: MediaItem) => void;
	}

	let { folder = 'library', paste = true, compact = false, onuploaded }: Props = $props();

	type Status = 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'cancelled';
	type Job = { id: number; file: File; preview: string; status: Status; progress: number; error: string; controller: AbortController | null };

	const uid = $props.id();
	let jobs = $state<Job[]>([]);
	let over = $state(false);
	let input: HTMLInputElement | undefined = $state();
	let nextId = 1;
	const PARALLEL = 3;

	const active = $derived(jobs.filter((j) => j.status === 'uploading' || j.status === 'processing').length);
	const doneCount = $derived(jobs.filter((j) => j.status === 'done').length);
	const summary = $derived(
		jobs.length === 0
			? ''
			: `${doneCount} van ${jobs.length} geüpload${jobs.some((j) => j.status === 'error') ? ', ' + jobs.filter((j) => j.status === 'error').length + ' mislukt' : ''}`
	);

	function addFiles(list: FileList | File[] | null | undefined) {
		const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || f.name.match(/\.(jpe?g|png|webp|heic)$/i));
		if (!files.length) return;
		const pending = jobs.filter((j) => j.status === 'queued' || j.status === 'uploading').length;
		const room = Math.max(0, MAX_BATCH - pending);
		if (files.length > room) toast.error(`Maximaal ${MAX_BATCH} foto’s per keer — ${files.length - room} overgeslagen.`);
		for (const file of files.slice(0, room)) {
			const problem = validateFile(file);
			jobs.push({
				id: nextId++,
				file,
				preview: problem ? '' : URL.createObjectURL(file),
				status: problem ? 'error' : 'queued',
				progress: 0,
				error: problem ?? '',
				controller: null
			});
		}
		pump();
	}

	function pump() {
		let running = jobs.filter((j) => j.status === 'uploading' || j.status === 'processing').length;
		for (const job of jobs) {
			if (running >= PARALLEL) break;
			if (job.status !== 'queued') continue;
			running++;
			void run(job.id);
		}
	}

	const find = (id: number) => jobs.find((j) => j.id === id);

	async function run(id: number) {
		const job = find(id);
		if (!job) return;
		const controller = new AbortController();
		job.controller = controller;
		job.status = 'uploading';
		job.progress = 0;
		job.error = '';
		try {
			const item = await uploadImage(job.file, {
				folder,
				signal: controller.signal,
				onProgress: (f) => {
					const j = find(id);
					if (!j) return;
					j.progress = f;
					if (f >= 1) j.status = 'processing';
				}
			});
			const j = find(id);
			if (j) j.status = 'done';
			onuploaded?.(item);
		} catch (e) {
			const j = find(id);
			if (j) {
				if ((e as Error).name === 'AbortError') j.status = 'cancelled';
				else {
					j.status = 'error';
					j.error = (e as Error).message || 'Upload mislukt.';
				}
			}
		} finally {
			const j = find(id);
			if (j) j.controller = null;
			pump();
		}
	}

	function cancel(id: number) {
		const j = find(id);
		if (!j) return;
		if (j.controller) j.controller.abort();
		else if (j.status === 'queued') j.status = 'cancelled';
	}

	function retry(id: number) {
		const j = find(id);
		if (!j || validateFile(j.file)) return;
		j.status = 'queued';
		j.error = '';
		pump();
	}

	function removeJob(id: number) {
		const j = find(id);
		if (j?.preview) URL.revokeObjectURL(j.preview);
		jobs = jobs.filter((x) => x.id !== id);
	}

	function clearFinished() {
		for (const j of jobs) if (j.status === 'done' || j.status === 'cancelled') if (j.preview) URL.revokeObjectURL(j.preview);
		jobs = jobs.filter((j) => j.status !== 'done' && j.status !== 'cancelled');
	}

	function onPaste(e: ClipboardEvent) {
		if (!paste) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea, [contenteditable="true"]')) return;
		const files = Array.from(e.clipboardData?.files ?? []);
		if (files.length) {
			e.preventDefault();
			addFiles(files);
		}
	}

	onDestroy(() => {
		for (const j of jobs) {
			j.controller?.abort();
			if (j.preview) URL.revokeObjectURL(j.preview);
		}
	});

	const statusLabel: Record<Status, string> = {
		queued: 'In wachtrij',
		uploading: 'Uploaden…',
		processing: 'Verwerken…',
		done: 'Klaar',
		error: 'Mislukt',
		cancelled: 'Geannuleerd'
	};
</script>

<svelte:window onpaste={onPaste} />

<div class="uploader" class:compact>
	<label
		class="dropzone"
		class:over
		for="{uid}-input"
		ondragenter={(e) => {
			e.preventDefault();
			over = true;
		}}
		ondragover={(e) => {
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
			over = true;
		}}
		ondragleave={(e) => {
			if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) over = false;
		}}
		ondrop={(e) => {
			e.preventDefault();
			over = false;
			addFiles(e.dataTransfer?.files);
		}}
	>
		<span class="icon" aria-hidden="true"><UploadCloud size={compact ? 24 : 32} strokeWidth={1.5} /></span>
		<span class="title">Sleep foto’s hierheen of <span class="link">kies bestanden</span></span>
		<span class="hint">JPEG, PNG of WebP · max. 25 MB per foto · max. {MAX_BATCH} per keer{paste ? ' · plakken met Ctrl+V' : ''}</span>
		<input
			bind:this={input}
			id="{uid}-input"
			type="file"
			accept="image/jpeg,image/png,image/webp"
			multiple
			class="visually-hidden"
			onchange={(e) => {
				addFiles(e.currentTarget.files);
				e.currentTarget.value = '';
			}}
		/>
	</label>

	{#if jobs.length}
		<div class="head">
			<p aria-live="polite">{summary}{active ? ` · ${active} bezig` : ''}</p>
			{#if jobs.some((j) => j.status === 'done' || j.status === 'cancelled')}
				<button type="button" class="link-btn" onclick={clearFinished}>Lijst opschonen</button>
			{/if}
		</div>
		<ul class="cards">
			{#each jobs as job (job.id)}
				<li class="card" data-status={job.status}>
					<div class="thumb">
						{#if job.preview}<img src={job.preview} alt="" />{/if}
						{#if job.status === 'done'}<span class="badge ok"><CircleCheck size={16} aria-hidden="true" /></span>{/if}
						{#if job.status === 'error'}<span class="badge bad"><CircleAlert size={16} aria-hidden="true" /></span>{/if}
					</div>
					<div class="info">
						<p class="name" title={job.file.name}>{job.file.name}</p>
						<p class="meta">
							{formatBytes(job.file.size)} ·
							<span class="st">
								{#if job.status === 'processing'}<Spinner size={12} />{/if}
								{job.status === 'error' ? job.error : statusLabel[job.status]}
							</span>
						</p>
						{#if job.status === 'uploading' || job.status === 'processing' || job.status === 'queued'}
							<div
								class="bar"
								role="progressbar"
								aria-label="Voortgang {job.file.name}"
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={Math.round(job.progress * 100)}
							>
								<span style:width="{Math.round(job.progress * 100)}%"></span>
							</div>
						{/if}
					</div>
					<div class="actions">
						{#if job.status === 'uploading' || job.status === 'queued'}
							<button type="button" aria-label="Annuleer {job.file.name}" title="Annuleren" onclick={() => cancel(job.id)}><X size={16} /></button>
						{:else if job.status === 'error' || job.status === 'cancelled'}
							{#if !validateFile(job.file)}
								<button type="button" aria-label="Opnieuw proberen: {job.file.name}" title="Opnieuw" onclick={() => retry(job.id)}><RotateCcw size={16} /></button>
							{/if}
							<button type="button" aria-label="Verwijder {job.file.name} uit de lijst" title="Verwijderen" onclick={() => removeJob(job.id)}><X size={16} /></button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.uploader {
		display: grid;
		gap: var(--space-3);
	}
	.dropzone {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: var(--space-8) var(--space-4);
		border: 2px dashed var(--forest-300);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-align: center;
		cursor: pointer;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	.compact .dropzone {
		padding: var(--space-5) var(--space-4);
	}
	.dropzone:hover,
	.dropzone.over {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	.dropzone:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.icon {
		color: var(--color-primary);
	}
	.title {
		font-weight: 600;
	}
	.link {
		color: var(--color-link);
		text-decoration: underline;
	}
	.hint {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.link-btn {
		border: 0;
		background: none;
		padding: 0;
		color: var(--color-link);
		font-size: var(--text-sm);
		text-decoration: underline;
		cursor: pointer;
	}
	.cards {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-2);
	}
	.card {
		display: grid;
		grid-template-columns: 48px 1fr auto;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
	}
	.card[data-status='error'] {
		border-color: var(--color-error);
	}
	.thumb {
		position: relative;
		width: 48px;
		height: 48px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-surface-sunken);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.badge {
		position: absolute;
		right: 2px;
		bottom: 2px;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-surface);
	}
	.badge.ok {
		color: var(--color-success);
	}
	.badge.bad {
		color: var(--color-error);
	}
	.info {
		min-width: 0;
		display: grid;
		gap: 3px;
	}
	.name {
		font-size: var(--text-sm);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.st {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	[data-status='error'] .st {
		color: var(--color-error);
		font-weight: 600;
	}
	.bar {
		height: 4px;
		border-radius: 2px;
		background: var(--color-surface-sunken);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--color-primary);
		transition: width var(--dur-fast) linear;
	}
	[data-status='processing'] .bar span {
		animation: pulse 1s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		to {
			opacity: 0.45;
		}
	}
	.actions {
		display: flex;
	}
	.actions button {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.actions button:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.actions button:focus-visible {
		outline: 2px solid var(--color-focus);
	}
</style>
