import { ENV } from "./_core/env";

export interface OperatorStatus {
  extension: string;
  name: string;
  status: "Available" | "Busy" | "Away" | "DND" | "Offline" | "InCall";
  isAvailable: boolean;
}

/**
 * Get status of all operators from 3CX Management Console API
 */
export async function getOperatorStatuses(
  extensions: string[]
): Promise<OperatorStatus[]> {
  const auth = Buffer.from(
    `${ENV.tcxApiEmail}:${ENV.tcxApiPassword}`
  ).toString("base64");

  try {
    // Try to get extension list from 3CX API
    const response = await fetch(`${ENV.tcxApiUrl}/api/ExtensionList`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `3CX API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Parse extension statuses
    const statuses: OperatorStatus[] = [];

    for (const ext of extensions) {
      const extData = data.list?.find((e: any) => e.Number === ext);

      if (!extData) {
        statuses.push({
          extension: ext,
          name: `Operator ${ext}`,
          status: "Offline",
          isAvailable: false,
        });
        continue;
      }

      const status = extData.CurrentProfileName || "Offline";
      const isInCall = extData.IsRegistered && extData.Talking;

      statuses.push({
        extension: ext,
        name: extData.FirstName || `Operator ${ext}`,
        status: isInCall ? "InCall" : status,
        isAvailable: status === "Available" && !isInCall,
      });
    }

    return statuses;
  } catch (error) {
    console.error("[3CX API] Failed to get operator statuses:", error);
    throw error;
  }
}

/**
 * Check if any operator is available
 */
export async function hasAvailableOperators(
  extensions: string[]
): Promise<boolean> {
  const statuses = await getOperatorStatuses(extensions);
  return statuses.some((s) => s.isAvailable);
}

/**
 * Get count of available operators
 */
export async function getAvailableOperatorCount(
  extensions: string[]
): Promise<number> {
  const statuses = await getOperatorStatuses(extensions);
  return statuses.filter((s) => s.isAvailable).length;
}
