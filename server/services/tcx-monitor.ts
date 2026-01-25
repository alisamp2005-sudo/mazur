import { ENV } from "../_core/env";

export interface ExtensionStatus {
  extension: string;
  status: "Available" | "Busy" | "Ringing" | "OnHold" | "Offline";
  lastUpdated: Date;
}

class TCXMonitor {
  private extensionsToMonitor = ["1000", "2000", "3000", "4000"];
  private statuses: Map<string, ExtensionStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sessionCookie: string | null = null;

  async login(): Promise<boolean> {
    try {
      const loginUrl = `${ENV.tcxApiUrl}/api/login`;
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: ENV.tcxApiEmail,
          password: ENV.tcxApiPassword,
        }),
      });

      if (!response.ok) {
        console.error("TCX login failed:", response.statusText);
        return false;
      }

      // Extract session cookie
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        this.sessionCookie = setCookie.split(";")[0];
      }

      console.log("TCX Monitor: Successfully logged in");
      return true;
    } catch (error) {
      console.error("TCX login error:", error);
      return false;
    }
  }

  async fetchExtensionStatus(extension: string): Promise<ExtensionStatus> {
    try {
      // Try WebAPI endpoint first
      const url = `${ENV.tcxApiUrl}/webapi/tcx/ext.state.get?num=${extension}`;
      const response = await fetch(url, {
        headers: this.sessionCookie
          ? { Cookie: this.sessionCookie }
          : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          extension,
          status: this.mapStatus(data.status || data.fwdName),
          lastUpdated: new Date(),
        };
      }
    } catch (error) {
      console.error(`Error fetching status for ${extension}:`, error);
    }

    // Fallback: return offline status
    return {
      extension,
      status: "Offline",
      lastUpdated: new Date(),
    };
  }

  private mapStatus(status: string): ExtensionStatus["status"] {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("available") || statusLower.includes("free"))
      return "Available";
    if (statusLower.includes("busy") || statusLower.includes("on call"))
      return "Busy";
    if (statusLower.includes("ring")) return "Ringing";
    if (statusLower.includes("hold")) return "OnHold";
    return "Offline";
  }

  async updateAllStatuses(): Promise<void> {
    for (const ext of this.extensionsToMonitor) {
      const status = await this.fetchExtensionStatus(ext);
      this.statuses.set(ext, status);
    }
  }

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

  areAllOperatorsBusy(): boolean {
    const statuses = this.getAllStatuses();
    if (statuses.length !== this.extensionsToMonitor.length) return false;

    return statuses.every(
      (s) => s.status === "Busy" || s.status === "Ringing" || s.status === "OnHold"
    );
  }

  isAnyOperatorAvailable(): boolean {
    const statuses = this.getAllStatuses();
    return statuses.some((s) => s.status === "Available");
  }

  async startMonitoring(intervalMs: number = 10000): Promise<void> {
    if (this.monitoringInterval) {
      console.log("TCX Monitor: Already running");
      return;
    }

    // Initial login
    await this.login();

    // Initial fetch
    await this.updateAllStatuses();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.updateAllStatuses();
      console.log(
        "TCX Monitor: Updated statuses",
        this.getAllStatuses().map((s) => `${s.extension}:${s.status}`)
      );
    }, intervalMs);

    console.log(`TCX Monitor: Started monitoring every ${intervalMs}ms`);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("TCX Monitor: Stopped monitoring");
    }
  }
}

export const tcxMonitor = new TCXMonitor();
