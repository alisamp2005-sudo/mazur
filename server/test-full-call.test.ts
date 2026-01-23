import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test Full Call Completion", () => {
  it("should create call and wait for full completion with transcript", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = "agent_8301kfgw54f5eekabw8htz6ekgnw";
    const phoneNumberId = "phnum_2401kfgya520f2xagfd4vv3c4qee";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log("\n📞 Creating batch call...");

    try {
      // Create batch call
      const response = await axios.post(
        "https://api.elevenlabs.io/v1/convai/batch-calling/submit",
        {
          call_name: "Full Call Test",
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          recipients: [
            {
              phone_number: "+19176193743",
              name: "Test User",
            },
          ],
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      console.log("✅ Batch call created:", response.data.id);
      const batchId = response.data.id;

      // Step 1: Wait for conversation_id
      console.log("\n⏳ Step 1: Waiting for conversation_id...");
      let conversationId: string | null = null;
      let attempts = 0;

      while (!conversationId && attempts < 20) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const batchResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/batch-calling/${batchId}`,
          {
            headers: { "xi-api-key": apiKey },
            timeout: 15000,
          }
        );

        if (batchResponse.data.recipients?.[0]?.conversation_id) {
          conversationId = batchResponse.data.recipients[0].conversation_id;
          console.log(`✅ Conversation ID found: ${conversationId}`);
        } else {
          process.stdout.write(".");
        }
      }

      if (!conversationId) {
        throw new Error("Conversation ID not found after 60 seconds");
      }

      // Step 2: Wait for call completion
      console.log("\n\n⏳ Step 2: Waiting for call to complete...");
      let callCompleted = false;
      attempts = 0;

      while (!callCompleted && attempts < 40) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const convResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
          {
            headers: { "xi-api-key": apiKey },
            timeout: 15000,
          }
        );

        const status = convResponse.data.status;
        const duration = convResponse.data.metadata?.call_duration_secs || 0;

        process.stdout.write(`\n  [${attempts}] Status: ${status}, Duration: ${duration}s`);

        // Check if call is finished
        if (
          status === "successful" ||
          status === "completed" ||
          status === "failed" ||
          status === "ended"
        ) {
          callCompleted = true;
          console.log("\n\n✅ Call completed!");

          // Display full results
          console.log("\n" + "=".repeat(60));
          console.log("📊 FINAL CALL RESULTS");
          console.log("=".repeat(60));
          console.log("Status:", status);
          console.log("Duration:", duration, "seconds");
          console.log("Cost: $" + (convResponse.data.metadata?.cost || 0));

          if (convResponse.data.metadata?.termination_reason) {
            console.log("Termination:", convResponse.data.metadata.termination_reason);
          }

          if (convResponse.data.metadata?.error) {
            console.log("\n❌ ERROR DETAILS:");
            console.log(JSON.stringify(convResponse.data.metadata.error, null, 2));
          }

          if (convResponse.data.transcript && convResponse.data.transcript.length > 0) {
            console.log("\n📝 FULL TRANSCRIPT:");
            console.log("-".repeat(60));
            convResponse.data.transcript.forEach((turn: any, index: number) => {
              const role = turn.role.toUpperCase();
              const message = turn.message || turn.original_message || "...";
              const interrupted = turn.interrupted ? " [INTERRUPTED]" : "";
              const time = turn.time_in_call_secs || 0;
              console.log(`\n[${time}s] ${role}:${interrupted}`);
              console.log(message);
            });
            console.log("\n" + "-".repeat(60));
          }

          if (convResponse.data.has_audio) {
            console.log("\n🔊 Audio available: YES");
          }

          console.log("\n" + "=".repeat(60));

          // Success check
          if (status === "successful" || status === "completed") {
            console.log("\n🎉 CALL COMPLETED SUCCESSFULLY!");
          } else if (status === "failed") {
            console.log("\n⚠️ CALL FAILED - Check error details above");
          }
        }
      }

      if (!callCompleted) {
        console.log("\n\n⚠️ Call still in progress after 200 seconds");
        console.log("This may be a long call - check ElevenLabs dashboard for status");
      }

      expect(response.status).toBe(200);
      expect(conversationId).toBeTruthy();
    } catch (error: any) {
      console.error("\n❌ Error:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }, 240000); // 4 minute timeout
});
