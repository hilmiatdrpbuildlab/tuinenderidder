import { env } from '$env/dynamic/private';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { DATA_DIR } from './db';

/**
 * Object-storage adapter. The demo stores files on local disk (./data/uploads) but keeps
 * the same contract as Neon Object Storage / S3: the server signs a short-lived upload URL
 * scoped to one key, and the browser PUTs the file straight to it. Swap the internals of
 * this file for an S3-compatible client to go to production; callers do not change.
 */

const ROOT = resolve(DATA_DIR, 'uploads');
const UPLOAD_TTL_MS = 5 * 60 * 1000;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function secret() {
	return env.APP_SECRET || 'dev-secret-change-me';
}

function pathFor(key: string) {
	const full = resolve(ROOT, key);
	if (!full.startsWith(ROOT + sep)) throw new Error('Invalid storage key');
	return full;
}

export async function putObject(key: string, body: Uint8Array) {
	const full = pathFor(key);
	await mkdir(dirname(full), { recursive: true });
	await writeFile(full, body);
}

export async function getObject(key: string): Promise<Buffer | null> {
	try {
		return await readFile(pathFor(key));
	} catch {
		return null;
	}
}

export async function objectExists(key: string) {
	try {
		await stat(pathFor(key));
		return true;
	} catch {
		return false;
	}
}

export async function deleteObject(key: string) {
	await rm(pathFor(key), { force: true });
}

/** Public URL for a stored object (served by src/routes/media/[...key]). */
export function publicUrl(key: string) {
	return `/media/${key}`;
}

/* ---------- presigned upload URLs ---------- */

type UploadClaims = { key: string; mime: string; maxBytes: number; exp: number; uid: number };

function sign(payload: string) {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createUploadUrl(claims: Omit<UploadClaims, 'exp'>) {
	const body = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + UPLOAD_TTL_MS })).toString(
		'base64url'
	);
	const token = `${body}.${sign(body)}`;
	return { url: `/api/media/upload?token=${token}`, token, expiresInSeconds: UPLOAD_TTL_MS / 1000 };
}

export function verifyUploadToken(token: string): UploadClaims | null {
	const [body, sig] = token.split('.');
	if (!body || !sig) return null;
	const expected = Buffer.from(sign(body));
	const given = Buffer.from(sig);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	try {
		const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as UploadClaims;
		if (claims.exp < Date.now()) return null;
		return claims;
	} catch {
		return null;
	}
}
