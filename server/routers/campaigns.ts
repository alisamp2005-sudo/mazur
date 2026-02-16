/**
 * Call Campaigns Router
 * Handles single calls and bulk campaigns
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCallCampaign,
  getCallCampaignsByApplication,
  getCallCampaignById,
  updateCallCampaign,
  getCampaignStats,
  createVoximplantCall,
  getVoximplantCallsByApplication,
  getVoximplantAccountById,
  getVoximplantApplicationById,
  updateVoximplantCall,
} from "../voximplant-db";

interface VoximplantCredentials {
  accountId: string;
  apiKey: string;
}

/**
 * Make authenticated request to Voximplant API
 */
async function makeVoximplantRequest(
  method: string,
  params: Record<string, any>,
  credentials: VoximplantCredentials
): Promise<any> {
  const baseUrl = 'https://api.voximplant.com/platform_api';
  
  const queryParams = new URLSearchParams({
    ...params,
    account_id: String(credentials.accountId),
    api_key: credentials.apiKey,
  });

  const url = `${baseUrl}/${method}/?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voximplant API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Voximplant API error: ${data.error.msg || JSON.stringify(data.error)}`);
  }

  return data.result || data;
}

export const campaignsRouter = router({
  // ============================================================================
  // Single Call
  // ============================================================================

  /**
   * Make a single outbound call
   */
  makeSingleCall: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        phoneNumber: z.string().min(1),
        callerId: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get application
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      // Verify ownership
      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      if (!application.voximplantRuleId) {
        throw new Error("Application has no rule configured");
      }

      const credentials = {
        accountId: account.accountId,
        apiKey: account.apiKey,
      };

      // Make the call using StartScenarios API
      const result = await makeVoximplantRequest('StartScenarios', {
        rule_id: application.voximplantRuleId,
        script_custom_data: JSON.stringify({
          destination: input.phoneNumber,
          callerid: input.callerId,
        }),
      }, credentials);

      // Save call to database
      const call = await createVoximplantCall({
        applicationId: input.applicationId,
        callSessionHistoryId: String(result.call_session_history_id || result.media_session_id),
        phoneNumber: input.phoneNumber,
        callerId: input.callerId,
        direction: 'outbound',
        status: 'pending',
      });

      return {
        success: true,
        callId: call.id,
        callSessionHistoryId: result.call_session_history_id,
        mediaSessionId: result.media_session_id,
      };
    }),

  // ============================================================================
  // Bulk Campaigns
  // ============================================================================

  /**
   * Create a new campaign
   */
  createCampaign: protectedProcedure
    .input(
      z.object({
        applicationId: z.number(),
        campaignName: z.string().min(1),
        phoneNumbers: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      // Create campaign
      const campaign = await createCallCampaign({
        applicationId: input.applicationId,
        campaignName: input.campaignName,
        totalNumbers: input.phoneNumbers.length,
      });

      return {
        success: true,
        campaignId: campaign.id,
        totalNumbers: input.phoneNumbers.length,
      };
    }),

  /**
   * Start a campaign (make calls)
   */
  startCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        phoneNumbers: z.array(z.string()).min(1),
        callerId: z.string().min(1),
        delayBetweenCalls: z.number().optional().default(2000), // ms
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get campaign
      const campaign = await getCallCampaignById(input.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Get application
      const application = await getVoximplantApplicationById(campaign.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      // Verify ownership
      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Campaign not found");
      }

      if (!application.voximplantRuleId) {
        throw new Error("Application has no rule configured");
      }

      const credentials = {
        accountId: account.accountId,
        apiKey: account.apiKey,
      };

      // Update campaign status
      await updateCallCampaign(input.campaignId, {
        status: 'running',
        startedAt: new Date(),
      });

      // Start making calls (in background)
      // Note: In production, this should be done via a queue system
      const callResults = [];
      
      for (let i = 0; i < input.phoneNumbers.length; i++) {
        const phoneNumber = input.phoneNumbers[i];
        
        try {
          // Make the call
          const result = await makeVoximplantRequest('StartScenarios', {
            rule_id: application.voximplantRuleId,
            script_custom_data: JSON.stringify({
              destination: phoneNumber,
              callerid: input.callerId,
            }),
          }, credentials);

          // Save call to database
          const call = await createVoximplantCall({
            applicationId: campaign.applicationId,
            campaignId: input.campaignId,
            callSessionHistoryId: String(result.call_session_history_id || result.media_session_id),
            phoneNumber: phoneNumber,
            callerId: input.callerId,
            direction: 'outbound',
            status: 'pending',
          });

          callResults.push({
            phoneNumber,
            success: true,
            callId: call.id,
          });

          // Delay between calls
          if (i < input.phoneNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, input.delayBetweenCalls));
          }
        } catch (error: any) {
          callResults.push({
            phoneNumber,
            success: false,
            error: error.message,
          });
        }
      }

      // Update campaign
      const successCount = callResults.filter(r => r.success).length;
      const failCount = callResults.filter(r => !r.success).length;
      
      await updateCallCampaign(input.campaignId, {
        status: 'completed',
        completedCalls: callResults.length,
        successfulCalls: successCount,
        failedCalls: failCount,
        completedAt: new Date(),
      });

      return {
        success: true,
        totalCalls: callResults.length,
        successfulCalls: successCount,
        failedCalls: failCount,
        results: callResults,
      };
    }),

  /**
   * Get all campaigns for an application
   */
  getCampaigns: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const application = await getVoximplantApplicationById(input.applicationId);
      if (!application) {
        throw new Error("Application not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Application not found");
      }

      return getCallCampaignsByApplication(input.applicationId);
    }),

  /**
   * Get campaign details with stats
   */
  getCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      const campaign = await getCallCampaignById(input.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Verify ownership
      const application = await getVoximplantApplicationById(campaign.applicationId);
      if (!application) {
        throw new Error("Campaign not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Campaign not found");
      }

      // Get stats
      const stats = await getCampaignStats(input.campaignId);

      return {
        ...campaign,
        stats,
      };
    }),

  /**
   * Get calls for a campaign
   */
  getCampaignCalls: protectedProcedure
    .input(
      z.object({
        campaignId: z.number(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const campaign = await getCallCampaignById(input.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Verify ownership
      const application = await getVoximplantApplicationById(campaign.applicationId);
      if (!application) {
        throw new Error("Campaign not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Campaign not found");
      }

      return getVoximplantCallsByApplication(campaign.applicationId, {
        campaignId: input.campaignId,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Pause a running campaign
   */
  pauseCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const campaign = await getCallCampaignById(input.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Verify ownership
      const application = await getVoximplantApplicationById(campaign.applicationId);
      if (!application) {
        throw new Error("Campaign not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Campaign not found");
      }

      await updateCallCampaign(input.campaignId, {
        status: 'paused',
      });

      return { success: true };
    }),

  /**
   * Resume a paused campaign
   */
  resumeCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const campaign = await getCallCampaignById(input.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Verify ownership
      const application = await getVoximplantApplicationById(campaign.applicationId);
      if (!application) {
        throw new Error("Campaign not found");
      }

      const account = await getVoximplantAccountById(application.voximplantAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Campaign not found");
      }

      await updateCallCampaign(input.campaignId, {
        status: 'running',
      });

      return { success: true };
    }),
});
