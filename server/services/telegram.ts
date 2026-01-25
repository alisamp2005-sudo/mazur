import axios from 'axios';

export interface TelegramMessage {
  chatId: string;
  text: string;
  audioUrl?: string;
  audioFilename?: string;
}

/**
 * Send text message to Telegram
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    return true;
  } catch (error: any) {
    console.error('[Telegram] Failed to send message:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send audio file to Telegram
 */
export async function sendTelegramAudio(
  botToken: string,
  chatId: string,
  audioUrl: string,
  caption?: string
): Promise<boolean> {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendAudio`, {
      chat_id: chatId,
      audio: audioUrl,
      caption,
      parse_mode: 'HTML',
    });
    return true;
  } catch (error: any) {
    console.error('[Telegram] Failed to send audio:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send call recording with transcript to Telegram
 */
export async function sendCallRecordingToTelegram(
  botToken: string,
  chatId: string,
  options: {
    callId: number;
    phoneNumber: string;
    duration?: number;
    startTime?: number;
    audioUrl?: string;
    transcript?: Array<{ role: 'user' | 'agent'; message: string; timeInCallSecs: number }>;
  }
): Promise<boolean> {
  try {
    // Format transcript
    let transcriptText = '';
    if (options.transcript && options.transcript.length > 0) {
      transcriptText = '\n\n📝 <b>Transcript:</b>\n\n';
      options.transcript.forEach((item) => {
        const speaker = item.role === 'agent' ? '🤖 AI Agent' : '👤 Client';
        const time = formatTime(item.timeInCallSecs);
        transcriptText += `${speaker} [${time}]:\n${item.message}\n\n`;
      });
    }

    // Format message
    const date = options.startTime ? new Date(options.startTime * 1000).toLocaleString() : 'Unknown';
    const duration = options.duration ? formatDuration(options.duration) : 'N/A';
    
    const message = `
📞 <b>New Call Recording</b>

📱 Phone: <code>${options.phoneNumber}</code>
🕐 Date: ${date}
⏱ Duration: ${duration}
🆔 Call ID: ${options.callId}${transcriptText}
    `.trim();

    // Send message
    await sendTelegramMessage(botToken, chatId, message);

    // Send audio if available
    if (options.audioUrl) {
      await sendTelegramAudio(botToken, chatId, options.audioUrl, `Call recording - ${options.phoneNumber}`);
    }

    return true;
  } catch (error: any) {
    console.error('[Telegram] Failed to send call recording:', error);
    return false;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
