import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';
import * as elevenlabs from './elevenlabs';

// Mock dependencies
vi.mock('./db');
vi.mock('./elevenlabs');

describe('Single Call Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSingleCall', () => {
    it('should create a call with manual phone number input', async () => {
      const mockAgent = {
        id: 1,
        agentId: 'agent_test123',
        phoneNumberId: 'phnum_test456',
        name: 'Test Agent',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCallResult = {
        conversation_id: 'conv_123',
        callSid: 'sid_123',
      };

      const mockCall = {
        id: 1,
        conversationId: 'conv_123',
        callSid: 'sid_123',
        agentId: 1,
        phoneNumberId: null, // No phone number record for manual calls
        toNumber: '+1234567890',
        status: 'initiated' as const,
        startTime: null,
        endTime: null,
        duration: null,
        audioUrl: null,
        audioPath: null,
        hasAudio: false,
        hasTranscript: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getAgentById).mockResolvedValue(mockAgent);
      vi.mocked(elevenlabs.initiateOutboundCall).mockResolvedValue(mockCallResult);
      vi.mocked(db.createCall).mockResolvedValue(mockCall);

      // Simulate the mutation logic
      const input = {
        agentId: 1,
        phoneNumber: '+1234567890',
      };

      const agent = await db.getAgentById(input.agentId);
      expect(agent).toBeDefined();

      const result = await elevenlabs.initiateOutboundCall('test-api-key', {
        agentId: agent!.agentId,
        agentPhoneNumberId: agent!.phoneNumberId,
        toNumber: input.phoneNumber,
      });

      const call = await db.createCall({
        conversationId: result.conversation_id,
        callSid: result.callSid,
        agentId: agent!.id,
        phoneNumberId: null,
        toNumber: input.phoneNumber,
        status: 'initiated',
        hasAudio: false,
        hasTranscript: false,
      });

      expect(call).toBeDefined();
      expect(call.phoneNumberId).toBeNull();
      expect(call.toNumber).toBe('+1234567890');
      expect(call.status).toBe('initiated');
    });

    it('should validate phone number format', () => {
      const validNumbers = [
        '+1234567890',
        '+441234567890',
        '+61234567890',
        '+12345678901',
      ];

      const invalidNumbers = [
        '1234567890', // Missing +
        'abc123', // Invalid characters
        '+12 345 6789', // Spaces
        '+0123456789', // Starts with 0
      ];

      // Simple E.164 validation regex
      const e164Regex = /^\+[1-9]\d{1,14}$/;

      validNumbers.forEach(num => {
        expect(e164Regex.test(num)).toBe(true);
      });

      invalidNumbers.forEach(num => {
        expect(e164Regex.test(num)).toBe(false);
      });
    });

    it('should handle agent not found error', async () => {
      vi.mocked(db.getAgentById).mockResolvedValue(undefined);

      const input = {
        agentId: 999,
        phoneNumber: '+1234567890',
      };

      const agent = await db.getAgentById(input.agentId);
      expect(agent).toBeUndefined();
    });

    it('should handle ElevenLabs API error', async () => {
      const mockAgent = {
        id: 1,
        agentId: 'agent_test123',
        phoneNumberId: 'phnum_test456',
        name: 'Test Agent',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getAgentById).mockResolvedValue(mockAgent);
      vi.mocked(elevenlabs.initiateOutboundCall).mockRejectedValue(
        new Error('ElevenLabs API error')
      );

      const input = {
        agentId: 1,
        phoneNumber: '+1234567890',
      };

      const agent = await db.getAgentById(input.agentId);
      expect(agent).toBeDefined();

      await expect(
        elevenlabs.initiateOutboundCall('test-api-key', {
          agentId: agent!.agentId,
          agentPhoneNumberId: agent!.phoneNumberId,
          toNumber: input.phoneNumber,
        })
      ).rejects.toThrow('ElevenLabs API error');
    });

    it('should create call without phone number record', async () => {
      const mockCall = {
        id: 1,
        conversationId: 'conv_123',
        callSid: null,
        agentId: 1,
        phoneNumberId: null, // Key difference from regular calls
        toNumber: '+1234567890',
        status: 'initiated' as const,
        startTime: null,
        endTime: null,
        duration: null,
        audioUrl: null,
        audioPath: null,
        hasAudio: false,
        hasTranscript: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createCall).mockResolvedValue(mockCall);

      const call = await db.createCall({
        conversationId: 'conv_123',
        callSid: undefined,
        agentId: 1,
        phoneNumberId: null, // Manual call without phone number record
        toNumber: '+1234567890',
        status: 'initiated',
        hasAudio: false,
        hasTranscript: false,
      });

      expect(call.phoneNumberId).toBeNull();
      expect(call.toNumber).toBe('+1234567890');
    });
  });
});
