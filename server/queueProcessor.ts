import * as db from './db';
import { initiateOutboundCall } from './elevenlabs';

/**
 * Queue processor that handles parallel outbound calls
 * Processes up to MAX_CONCURRENT_CALLS at a time
 */
export class QueueProcessor {
  private isRunning: boolean = false;
  private activeWorkers: number = 0;
  private maxConcurrentCalls: number = 3; // Default to 3, can be changed
  private readonly POLL_INTERVAL_MS = 5000; // Check queue every 5 seconds
  private pollTimer: NodeJS.Timeout | null = null;
  private readonly MAX_ALLOWED_CONCURRENT = 15; // Hard limit

  constructor(private apiKey: string) {}

  /**
   * Start the queue processor
   */
  start() {
    if (this.isRunning) {
      console.log('[QueueProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[QueueProcessor] Started');
    this.processQueue();
  }

  /**
   * Stop the queue processor
   */
  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[QueueProcessor] Stopped');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeWorkers: this.activeWorkers,
      maxConcurrent: this.maxConcurrentCalls,
      maxAllowed: this.MAX_ALLOWED_CONCURRENT,
    };
  }

  /**
   * Set max concurrent calls (1-15)
   */
  setMaxConcurrent(max: number) {
    if (max < 1 || max > this.MAX_ALLOWED_CONCURRENT) {
      throw new Error(`Max concurrent calls must be between 1 and ${this.MAX_ALLOWED_CONCURRENT}`);
    }
    this.maxConcurrentCalls = max;
    console.log(`[QueueProcessor] Max concurrent calls set to ${max}`);
  }

  /**
   * Main queue processing loop
   */
  private async processQueue() {
    if (!this.isRunning) return;

    try {
      // Check if we can process more items
      const availableSlots = this.maxConcurrentCalls - this.activeWorkers;
      
      if (availableSlots > 0) {
        // Get next items from queue
        const items = await db.getNextQueueItems(availableSlots);
        
        // Process each item in parallel
        for (const item of items) {
          this.processQueueItem(item.id).catch(error => {
            console.error(`[QueueProcessor] Error processing item ${item.id}:`, error);
          });
        }
      }
    } catch (error) {
      console.error('[QueueProcessor] Error in processQueue:', error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.processQueue(), this.POLL_INTERVAL_MS);
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(queueItemId: number) {
    this.activeWorkers++;

    try {
      // Get queue item
      const items = await db.getQueueItems();
      const item = items.find(i => i.id === queueItemId);
      
      if (!item) {
        console.error(`[QueueProcessor] Queue item ${queueItemId} not found`);
        return;
      }

      // Update status to processing
      await db.updateQueueItem(queueItemId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Get agent and phone number
      const agent = await db.getAgentById(item.agentId);
      const phoneNumber = await db.getPhoneNumberById(item.phoneNumberId);

      if (!agent) {
        throw new Error(`Agent ${item.agentId} not found`);
      }

      if (!phoneNumber) {
        throw new Error(`Phone number ${item.phoneNumberId} not found`);
      }

      console.log(`[QueueProcessor] Initiating call to ${phoneNumber.phone} via agent ${agent.name}`);

      // Initiate call via ElevenLabs
      const result = await initiateOutboundCall(this.apiKey, {
        agentId: agent.agentId,
        agentPhoneNumberId: agent.phoneNumberId,
        toNumber: phoneNumber.phone,
      });

      // Create call record
      const call = await db.createCall({
        conversationId: result.conversation_id || undefined,
        callSid: result.callSid || undefined,
        agentId: agent.id,
        phoneNumberId: phoneNumber.id,
        toNumber: phoneNumber.phone,
        status: 'initiated',
        hasAudio: false,
        hasTranscript: false,
      });

      // Update phone number status
      await db.updatePhoneNumber(phoneNumber.id, {
        status: 'calling',
        lastCallId: call.id,
        callCount: phoneNumber.callCount + 1,
      });

      // Mark queue item as completed
      await db.updateQueueItem(queueItemId, {
        status: 'completed',
        completedAt: new Date(),
      });

      console.log(`[QueueProcessor] Call initiated successfully: ${result.conversation_id}`);
    } catch (error: any) {
      console.error(`[QueueProcessor] Failed to process queue item ${queueItemId}:`, error);

      // Get current item to check retry count
      const items = await db.getQueueItems();
      const item = items.find(i => i.id === queueItemId);

      if (item) {
        const newRetryCount = item.retryCount + 1;
        
        if (newRetryCount >= item.maxRetries) {
          // Max retries reached, mark as failed
          await db.updateQueueItem(queueItemId, {
            status: 'failed',
            retryCount: newRetryCount,
            errorMessage: error.message,
            completedAt: new Date(),
          });

          // Update phone number status
          await db.updatePhoneNumber(item.phoneNumberId, {
            status: 'failed',
          });
        } else {
          // Retry later
          await db.updateQueueItem(queueItemId, {
            status: 'waiting',
            retryCount: newRetryCount,
            errorMessage: error.message,
          });
        }
      }
    } finally {
      this.activeWorkers--;
    }
  }
}

// Global queue processor instance
let queueProcessor: QueueProcessor | null = null;

/**
 * Initialize the queue processor
 */
export function initQueueProcessor(apiKey: string) {
  if (!queueProcessor) {
    queueProcessor = new QueueProcessor(apiKey);
  }
  return queueProcessor;
}

/**
 * Get the queue processor instance
 */
export function getQueueProcessor(): QueueProcessor | null {
  return queueProcessor;
}
