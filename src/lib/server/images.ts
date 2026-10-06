import sharp from 'sharp';
import { getObject, putObject } from './storage';
import { variantKey } from '$lib/media';

export { variantKey };
export const DERIVATIVE_WIDTHS = [480, 960, 1600, 2400] as const;

export type ProcessedImage = {
	width: number;
	height: number;
	bytes: number;
	mime: string;
	lqip: string;
	variants: number[];
};

/**
 * Normalise an uploaded original and build its derivatives:
 *  - auto-rotate from EXIF, then re-encode, which strips EXIF/GPS (customers' home locations)
 *  - WebP derivatives at 480/960/1600/2400 px (never upscaled)
 *  - a ~24 px blurred placeholder as a data URL (stands in for BlurHash)
 */
export async function processImage(key: string, mime: string): Promise<ProcessedImage> {
	const original = await getObject(key);
	if (!original) throw new Error(`Object not found: ${key}`);

	const base = sharp(original, { failOn: 'error' }).rotate();
	let cleaned: Buffer;
	if (mime === 'image/png') cleaned = await base.png({ compressionLevel: 9 }).toBuffer();
	else if (mime === 'image/webp') cleaned = await base.webp({ quality: 88 }).toBuffer();
	else cleaned = await base.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
	await putObject(key, cleaned);

	const meta = await sharp(cleaned).metadata();
	const width = meta.width ?? 0;
	const height = meta.height ?? 0;

	const variants: number[] = [];
	for (const w of DERIVATIVE_WIDTHS) {
		if (w > width && variants.length > 0) break;
		const target = Math.min(w, width);
		const buf = await sharp(cleaned).resize({ width: target }).webp({ quality: 78 }).toBuffer();
		await putObject(variantKey(key, w), buf);
		variants.push(w);
		if (target < w) break;
	}

	const tiny = await sharp(cleaned).resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
	const lqip = `data:image/webp;base64,${tiny.toString('base64')}`;

	return { width, height, bytes: cleaned.byteLength, mime, lqip, variants };
}
