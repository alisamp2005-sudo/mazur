import { describe, it, expect, beforeEach } from 'vitest';
import { operatorAvailability } from './services/operator-availability';

describe('Operator Availability Service', () => {
  beforeEach(() => {
    // Reset state before each test
    operatorAvailability.reset();
  });

  it('should start with all operators available', () => {
    const status = operatorAvailability.getStatus();
    expect(status.totalOperators).toBe(4);
    expect(status.availableOperators).toBe(4);
    expect(status.busyOperators).toBe(0);
    expect(status.isAnyAvailable).toBe(true);
  });

  it('should register a transfer and mark operator as busy', () => {
    operatorAvailability.registerTransfer('call-123');
    
    const status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(1);
    expect(status.availableOperators).toBe(3);
    expect(status.isAnyAvailable).toBe(true);
  });

  it('should mark all operators as busy when 4 transfers registered', () => {
    operatorAvailability.registerTransfer('call-1');
    operatorAvailability.registerTransfer('call-2');
    operatorAvailability.registerTransfer('call-3');
    operatorAvailability.registerTransfer('call-4');
    
    const status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(4);
    expect(status.availableOperators).toBe(0);
    expect(status.isAnyAvailable).toBe(false);
    expect(operatorAvailability.isAvailable()).toBe(false);
  });

  it('should complete a transfer and free up operator', () => {
    operatorAvailability.registerTransfer('call-1');
    operatorAvailability.registerTransfer('call-2');
    
    let status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(2);
    
    operatorAvailability.completeTransfer('call-1');
    
    status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(1);
    expect(status.availableOperators).toBe(3);
  });

  it('should handle completing non-existent transfer gracefully', () => {
    operatorAvailability.completeTransfer('non-existent-call');
    
    const status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(0);
    expect(status.availableOperators).toBe(4);
  });

  it('should manually set operator as busy', () => {
    operatorAvailability.setOperatorBusy('1000');
    
    const status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(1);
    expect(status.availableOperators).toBe(3);
  });

  it('should manually set operator as available', () => {
    operatorAvailability.setOperatorBusy('1000');
    operatorAvailability.setOperatorBusy('2000');
    
    let status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(2);
    
    operatorAvailability.setOperatorAvailable('1000');
    
    status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(1);
    expect(status.availableOperators).toBe(3);
  });

  it('should reset all operator statuses', () => {
    operatorAvailability.registerTransfer('call-1');
    operatorAvailability.registerTransfer('call-2');
    operatorAvailability.setOperatorBusy('1000');
    
    let status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(3);
    
    operatorAvailability.reset();
    
    status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(0);
    expect(status.availableOperators).toBe(4);
    expect(status.isAnyAvailable).toBe(true);
  });

  it('should return correct available count', () => {
    expect(operatorAvailability.getAvailableCount()).toBe(4);
    
    operatorAvailability.registerTransfer('call-1');
    expect(operatorAvailability.getAvailableCount()).toBe(3);
    
    operatorAvailability.registerTransfer('call-2');
    expect(operatorAvailability.getAvailableCount()).toBe(2);
    
    operatorAvailability.completeTransfer('call-1');
    expect(operatorAvailability.getAvailableCount()).toBe(3);
  });

  it('should handle edge case of more than 4 busy operators', () => {
    // Register more than 4 transfers (shouldn't happen in practice)
    operatorAvailability.registerTransfer('call-1');
    operatorAvailability.registerTransfer('call-2');
    operatorAvailability.registerTransfer('call-3');
    operatorAvailability.registerTransfer('call-4');
    operatorAvailability.registerTransfer('call-5');
    
    const status = operatorAvailability.getStatus();
    expect(status.busyOperators).toBe(5);
    expect(status.availableOperators).toBe(0); // Should not go negative
    expect(status.isAnyAvailable).toBe(false);
  });
});
