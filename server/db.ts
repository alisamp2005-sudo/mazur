import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  agents, 
  Agent, 
  InsertAgent,
  phoneNumbers,
  PhoneNumber,
  InsertPhoneNumber,
  calls,
  Call,
  InsertCall,
  callTranscripts,
  CallTranscript,
  InsertCallTranscript,
  callQueue,
  CallQueueItem,
  InsertCallQueueItem,
  callRatings,
  CallRating,
  InsertCallRating,
  promptVersions,
  PromptVersion,
  InsertPromptVersion
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Management ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      email: user.email,
      passwordHash: user.passwordHash,
    };
    const updateSet: Record<string, unknown> = {};

    if (user.name !== undefined) {
      values.name = user.name ?? null;
      updateSet.name = user.name ?? null;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Agent Management ============

export async function createAgent(agent: InsertAgent): Promise<Agent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agents).values(agent);
  const inserted = await db.select().from(agents).where(eq(agents.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getAgents(): Promise<Agent[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(agents).orderBy(desc(agents.createdAt));
}

export async function getAgentById(id: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0];
}

export async function updateAgent(id: number, data: Partial<InsertAgent>): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(agents).set(data).where(eq(agents.id, id));
  return getAgentById(id);
}

export async function deleteAgent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(agents).where(eq(agents.id, id));
}

// ============ Phone Number Management ============

export async function createPhoneNumbers(numbers: InsertPhoneNumber[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (numbers.length === 0) return;
  await db.insert(phoneNumbers).values(numbers);
}

export async function getPhoneNumbers(limit: number = 100, offset: number = 0): Promise<PhoneNumber[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(phoneNumbers).orderBy(desc(phoneNumbers.createdAt)).limit(limit).offset(offset);
}

export async function getPhoneNumberById(id: number): Promise<PhoneNumber | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id)).limit(1);
  return result[0];
}

export async function updatePhoneNumber(id: number, data: Partial<InsertPhoneNumber>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(phoneNumbers).set(data).where(eq(phoneNumbers.id, id));
}

export async function deletePhoneNumbers(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (ids.length === 0) return;
  await db.delete(phoneNumbers).where(inArray(phoneNumbers.id, ids));
}

export async function countPhoneNumbers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` }).from(phoneNumbers);
  return result[0]?.count || 0;
}

// ============ Call Management ============

export async function createCall(call: InsertCall): Promise<Call> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(calls).values(call);
  const inserted = await db.select().from(calls).where(eq(calls.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getCalls(limit: number = 100, offset: number = 0): Promise<Call[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(calls).orderBy(desc(calls.createdAt)).limit(limit).offset(offset);
}

export async function getCallById(id: number): Promise<Call | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(calls).where(eq(calls.id, id)).limit(1);
  return result[0];
}

export async function getCallByConversationId(conversationId: string): Promise<Call | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(calls).where(eq(calls.conversationId, conversationId)).limit(1);
  return result[0];
}

export async function updateCall(id: number, data: Partial<InsertCall>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(calls).set(data).where(eq(calls.id, id));
}

export async function getCallStats() {
  const db = await getDb();
  if (!db) return { total: 0, initiated: 0, inProgress: 0, processing: 0, done: 0, failed: 0 };

  const result = await db.select({
    status: calls.status,
    count: sql<number>`count(*)`
  }).from(calls).groupBy(calls.status);

  const stats = {
    total: 0,
    initiated: 0,
    inProgress: 0,
    processing: 0,
    done: 0,
    failed: 0
  };

  result.forEach(row => {
    const count = row.count || 0;
    stats.total += count;
    
    switch (row.status) {
      case 'initiated': stats.initiated = count; break;
      case 'in-progress': stats.inProgress = count; break;
      case 'processing': stats.processing = count; break;
      case 'done': stats.done = count; break;
      case 'failed': stats.failed = count; break;
    }
  });

  return stats;
}

// ============ Call Transcript Management ============

export async function createTranscripts(transcripts: InsertCallTranscript[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (transcripts.length === 0) return;
  await db.insert(callTranscripts).values(transcripts);
}

export async function getTranscriptsByCallId(callId: number): Promise<CallTranscript[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(callTranscripts).where(eq(callTranscripts.callId, callId)).orderBy(callTranscripts.timeInCallSecs);
}

// ============ Call Queue Management ============

export async function addToQueue(item: InsertCallQueueItem): Promise<CallQueueItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(callQueue).values(item);
  const inserted = await db.select().from(callQueue).where(eq(callQueue.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getQueueItems(status?: string, limit: number = 100): Promise<CallQueueItem[]> {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return db.select().from(callQueue).where(eq(callQueue.status, status as any)).orderBy(callQueue.priority, desc(callQueue.createdAt)).limit(limit);
  }

  return db.select().from(callQueue).orderBy(callQueue.priority, desc(callQueue.createdAt)).limit(limit);
}

export async function getNextQueueItems(limit: number = 3): Promise<CallQueueItem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(callQueue)
    .where(eq(callQueue.status, 'waiting'))
    .orderBy(callQueue.priority, callQueue.createdAt)
    .limit(limit);
}

export async function updateQueueItem(id: number, data: Partial<InsertCallQueueItem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(callQueue).set(data).where(eq(callQueue.id, id));
}

export async function getQueueStats() {
  const db = await getDb();
  if (!db) return { total: 0, waiting: 0, processing: 0, completed: 0, failed: 0 };

  const result = await db.select({
    status: callQueue.status,
    count: sql<number>`count(*)`
  }).from(callQueue).groupBy(callQueue.status);

  const stats = {
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  result.forEach(row => {
    const count = row.count || 0;
    stats.total += count;
    
    switch (row.status) {
      case 'waiting': stats.waiting = count; break;
      case 'processing': stats.processing = count; break;
      case 'completed': stats.completed = count; break;
      case 'failed': stats.failed = count; break;
    }
  });

  return stats;
}

// ============ Call Ratings ============

export async function createCallRating(rating: InsertCallRating): Promise<CallRating> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(callRatings).values(rating);
  const inserted = await db.select().from(callRatings).where(eq(callRatings.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getCallRating(callId: number): Promise<CallRating | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(callRatings).where(eq(callRatings.callId, callId)).limit(1);
  return result[0] || null;
}

export async function updateCallRating(id: number, data: Partial<InsertCallRating>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(callRatings).set(data).where(eq(callRatings.id, id));
}

export async function getCallRatingsStats(agentId?: number) {
  const db = await getDb();
  if (!db) return { avgRating: 0, totalRatings: 0, successRate: 0 };

  let query = db.select({
    avgRating: sql<number>`AVG(${callRatings.overallRating})`,
    totalRatings: sql<number>`COUNT(*)`,
    successCount: sql<number>`SUM(CASE WHEN ${callRatings.objectiveAchieved} = 1 THEN 1 ELSE 0 END)`
  }).from(callRatings);

  if (agentId) {
    query = query.innerJoin(calls, eq(callRatings.callId, calls.id)).where(eq(calls.agentId, agentId)) as any;
  }

  const result = await query;
  const row = result[0];

  return {
    avgRating: row?.avgRating || 0,
    totalRatings: row?.totalRatings || 0,
    successRate: row?.totalRatings ? ((row?.successCount || 0) / row.totalRatings) * 100 : 0
  };
}

// ============ Prompt Versions ============

export async function createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(promptVersions).values(version);
  const inserted = await db.select().from(promptVersions).where(eq(promptVersions.id, Number(result[0].insertId))).limit(1);
  return inserted[0]!;
}

export async function getPromptVersionById(versionId: number): Promise<PromptVersion | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(promptVersions).where(eq(promptVersions.id, versionId)).limit(1);
  return result[0] || null;
}

export async function getPromptVersions(agentId: number): Promise<PromptVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(promptVersions).where(eq(promptVersions.agentId, agentId)).orderBy(desc(promptVersions.version));
}

export async function getActivePromptVersion(agentId: number): Promise<PromptVersion | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(promptVersions)
    .where(and(eq(promptVersions.agentId, agentId), eq(promptVersions.isActive, true)))
    .limit(1);
  
  return result[0] || null;
}

export async function getLatestPromptVersion(agentId: number): Promise<PromptVersion | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(promptVersions)
    .where(eq(promptVersions.agentId, agentId))
    .orderBy(desc(promptVersions.version))
    .limit(1);
  
  return result[0] || null;
}

export async function setActivePromptVersion(agentId: number, versionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deactivate all versions for this agent
  await db.update(promptVersions)
    .set({ isActive: false })
    .where(eq(promptVersions.agentId, agentId));

  // Activate the selected version
  await db.update(promptVersions)
    .set({ isActive: true })
    .where(eq(promptVersions.id, versionId));
}

export async function updatePromptVersionMetrics(versionId: number, metrics: { callCount?: number; avgRating?: number; successRate?: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (metrics.callCount !== undefined) updateData.callCount = metrics.callCount;
  if (metrics.avgRating !== undefined) updateData.avgRating = Math.round(metrics.avgRating * 100);
  if (metrics.successRate !== undefined) updateData.successRate = Math.round(metrics.successRate * 100);

  await db.update(promptVersions).set(updateData).where(eq(promptVersions.id, versionId));
}
