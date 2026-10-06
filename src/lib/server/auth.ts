import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from './db';
import { sessions, users, type Role } from './db/schema';

/**
 * CMS authentication: email + password only. Deliberately no OTP, magic link or email
 * verification — the project has no mail/SMS provider yet. Sessions are random 256-bit
 * tokens; only their SHA-256 hash is stored, so a DB leak cannot be replayed.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = 'tdr_session';
const SESSION_DAYS = 30;
const RENEW_WITHIN_DAYS = 15;

export async function hashPassword(password: string) {
	const salt = randomBytes(16);
	const hash = await scrypt(password.normalize('NFKC'), salt, 64);
	return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [algo, saltB64, hashB64] = stored.split('$');
	if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
	const expected = Buffer.from(hashB64, 'base64');
	const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length);
	return timingSafeEqual(expected, actual);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type SessionUser = { id: number; email: string; name: string; role: Role; locale: 'nl' | 'en' };

export async function createSession(userId: number, cookies: Cookies) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
	await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
	await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
	setCookie(cookies, token, expiresAt);
}

export async function validateSession(cookies: Cookies): Promise<SessionUser | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const id = hashToken(token);
	const [row] = await db
		.select({
			expiresAt: sessions.expiresAt,
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			locale: users.locale,
			isActive: users.isActive
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
		.limit(1);
	if (!row || !row.isActive) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	// Sliding expiry: renew when less than half the lifetime is left.
	if (row.expiresAt.getTime() - Date.now() < RENEW_WITHIN_DAYS * 864e5) {
		const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
		setCookie(cookies, token, expiresAt);
	}
	return { id: row.id, email: row.email, name: row.name, role: row.role, locale: row.locale };
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function destroyUserSessions(userId: number) {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions() {
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

function setCookie(cookies: Cookies, token: string, expires: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires
	});
}
