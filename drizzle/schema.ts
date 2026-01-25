import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * ElevenLabs agents configuration
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  agentId: varchar("agentId", { length: 255 }).notNull().unique(),
  phoneNumberId: varchar("phoneNumberId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Phone numbers database for outbound calling
 */
export const phoneNumbers = mysqlTable("phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 50 }).notNull(),
  metadata: text("metadata"), // JSON string for additional data from CSV
  status: mysqlEnum("status", ["pending", "queued", "calling", "completed", "failed"]).default("pending").notNull(),
  agentId: int("agentId"),
  lastCallId: int("lastCallId"),
  callCount: int("callCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = typeof phoneNumbers.$inferInsert;

/**
 * Call records with status tracking
 */
export const calls = mysqlTable("calls", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 255 }).unique(),
  callSid: varchar("callSid", { length: 255 }),
  agentId: int("agentId").notNull(),
  phoneNumberId: int("phoneNumberId"),
  toNumber: varchar("toNumber", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["initiated", "in-progress", "processing", "done", "failed"]).default("initiated").notNull(),
  startTime: bigint("startTime", { mode: "number" }), // Unix timestamp in seconds
  endTime: bigint("endTime", { mode: "number" }),
  duration: int("duration"), // Duration in seconds
  audioUrl: text("audioUrl"),
  audioPath: text("audioPath"), // Local file path for audio
  hasAudio: boolean("hasAudio").default(false).notNull(),
  hasTranscript: boolean("hasTranscript").default(false).notNull(),
  metadata: text("metadata"), // JSON string for additional webhook data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Call = typeof calls.$inferSelect;
export type InsertCall = typeof calls.$inferInsert;

/**
 * Call transcripts with speaker identification
 */
export const callTranscripts = mysqlTable("call_transcripts", {
  id: int("id").autoincrement().primaryKey(),
  callId: int("callId").notNull(),
  role: mysqlEnum("role", ["user", "agent"]).notNull(),
  message: text("message").notNull(),
  timeInCallSecs: int("timeInCallSecs").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallTranscript = typeof callTranscripts.$inferSelect;
export type InsertCallTranscript = typeof callTranscripts.$inferInsert;

/**
 * Call queue for managing parallel outbound calls
 */
export const callQueue = mysqlTable("call_queue", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumberId: int("phoneNumberId").notNull(),
  agentId: int("agentId").notNull(),
  status: mysqlEnum("status", ["waiting", "processing", "completed", "failed"]).default("waiting").notNull(),
  priority: int("priority").default(0).notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  maxRetries: int("maxRetries").default(3).notNull(),
  errorMessage: text("errorMessage"),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallQueueItem = typeof callQueue.$inferSelect;
export type InsertCallQueueItem = typeof callQueue.$inferInsert;

/**
 * Call quality ratings and evaluation
 */
export const callRatings = mysqlTable("call_ratings", {
  id: int("id").autoincrement().primaryKey(),
  callId: int("callId").notNull(),
  overallRating: int("overallRating").notNull(), // 1-5 stars
  clarityScore: int("clarityScore"), // 1-5
  engagementScore: int("engagementScore"), // 1-5
  objectiveAchieved: boolean("objectiveAchieved"), // Did call achieve its goal?
  transferSuccessful: boolean("transferSuccessful"), // Was transfer successful if applicable?
  feedback: text("feedback"), // Free-form feedback
  evaluationType: mysqlEnum("evaluationType", ["manual", "auto"]).default("manual").notNull(),
  evaluatedBy: varchar("evaluatedBy", { length: 255 }), // User ID or "system" for auto
  autoEvaluation: text("autoEvaluation"), // JSON string with LLM evaluation details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallRating = typeof callRatings.$inferSelect;
export type InsertCallRating = typeof callRatings.$inferInsert;

/**
 * Agent prompt versions for A/B testing and improvement
 */
export const promptVersions = mysqlTable("prompt_versions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  version: int("version").notNull(), // Incremental version number
  promptText: text("promptText").notNull(),
  firstMessage: text("firstMessage"),
  isActive: boolean("isActive").default(false).notNull(),
  description: text("description"), // What changed in this version
  performanceMetrics: text("performanceMetrics"), // JSON: avg rating, success rate, etc.
  callCount: int("callCount").default(0).notNull(),
  avgRating: int("avgRating"), // Average rating * 100 (e.g., 425 = 4.25)
  successRate: int("successRate"), // Success rate * 100 (e.g., 8500 = 85%)
  createdBy: varchar("createdBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = typeof promptVersions.$inferInsert;

/**
 * Telegram integration settings
 */
export const telegramSettings = mysqlTable("telegram_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner user ID
  botToken: text("botToken"), // Telegram bot token
  chatId: varchar("chatId", { length: 255 }), // Telegram chat ID to send recordings
  isActive: boolean("isActive").default(false).notNull(),
  sendRecordings: boolean("sendRecordings").default(true).notNull(),
  sendTranscripts: boolean("sendTranscripts").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type InsertTelegramSettings = typeof telegramSettings.$inferInsert;
