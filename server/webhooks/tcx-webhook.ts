import { Router } from "express";
import { tcxMonitor } from "../services/tcx-monitor";

const router = Router();

/**
 * Webhook endpoint for receiving events from 3CX Call Flow Designer
 * 
 * Expected payload from 3CX:
 * {
 *   "event": "call_answered" | "call_ended",
 *   "extension": "1000",
 *   "callId": "...",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post("/3cx-webhook", async (req, res) => {
  try {
    const { event, extension, callId, timestamp } = req.body;

    console.log(`[3CX Webhook] Received event: ${event} for extension ${extension}`);

    // Update operator status based on event
    if (event === "call_answered") {
      // Operator picked up a call - mark as Busy
      tcxMonitor.updateOperatorStatus(extension, "Busy");
    } else if (event === "call_ended") {
      // Call ended - mark as Available
      tcxMonitor.updateOperatorStatus(extension, "Available");
    }

    res.json({ success: true, received: { event, extension, callId } });
  } catch (error) {
    console.error("[3CX Webhook] Error processing webhook:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Manual status update endpoint (for testing)
 */
router.post("/3cx-webhook/manual-update", async (req, res) => {
  try {
    const { extension, status } = req.body;

    if (!extension || !status) {
      return res.status(400).json({ success: false, error: "Missing extension or status" });
    }

    tcxMonitor.updateOperatorStatus(extension, status);
    
    res.json({ success: true, updated: { extension, status } });
  } catch (error) {
    console.error("[3CX Webhook] Error in manual update:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
