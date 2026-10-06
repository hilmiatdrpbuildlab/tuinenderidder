<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { onMount } from 'svelte';
	import { translator, type Locale } from '$lib/i18n';

	/**
	 * Optional garden photos (max 5). Lives inside the step's multipart <form>:
	 *  - without JS: choose files, press "Foto's toevoegen" (formaction ?/upload)
	 *  - with JS: choosing or dropping files submits that button automatically
	 * Thumbnails have a remove button (formaction ?/removePhoto).
	 */
	interface Props {
		locale: Locale;
		photos: { id: number; src: string }[];
		max?: number;
		error?: string | string[] | null;
		busy?: boolean;
		name?: string;
		uploadAction?: string;
		removeAction?: string;
	}

	let {
		locale,
		photos,
		max = 5,
		error,
		busy = false,
		name = 'photos',
		uploadAction = '?/upload',
		removeAction = '?/removePhoto'
	}: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();
	const message = $derived(Array.isArray(error) ? error[0] : error);
	const full = $derived(photos.length >= max);

	let input: HTMLInputElement | undefined = $state();
	let uploadButton: HTMLButtonElement | undefined = $state();
	let enhanced = $state(false);
	let dragging = $state(false);

	onMount(() => (enhanced = true));

	function submitUpload() {
		if (!input?.files?.length || !uploadButton) return;
		input.form?.requestSubmit(uploadButton);
	}

	function ondrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (!input || !e.dataTransfer?.files.length) return;
		input.files = e.dataTransfer.files;
		submitUpload();
	}
</script>

<div class="photodrop" aria-busy={busy || undefined}>
	<p class="label" id="{uid}-label">
		{t('booking.photos.label')} <span class="opt">({t('common.optional')})</span>
	</p>
	<p class="helper" id="{uid}-helper">{t('booking.photos.helper')}</p>

	{#if !full}
		<label
			class="zone"
			class:dragging
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			{ondrop}
		>
			<input
				bind:this={input}
				class="visually-hidden"
				type="file"
				{name}
				multiple
				accept="image/jpeg,image/png,image/webp"
				aria-describedby="{uid}-helper{message ? ` ${uid}-error` : ''}"
				aria-invalid={message ? true : undefined}
				onchange={() => enhanced && submitUpload()}
			/>
			<span class="zone-icon" aria-hidden="true">
				{#if busy}<Spinner size={24} />{:else}<ImagePlus size={28} strokeWidth={1.5} />{/if}
			</span>
			<span class="zone-text">
				<span class="choose">{busy ? t('booking.photos.uploading') : t('booking.photos.choose')}</span>
				<span class="drop">{t('booking.photos.drop')}</span>
			</span>
		</label>
		<button
			bind:this={uploadButton}
			type="submit"
			class="upload"
			class:enhanced
			formaction={uploadAction}
			formnovalidate
		>
			<Upload size={18} aria-hidden="true" />
			{t('booking.photos.upload')}
		</button>
	{:else}
		<p class="full">{t('booking.photos.full', { max })}</p>
	{/if}

	{#if message}
		<p class="error" id="{uid}-error">
			<CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
			<span>{message}</span>
		</p>
	{/if}

	{#if photos.length}
		<p class="count" aria-live="polite">{t('booking.photos.count', { n: photos.length, max })}</p>
		<ul class="thumbs">
			{#each photos as photo, i (photo.id)}
				<li>
					<img src={photo.src} alt={t('booking.photos.alt', { n: i + 1 })} loading="lazy" width="120" height="120" />
					<button
						type="submit"
						class="remove"
						formaction={removeAction}
						formnovalidate
						name="removePhoto"
						value={photo.id}
						aria-label={t('booking.photos.remove', { n: i + 1 })}
					>
						<X size={16} strokeWidth={2.5} aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.photodrop {
		display: grid;
		gap: var(--space-2);
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.opt,
	.helper {
		font-weight: 400;
		color: var(--color-text-muted);
	}
	.helper {
		font-size: var(--text-sm);
		margin-top: -4px;
	}
	.zone {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		min-height: 96px;
		padding: var(--space-5);
		border: 2px dashed var(--color-border-strong);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		cursor: pointer;
		transition:
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out);
	}
	.zone:hover,
	.zone.dragging {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
	}
	.zone:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.zone-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--forest-50);
		color: var(--forest-700);
	}
	.zone-text {
		display: grid;
	}
	.choose {
		font-weight: 600;
		color: var(--color-primary-hover);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.drop {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.upload {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		padding: 0 var(--space-4);
		border: 1.5px solid var(--color-primary);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-primary);
		font-weight: 600;
	}
	.upload:hover {
		background: var(--color-primary-subtle);
	}
	/* With JS, choosing files uploads immediately: keep the button for AT but out of sight. */
	.upload.enhanced {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		padding: 0;
		border: 0;
	}
	.full,
	.count {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.error {
		display: flex;
		gap: 6px;
		align-items: flex-start;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-error);
	}
	.thumbs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: var(--space-3);
		list-style: none;
		padding: 0;
	}
	.thumbs li {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-surface-sunken);
		box-shadow: var(--shadow-1);
	}
	.thumbs img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.remove {
		position: absolute;
		top: 4px;
		right: 4px;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-2);
	}
	/* 44px hit area around the visual 32px button */
	.remove::after {
		content: '';
		position: absolute;
		inset: -6px;
	}
	.remove:hover {
		background: var(--color-error-subtle);
		color: var(--color-error);
	}
</style>
