import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { media, projectTranslations, projects, services, testimonials, contactMessages } from '$lib/server/db/schema';

/** Content-oriented numbers for the editor dashboard. */
export async function contentStats() {
	const count = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
	const [publishedProjects, draftProjects, publishedServices, visibleTestimonials, mediaTotal, mediaNoAlt] = await Promise.all([
		count(db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.status, 'published'))),
		count(db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.status, 'draft'))),
		count(db.select({ n: sql<number>`count(*)::int` }).from(services).where(eq(services.status, 'published'))),
		count(db.select({ n: sql<number>`count(*)::int` }).from(testimonials).where(eq(testimonials.isVisible, true))),
		count(db.select({ n: sql<number>`count(*)::int` }).from(media)),
		count(db.select({ n: sql<number>`count(*)::int` }).from(media).where(sql`trim(${media.altNl}) = ''`))
	]);
	const recentProjects = await db
		.select({ id: projects.id, title: projectTranslations.title, status: projects.status, updatedAt: projects.updatedAt })
		.from(projects)
		.innerJoin(projectTranslations, and(eq(projectTranslations.projectId, projects.id), eq(projectTranslations.locale, 'nl')))
		.orderBy(desc(projects.updatedAt))
		.limit(5);
	return {
		publishedProjects,
		draftProjects,
		publishedServices,
		visibleTestimonials,
		mediaTotal,
		mediaNoAlt,
		recentProjects: recentProjects.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))
	};
}

export async function unreadMessages(limit = 3) {
	return db
		.select({ id: contactMessages.id, name: contactMessages.name, message: contactMessages.message, createdAt: contactMessages.createdAt })
		.from(contactMessages)
		.where(eq(contactMessages.isRead, false))
		.orderBy(desc(contactMessages.createdAt))
		.limit(limit);
}
