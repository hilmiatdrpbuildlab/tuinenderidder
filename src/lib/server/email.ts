import { db } from './db';
import { emails } from './db/schema';
import type { Locale } from '$lib/i18n';

/**
 * Email transport. No provider (Brevo/Postmark) is connected yet, so messages are written to
 * the `emails` outbox table and shown in the CMS under Beheer → E-mails. To go live, send the
 * message through the provider API here and set status to 'sent' / 'failed'.
 */
export type OutgoingEmail = {
	to: string;
	subject: string;
	html: string;
	text?: string;
	kind: 'booking_confirmation' | 'booking_alert' | 'booking_reminder' | 'booking_status' | 'contact_alert';
	bookingId?: number | null;
	locale?: Locale;
};

export async function sendEmail(msg: OutgoingEmail) {
	await db.insert(emails).values({
		to: msg.to,
		subject: msg.subject,
		html: msg.html,
		text: msg.text ?? '',
		kind: msg.kind,
		bookingId: msg.bookingId ?? null,
		locale: msg.locale ?? 'nl',
		status: 'queued'
	});
}

/** Minimal branded email wrapper (inline styles — email clients ignore <style>). */
export function emailLayout(opts: { title: string; bodyHtml: string; footer: string; lang: Locale }) {
	return `<!doctype html><html lang="${opts.lang}"><body style="margin:0;background:#FBF9F4;font-family:Figtree,Arial,sans-serif;color:#1C1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF9F4;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #DAD4C7">
<tr><td style="background:#132A16;padding:24px 32px;color:#FBF9F4;font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:26px;font-weight:700;letter-spacing:.02em;text-transform:uppercase">Tuinen De Ridder</td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:32px;line-height:1.05;color:#132A16">${opts.title}</h1>${opts.bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;background:#F5F2EA;font-size:13px;color:#5C5750">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s: string) {
	return s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
