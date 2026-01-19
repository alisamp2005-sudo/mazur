import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import * as db from './db';

const router = Router();

// Directory for storing audio files
const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'storage', 'audio');

/**
 * Stream audio file for a conversation
 */
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    // Find call by conversation ID
    const call = await db.getCallByConversationId(conversationId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (!call.audioPath) {
      return res.status(404).json({ error: 'Audio not available' });
    }

    // Check if file exists
    try {
      await fs.access(call.audioPath);
    } catch {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    // Get file stats
    const stats = await fs.stat(call.audioPath);
    const fileSize = stats.size;

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fileSize.toString());
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunksize.toString());

      // Stream the range
      const fileBuffer = await fs.readFile(call.audioPath);
      res.end(fileBuffer.slice(start, end + 1));
    } else {
      // Stream entire file
      const fileBuffer = await fs.readFile(call.audioPath);
      res.end(fileBuffer);
    }
  } catch (error) {
    console.error('[AudioServer] Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

export default router;
