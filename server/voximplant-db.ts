/**
 * Voximplant Database Operations
 * Direct MySQL queries for Voximplant data management
 */

import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'mazur',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ============================================================================
// Voximplant Accounts
// ============================================================================

export interface VoximplantAccount {
  id: number;
  userId: number;
  accountId: string;
  apiKey: string;
  accountName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function createVoximplantAccount(data: {
  userId: number;
  accountId: string;
  apiKey: string;
  accountName?: string;
  isActive: boolean;
}): Promise<VoximplantAccount> {
  const [result] = await pool.execute(
    `INSERT INTO voximplant_accounts (user_id, account_id, api_key, account_name, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.userId, data.accountId, data.apiKey, data.accountName || null, data.isActive]
  );
  
  const insertId = (result as any).insertId;
  return getVoximplantAccountById(insertId) as Promise<VoximplantAccount>;
}

export async function getVoximplantAccountsByUser(userId: number): Promise<VoximplantAccount[]> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_accounts WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows as VoximplantAccount[];
}

export async function getVoximplantAccountById(id: number): Promise<VoximplantAccount | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_accounts WHERE id = ?`,
    [id]
  );
  const accounts = rows as VoximplantAccount[];
  return accounts[0] || null;
}

export async function updateVoximplantAccount(id: number, data: {
  accountName?: string;
  isActive?: boolean;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.accountName !== undefined) {
    updates.push('account_name = ?');
    values.push(data.accountName);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(data.isActive);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.execute(
      `UPDATE voximplant_accounts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }
}

export async function deleteVoximplantAccount(id: number): Promise<void> {
  await pool.execute(`DELETE FROM voximplant_accounts WHERE id = ?`, [id]);
}

// ============================================================================
// Voximplant Applications
// ============================================================================

export interface VoximplantApplication {
  id: number;
  voximplantAccountId: number;
  voximplantApplicationId?: string;
  voximplantRuleId?: string;
  applicationName: string;
  elevenlabsApiKey: string;
  elevenlabsAgentId: string;
  scenarioCode?: string;
  phoneNumber?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createVoximplantApplication(data: {
  voximplantAccountId: number;
  voximplantApplicationId?: string;
  voximplantRuleId?: string;
  applicationName: string;
  elevenlabsApiKey: string;
  elevenlabsAgentId: string;
  scenarioCode?: string;
  phoneNumber?: string;
  status: string;
}): Promise<VoximplantApplication> {
  const [result] = await pool.execute(
    `INSERT INTO voximplant_applications 
     (voximplant_account_id, voximplant_application_id, voximplant_rule_id, application_name, 
      elevenlabs_api_key, elevenlabs_agent_id, scenario_code, phone_number, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.voximplantAccountId,
      data.voximplantApplicationId || null,
      data.voximplantRuleId || null,
      data.applicationName,
      data.elevenlabsApiKey,
      data.elevenlabsAgentId,
      data.scenarioCode || null,
      data.phoneNumber || null,
      data.status,
    ]
  );
  
  const insertId = (result as any).insertId;
  return getVoximplantApplicationById(insertId) as Promise<VoximplantApplication>;
}

export async function getVoximplantApplicationsByAccount(accountId: number): Promise<VoximplantApplication[]> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_applications WHERE voximplant_account_id = ? ORDER BY created_at DESC`,
    [accountId]
  );
  return rows as VoximplantApplication[];
}

export async function getVoximplantApplicationById(id: number): Promise<VoximplantApplication | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_applications WHERE id = ?`,
    [id]
  );
  const apps = rows as VoximplantApplication[];
  return apps[0] || null;
}

export async function updateVoximplantApplication(id: number, data: {
  applicationName?: string;
  phoneNumber?: string;
  status?: string;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.applicationName !== undefined) {
    updates.push('application_name = ?');
    values.push(data.applicationName);
  }
  if (data.phoneNumber !== undefined) {
    updates.push('phone_number = ?');
    values.push(data.phoneNumber);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.execute(
      `UPDATE voximplant_applications SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }
}

export async function deleteVoximplantApplication(id: number): Promise<void> {
  await pool.execute(`DELETE FROM voximplant_applications WHERE id = ?`, [id]);
}

// ============================================================================
// Call Campaigns
// ============================================================================

export interface CallCampaign {
  id: number;
  applicationId: number;
  campaignName: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  totalNumbers: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export async function createCallCampaign(data: {
  applicationId: number;
  campaignName: string;
  totalNumbers: number;
}): Promise<CallCampaign> {
  const [result] = await pool.execute(
    `INSERT INTO call_campaigns 
     (application_id, campaign_name, status, total_numbers, completed_calls, successful_calls, failed_calls, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, 0, 0, 0, NOW(), NOW())`,
    [data.applicationId, data.campaignName, data.totalNumbers]
  );
  
  const insertId = (result as any).insertId;
  return getCallCampaignById(insertId) as Promise<CallCampaign>;
}

export async function getCallCampaignsByApplication(applicationId: number): Promise<CallCampaign[]> {
  const [rows] = await pool.execute(
    `SELECT * FROM call_campaigns WHERE application_id = ? ORDER BY created_at DESC`,
    [applicationId]
  );
  return rows as CallCampaign[];
}

export async function getCallCampaignById(id: number): Promise<CallCampaign | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM call_campaigns WHERE id = ?`,
    [id]
  );
  const campaigns = rows as CallCampaign[];
  return campaigns[0] || null;
}

export async function updateCallCampaign(id: number, data: {
  status?: string;
  completedCalls?: number;
  successfulCalls?: number;
  failedCalls?: number;
  startedAt?: Date;
  completedAt?: Date;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.completedCalls !== undefined) {
    updates.push('completed_calls = ?');
    values.push(data.completedCalls);
  }
  if (data.successfulCalls !== undefined) {
    updates.push('successful_calls = ?');
    values.push(data.successfulCalls);
  }
  if (data.failedCalls !== undefined) {
    updates.push('failed_calls = ?');
    values.push(data.failedCalls);
  }
  if (data.startedAt !== undefined) {
    updates.push('started_at = ?');
    values.push(data.startedAt);
  }
  if (data.completedAt !== undefined) {
    updates.push('completed_at = ?');
    values.push(data.completedAt);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.execute(
      `UPDATE call_campaigns SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }
}

// ============================================================================
// Voximplant Calls
// ============================================================================

export interface VoximplantCall {
  id: number;
  applicationId: number;
  campaignId?: number;
  callSessionHistoryId: string;
  phoneNumber: string;
  callerId: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'ringing' | 'answered' | 'completed' | 'failed' | 'no_answer';
  duration?: number;
  cost?: number;
  startTime?: Date;
  endTime?: Date;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createVoximplantCall(data: {
  applicationId: number;
  campaignId?: number;
  callSessionHistoryId: string;
  phoneNumber: string;
  callerId: string;
  direction: 'inbound' | 'outbound';
  status: string;
}): Promise<VoximplantCall> {
  const [result] = await pool.execute(
    `INSERT INTO voximplant_calls 
     (application_id, campaign_id, call_session_history_id, phone_number, caller_id, direction, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.applicationId,
      data.campaignId || null,
      data.callSessionHistoryId,
      data.phoneNumber,
      data.callerId,
      data.direction,
      data.status,
    ]
  );
  
  const insertId = (result as any).insertId;
  return getVoximplantCallById(insertId) as Promise<VoximplantCall>;
}

export async function getVoximplantCallsByApplication(
  applicationId: number,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
    campaignId?: number;
  }
): Promise<VoximplantCall[]> {
  let query = `SELECT * FROM voximplant_calls WHERE application_id = ?`;
  const params: any[] = [applicationId];
  
  if (options?.campaignId) {
    query += ` AND campaign_id = ?`;
    params.push(options.campaignId);
  }
  
  if (options?.startDate) {
    query += ` AND created_at >= FROM_UNIXTIME(?)`;
    params.push(options.startDate);
  }
  
  if (options?.endDate) {
    query += ` AND created_at <= FROM_UNIXTIME(?)`;
    params.push(options.endDate);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
    
    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }
  }
  
  const [rows] = await pool.execute(query, params);
  return rows as VoximplantCall[];
}

export async function getVoximplantCallById(id: number): Promise<VoximplantCall | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_calls WHERE id = ?`,
    [id]
  );
  const calls = rows as VoximplantCall[];
  return calls[0] || null;
}

export async function updateVoximplantCall(id: number, data: {
  status?: string;
  duration?: number;
  cost?: number;
  startTime?: Date;
  endTime?: Date;
  recordingUrl?: string;
}): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.duration !== undefined) {
    updates.push('duration = ?');
    values.push(data.duration);
  }
  if (data.cost !== undefined) {
    updates.push('cost = ?');
    values.push(data.cost);
  }
  if (data.startTime !== undefined) {
    updates.push('start_time = ?');
    values.push(data.startTime);
  }
  if (data.endTime !== undefined) {
    updates.push('end_time = ?');
    values.push(data.endTime);
  }
  if (data.recordingUrl !== undefined) {
    updates.push('recording_url = ?');
    values.push(data.recordingUrl);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.execute(
      `UPDATE voximplant_calls SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }
}

// ============================================================================
// Call Transcripts
// ============================================================================

export interface VoximplantTranscript {
  id: number;
  callId: number;
  transcript: string;
  createdAt: Date;
}

export async function createVoximplantTranscript(data: {
  callId: number;
  transcript: string;
}): Promise<VoximplantTranscript> {
  const [result] = await pool.execute(
    `INSERT INTO voximplant_transcripts (call_id, transcript, created_at)
     VALUES (?, ?, NOW())`,
    [data.callId, data.transcript]
  );
  
  const insertId = (result as any).insertId;
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_transcripts WHERE id = ?`,
    [insertId]
  );
  return (rows as VoximplantTranscript[])[0];
}

export async function getVoximplantTranscriptByCallId(callId: number): Promise<VoximplantTranscript | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM voximplant_transcripts WHERE call_id = ?`,
    [callId]
  );
  const transcripts = rows as VoximplantTranscript[];
  return transcripts[0] || null;
}

// ============================================================================
// Statistics
// ============================================================================

export async function getVoximplantCallStats(
  applicationId: number,
  startDate?: number,
  endDate?: number
): Promise<{
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalDuration: number;
  totalCost: number;
  averageDuration: number;
}> {
  let query = `
    SELECT 
      COUNT(*) as totalCalls,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulCalls,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCalls,
      SUM(COALESCE(duration, 0)) as totalDuration,
      SUM(COALESCE(cost, 0)) as totalCost,
      AVG(COALESCE(duration, 0)) as averageDuration
    FROM voximplant_calls 
    WHERE application_id = ?
  `;
  
  const params: any[] = [applicationId];
  
  if (startDate) {
    query += ` AND created_at >= FROM_UNIXTIME(?)`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND created_at <= FROM_UNIXTIME(?)`;
    params.push(endDate);
  }
  
  const [rows] = await pool.execute(query, params);
  const stats = (rows as any[])[0];
  
  return {
    totalCalls: parseInt(stats.totalCalls) || 0,
    successfulCalls: parseInt(stats.successfulCalls) || 0,
    failedCalls: parseInt(stats.failedCalls) || 0,
    totalDuration: parseFloat(stats.totalDuration) || 0,
    totalCost: parseFloat(stats.totalCost) || 0,
    averageDuration: parseFloat(stats.averageDuration) || 0,
  };
}

export async function getCampaignStats(campaignId: number): Promise<{
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  pendingCalls: number;
  averageDuration: number;
  totalCost: number;
}> {
  const [rows] = await pool.execute(
    `SELECT 
      COUNT(*) as totalCalls,
      SUM(CASE WHEN status IN ('completed', 'answered') THEN 1 ELSE 0 END) as completedCalls,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successfulCalls,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCalls,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCalls,
      AVG(COALESCE(duration, 0)) as averageDuration,
      SUM(COALESCE(cost, 0)) as totalCost
    FROM voximplant_calls 
    WHERE campaign_id = ?`,
    [campaignId]
  );
  
  const stats = (rows as any[])[0];
  
  return {
    totalCalls: parseInt(stats.totalCalls) || 0,
    completedCalls: parseInt(stats.completedCalls) || 0,
    successfulCalls: parseInt(stats.successfulCalls) || 0,
    failedCalls: parseInt(stats.failedCalls) || 0,
    pendingCalls: parseInt(stats.pendingCalls) || 0,
    averageDuration: parseFloat(stats.averageDuration) || 0,
    totalCost: parseFloat(stats.totalCost) || 0,
  };
}
