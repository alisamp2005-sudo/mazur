import { operatorAvailability } from './operator-availability';
import { getQueueProcessor } from '../queueProcessor';

/**
 * Integrated Queue Manager
 * 
 * Automatically pauses/resumes batch calls based on operator availability:
 * - When all operators busy → pause new calls
 * - When operator becomes available → resume calls
 * - Monitors operator status every 10 seconds
 */

class QueueManager {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITOR_INTERVAL = 10000; // 10 seconds
  private isActive = false;
  private lastOperatorStatus: boolean = true; // true = available

  /**
   * Start automatic queue management
   */
  start(): void {
    if (this.isActive) {
      console.log('[QueueManager] Already active');
      return;
    }

    this.isActive = true;
    console.log('[QueueManager] Started automatic queue management');

    // Initial check
    this.checkAndManageQueue();

    // Start monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkAndManageQueue();
    }, this.MONITOR_INTERVAL);
  }

  /**
   * Stop automatic queue management
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[QueueManager] Stopped automatic queue management');
  }

  /**
   * Check operator availability and manage queue accordingly
   */
  private checkAndManageQueue(): void {
    const processor = getQueueProcessor();
    if (!processor) {
      console.warn('[QueueManager] Queue processor not initialized');
      return;
    }

    const status = operatorAvailability.getStatus();
    const anyAvailable = status.isAnyAvailable;

    // State changed from available to all busy
    if (this.lastOperatorStatus && !anyAvailable) {
      console.log('[QueueManager] All operators busy → PAUSING queue');
      processor.pause();
      this.lastOperatorStatus = false;
    }

    // State changed from all busy to available
    if (!this.lastOperatorStatus && anyAvailable) {
      console.log(`[QueueManager] ${status.availableOperators} operator(s) available → RESUMING queue`);
      processor.resume();
      this.lastOperatorStatus = true;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const processor = getQueueProcessor();
    const operatorStatus = operatorAvailability.getStatus();

    return {
      isActive: this.isActive,
      operatorStatus,
      queueStatus: processor ? processor.getStatus() : null,
    };
  }

  /**
   * Manually trigger queue check
   */
  triggerCheck(): void {
    if (this.isActive) {
      this.checkAndManageQueue();
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
