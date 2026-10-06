/**
 * Small in-memory fixed-window rate limiter for public form actions and login.
 * Good enough for one Node process; use Upstash/Redis or the platform's limiter when scaling out.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
	const now = Date.now();
	const b = buckets.get(key);
	if (!b || b.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
		return { ok: true, retryAfter: 0 };
	}
	b.count++;
	return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}
