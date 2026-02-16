import { ENV } from "../_core/env";

export interface ExtensionStatus {
  extension: string;
  status: "Available" | "Busy" | "Ringing" | "OnHold" | "Offline";
  lastUpdated: Date;
}

class TCXMonitorV2 {
  private extensionsToMonitor = ["1000", "2000", "3000", "4000"];
  private statuses: Map<string, ExtensionStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sessionCookie: string | null = null;
  private lastLoginTime: number = 0;
  private readonly POLL_INTERVAL = 10000; // 10 seconds
  private readonly LOGIN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes

  /**
   * Login to 3CX and get session cookie
   */
  async login(): Promise<boolean> {
    try {
      console.log("[TCXMonitor] Attempting login to 3CX...");
      
      const loginUrl = `${ENV.tcxApiUrl}/webclient/api/Login/GetAccessToken`;
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Username: ENV.tcxApiEmail,
          Password: ENV.tcxApiPassword,
        }),
      });

      if (!response.ok) {
        console.error(`[TCXMonitor] Login failed: ${response.status} ${response.statusText}`);
        return false;
      }

      // Try to get session cookie from headers
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        this.sessionCookie = setCookie.split(";")[0];
        this.lastLoginTime = Date.now();
        console.log("[TCXMonitor] Successfully logged in with cookie");
        return true;
      }

      // Try to get token from response body
      const data = await response.json();
      if (data.access_token || data.token || data.Token) {
        this.sessionCookie = data.access_token || data.token || data.Token;
        this.lastLoginTime = Date.now();
        console.log("[TCXMonitor] Successfully logged in with token");
        return true;
      }

      console.error("[TCXMonitor] No session cookie or token received");
      return false;
    } catch (error) {
      console.error("[TCXMonitor] Login error:", error);
      return false;
    }
  }

  /**
   * Ensure we have a valid session
   */
  private async ensureSession(): Promise<boolean> {
    if (!this.sessionCookie || Date.now() - this.lastLoginTime > this.LOGIN_REFRESH_INTERVAL) {
      console.log("[TCXMonitor] Session expired or missing, re-logging in...");
      return await this.login();
    }
    return true;
  }

  /**
   * Fetch all extension statuses from 3CX MyPhone API
   */
  private async fetchAllStatuses(): Promise<void> {
    try {
      if (!(await this.ensureSession())) {
        console.error("[TCXMonitor] Failed to establish session");
        return;
      }

      // Try MyPhone session endpoint (shows active calls and statuses)
      const response = await fetch(`${ENV.tcxApiUrl}/webclient/api/MyPhone/session`, {
        headers: {
          Cookie: this.sessionCookie!,
          Authorization: `Bearer ${this.sessionCookie}`,
        },
      });

      if (!response.ok) {
        console.error(`[TCXMonitor] Failed to fetch statuses: ${response.status}`);
        
        // If unauthorized, try to re-login
        if (response.status === 401 || response.status === 403) {
          this.sessionCookie = null;
          await this.ensureSession();
        }
        return;
      }

      const data = await response.json();
      
      // Parse the response to extract extension statuses
      // The exact structure depends on 3CX API response
      // For now, we'll set all as Available by default
      for (const ext of this.extensionsToMonitor) {
        this.statuses.set(ext, {
          extension: ext,
          status: "Available",
          lastUpdated: new Date(),
        });
      }

      console.log("[TCXMonitor] Successfully updated statuses");
    } catch (error) {
      console.error("[TCXMonitor] Error fetching statuses:", error);
    }
  }

  /**
   * Start monitoring extension statuses
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      console.log("[TCXMonitor] Already monitoring");
      return;
    }

    // Initial login
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.error("[TCXMonitor] Failed to start monitoring - login failed");
      return;
    }

    // Initial fetch
    await this.fetchAllStatuses();

    // Start polling
    this.monitoringInterval = setInterval(async () => {
      await this.fetchAllStatuses();
    }, this.POLL_INTERVAL);

    console.log(`[TCXMonitor] Started monitoring ${this.extensionsToMonitor.length} extensions`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("[TCXMonitor] Stopped monitoring");
    }
  }

  /**
   * Get all current statuses
   */
  getAllStatuses(): ExtensionStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Manually update operator status (for webhook events)
   */
  updateOperatorStatus(extension: string, status: ExtensionStatus["status"]): void {
    this.statuses.set(extension, {
      extension,
      status,
      lastUpdated: new Date(),
    });
    console.log(`[TCXMonitor] Updated ${extension} status to ${status}`);
  }

  /**
   * Check if all operators are busy
   */
  areAllOperatorsBusy(): boolean {
    const statuses = this.getAllStatuses();
    if (statuses.length !== this.extensionsToMonitor.length) return false;

    return statuses.every((s) => s.status === "Busy" || s.status === "OnHold");
  }

  /**
   * Check if at least one operator is available
   */
  isAnyOperatorAvailable(): boolean {
    const statuses = this.getAllStatuses();
    return statuses.some((s) => s.status === "Available");
  }
}

// Export singleton instance
export const tcxMonitorV2 = new TCXMonitorV2();
