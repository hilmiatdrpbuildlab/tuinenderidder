/**
 * Generates illustrated garden scenes (SVG) in the brand palette, rendered to JPEG by the seed.
 * They stand in for real project photos until the client delivers them (development plan, 4 Dec
 * content deadline) and replace them through the CMS media library.
 */

export type Scene = 'lawn' | 'hedge' | 'terrace' | 'trees' | 'build' | 'overgrown' | 'pond';

function rng(seed: number) {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return ((s >>> 0) % 10000) / 10000;
	};
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

export function gardenScene({ w, h, seed, scene }: { w: number; h: number; seed: number; scene: Scene }) {
	const r = rng(seed * 7919 + w);
	const horizon = h * (0.38 + r() * 0.12);
	const vpX = w * (0.35 + r() * 0.3);
	const evening = r() > 0.7;
	const skyTop = evening ? '#F3D9B1' : pick(r, ['#DDEBDA', '#E4EEF2', '#E9EFE1']);
	const skyBottom = evening ? '#FBF0DC' : '#FBF9F4';
	const parts: string[] = [];

	parts.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>
<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.95"/><stop offset="1" stop-color="#FFF6DA" stop-opacity="0"/></radialGradient>
<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#132A16" stop-opacity="0"/><stop offset="1" stop-color="#132A16" stop-opacity="0.28"/></linearGradient>
</defs>`);
	parts.push(`<rect width="${w}" height="${h}" fill="url(#sky)"/>`);
	const sunX = w * (0.15 + r() * 0.7);
	parts.push(`<circle cx="${sunX}" cy="${horizon * 0.45}" r="${w * 0.22}" fill="url(#sun)"/>`);

	// far tree line
	const farColors = ['#84B582', '#5B9858', '#6FA56B'];
	for (let x = -40; x < w + 60; x += 30 + r() * 50) {
		const rad = h * (0.05 + r() * 0.07);
		parts.push(`<circle cx="${x}" cy="${horizon - rad * 0.35}" r="${rad}" fill="${pick(r, farColors)}" opacity="0.85"/>`);
	}
	parts.push(`<rect x="0" y="${horizon - 4}" width="${w}" height="${h}" fill="#5B9858"/>`);

	const ground = scene === 'overgrown' || scene === 'build' ? (scene === 'build' ? '#A07545' : '#8C8A52') : '#4F8E4C';

	// lawn with mowing stripes converging on the vanishing point
	parts.push(`<rect x="0" y="${horizon}" width="${w}" height="${h - horizon}" fill="${ground}"/>`);
	if (scene !== 'overgrown' && scene !== 'build') {
		const bands = 9;
		for (let i = 0; i < bands; i++) {
			if (i % 2) continue;
			const x0 = -w + (i * 3 * w) / bands;
			const x1 = -w + ((i + 1) * 3 * w) / bands;
			parts.push(
				`<polygon points="${vpX},${horizon} ${vpX + 1},${horizon} ${x1},${h} ${x0},${h}" fill="#5FA05B" opacity="0.55"/>`
			);
		}
	}

	if (scene === 'terrace') {
		// perspective paving in the foreground
		const top = horizon + (h - horizon) * 0.38;
		const left = w * 0.08;
		const right = w * 0.92;
		parts.push(`<polygon points="${vpX - w * 0.12},${top} ${vpX + w * 0.12},${top} ${right + w * 0.3},${h} ${left - w * 0.3},${h}" fill="#DAD4C7"/>`);
		for (let i = 0; i <= 10; i++) {
			const t = i / 10;
			const xt = vpX - w * 0.12 + t * w * 0.24;
			const xb = left - w * 0.3 + t * (right - left + w * 0.6);
			parts.push(`<line x1="${xt}" y1="${top}" x2="${xb}" y2="${h}" stroke="#BDB6A7" stroke-width="2"/>`);
		}
		for (let j = 1; j < 8; j++) {
			const t = Math.pow(j / 8, 1.6);
			const y = top + t * (h - top);
			parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#BDB6A7" stroke-width="${1 + t * 2}"/>`);
		}
		// planter boxes
		parts.push(`<rect x="${w * 0.04}" y="${top - h * 0.12}" width="${w * 0.18}" height="${h * 0.14}" rx="6" fill="#533A20"/>`);
		for (let k = 0; k < 5; k++)
			parts.push(`<circle cx="${w * 0.06 + k * w * 0.035}" cy="${top - h * 0.13}" r="${h * 0.04}" fill="${pick(r, ['#2F6530', '#3F7D3D', '#5B9858'])}"/>`);
	}

	if (scene === 'pond') {
		const cy = horizon + (h - horizon) * 0.55;
		parts.push(`<ellipse cx="${vpX}" cy="${cy}" rx="${w * 0.26}" ry="${(h - horizon) * 0.16}" fill="#6E9FB2"/>`);
		parts.push(`<ellipse cx="${vpX - w * 0.05}" cy="${cy - 6}" rx="${w * 0.12}" ry="${(h - horizon) * 0.05}" fill="#A9CBD6" opacity="0.7"/>`);
		for (let k = 0; k < 9; k++) {
			const a = (k / 9) * Math.PI * 2;
			parts.push(`<ellipse cx="${vpX + Math.cos(a) * w * 0.27}" cy="${cy + Math.sin(a) * (h - horizon) * 0.17}" rx="${w * 0.03}" ry="${h * 0.018}" fill="#9A9384"/>`);
		}
	}

	if (scene === 'hedge' || scene === 'lawn' || scene === 'pond') {
		// clipped hedge rows along the horizon
		const rows = scene === 'hedge' ? 2 : 1;
		for (let i = 0; i < rows; i++) {
			const y = horizon - h * 0.11 + i * h * 0.12;
			const hh = h * (0.13 + i * 0.03);
			parts.push(`<rect x="${-20}" y="${y}" width="${w * (0.55 + r() * 0.2)}" height="${hh}" rx="${hh * 0.3}" fill="${i ? '#255027' : '#2F6530'}"/>`);
			parts.push(`<rect x="${-20}" y="${y + hh * 0.72}" width="${w * 0.75}" height="${hh * 0.28}" fill="#1C3D1F" opacity="0.45"/>`);
		}
		if (scene === 'hedge') {
			// topiary balls
			for (let k = 0; k < 4; k++) {
				const cx = w * (0.62 + k * 0.1);
				const rad = h * (0.05 + r() * 0.03);
				parts.push(`<circle cx="${cx}" cy="${horizon + h * 0.05}" r="${rad}" fill="#2F6530"/><circle cx="${cx - rad * 0.3}" cy="${horizon + h * 0.05 - rad * 0.3}" r="${rad * 0.45}" fill="#3F7D3D"/>`);
			}
		}
	}

	if (scene === 'trees' || scene === 'lawn' || scene === 'overgrown' || scene === 'terrace') {
		const count = scene === 'trees' ? 3 : 1 + Math.floor(r() * 2);
		for (let k = 0; k < count; k++) {
			const big = scene === 'trees' && k === 0;
			const cx = big ? w * (0.25 + r() * 0.5) : w * (0.1 + r() * 0.8);
			const base = horizon + h * (big ? 0.18 : 0.04 + r() * 0.05);
			const height = h * (big ? 0.55 : 0.28 + r() * 0.12);
			const trunkW = w * (big ? 0.022 : 0.012);
			parts.push(`<rect x="${cx - trunkW / 2}" y="${base - height * 0.55}" width="${trunkW}" height="${height * 0.55}" rx="${trunkW / 3}" fill="#533A20"/>`);
			const crownY = base - height * 0.62;
			const cr = height * 0.32;
			const crownColors = scene === 'overgrown' ? ['#6B7B3A', '#5C6E33', '#7D8A45'] : ['#255027', '#2F6530', '#3F7D3D'];
			for (let c = 0; c < 6; c++) {
				parts.push(
					`<circle cx="${cx + (r() - 0.5) * cr * 1.4}" cy="${crownY + (r() - 0.5) * cr}" r="${cr * (0.5 + r() * 0.35)}" fill="${pick(r, crownColors)}"/>`
				);
			}
		}
	}

	if (scene === 'build') {
		// fresh soil beds, new plants, a wheelbarrow-coloured block and edging stones
		for (let i = 0; i < 4; i++) {
			const y = horizon + (h - horizon) * (0.18 + i * 0.2);
			parts.push(`<rect x="${w * 0.05}" y="${y}" width="${w * 0.9}" height="${(h - horizon) * 0.08}" rx="10" fill="#6B4A28"/>`);
			for (let k = 0; k < 7; k++) {
				const cx = w * (0.1 + k * 0.13 + r() * 0.03);
				parts.push(`<circle cx="${cx}" cy="${y + 4}" r="${h * (0.012 + i * 0.006)}" fill="${pick(r, ['#3F7D3D', '#5B9858', '#84B582'])}"/>`);
			}
			parts.push(`<rect x="${w * 0.05}" y="${y - 6}" width="${w * 0.9}" height="6" fill="#BDB6A7"/>`);
		}
	}

	if (scene === 'overgrown') {
		for (let k = 0; k < 140; k++) {
			const x = r() * w;
			const y = horizon + r() * (h - horizon);
			const len = h * (0.03 + r() * 0.07) * (y / h);
			parts.push(`<path d="M${x} ${y} q ${(r() - 0.5) * 20} ${-len / 2} ${(r() - 0.5) * 30} ${-len}" stroke="${pick(r, ['#6B7B3A', '#8C8A52', '#A39A5A', '#5C6E33'])}" stroke-width="${2 + r() * 2}" fill="none" stroke-linecap="round"/>`);
		}
		for (let k = 0; k < 5; k++) {
			const cx = r() * w;
			const cy = horizon + r() * h * 0.15;
			parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${w * (0.06 + r() * 0.05)}" ry="${h * (0.05 + r() * 0.04)}" fill="${pick(r, ['#5C6E33', '#6B7B3A'])}"/>`);
		}
	}

	if (scene === 'lawn') {
		// stepping stones path
		for (let i = 0; i < 6; i++) {
			const t = (i + 1) / 7;
			const y = horizon + Math.pow(t, 1.4) * (h - horizon);
			const x = vpX + (i % 2 ? 1 : -1) * w * 0.02 * t + (w * 0.15 * t * (r() - 0.5));
			parts.push(`<ellipse cx="${x}" cy="${y}" rx="${w * 0.05 * t + 6}" ry="${h * 0.02 * t + 3}" fill="#DAD4C7"/>`);
		}
	}

	// gentle bottom vignette for overlay text contrast
	parts.push(`<rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="url(#shade)"/>`);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
}
