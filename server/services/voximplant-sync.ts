/**
 * Voximplant Sync Service
 * Handles fetching transcripts and audio recordings from ElevenLabs
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getConversationDetails, getConversationAudioUrl, downloadAudioFile } from '../elevenlabs-api';
import {
  getVoximplantCallById,
  updateVoximplantCall,
  createVoximplantTranscript,
  getVoximplantTranscriptByConversationId,
} from '../voximplant-db';
import { getVoximplantApplicationById } from '../voximplant-db';

/**
 * Fetch and save transcript for a call
 */
export async function syncCallTranscript(callId: number): Promise<boolean> {
  try {
    const call = await getVoximplantCallById(callId);
    if (!call || !call.conversationId) {
      console.error(`Call ${callId} not found or has no conversationId`);
      return false;
    }

    // Check if transcript already exists
    const existingTranscript = await getVoximplantTranscriptByConversationId(
      call.conversationId
    );
    if (existingTranscript) {
      console.log(`Transcript already exists for call ${callId}`);
      return true;
    }

    // Get application to retrieve ElevenLabs API key
    const application = await getVoximplantApplicationById(call.applicationId);
    if (!application) {
      console.error(`Application not found for call ${callId}`);
      return false;
    }

    // Fetch conversation details from ElevenLabs
    const conversation = await getConversationDetails(
      { apiKey: application.elevenlabsApiKey },
      call.conversationId
    );

    if (!conversation.transcript || conversation.transcript.length === 0) {
      console.log(`No transcript available for call ${callId}`);
      return false;
    }

    // Save transcript to database
    await createVoximplantTranscript({
      callId: call.id,
      conversationId: call.conversationId,
      transcriptData: JSON.stringify(conversation.transcript),
    });

    // Update call to mark it has transcript
    await updateVoximplantCall(call.id, {
      hasTranscript: true,
    });

    console.log(`Transcript synced successfully for call ${callId}`);
    return true;
  } catch (error) {
    console.error(`Failed to sync transcript for call ${callId}:`, error);
    return false;
  }
}

/**
 * Fetch and save audio recording for a call
 */
export async function syncCallAudio(callId: number): Promise<boolean> {
  try {
    const call = await getVoximplantCallById(callId);
    if (!call || !call.conversationId) {
      console.error(`Call ${callId} not found or has no conversationId`);
      return false;
    }

    // Skip if recording already exists
    if (call.recordingUrl) {
      console.log(`Recording already exists for call ${callId}`);
      return true;
    }

    // Get application to retrieve ElevenLabs API key
    const application = await getVoximplantApplicationById(call.applicationId);
    if (!application) {
      console.error(`Application not found for call ${callId}`);
      return false;
    }

    // Fetch audio URL from ElevenLabs
    const audioUrl = await getConversationAudioUrl(
      { apiKey: application.elevenlabsApiKey },
      call.conversationId
    );

    if (!audioUrl) {
      console.log(`No audio available for call ${callId}`);
      return false;
    }

    // Download audio file
    const audioBuffer = await downloadAudioFile(audioUrl);

    // Create recordings directory if it doesn't exist
    const recordingsDir = join(process.cwd(), 'recordings');
    await mkdir(recordingsDir, { recursive: true });

    // Save audio file
    const filename = `call_${call.id}_${call.conversationId}.mp3`;
    const filepath = join(recordingsDir, filename);
    await writeFile(filepath, audioBuffer);

    // Update call with recording URL (relative path)
    const recordingUrl = `/recordings/${filename}`;
    await updateVoximplantCall(call.id, {
      recordingUrl,
    });

    console.log(`Audio synced successfully for call ${callId}`);
    return true;
  } catch (error) {
    console.error(`Failed to sync audio for call ${callId}:`, error);
    return false;
  }
}

/**
 * Sync both transcript and audio for a call
 */
export async function syncCallData(callId: number): Promise<{
  transcriptSynced: boolean;
  audioSynced: boolean;
}> {
  const transcriptSynced = await syncCallTranscript(callId);
  const audioSynced = await syncCallAudio(callId);

  return {
    transcriptSynced,
    audioSynced,
  };
}

/**
 * Sync data for all calls that don't have transcript or audio
 */
export async function syncPendingCalls(applicationId: number): Promise<{
  totalProcessed: number;
  transcriptsSynced: number;
  audiosSynced: number;
}> {
  const { getVoximplantCallsByApplication } = await import('../voximplant-db');
  
  // Get all calls for the application
  const calls = await getVoximplantCallsByApplication(applicationId);

  let transcriptsSynced = 0;
  let audiosSynced = 0;

  for (const call of calls) {
    // Only process calls that have a conversationId
    if (!call.conversationId) continue;

    // Sync transcript if missing
    if (!call.hasTranscript) {
      const success = await syncCallTranscript(call.id);
      if (success) transcriptsSynced++;
    }

    // Sync audio if missing
    if (!call.recordingUrl) {
      const success = await syncCallAudio(call.id);
      if (success) audiosSynced++;
    }
  }

  return {
    totalProcessed: calls.length,
    transcriptsSynced,
    audiosSynced,
  };
}
