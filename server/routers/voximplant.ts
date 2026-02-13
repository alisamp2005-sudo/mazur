/**
 * Voximplant tRPC Router
 * Handles Voximplant account, applications, calls, and statistics
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createVoximplantAccount,
  getVoximplantAccountsByUser,
  getVoximplantAccountById,
  updateVoximplantAccount,
  deleteVoximplantAccount,
  createVoximplantApplication,
  getVoximplantApplicationsByAccount,
  getVoximplantApplicationById,
  updateVoximplantApplication,
  deleteVoximplantApplication,
  createVoximplantCall,
  getVoximplantCallsByApplication,
  getVoximplantCallById,
  getVoximplantTranscriptByCallId,
  getVoximplantCallStats,
} from "../voximplant-db";
import {
  testVoximplantConnection,
  getAccountInfo,
  getApplications,
  getCallHistory,
  generateScenarioCode,
} from "../voximplant-api";

export const voximplantRouter = router({
  // ============================================================================
  // Voximplant Accounts
  // ============================================================================

  /**
   * Create a new Voximplant account
   */
  createAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.string().min(1),
        apiKey: z.string().min(1),
        accountName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Test connection before saving
      const isValid = await testVoximplantConnection({
        accountId: input.accountId,
        apiKey: input.apiKey,
      });

      if (!isValid) {
        throw new Error("Invalid Voximplant credentials");
      }

      return createVoximplantAccount({
        userId: ctx.user.id,
        accountId: input.accountId,
        apiKey: input.apiKey,
        accountName: input.accountName,
        isActive: true,
      });
    }),

  /**
   * Get all Voximplant accounts for current user
   */
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return getVoximplantAccountsByUser(ctx.user.id);
  }),

  /**
   * Get Voximplant account by ID
   */
  getAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const account = await getVoximplantAccountById(input.id);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }
      return account;
    }),

  /**
   * Update Voximplant account
   */
  updateAccount: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        accountName: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await getVoximplantAccountById(input.id);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      await updateVoximplantAccount(input.id, {
        accountName: input.accountName,
        isActive: input.isActive,
      });

      return { success: true };
    }),

  /**
   * Delete Voximplant account
   */
  deleteAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const account = await getVoximplantAccountById(input.id);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      await deleteVoximplantAccount(input.id);
      return { success: true };
    }),

  /**
   * Test Voximplant connection
   */
  testConnection: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        apiKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const isValid = await testVoximplantConnection(input);
      return { success: isValid };
    }),

  // ============================================================================
  // Voximplant Applications
  // ============================================================================

  /**
   * Create a new Voximplant application
   */
  createApplication: protectedProcedure
    .input(
      z.object({
        voximplantAccountId: z.number(),
        voximplantApplicationId: z.string().optional(),
        voximplantRuleId: z.string().optional(),
        applicationName: z.string().min(1),
        elevenlabsApiKey: z.string().min(1),
        elevenlabsAgentId: z.string().min(1),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify account ownership
      const account = await getVoximplantAccountById(input.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      // Generate scenario code
      const scenarioCode = generateScenarioCode({
        elevenlabsApiKey: input.elevenlabsApiKey,
        elevenlabsAgentId: input.elevenlabsAgentId,
      });

      return createVoximplantApplication({
        voximplantAccountId: input.voximplantAccountId,
        voximplantApplicationId: input.voximplantApplicationId,
        voximplantRuleId: input.voximplantRuleId,
        applicationName: input.applicationName,
        elevenlabsApiKey: input.elevenlabsApiKey,
        elevenlabsAgentId: input.elevenlabsAgentId,
        scenarioCode,
        phoneNumber: input.phoneNumber,
        status: "active",
      });
    }),

  /**
   * Get all applications for an account
   */
  getApplications: protectedProcedure
    .input(z.object({ voximplantAccountId: z.number() }))
    .query(async ({ input, ctx }) => {
      const account = await getVoximplantAccountById(input.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      return getVoximplantApplicationsByAccount(input.voximplantAccountId);
    }),

  /**
   * Get application by ID
   */
  getApplication: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.id);
      if (!application) {
        throw new Error("Application not found");
      }

      // Verify ownership through account
      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      return application;
    }),

  /**
   * Update application
   */
  updateApplication: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        applicationName: z.string().optional(),
        phoneNumber: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.id);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      await updateVoximplantApplication(input.id, {
        applicationName: input.applicationName,
        phoneNumber: input.phoneNumber,
        status: input.status,
      });

      return { success: true };
    }),

  /**
   * Delete application
   */
  deleteApplication: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.id);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      await deleteVoximplantApplication(input.id);
      return { success: true };
    }),

  /**
   * Get scenario code for an application
   */
  getScenarioCode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.id);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      return {
        scenarioCode: application.scenarioCode || "",
      };
    }),

  // ============================================================================
  // Call History
  // ============================================================================

  /**
   * Get call history for an application
   */
  getCalls: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      return getVoximplantCallsByApplication(input.applicationId, {
        limit: input.limit,
        offset: input.offset,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),

  /**
   * Get call details by ID
   */
  getCall: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const call = await getVoximplantCallById(input.id);
      if (!call) {
        throw new Error("Call not found");
      }

      const application = await getVoximplantApplicationById(call.applicationId);
      if (!application) {
        throw new Error("Call not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Call not found");
      }

      return call;
    }),

  /**
   * Get call transcript
   */
  getTranscript: protectedProcedure
    .input(z.object({ callId: z.number() }))
    .query(async ({ input, ctx }) => {
      const call = await getVoximplantCallById(input.callId);
      if (!call) {
        throw new Error("Call not found");
      }

      const application = await getVoximplantApplicationById(call.applicationId);
      if (!application) {
        throw new Error("Call not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Call not found");
      }

      const transcript = await getVoximplantTranscriptByCallId(input.callId);
      return transcript;
    }),

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get call statistics for an application
   */
  getStats: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      return getVoximplantCallStats(input.applicationId, input.startDate, input.endDate);
    }),

  /**
   * Sync call history from Voximplant API
   */
  syncCalls: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      // Fetch call history from Voximplant API
      const callHistory = await getCallHistory(
        {
          accountId: account.accountId,
          apiKey: account.apiKey,
        },
        {
          fromDate: input.fromDate,
          toDate: input.toDate,
        }
      );

      // TODO: Save calls to database
      // For now, just return the count
      return {
        success: true,
        count: callHistory.length,
      };
    }),
});
