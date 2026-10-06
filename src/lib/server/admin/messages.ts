import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { contactMessages } from '../db/schema';

export type MessageFilter = 'all' | 'unread';

/** Contact-form messages, newest first. */
export async function listMessages(filter: MessageFilter = 'all') {
	const q = db.select().from(contactMessages);
	const rows = await (filter === 'unread' ? q.where(eq(contactMessages.isRead, false)) : q).orderBy(
		desc(contactMessages.createdAt),
		desc(contactMessages.id)
	);
	return rows;
}

export async function messageCounts() {
	const [row] = await db
		.select({
			all: sql<number>`count(*)::int`,
			unread: sql<number>`count(*) filter (where ${contactMessages.isRead} = false)::int`
		})
		.from(contactMessages);
	return { all: Number(row?.all ?? 0), unread: Number(row?.unread ?? 0) };
}

/** Returns false when the message does not exist. */
export async function setMessageRead(id: number, isRead: boolean) {
	const updated = await db
		.update(contactMessages)
		.set({ isRead })
		.where(eq(contactMessages.id, id))
		.returning({ id: contactMessages.id });
	return updated.length > 0;
}

export async function deleteMessage(id: number) {
	const deleted = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
	return deleted.length > 0;
}
