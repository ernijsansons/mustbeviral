import { pgTable, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table: Store user profiles and authentication data
export const users = pgTable('users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('creator'),
  profileData: text('profile_data').default('{}'),
  aiPreferenceLevel: integer('ai_preference_level').default(50),
  onboardingCompleted: integer('onboarding_completed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  usernameIdx: index('idx_users_username').on(table.username)
}));

// Content table: Store all content (AI-generated and user-created)
export const content = pgTable('content', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('draft'),
  type: text('type').notNull().default('news_article'),
  generatedByAi: integer('generated_by_ai').notNull().default(0),
  aiModelUsed: text('ai_model_used'),
  ethicsCheckStatus: text('ethics_check_status').default('pending'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  publishedAt: timestamp('published_at')
}, (table) => ({
  userIdIdx: index('idx_content_user_id').on(table.userId),
  statusIdx: index('idx_content_status').on(table.status),
  typeIdx: index('idx_content_type').on(table.type)
}));

// Matches table: Store influencer-content matching data
export const matches = pgTable('matches', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  contentId: text('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
  influencerUserId: text('influencer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  matchScore: real('match_score').default(0.0),
  status: text('status').notNull().default('pending'),
  matchDetails: text('match_details').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  contentIdIdx: index('idx_matches_content_id').on(table.contentId),
  influencerIdIdx: index('idx_matches_influencer_id').on(table.influencerUserId),
  statusIdx: index('idx_matches_status').on(table.status)
}));