/**
 * Make outbound call endpoint
 */

import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getVoximplantAccountById, getVoximplantApplicationById } from "../voximplant-db";

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

/**
 * Make an outbound call using Voximplant
 */
export const makeOutboundCall = protectedProcedure
  .input(
    z.object({
      applicationId: z.number(),
      ruleId: z.number(),
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

    // Verify ownership through account
    const account = await getVoximplantAccountById(application.voximplantAccountId);
    if (!account || account.userId !== ctx.user.id) {
      throw new Error("Application not found");
    }

    const credentials = {
      accountId: account.accountId,
      apiKey: account.apiKey,
    };

    // Make the call using StartScenarios API
    const result = await makeVoximplantRequest('StartScenarios', {
      rule_id: input.ruleId,
      script_custom_data: JSON.stringify({
        destination: input.phoneNumber,
        callerid: input.callerId,
      }),
    }, credentials);

    return {
      success: true,
      callSessionHistoryId: result.call_session_history_id,
      mediaSessionId: result.media_session_id,
    };
  });
