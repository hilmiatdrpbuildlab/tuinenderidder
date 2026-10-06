<script lang="ts">
	/**
	 * Click (or use the arrow keys) on the subject of the photo; crops for 4:5, 1:1 and 16:9 are
	 * previewed live. Hidden inputs `focalX` / `focalY` (0…1) post with the surrounding form.
	 */
	interface Props {
		src: string;
		alt?: string;
		x?: number;
		y?: number;
		width: number;
		height: number;
		nameX?: string;
		nameY?: string;
		onchange?: (x: number, y: number) => void;
	}

	let { src, alt = '', x = $bindable(0.5), y = $bindable(0.5), width, height, nameX = 'focalX', nameY = 'focalY', onchange }: Props = $props();

	const uid = $props.id();
	let box: HTMLDivElement | undefined = $state();
	let dragging = false;

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const clamp = (n: number) => Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));

	function setFromPointer(e: PointerEvent) {
		if (!box) return;
		const r = box.getBoundingClientRect();
		x = clamp((e.clientX - r.left) / r.width);
		y = clamp((e.clientY - r.top) / r.height);
		onchange?.(x, y);
	}

	function onKeydown(e: KeyboardEvent) {
		const step = e.shiftKey ? 0.1 : 0.02;
		let handled = true;
		if (e.key === 'ArrowLeft') x = clamp(x - step);
		else if (e.key === 'ArrowRight') x = clamp(x + step);
		else if (e.key === 'ArrowUp') y = clamp(y - step);
		else if (e.key === 'ArrowDown') y = clamp(y + step);
		else if (e.key === 'Home') {
			x = 0.5;
			y = 0.5;
		} else handled = false;
		if (handled) {
			e.preventDefault();
			onchange?.(x, y);
		}
	}

	const crops = [
		{ label: '4:5', ratio: '4 / 5' },
		{ label: '1:1', ratio: '1 / 1' },
		{ label: '16:9', ratio: '16 / 9' }
	];
</script>

<div class="focal">
	<p class="label" id="{uid}-label">Focuspunt</p>
	<div
		bind:this={box}
		class="stage"
		style:aspect-ratio="{width || 4} / {height || 3}"
		style:max-width="{Math.round((360 * (width || 4)) / (height || 3))}px"
		role="slider"
		tabindex="0"
		aria-labelledby="{uid}-label"
		aria-describedby="{uid}-help"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(x * 100)}
		aria-valuetext="Horizontaal {pct(x)}, verticaal {pct(y)}"
		onpointerdown={(e) => {
			dragging = true;
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			setFromPointer(e);
		}}
		onpointermove={(e) => dragging && setFromPointer(e)}
		onpointerup={() => (dragging = false)}
		onkeydown={onKeydown}
	>
		<img {src} {alt} draggable="false" />
		<span class="marker" style:left={pct(x)} style:top={pct(y)} aria-hidden="true"></span>
	</div>
	<p class="help" id="{uid}-help">Klik op het onderwerp of gebruik de pijltjestoetsen (Shift = grotere stap, Home = midden).</p>

	<div class="previews" aria-label="Voorbeeld uitsnedes">
		{#each crops as c (c.label)}
			<figure>
				<div class="crop" style:aspect-ratio={c.ratio}>
					<img {src} alt="" style:object-position="{pct(x)} {pct(y)}" />
				</div>
				<figcaption>{c.label}</figcaption>
			</figure>
		{/each}
	</div>

	<input type="hidden" name={nameX} value={x} />
	<input type="hidden" name={nameY} value={y} />
</div>

<style>
	.focal {
		display: grid;
		gap: var(--space-2);
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.stage {
		position: relative;
		width: 100%;
		margin-inline: auto;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--color-surface-sunken);
		cursor: crosshair;
		touch-action: none;
		user-select: none;
	}
	.stage:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.stage img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}
	.marker {
		position: absolute;
		width: 28px;
		height: 28px;
		margin: -14px 0 0 -14px;
		border: 3px solid var(--white);
		border-radius: 50%;
		box-shadow:
			0 0 0 2px var(--forest-900),
			0 2px 8px rgb(0 0 0 / 0.4);
		background: color-mix(in srgb, var(--harvest) 45%, transparent);
		pointer-events: none;
	}
	.help {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.previews {
		display: grid;
		grid-template-columns: 0.8fr 1fr 1.6fr;
		align-items: end;
		gap: var(--space-2);
	}
	figure {
		margin: 0;
		display: grid;
		gap: 4px;
	}
	.crop {
		overflow: hidden;
		border-radius: 6px;
		background: var(--color-surface-sunken);
	}
	.crop img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	figcaption {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
