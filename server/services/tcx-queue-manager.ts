/**
 * 3CX Integrated Queue Manager
 * 
 * Automatically manages batch call queue based on real-time 3CX operator status:
 * - Polls 3CX /xapi/v1/ActiveCalls every 10 seconds
 * - Pauses queue when all operators (1000, 2000, 3000, 4000) are busy
 * - Resumes queue when any operator becomes available
 */

import { startPolling, stopPolling, isAnyExtensionAvailable, getExtensionStatuses } from './tcx-polling';
import { getQueueProcessor } from '../queueProcessor';

class TcxQueueManager {
  private isActive = false;
  private lastAvailabilityStatus = true; // true = at least one operator available

  /**
   * Start automatic queue management with 3CX polling
   */
  start(): void {
    if (this.isActive) {
      console.log('[TcxQueueManager] Already active');
      return;
    }

    this.isActive = true;
    console.log('[TcxQueueManager] Starting 3CX-based queue management');

    // Start 3CX polling with status change callback
    startPolling((extension: string, isBusy: boolean) => {
      console.log(`[TcxQueueManager] Extension ${extension} is now ${isBusy ? 'BUSY' : 'AVAILABLE'}`);
      this.checkAndManageQueue();
    });

    // Initial check
    this.checkAndManageQueue();
  }

  /**
   * Stop automatic queue management
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    stopPolling();
    console.log('[TcxQueueManager] Stopped 3CX-based queue management');
  }

  /**
   * Check operator availability and manage queue
   */
  private checkAndManageQueue(): void {
    const processor = getQueueProcessor();
    if (!processor) {
      console.warn('[TcxQueueManager] Queue processor not initialized');
      return;
    }

    const anyAvailable = isAnyExtensionAvailable();

    // State changed: available → all busy
    if (this.lastAvailabilityStatus && !anyAvailable) {
      console.log('[TcxQueueManager] ⚠️ All operators BUSY → PAUSING queue');
      processor.pause();
      this.lastAvailabilityStatus = false;
    }

    // State changed: all busy → available
    if (!this.lastAvailabilityStatus && anyAvailable) {
      const statuses = getExtensionStatuses();
      const availableCount = Object.values(statuses).filter(busy => !busy).length;
      console.log(`[TcxQueueManager] ✅ ${availableCount} operator(s) AVAILABLE → RESUMING queue`);
      processor.resume();
      this.lastAvailabilityStatus = true;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const processor = getQueueProcessor();
    const extensionStatuses = getExtensionStatuses();
    const anyAvailable = isAnyExtensionAvailable();
    const availableCount = Object.values(extensionStatuses).filter(busy => !busy).length;
    const busyCount = Object.values(extensionStatuses).filter(busy => busy).length;

    return {
      isActive: this.isActive,
      operators: {
        total: 4,
        available: availableCount,
        busy: busyCount,
        extensions: extensionStatuses,
      },
      queueStatus: processor ? processor.getStatus() : null,
      autoManagement: {
        enabled: this.isActive,
        lastStatus: this.lastAvailabilityStatus ? 'available' : 'all_busy',
      },
    };
  }

  /**
   * Check if manager is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

// Export singleton instance
export const tcxQueueManager = new TcxQueueManager();
