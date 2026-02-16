import { tcxMonitor } from "./tcx-monitor";
import { getQueueProcessor } from "../queueProcessor";

/**
 * Automatic queue manager that pauses/resumes queue based on operator availability
 */
class AutoQueueManager {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
  private lastState: "paused" | "active" = "active";

  async start() {
    if (this.checkInterval) {
      console.log("[AutoQueueManager] Already running");
      return;
    }

    // Start TCX monitoring first
    await tcxMonitor.startMonitoring();

    // Start checking operator status
    this.checkInterval = setInterval(() => {
      this.checkAndManageQueue();
    }, this.CHECK_INTERVAL_MS);

    console.log("[AutoQueueManager] Started automatic queue management");
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    tcxMonitor.stopMonitoring();
    console.log("[AutoQueueManager] Stopped");
  }

  private async checkAndManageQueue() {
    try {
      const processor = getQueueProcessor();
      if (!processor) {
        console.log("[AutoQueueManager] Queue processor not initialized");
        return;
      }

      const allBusy = tcxMonitor.areAllOperatorsBusy();
      const anyAvailable = tcxMonitor.isAnyOperatorAvailable();

      // Get current queue status
      const queueStatus = processor.getStatus();

      // Decision logic
      if (allBusy && !queueStatus.isPaused) {
        // All operators busy → Pause queue
        console.log("[AutoQueueManager] All operators busy, pausing queue");
        processor.pause();
        this.lastState = "paused";
      } else if (anyAvailable && queueStatus.isPaused) {
        // At least one operator available → Resume queue
        console.log("[AutoQueueManager] Operator available, resuming queue");
        processor.resume();
        this.lastState = "active";
      }

      // Log status
      const statuses = tcxMonitor.getAllStatuses();
      console.log(
        `[AutoQueueManager] Status check - Queue: ${queueStatus.isPaused ? "PAUSED" : "ACTIVE"}, Operators: ${statuses.map((s) => `${s.extension}:${s.status}`).join(", ")}`
      );
    } catch (error) {
      console.error("[AutoQueueManager] Error in checkAndManageQueue:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.checkInterval !== null,
      lastState: this.lastState,
      operatorStatuses: tcxMonitor.getAllStatuses(),
    };
  }
}

export const autoQueueManager = new AutoQueueManager();
