import * as db from '../db';
import type { Call, PhoneNumber } from '../../drizzle/schema';
import { getCallDetails, downloadCallAudio, formatTranscript } from './elevenlabs-api';
import { sendCallNotification } from './telegram';

let monitorInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Start monitoring calls for completion and send notifications
 */
export async function startCallMonitoring(elevenlabsApiKey: string, intervalMs: number = 30000) {
  if (monitorInterval) {
    console.log('[CallMonitor] Already running');
    return;
  }

  console.log(`[CallMonitor] Starting call monitoring (interval: ${intervalMs}ms)`);

  monitorInterval = setInterval(async () => {
    if (isProcessing) {
      return; // Skip if previous check is still running
    }

    isProcessing = true;
    try {
      await checkCompletedCalls(elevenlabsApiKey);
    } catch (error: any) {
      console.error('[CallMonitor] Error checking calls:', error.message);
    } finally {
      isProcessing = false;
    }
  }, intervalMs);

  // Run immediately on start
  setTimeout(() => checkCompletedCalls(elevenlabsApiKey), 1000);
}

/**
 * Stop call monitoring
 */
export function stopCallMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[CallMonitor] Stopped');
  }
}

/**
 * Check for completed calls and send notifications
 */
async function checkCompletedCalls(elevenlabsApiKey: string) {
  // Get calls that are initiated or in-progress
  const calls = await db.getCalls();
  const pendingCalls = calls.filter(call => 
    call.conversationId && 
    (call.status === 'initiated' || call.status === 'in-progress') &&
    !call.hasTranscript
  );

  if (pendingCalls.length === 0) {
    return;
  }

  console.log(`[CallMonitor] Checking ${pendingCalls.length} pending calls`);

  for (const call of pendingCalls) {
    try {
      // Fetch call details from ElevenLabs
      const details = await getCallDetails(call.conversationId!, elevenlabsApiKey);
      
      if (!details) {
        continue;
      }

      // Check if call is done
      if (details.status === 'done') {
        console.log(`[CallMonitor] Call ${call.conversationId} completed, sending notification`);

        // Update call record
        await db.updateCall(call.id, {
          status: 'done',
        });

        // Download audio if available
        let audioBuffer: Buffer | null = null;
        if (details.has_audio) {
          audioBuffer = await downloadCallAudio(call.conversationId!, elevenlabsApiKey);
        }

        // Get phone number for context
        const phoneNumber = call.phoneNumberId ? await db.getPhoneNumberById(call.phoneNumberId) : null;
        
        // Send Telegram notification
        await sendCallNotification({
          phoneNumber: phoneNumber?.phone || 'Unknown',
          callTime: call.createdAt,
          transcript: formatTranscript(details.transcript || []),
          audioBuffer,
        });

        console.log(`[CallMonitor] Notification sent for call ${call.conversationId}`);
      }
    } catch (error: any) {
      console.error(`[CallMonitor] Error processing call ${call.id}:`, error.message);
    }
  }
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus() {
  return {
    isRunning: monitorInterval !== null,
    isProcessing,
  };
}
