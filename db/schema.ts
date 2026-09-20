import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const registrations = sqliteTable('registrations', {
 id: text('id').primaryKey(),
 name: text('name').notNull(),
 email: text('email').notNull(),
 studentClass: text('student_class').notNull(),
 createdAt: text('created_at').notNull(),
});
