import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  numeric, 
  boolean, 
  timestamp, 
  date, 
  unique, 
  uniqueIndex, 
  index, 
  serial 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Gyms table (Tenant root)
export const gyms = pgTable('gyms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  upiId: text('upi_id'),
  gstNumber: text('gst_number'),
  currency: text('currency').default('INR').notNull(),
  timezone: text('timezone').default('Asia/Kolkata').notNull(),
  receiptPrefix: text('receipt_prefix').default('GM-').notNull(),
  receiptFooter: text('receipt_footer').default('Thank you for training with us! Fees once paid are non-refundable.'),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, SUSPENDED, DEACTIVATED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. User Profiles table
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  role: text('role').default('OWNER').notNull(), // OWNER, MANAGER, TRAINER
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_profiles_gym_id_idx').on(table.gymId),
  index('user_profiles_firebase_uid_idx').on(table.firebaseUid),
]);

// 3. Concurrency-Safe Sequence Counters per Gym
export const gymCounters = pgTable('gym_counters', {
  id: serial('id').primaryKey(),
  gymId: uuid('gym_id').notNull().unique().references(() => gyms.id, { onDelete: 'cascade' }),
  memberSequence: integer('member_sequence').default(0).notNull(),
  receiptSequence: integer('receipt_sequence').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Membership Plans
export const membershipPlans = pgTable('membership_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  durationMonths: integer('duration_months').default(1).notNull(),
  durationDays: integer('duration_days').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('membership_plans_gym_id_idx').on(table.gymId),
]);

// 5. Members Table
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  memberCode: text('member_code').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender').default('Prefer not to say'),
  address: text('address'),
  joinDate: date('join_date').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, PAYMENT PENDING, EXPIRING SOON, EXPIRED, INACTIVE
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('gym_member_code_unique').on(table.gymId, table.memberCode),
  index('members_gym_id_idx').on(table.gymId),
  index('members_gym_phone_idx').on(table.gymId, table.phone),
  index('members_gym_code_idx').on(table.gymId, table.memberCode),
]);

// 6. Memberships Table
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => membershipPlans.id),
  planName: text('plan_name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalFee: numeric('total_fee', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(), // finalAmount
  status: text('status').default('Active').notNull(), // Active, Expiring, Expired, Pending
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('memberships_gym_id_idx').on(table.gymId),
  index('memberships_member_id_idx').on(table.memberId),
  index('memberships_end_date_idx').on(table.gymId, table.endDate),
]);

// 7. Payments Table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'restrict' }),
  memberName: text('member_name').notNull(),
  membershipId: uuid('membership_id').references(() => memberships.id, { onDelete: 'set null' }),
  receiptNumber: text('receipt_number').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').default('Cash').notNull(),
  status: text('status').default('Paid').notNull(), // Paid, Partial, Pending, Refunded
  paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),
  idempotencyKey: text('idempotency_key'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('gym_receipt_unique').on(table.gymId, table.receiptNumber),
  uniqueIndex('gym_payment_idempotency_unique').on(table.gymId, table.idempotencyKey),
  index('payments_gym_id_idx').on(table.gymId),
  index('payments_member_id_idx').on(table.memberId),
  index('payments_date_idx').on(table.gymId, table.paymentDate),
]);

// 8. Expenses Table
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  expenseDate: date('expense_date').notNull(),
  paymentMethod: text('payment_method').default('Cash').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('expenses_gym_id_idx').on(table.gymId),
  index('expenses_date_idx').on(table.gymId, table.expenseDate),
]);

// 9. Notifications Table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }),
  memberName: text('member_name'),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  date: date('date'),
  read: boolean('read').default(false).notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_gym_id_idx').on(table.gymId),
]);

// 10. Audit Logs Table (Tenant-scoped immutable security & operational history)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  action: text('action').notNull(), // USER_PROVISIONED, MEMBER_CREATED, MEMBER_DELETED, MEMBER_ARCHIVED, MEMBERSHIP_RENEWED, PAYMENT_CREATED, PAYMENT_REFUNDED, EXPENSE_CREATED, EXPENSE_DELETED, ROLE_CHANGED, GYM_STATUS_CHANGED, BACKUP_EXPORTED
  entityType: text('entity_type').notNull(), // USER, MEMBER, MEMBERSHIP, PAYMENT, EXPENSE, GYM, BACKUP
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_gym_id_idx').on(table.gymId),
  index('audit_logs_gym_created_idx').on(table.gymId, table.createdAt),
]);

// Define Drizzle Relations for nested queries
export const gymsRelations = relations(gyms, ({ many, one }) => ({
  userProfiles: many(userProfiles),
  members: many(members),
  plans: many(membershipPlans),
  memberships: many(memberships),
  payments: many(payments),
  expenses: many(expenses),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  counters: one(gymCounters, {
    fields: [gyms.id],
    references: [gymCounters.gymId],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  gym: one(gyms, {
    fields: [auditLogs.gymId],
    references: [gyms.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  gym: one(gyms, {
    fields: [userProfiles.gymId],
    references: [gyms.id],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [members.gymId],
    references: [gyms.id],
  }),
  memberships: many(memberships),
  payments: many(payments),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [memberships.gymId],
    references: [gyms.id],
  }),
  member: one(members, {
    fields: [memberships.memberId],
    references: [members.id],
  }),
  plan: one(membershipPlans, {
    fields: [memberships.planId],
    references: [membershipPlans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  gym: one(gyms, {
    fields: [payments.gymId],
    references: [gyms.id],
  }),
  member: one(members, {
    fields: [payments.memberId],
    references: [members.id],
  }),
  membership: one(memberships, {
    fields: [payments.membershipId],
    references: [memberships.id],
  }),
}));
