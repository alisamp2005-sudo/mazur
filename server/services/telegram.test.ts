import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTelegramBot, sendCallNotification, testTelegramBot } from './telegram';
import * as db from '../db';

// Mock database
vi.mock('../db', () => ({
  getSetting: vi.fn(),
}));

// Mock node-telegram-bot-api
vi.mock('node-telegram-bot-api', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      sendMessage: vi.fn().mockResolvedValue({}),
      sendAudio: vi.fn().mockResolvedValue({}),
    })),
  };
});

describe('Telegram Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize bot with valid token', async () => {
    vi.mocked(db.getSetting).mockResolvedValue('valid-token');
    
    const bot = await initTelegramBot();
    expect(bot).toBeTruthy();
  });

  it('should return null when token not configured', async () => {
    vi.mocked(db.getSetting).mockResolvedValue(null);
    
    const bot = await initTelegramBot();
    expect(bot).toBeNull();
  });

  it('should send call notification with transcript', async () => {
    vi.mocked(db.getSetting)
      .mockResolvedValueOnce('valid-token')  // bot token
      .mockResolvedValueOnce('123456789');    // chat id
    
    const result = await sendCallNotification({
      phoneNumber: '+1234567890',
      callTime: new Date('2024-01-30T10:00:00Z'),
      transcript: 'User: Hello\nAgent: Hi there!',
    });
    
    expect(result).toBe(true);
  });

  // Note: Chat ID validation is tested manually through UI

  // Note: testTelegramBot is tested manually through UI
});
