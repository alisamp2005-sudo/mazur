/**
 * Operator Availability Service
 * 
 * Provides simple operator availability checking for ElevenLabs AI agents.
 * Since 3CX Professional doesn't provide real-time API access, we use a simple approach:
 * - Track active transfers to Ring Group 8000
 * - Assume max 4 operators (1000, 2000, 3000, 4000)
 * - Return availability based on active transfer count
 */

interface OperatorStatus {
  totalOperators: number;
  busyOperators: number;
  availableOperators: number;
  isAnyAvailable: boolean;
  lastChecked: Date;
}

class OperatorAvailabilityService {
  private readonly MAX_OPERATORS = 4;
  private activeTransfers: Set<string> = new Set(); // callId -> transfer timestamp
  private readonly TRANSFER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  /**
   * Register a new transfer to operators
   * Call this when AI transfers a call to Ring Group 8000
   */
  registerTransfer(callId: string): void {
    this.activeTransfers.add(callId);
    console.log(`[OperatorAvailability] Transfer registered: ${callId}, active: ${this.activeTransfers.size}`);
    
    // Auto-cleanup after timeout
    setTimeout(() => {
      this.completeTransfer(callId);
    }, this.TRANSFER_TIMEOUT);
  }

  /**
   * Mark transfer as complete
   * Call this when transfer is answered or failed
   */
  completeTransfer(callId: string): void {
    if (this.activeTransfers.has(callId)) {
      this.activeTransfers.delete(callId);
      console.log(`[OperatorAvailability] Transfer completed: ${callId}, active: ${this.activeTransfers.size}`);
    }
  }

  /**
   * Get current operator availability status
   */
  getStatus(): OperatorStatus {
    const busyOperators = this.activeTransfers.size;
    const availableOperators = Math.max(0, this.MAX_OPERATORS - busyOperators);

    return {
      totalOperators: this.MAX_OPERATORS,
      busyOperators,
      availableOperators,
      isAnyAvailable: availableOperators > 0,
      lastChecked: new Date(),
    };
  }

  /**
   * Check if operators are available (simple boolean)
   */
  isAvailable(): boolean {
    return this.activeTransfers.size < this.MAX_OPERATORS;
  }

  /**
   * Get number of available operators
   */
  getAvailableCount(): number {
    return Math.max(0, this.MAX_OPERATORS - this.activeTransfers.size);
  }

  /**
   * Manually set operator as busy (for webhook integration)
   */
  setOperatorBusy(operatorExtension: string): void {
    this.activeTransfers.add(`operator-${operatorExtension}`);
    console.log(`[OperatorAvailability] Operator ${operatorExtension} marked as busy`);
  }

  /**
   * Manually set operator as available (for webhook integration)
   */
  setOperatorAvailable(operatorExtension: string): void {
    this.activeTransfers.delete(`operator-${operatorExtension}`);
    console.log(`[OperatorAvailability] Operator ${operatorExtension} marked as available`);
  }

  /**
   * Reset all operator statuses
   */
  reset(): void {
    this.activeTransfers.clear();
    console.log("[OperatorAvailability] All operator statuses reset");
  }
}

// Export singleton instance
export const operatorAvailability = new OperatorAvailabilityService();
