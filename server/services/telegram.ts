import TelegramBot from 'node-telegram-bot-api';
import { getSetting } from '../db';

let bot: TelegramBot | null = null;

/**
 * Initialize Telegram bot with token from database
 */
export async function initTelegramBot() {
  const token = await getSetting('telegram_bot_token');
  if (!token) {
    console.warn('[Telegram] Bot token not configured');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: false });
    console.log('[Telegram] Bot initialized successfully');
    return bot;
  } catch (error) {
    console.error('[Telegram] Failed to initialize bot:', error);
    return null;
  }
}

/**
 * Send call recording and transcript to Telegram
 */
export async function sendCallNotification(params: {
  phoneNumber: string;
  callTime: Date;
  transcript: string;
  audioBuffer?: Buffer | null;
  duration?: number;
}) {
  const chatId = await getSetting('telegram_chat_id');
  if (!chatId) {
    console.warn('[Telegram] Chat ID not configured');
    return false;
  }

  if (!bot) {
    await initTelegramBot();
    if (!bot) {
      console.error('[Telegram] Bot not initialized');
      return false;
    }
  }

  try {
    // Format message
    const timeStr = params.callTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });

    const durationStr = params.duration 
      ? `\n⏱ Duration: ${Math.floor(params.duration / 60)}:${String(params.duration % 60).padStart(2, '0')}`
      : '';

    const message = `📞 *New Call Recording*\n\n` +
      `📱 Phone: \`${params.phoneNumber}\`\n` +
      `🕐 Time: ${timeStr}${durationStr}\n\n` +
      `📝 *Transcript:*\n${params.transcript || 'No transcript available'}`;

    // Send message
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    // Send audio if available
    if (params.audioBuffer) {
      try {
        await bot.sendAudio(chatId, params.audioBuffer, {
          caption: `🎙 Recording for ${params.phoneNumber}`
        });
      } catch (audioError) {
        console.error('[Telegram] Failed to send audio:', audioError);
        // Continue even if audio fails
      }
    }

    console.log(`[Telegram] Notification sent for ${params.phoneNumber}`);
    return true;
  } catch (error) {
    console.error('[Telegram] Failed to send notification:', error);
    return false;
  }
}

/**
 * Test Telegram bot connection
 */
export async function testTelegramBot(): Promise<{ success: boolean; message: string }> {
  const chatId = await getSetting('telegram_chat_id');
  if (!chatId) {
    return { success: false, message: 'Chat ID not configured' };
  }

  if (!bot) {
    await initTelegramBot();
    if (!bot) {
      return { success: false, message: 'Failed to initialize bot' };
    }
  }

  try {
    await bot.sendMessage(chatId, '✅ Telegram bot connection test successful!');
    return { success: true, message: 'Test message sent successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to send test message' };
  }
}
