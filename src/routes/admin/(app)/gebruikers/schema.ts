import { z } from 'zod';
import { ROLES } from '$lib/server/admin/users';

export const nameSchema = z.string().trim().min(2, 'Vul een naam in (minstens 2 tekens).').max(80, 'Maximaal 80 tekens.');
export const passwordSchema = z
	.string()
	.min(10, 'Het wachtwoord moet minstens 10 tekens lang zijn.')
	.max(200, 'Maximaal 200 tekens.');
export const roleSchema = z.enum(ROLES, { error: 'Kies een rol.' });

export const createSchema = z.object({
	name: nameSchema,
	email: z.string().trim().toLowerCase().email('Vul een geldig e-mailadres in.'),
	role: roleSchema,
	password: passwordSchema
});

export const updateSchema = z.object({
	name: nameSchema,
	role: roleSchema,
	isActive: z.boolean()
});
