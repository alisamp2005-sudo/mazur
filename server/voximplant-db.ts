/**
 * Database helpers for Voximplant tables
 */

import { getDb } from "./db";
import { 
  voximplantAccounts, 
  voximplantApplications, 
  voximplantCalls,
  voximplantTranscripts,
  type InsertVoximplantAccount,
  type InsertVoximplantApplication,
  type InsertVoximplantCall,
  type InsertVoximplantTranscript,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// ============================================================================
// Voximplant Accounts
// ============================================================================

export async function createVoximplantAccount(data: InsertVoximplantAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db.insert(voximplantAccounts).values(data);
  return account;
}

export async function getVoximplantAccountsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(voximplantAccounts).where(eq(voximplantAccounts.userId, userId));
}

export async function getVoximplantAccountById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db.select().from(voximplantAccounts).where(eq(voximplantAccounts.id, id));
  return account;
}

export async function updateVoximplantAccount(id: number, data: Partial<InsertVoximplantAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(voximplantAccounts).set(data).where(eq(voximplantAccounts.id, id));
}

export async function deleteVoximplantAccount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(voximplantAccounts).where(eq(voximplantAccounts.id, id));
}

// ============================================================================
// Voximplant Applications
// ============================================================================

export async function createVoximplantApplication(data: InsertVoximplantApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [application] = await db.insert(voximplantApplications).values(data);
  return application;
}

export async function getVoximplantApplicationsByAccount(voximplantAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(voximplantApplications)
    .where(eq(voximplantApplications.voximplantAccountId, voximplantAccountId))
    .orderBy(desc(voximplantApplications.createdAt));
}

export async function getVoximplantApplicationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [application] = await db.select().from(voximplantApplications)
    .where(eq(voximplantApplications.id, id));
  return application;
}

export async function updateVoximplantApplication(id: number, data: Partial<InsertVoximplantApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(voximplantApplications).set(data).where(eq(voximplantApplications.id, id));
}

export async function deleteVoximplantApplication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(voximplantApplications).where(eq(voximplantApplications.id, id));
}

// ============================================================================
// Voximplant Calls
// ============================================================================

export async function createVoximplantCall(data: InsertVoximplantCall) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [call] = await db.insert(voximplantCalls).values(data);
  return call;
}

export async function getVoximplantCallsByApplication(
  applicationId: number,
  params?: {
    limit?: number;
    offset?: number;
    startDate?: number; // Unix timestamp
    endDate?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(voximplantCalls.applicationId, applicationId)];

  if (params?.startDate && params?.endDate) {
    conditions.push(
      gte(voximplantCalls.startTime, params.startDate),
      lte(voximplantCalls.startTime, params.endDate)
    );
  }

  let query = db.select().from(voximplantCalls)
    .where(and(...conditions))
    .orderBy(desc(voximplantCalls.startTime));

  if (params?.limit) {
    query = query.limit(params.limit) as any;
  }

  if (params?.offset) {
    query = query.offset(params.offset) as any;
  }

  return query;
}

export async function getVoximplantCallById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [call] = await db.select().from(voximplantCalls)
    .where(eq(voximplantCalls.id, id));
  return call;
}

export async function getVoximplantCallByCallId(callId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [call] = await db.select().from(voximplantCalls)
    .where(eq(voximplantCalls.callId, callId));
  return call;
}

export async function updateVoximplantCall(id: number, data: Partial<InsertVoximplantCall>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(voximplantCalls).set(data).where(eq(voximplantCalls.id, id));
}

// ============================================================================
// Voximplant Transcripts
// ============================================================================

export async function createVoximplantTranscript(data: InsertVoximplantTranscript) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [transcript] = await db.insert(voximplantTranscripts).values(data);
  return transcript;
}

export async function getVoximplantTranscriptByCallId(callId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [transcript] = await db.select().from(voximplantTranscripts)
    .where(eq(voximplantTranscripts.callId, callId));
  return transcript;
}

export async function getVoximplantTranscriptByConversationId(conversationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [transcript] = await db.select().from(voximplantTranscripts)
    .where(eq(voximplantTranscripts.conversationId, conversationId));
  return transcript;
}

// ============================================================================
// Statistics
// ============================================================================

export async function getVoximplantCallStats(applicationId: number, startDate?: number, endDate?: number) {
  const calls = await getVoximplantCallsByApplication(applicationId, {
    startDate,
    endDate,
  });

  const totalCalls = calls.length;
  const answeredCalls = calls.filter((c: any) => c.status === 'answered').length;
  const failedCalls = calls.filter((c: any) => c.status === 'failed').length;
  const totalDuration = calls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0);
  const totalCost = calls.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  return {
    totalCalls,
    answeredCalls,
    failedCalls,
    successRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
    totalDuration,
    avgDuration,
    totalCost,
  };
}
