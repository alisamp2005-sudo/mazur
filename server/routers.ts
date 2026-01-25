import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { parsePhoneNumberFile, isValidPhoneNumber } from "./fileParser";
import { initiateOutboundCall, getConversationDetails } from "./elevenlabs";
import { TRPCError } from "@trpc/server";
import { getQueueProcessor } from "./queueProcessor";
import { tcxMonitor } from "./services/tcx-monitor";
import { autoQueueManager } from './services/auto-queue-manager';
import { operatorAvailability } from './services/operator-availability';
import { queueManager } from './services/queue-manager';

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ Agent Management ============
  agents: router({
    list: protectedProcedure.query(async () => {
      return await db.getAgents();
    }),

    create: protectedProcedure
      .input(z.object({
        agentId: z.string().min(1, "Agent ID is required"),
        phoneNumberId: z.string().min(1, "Phone Number ID is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createAgent({
          agentId: input.agentId,
          phoneNumberId: input.phoneNumberId,
          name: input.name,
          description: input.description,
          isActive: true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        agentId: z.string().optional(),
        phoneNumberId: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAgent(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAgent(input.id);
        return { success: true };
      }),
  }),

  // ============ Phone Number Management ============
  phoneNumbers: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const numbers = await db.getPhoneNumbers(input.limit, input.offset);
        const total = await db.countPhoneNumbers();
        return { numbers, total };
      }),

    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Decode base64 to buffer
          const buffer = Buffer.from(input.base64Data, 'base64');
          
          // Parse file
          const parsed = parsePhoneNumberFile(buffer, input.filename);
          
          // Validate phone numbers
          const validNumbers = parsed.filter(p => isValidPhoneNumber(p.phone));
          const invalidCount = parsed.length - validNumbers.length;

          if (validNumbers.length === 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'No valid phone numbers found in file',
            });
          }

          // Insert into database
          const insertData = validNumbers.map(p => ({
            phone: p.phone,
            metadata: p.metadata ? JSON.stringify(p.metadata) : null,
            status: 'pending' as const,
            agentId: null,
            lastCallId: null,
            callCount: 0,
          }));

          await db.createPhoneNumbers(insertData);

          return {
            success: true,
            imported: validNumbers.length,
            invalid: invalidCount,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Failed to upload file',
          });
        }
      }),

    delete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.deletePhoneNumbers(input.ids);
        return { success: true };
      }),
  }),

  // ============ Call Management ============
  calls: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getCalls(input.limit, input.offset);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const call = await db.getCallById(input.id);
        if (!call) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Call not found',
          });
        }

        const transcripts = await db.getTranscriptsByCallId(call.id);
        return { call, transcripts };
      }),

    initiate: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        phoneNumberId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get agent and phone number
        const agent = await db.getAgentById(input.agentId);
        const phoneNumber = await db.getPhoneNumberById(input.phoneNumberId);

        if (!agent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        if (!phoneNumber) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Phone number not found',
          });
        }

        // TODO: Get API key from environment or user settings
        const apiKey = process.env.ELEVENLABS_API_KEY || '';
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'ElevenLabs API key not configured',
          });
        }

        try {
          // Initiate call via ElevenLabs
          const result = await initiateOutboundCall(apiKey, {
            agentId: agent.agentId,
            agentPhoneNumberId: agent.phoneNumberId,
            toNumber: phoneNumber.phone,
          });

          // Create call record
          const call = await db.createCall({
            conversationId: result.conversation_id || undefined,
            callSid: result.callSid || undefined,
            agentId: agent.id,
            phoneNumberId: phoneNumber.id,
            toNumber: phoneNumber.phone,
            status: 'initiated',
            hasAudio: false,
            hasTranscript: false,
          });

          // Update phone number status
          await db.updatePhoneNumber(phoneNumber.id, {
            status: 'calling',
            lastCallId: call.id,
            callCount: phoneNumber.callCount + 1,
          });

          return { success: true, call };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to initiate call',
          });
        }
      }),

    stats: protectedProcedure.query(async () => {
      return await db.getCallStats();
    }),

    // Create single call with manual phone number input
    createSingleCall: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        phoneNumber: z.string().min(1, "Phone number is required"),
      }))
      .mutation(async ({ input }) => {
        // Validate phone number format
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
          });
        }

        // Get agent
        const agent = await db.getAgentById(input.agentId);
        if (!agent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        // Check API key
        const apiKey = process.env.ELEVENLABS_API_KEY || '';
        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'ElevenLabs API key not configured',
          });
        }

        try {
          // Initiate call via ElevenLabs
          const result = await initiateOutboundCall(apiKey, {
            agentId: agent.agentId,
            agentPhoneNumberId: agent.phoneNumberId,
            toNumber: input.phoneNumber,
          });

          // Create call record (without phone number ID since it's manual input)
          const call = await db.createCall({
            conversationId: result.conversation_id || undefined,
            callSid: result.sip_call_id || result.callSid || undefined, // Support both SIP and Twilio
            agentId: agent.id,
            phoneNumberId: null, // No phone number record for manual calls
            toNumber: input.phoneNumber,
            status: 'initiated',
            hasAudio: false,
            hasTranscript: false,
          });

          return { success: true, call };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to initiate call',
          });
        }
      }),
  }),

  // ============ Call Queue Management ============
  queue: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['waiting', 'processing', 'completed', 'failed']).optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return await db.getQueueItems(input.status, input.limit);
      }),

    add: protectedProcedure
      .input(z.object({
        phoneNumberIds: z.array(z.number()),
        agentId: z.number(),
        priority: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const agent = await db.getAgentById(input.agentId);
        if (!agent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        // Add all phone numbers to queue
        const items = [];
        for (const phoneNumberId of input.phoneNumberIds) {
          const item = await db.addToQueue({
            phoneNumberId,
            agentId: input.agentId,
            status: 'waiting',
            priority: input.priority,
            retryCount: 0,
            maxRetries: 3,
          });
          items.push(item);
        }

        return { success: true, added: items.length };
      }),

    stats: protectedProcedure.query(async () => {
      return await db.getQueueStats();
    }),

    status: protectedProcedure.query(() => {
      const processor = getQueueProcessor();
      if (!processor) {
        return { isRunning: false, activeWorkers: 0, maxConcurrent: 3, maxAllowed: 15 };
      }
      return processor.getStatus();
    }),

    start: protectedProcedure.mutation(() => {
      const processor = getQueueProcessor();
      if (!processor) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Queue processor not initialized',
        });
      }
      processor.start();
      return { success: true, message: 'Queue processor started' };
    }),

    stop: protectedProcedure.mutation(() => {
      const processor = getQueueProcessor();
      if (!processor) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Queue processor not initialized',
        });
      }
      processor.stop();
      return { success: true, message: 'Queue processor stopped' };
    }),

    setMaxConcurrent: protectedProcedure
      .input(z.object({ max: z.number().min(1).max(15) }))
      .mutation(({ input }) => {
        const processor = getQueueProcessor();
        if (!processor) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Queue processor not initialized',
          });
        }
        processor.setMaxConcurrent(input.max);
        return { success: true, maxConcurrent: input.max };
      }),
  }),

  // ============ Call Quality Evaluation ============
  ratings: router({
    create: protectedProcedure
      .input(z.object({
        callId: z.number(),
        overallRating: z.number().min(1).max(5),
        clarityScore: z.number().min(1).max(5).optional(),
        engagementScore: z.number().min(1).max(5).optional(),
        objectiveAchieved: z.boolean().optional(),
        transferSuccessful: z.boolean().optional(),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createCallRating({
          ...input,
          evaluationType: 'manual',
          evaluatedBy: ctx.user?.openId || 'unknown',
        });
      }),

    get: protectedProcedure
      .input(z.object({ callId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCallRating(input.callId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        overallRating: z.number().min(1).max(5).optional(),
        clarityScore: z.number().min(1).max(5).optional(),
        engagementScore: z.number().min(1).max(5).optional(),
        objectiveAchieved: z.boolean().optional(),
        transferSuccessful: z.boolean().optional(),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCallRating(id, data);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ agentId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getCallRatingsStats(input.agentId);
      }),

    autoEvaluate: protectedProcedure
      .input(z.object({ callId: z.number() }))
      .mutation(async ({ input }) => {
        // Get call details and transcript
        const call = await db.getCallById(input.callId);
        if (!call) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Call not found',
          });
        }

        const transcripts = await db.getTranscriptsByCallId(input.callId);
        if (!transcripts || transcripts.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No transcript available for evaluation',
          });
        }

        // Build conversation text
        const conversationText = transcripts.map((t: any) => `${t.role}: ${t.message}`).join('\n');

        // Use LLM to evaluate call quality
        const { invokeLLM } = await import('./_core/llm');
        const evaluation = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `You are a call quality evaluator. Analyze the following phone conversation and provide:
1. Overall rating (1-5)
2. Clarity score (1-5) - How clear and understandable was the conversation?
3. Engagement score (1-5) - How engaged was the conversation?
4. Objective achieved (true/false) - Did the call achieve its intended purpose?
5. Brief feedback (2-3 sentences)

Respond in JSON format with keys: overallRating, clarityScore, engagementScore, objectiveAchieved, feedback`
            },
            {
              role: 'user',
              content: `Conversation:\n${conversationText}\n\nCall duration: ${call.duration || 0} seconds\nCall status: ${call.status}`
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'call_evaluation',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  overallRating: { type: 'integer', description: 'Overall rating 1-5' },
                  clarityScore: { type: 'integer', description: 'Clarity score 1-5' },
                  engagementScore: { type: 'integer', description: 'Engagement score 1-5' },
                  objectiveAchieved: { type: 'boolean', description: 'Whether objective was achieved' },
                  feedback: { type: 'string', description: 'Brief feedback' }
                },
                required: ['overallRating', 'clarityScore', 'engagementScore', 'objectiveAchieved', 'feedback'],
                additionalProperties: false
              }
            }
          }
        });

        const content = evaluation.choices[0].message.content;
        const result = JSON.parse(typeof content === 'string' ? content : '{}');

        // Save auto evaluation
        const rating = await db.createCallRating({
          callId: input.callId,
          overallRating: result.overallRating,
          clarityScore: result.clarityScore,
          engagementScore: result.engagementScore,
          objectiveAchieved: result.objectiveAchieved,
          feedback: result.feedback,
          evaluationType: 'auto',
          evaluatedBy: 'system',
          autoEvaluation: JSON.stringify(result),
        });

        return rating;
      }),
  }),

  // ============ Prompt Management ============
  prompts: router({
    list: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPromptVersions(input.agentId);
      }),

    create: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        promptText: z.string().min(1),
        firstMessage: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get latest version number
        const latestVersion = await db.getLatestPromptVersion(input.agentId);
        const newVersion = (latestVersion?.version || 0) + 1;

        return await db.createPromptVersion({
          agentId: input.agentId,
          version: newVersion,
          promptText: input.promptText,
          firstMessage: input.firstMessage,
          description: input.description,
          isActive: false,
          createdBy: ctx.user?.openId || 'unknown',
        });
      }),

    getActive: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActivePromptVersion(input.agentId);
      }),

    setActive: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        versionId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get the prompt version details
        const promptVersion = await db.getPromptVersionById(input.versionId);
        if (!promptVersion) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Prompt version not found',
          });
        }

        // Get the agent details to find elevenlabs_agent_id
        const agent = await db.getAgentById(input.agentId);
        if (!agent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        // Update in local database
        await db.setActivePromptVersion(input.agentId, input.versionId);

        // Sync with ElevenLabs if agent has agentId
        if (agent.agentId) {
          try {
            const { updateAgentPrompt } = await import('./elevenlabs-agent');
            await updateAgentPrompt({
              agentId: agent.agentId,
              prompt: promptVersion.promptText,
              firstMessage: promptVersion.firstMessage || undefined,
            });
            console.log(`[Prompt Sync] Successfully synced prompt version ${input.versionId} to ElevenLabs agent ${agent.agentId}`);
          } catch (error) {
            console.error('[Prompt Sync] Failed to sync with ElevenLabs:', error);
            // Don't throw - local update succeeded, just log the sync failure
            // User can manually update in ElevenLabs dashboard if needed
          }
        }

        return { success: true };
      }),

    compare: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        versionIds: z.array(z.number()).min(2).max(5),
      }))
      .query(async ({ input }) => {
        const versions = await db.getPromptVersions(input.agentId);
        const selectedVersions = versions.filter(v => input.versionIds.includes(v.id));

        // Get ratings for calls using each version
        // Note: This requires tracking which prompt version was used for each call
        // For now, return basic version info
        return selectedVersions.map(v => ({
          id: v.id,
          version: v.version,
          description: v.description,
          callCount: v.callCount,
          avgRating: v.avgRating ? v.avgRating / 100 : null,
          successRate: v.successRate ? v.successRate / 100 : null,
          createdAt: v.createdAt,
        }));
      }),
  }),

  // ============ 3CX Integration ============
  tcx: router({  
    getOperatorStatuses: protectedProcedure.query(async () => {
      return tcxMonitor.getAllStatuses();
    }),

    checkAllBusy: protectedProcedure.query(async () => {
      return {
        allBusy: tcxMonitor.areAllOperatorsBusy(),
        anyAvailable: tcxMonitor.isAnyOperatorAvailable(),
      };
    }),

    startMonitoring: protectedProcedure.mutation(async () => {
      await tcxMonitor.startMonitoring();
      return { success: true };
    }),

    stopMonitoring: protectedProcedure.mutation(async () => {
      tcxMonitor.stopMonitoring();
      return { success: true };
    }),
  }),

  // ============ Queue Control ============
  queueControl: router({
    pause: protectedProcedure.mutation(async () => {
      const processor = getQueueProcessor();
      if (!processor) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Queue processor not initialized' });
      processor.pause();
      return { success: true };
    }),

    resume: protectedProcedure.mutation(async () => {
      const processor = getQueueProcessor();
      if (!processor) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Queue processor not initialized' });
      processor.resume();
      return { success: true };
    }),

    startAutoManagement: protectedProcedure.mutation(async () => {
      await autoQueueManager.start();
      return { success: true };
    }),

    stopAutoManagement: protectedProcedure.mutation(async () => {
      autoQueueManager.stop();
      return { success: true };
    }),

    getAutoManagementStatus: protectedProcedure.query(async () => {
      return autoQueueManager.getStatus();
    }),
  }),

  // ============ Operator Availability (for ElevenLabs) ============
  operators: router({
    // Public endpoint for ElevenLabs AI agent to check availability
    checkAvailability: publicProcedure.query(async () => {
      return operatorAvailability.getStatus();
    }),

    // Register a transfer to operators
    registerTransfer: publicProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        operatorAvailability.registerTransfer(input.callId);
        return { success: true };
      }),

    // Complete a transfer
    completeTransfer: publicProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        operatorAvailability.completeTransfer(input.callId);
        return { success: true };
      }),

    // Admin endpoints
    getStatus: protectedProcedure.query(async () => {
      return operatorAvailability.getStatus();
    }),

    setOperatorBusy: protectedProcedure
      .input(z.object({ extension: z.string() }))
      .mutation(async ({ input }) => {
        operatorAvailability.setOperatorBusy(input.extension);
        return { success: true };
      }),

    setOperatorAvailable: protectedProcedure
      .input(z.object({ extension: z.string() }))
      .mutation(async ({ input }) => {
        operatorAvailability.setOperatorAvailable(input.extension);
        return { success: true };
      }),

    reset: protectedProcedure.mutation(async () => {
      operatorAvailability.reset();
      return { success: true };
    }),
  }),

  // ============ Integrated Queue Manager ============
  queueManager: router({
    start: protectedProcedure.mutation(async () => {
      queueManager.start();
      return { success: true };
    }),

    stop: protectedProcedure.mutation(async () => {
      queueManager.stop();
      return { success: true };
    }),

    getStatus: protectedProcedure.query(async () => {
      return queueManager.getStatus();
    }),

    triggerCheck: protectedProcedure.mutation(async () => {
      queueManager.triggerCheck();
      return { success: true };
    }),
   }),

  // ============ Call Recordings ============
  recordings: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const calls = await db.getCalls(input.limit, input.offset);
        
        // Get agent names for each call
        const callsWithAgentNames = await Promise.all(
          calls.map(async (call) => {
            const agent = await db.getAgentById(call.agentId);
            const transcripts = await db.getTranscriptsByCallId(call.id);
            return {
              ...call,
              agentName: agent?.name || 'Unknown',
              transcript: transcripts,
            };
          })
        );

        const total = calls.length; // TODO: Add count function
        return { calls: callsWithAgentNames, total };
      }),

    syncFromElevenLabs: protectedProcedure.mutation(async ({ ctx }) => {
      const apiKey = process.env.ELEVENLABS_API_KEY || '';
      if (!apiKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ElevenLabs API key not configured',
        });
      }

      try {
        const { getConversations, getConversationDetails, getConversationAudio, downloadAudioFile } = await import('./elevenlabs');
        const { storagePut } = await import('./storage');
        
        // Get all conversations from ElevenLabs
        const result = await getConversations(apiKey, { page_size: 100 });
        
        let imported = 0;
        for (const conv of result.conversations) {
          // Check if conversation already exists
          const existing = await db.getCallByConversationId(conv.conversation_id);
          if (existing) continue;

          // Get conversation details
          const details = await getConversationDetails(apiKey, conv.conversation_id);
          
          // Get audio URL and download
          let audioUrl: string | undefined;
          let audioPath: string | undefined;
          if (details.has_audio) {
            try {
              const audioData = await getConversationAudio(apiKey, conv.conversation_id);
              const audioBuffer = await downloadAudioFile(audioData.audio_url);
              
              // Upload to storage
              const storageResult = await storagePut(
                `recordings/${conv.conversation_id}.mp3`,
                audioBuffer,
                'audio/mpeg'
              );
              audioUrl = storageResult.url;
              audioPath = storageResult.key;
            } catch (error) {
              console.error(`Failed to download audio for ${conv.conversation_id}:`, error);
            }
          }

          // Find agent by agentId
          const agents = await db.getAgents();
          const agent = agents.find(a => a.agentId === conv.agent_id);
          if (!agent) {
            console.warn(`Agent not found for conversation ${conv.conversation_id}`);
            continue;
          }

          // Create call record
          const call = await db.createCall({
            conversationId: conv.conversation_id,
            agentId: agent.id,
            phoneNumberId: null,
            toNumber: 'Unknown', // ElevenLabs API doesn't provide this in list
            status: conv.status,
            startTime: conv.start_time_unix_secs,
            duration: conv.call_duration_secs,
            audioUrl,
            audioPath,
            hasAudio: details.has_audio,
            hasTranscript: details.transcript && details.transcript.length > 0,
          });

          // Save transcripts
          if (details.transcript && details.transcript.length > 0) {
            const transcripts = details.transcript.map(t => ({
              callId: call.id,
              role: t.role === 'agent' ? ('agent' as const) : ('user' as const),
              message: t.message,
              timeInCallSecs: t.time_in_call_secs,
            }));
            await db.createTranscripts(transcripts);
          }

          imported++;

          // Send to Telegram if configured
          try {
            if (ctx.user) {
              const telegramSettings = await db.getTelegramSettings(ctx.user.id);
              if (telegramSettings && telegramSettings.isActive && telegramSettings.sendRecordings) {
                const { sendCallRecordingToTelegram } = await import('./services/telegram');
                await sendCallRecordingToTelegram(
                  telegramSettings.botToken || '',
                  telegramSettings.chatId || '',
                  {
                    callId: call.id,
                    phoneNumber: call.toNumber,
                    duration: call.duration || undefined,
                    startTime: call.startTime || undefined,
                    audioUrl: audioUrl,
                    transcript: details.transcript && details.transcript.length > 0
                      ? details.transcript.map(t => ({
                          role: t.role === 'agent' ? ('agent' as const) : ('user' as const),
                          message: t.message,
                          timeInCallSecs: t.time_in_call_secs,
                        }))
                      : undefined,
                  }
                );
              }
            }
          } catch (telegramError) {
            console.error('[Recordings] Failed to send to Telegram:', telegramError);
            // Don't fail the import if Telegram fails
          }
        }

        return { success: true, imported };
      } catch (error: any) {
        console.error('[Recordings] Sync failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to sync recordings',
        });
      }
      }),
  }),

  // ============ Telegram Integration ============
  telegram: router({
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      return await db.getTelegramSettings(ctx.user.id);
    }),

    saveSettings: protectedProcedure
      .input(z.object({
        botToken: z.string().min(1, "Bot token is required"),
        chatId: z.string().min(1, "Chat ID is required"),
        isActive: z.boolean().default(true),
        sendRecordings: z.boolean().default(true),
        sendTranscripts: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }
        return await db.upsertTelegramSettings({
          userId: ctx.user.id,
          ...input,
        });
      }),

    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const settings = await db.getTelegramSettings(ctx.user.id);
      if (!settings || !settings.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Telegram integration not configured',
        });
      }

      const { sendTelegramMessage } = await import('./services/telegram');
      const success = await sendTelegramMessage(
        settings.botToken || '',
        settings.chatId || '',
        '✅ Test message from ElevenLabs Call Admin Panel\n\nYour Telegram integration is working correctly!'
      );

      if (!success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send test message. Please check your bot token and chat ID.',
        });
      }

      return { success: true };
    }),

    deleteSettings: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      await db.deleteTelegramSettings(ctx.user.id);
      return { success: true };
    }),
  }),
});
export type AppRouter = typeof appRouter;
