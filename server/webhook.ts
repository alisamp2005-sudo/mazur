import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import * as db from './db';
import { downloadAudioFile } from './elevenlabs';
import fs from 'fs/promises';
import path from 'path';
import { tcxMonitor } from './services/tcx-monitor';

const router = Router();

// Directory for storing audio files
const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'storage', 'audio');

/**
 * Verify HMAC signature from ElevenLabs
 */
function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Parse signature: t=timestamp,v0=hash
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const hashPart = parts.find(p => p.startsWith('v0='));

    if (!timestampPart || !hashPart) {
      console.error('[Webhook] Invalid signature format');
      return false;
    }

    const timestamp = timestampPart.substring(2);
    const expectedHash = hashPart.substring(3);

    // Validate timestamp (within 30 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    const tolerance = 30 * 60; // 30 minutes

    if (currentTime - signatureTime > tolerance) {
      console.error('[Webhook] Signature timestamp too old');
      return false;
    }

    // Compute HMAC
    const fullPayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayload);
    const computedHash = hmac.digest('hex');

    // Compare hashes
    return computedHash === expectedHash;
  } catch (error) {
    console.error('[Webhook] Error verifying signature:', error);
    return false;
  }
}

/**
 * Ensure audio storage directory exists
 */
async function ensureAudioStorageDir() {
  try {
    await fs.mkdir(AUDIO_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('[Webhook] Failed to create audio storage directory:', error);
  }
}

/**
 * Save audio file to local storage
 */
async function saveAudioFile(conversationId: string, audioBuffer: Buffer): Promise<string> {
  await ensureAudioStorageDir();
  
  const filename = `${conversationId}.mp3`;
  const filepath = path.join(AUDIO_STORAGE_DIR, filename);
  
  await fs.writeFile(filepath, audioBuffer);
  
  return filepath;
}

/**
 * Handle transcription webhook
 */
async function handleTranscriptionWebhook(data: any) {
  console.log('[Webhook] Processing transcription webhook:', data.conversation_id);

  const conversationId = data.conversation_id;
  if (!conversationId) {
    console.error('[Webhook] No conversation_id in payload');
    return;
  }

  // Find call by conversation_id
  const call = await db.getCallByConversationId(conversationId);
  if (!call) {
    console.error(`[Webhook] Call not found for conversation ${conversationId}`);
    return;
  }

  // Update call status and metadata
  await db.updateCall(call.id, {
    status: data.status || call.status,
    startTime: data.metadata?.start_time_unix_secs,
    duration: data.metadata?.call_duration_secs,
    hasTranscript: data.transcript && data.transcript.length > 0,
    metadata: JSON.stringify(data.metadata || {}),
  });

  // Save transcripts
  if (data.transcript && Array.isArray(data.transcript)) {
    const transcripts = data.transcript.map((item: any) => ({
      callId: call.id,
      role: item.role === 'user' ? 'user' : 'agent',
      message: item.message || '',
      timeInCallSecs: item.time_in_call_secs || 0,
    }));

    await db.createTranscripts(transcripts);
  }

  // Update phone number status
  if (call.phoneNumberId) {
    if (data.status === 'done') {
      await db.updatePhoneNumber(call.phoneNumberId, {
        status: 'completed',
      });
    } else if (data.status === 'failed') {
      await db.updatePhoneNumber(call.phoneNumberId, {
        status: 'failed',
      });
    }
  }

  console.log(`[Webhook] Transcription processed for call ${call.id}`);
}

/**
 * Handle audio webhook
 */
async function handleAudioWebhook(data: any) {
  console.log('[Webhook] Processing audio webhook:', data.conversation_id);

  const conversationId = data.conversation_id;
  if (!conversationId) {
    console.error('[Webhook] No conversation_id in payload');
    return;
  }

  // Find call by conversation_id
  const call = await db.getCallByConversationId(conversationId);
  if (!call) {
    console.error(`[Webhook] Call not found for conversation ${conversationId}`);
    return;
  }

  // Decode base64 audio
  if (data.audio_base64) {
    try {
      const audioBuffer = Buffer.from(data.audio_base64, 'base64');
      const audioPath = await saveAudioFile(conversationId, audioBuffer);

      // Update call with audio info
      await db.updateCall(call.id, {
        audioPath,
        hasAudio: true,
      });

      console.log(`[Webhook] Audio saved for call ${call.id} at ${audioPath}`);
    } catch (error) {
      console.error('[Webhook] Failed to save audio:', error);
    }
  }
}

/**
 * Handle call initiation failure webhook
 */
async function handleCallInitiationFailure(data: any) {
  console.log('[Webhook] Processing call initiation failure:', data.conversation_id);

  const conversationId = data.conversation_id;
  if (!conversationId) {
    console.error('[Webhook] No conversation_id in payload');
    return;
  }

  // Find call by conversation_id
  const call = await db.getCallByConversationId(conversationId);
  if (!call) {
    console.error(`[Webhook] Call not found for conversation ${conversationId}`);
    return;
  }

  // Update call status to failed
  await db.updateCall(call.id, {
    status: 'failed',
    metadata: JSON.stringify(data.metadata || {}),
  });

  // Update phone number status
  if (call.phoneNumberId) {
    await db.updatePhoneNumber(call.phoneNumberId, {
      status: 'failed',
    });
  }

  console.log(`[Webhook] Call ${call.id} marked as failed`);
}

/**
 * Main webhook endpoint
 */
router.post('/elevenlabs', async (req: Request, res: Response) => {
  try {
    // Get signature from header
    const signature = req.headers['elevenlabs-signature'] as string;
    if (!signature) {
      console.error('[Webhook] No signature header');
      return res.status(401).json({ error: 'No signature provided' });
    }

    // Get webhook secret from environment
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET || '';
    if (!secret) {
      console.error('[Webhook] No webhook secret configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get raw body
    const rawBody = JSON.stringify(req.body);

    // Verify signature
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      console.error('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook based on type
    const { type, data } = req.body;

    switch (type) {
      case 'post_call_transcription':
        await handleTranscriptionWebhook(data);
        break;

      case 'post_call_audio':
        await handleAudioWebhook(data);
        break;

      case 'call_initiation_failure':
        await handleCallInitiationFailure(data);
        break;

      default:
        console.warn(`[Webhook] Unknown webhook type: ${type}`);
    }

    // Return 200 to acknowledge receipt
    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 3CX Webhook endpoint for receiving operator status events
 * 
 * Expected payload from 3CX Call Flow:
 * {
 *   "event": "call_answered" | "call_ended",
 *   "extension": "1000",
 *   "callId": "...",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post('/3cx', async (req: Request, res: Response) => {
  try {
    const { event, extension, callId, timestamp } = req.body;

    console.log(`[3CX Webhook] Received event: ${event} for extension ${extension}`);

    // Update operator status based on event
    if (event === "call_answered") {
      // Operator picked up a call - mark as Busy
      tcxMonitor.updateOperatorStatus(extension, "Busy");
    } else if (event === "call_ended") {
      // Call ended - mark as Available
      tcxMonitor.updateOperatorStatus(extension, "Available");
    }

    res.json({ success: true, received: { event, extension, callId } });
  } catch (error) {
    console.error("[3CX Webhook] Error processing webhook:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Manual status update endpoint (for testing)
 */
router.post('/3cx/manual-update', async (req: Request, res: Response) => {
  try {
    const { extension, status } = req.body;

    if (!extension || !status) {
      return res.status(400).json({ success: false, error: "Missing extension or status" });
    }

    tcxMonitor.updateOperatorStatus(extension, status);
    
    res.json({ success: true, updated: { extension, status } });
  } catch (error) {
    console.error("[3CX Webhook] Error in manual update:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
