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
});

export type AppRouter = typeof appRouter;
