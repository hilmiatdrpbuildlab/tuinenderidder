import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, type Role } from '$lib/server/db/schema';
import { destroyUserSessions, hashPassword } from '$lib/server/auth';

/** CMS user management (Beheer → Gebruikers). Business rules live here so every action enforces them. */

export const ROLES = ['admin', 'planner', 'editor'] as const satisfies readonly Role[];

const publicColumns = {
	id: users.id,
	name: users.name,
	email: users.email,
	role: users.role,
	isActive: users.isActive,
	lastLoginAt: users.lastLoginAt,
	createdAt: users.createdAt
};

export type AdminUserRow = {
	id: number;
	name: string;
	email: string;
	role: Role;
	isActive: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
};

export async function listUsers(): Promise<AdminUserRow[]> {
	return db
		.select(publicColumns)
		.from(users)
		.orderBy(sql`${users.isActive} desc`, asc(users.name));
}

export async function getUser(id: number): Promise<AdminUserRow | null> {
	const [row] = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
	return row ?? null;
}

export async function emailTaken(email: string, exceptId?: number) {
	const where = exceptId
		? and(eq(users.email, email.toLowerCase()), ne(users.id, exceptId))
		: eq(users.email, email.toLowerCase());
	const [row] = await db.select({ id: users.id }).from(users).where(where).limit(1);
	return !!row;
}

/** Number of active admins other than `exceptId`. */
async function otherActiveAdmins(exceptId: number) {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(users)
		.where(and(eq(users.role, 'admin'), eq(users.isActive, true), ne(users.id, exceptId)));
	return Number(row.n);
}

export async function createUser(input: { name: string; email: string; role: Role; password: string }) {
	const [row] = await db
		.insert(users)
		.values({
			name: input.name,
			email: input.email.toLowerCase(),
			role: input.role,
			passwordHash: await hashPassword(input.password)
		})
		.returning({ id: users.id });
	return row.id;
}

/**
 * Update name, role and active flag. Returns an error message (Dutch) when a rule is violated:
 * you cannot deactivate or demote yourself, and the last active admin must stay an active admin.
 */
export async function updateUser(
	actorId: number,
	id: number,
	input: { name: string; role: Role; isActive: boolean }
): Promise<{ ok: true } | { ok: false; field?: 'role' | 'isActive'; message: string }> {
	const current = await getUser(id);
	if (!current) return { ok: false, message: 'Deze gebruiker bestaat niet meer.' };

	const demoting = current.role === 'admin' && input.role !== 'admin';
	const deactivating = current.isActive && !input.isActive;

	if (id === actorId && demoting) {
		return { ok: false, field: 'role', message: 'Je kunt je eigen rol niet verlagen.' };
	}
	if (id === actorId && deactivating) {
		return { ok: false, field: 'isActive', message: 'Je kunt je eigen account niet deactiveren.' };
	}
	if (current.role === 'admin' && current.isActive && (demoting || deactivating)) {
		if ((await otherActiveAdmins(id)) === 0) {
			return {
				ok: false,
				field: demoting ? 'role' : 'isActive',
				message: 'Er moet minstens één actieve beheerder overblijven.'
			};
		}
	}

	await db
		.update(users)
		.set({ name: input.name, role: input.role, isActive: input.isActive, updatedAt: new Date() })
		.where(eq(users.id, id));
	if (deactivating) await destroyUserSessions(id);
	return { ok: true };
}

export async function setPassword(id: number, password: string) {
	await db
		.update(users)
		.set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
		.where(eq(users.id, id));
}

export async function getPasswordHash(id: number) {
	const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, id)).limit(1);
	return row?.hash ?? null;
}

export async function updateName(id: number, name: string) {
	await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, id));
}
