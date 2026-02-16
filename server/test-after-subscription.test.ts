import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test Calls After Subscription Update", () => {
  it("should successfully create batch call with active subscription", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = "agent_8301kfgw54f5eekabw8htz6ekgnw";
    const phoneNumberId = "phnum_2401kfgya520f2xagfd4vv3c4qee";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log("\n📞 Creating batch call with updated subscription...");

    try {
      const response = await axios.post(
        "https://api.elevenlabs.io/v1/convai/batch-calling/submit",
        {
          call_name: "Test Call After Subscription Update",
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

      console.log("\n✅ Batch call created successfully!");
      console.log("Batch ID:", response.data.id);
      console.log("Status:", response.data.status);

      expect(response.status).toBe(200);
      expect(response.data.id).toBeDefined();

      const batchId = response.data.id;

      // Wait a bit for the call to be dispatched
      console.log("\n⏳ Waiting 5 seconds for call to be dispatched...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get batch call details to retrieve conversation_id
      console.log(`\n📊 Getting batch call details: ${batchId}`);
      const batchResponse = await axios.get(
        `https://api.elevenlabs.io/v1/convai/batch-calling/${batchId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
          timeout: 15000,
        }
      );

      console.log("\nBatch Status:", batchResponse.data.status);
      console.log("Total Dispatched:", batchResponse.data.total_calls_dispatched);
      console.log("Total Scheduled:", batchResponse.data.total_calls_scheduled);
      console.log("Total Finished:", batchResponse.data.total_calls_finished);

      if (batchResponse.data.recipients && batchResponse.data.recipients.length > 0) {
        console.log("\n📋 Recipients:");
        batchResponse.data.recipients.forEach((recipient: any, index: number) => {
          console.log(`\n  ${index + 1}. ${recipient.phone_number}`);
          console.log(`     Status: ${recipient.status}`);
          console.log(`     Conversation ID: ${recipient.conversation_id || "N/A"}`);
        });

        // Wait more for call to complete
        console.log("\n⏳ Waiting 10 more seconds for call to complete...");
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Get conversation details
        const conversationId = batchResponse.data.recipients[0]?.conversation_id;
        if (conversationId) {
          console.log(`\n💬 Checking conversation: ${conversationId}`);

          try {
            const convResponse = await axios.get(
              `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
              {
                headers: {
                  "xi-api-key": apiKey,
                },
                timeout: 15000,
              }
            );

            console.log("\n📊 Call Status:", convResponse.data.status);
            
            if (convResponse.data.metadata?.termination_reason) {
              console.log("🔚 Termination Reason:", convResponse.data.metadata.termination_reason);
            }

            if (convResponse.data.metadata?.error) {
              console.log("❌ Error:", convResponse.data.metadata.error);
            } else {
              console.log("✅ No errors!");
            }

            if (convResponse.data.transcript && convResponse.data.transcript.length > 0) {
              console.log("\n📝 Transcript:");
              convResponse.data.transcript.forEach((turn: any) => {
                console.log(`  ${turn.role}: ${turn.message || turn.original_message}`);
              });
            }

            if (convResponse.data.metadata?.call_duration_secs) {
              console.log(`\n⏱️ Call Duration: ${convResponse.data.metadata.call_duration_secs} seconds`);
            }

            if (convResponse.data.metadata?.cost) {
              console.log(`💰 Cost: $${convResponse.data.metadata.cost}`);
            }
          } catch (convError: any) {
            console.error("\n⚠️ Could not get conversation details:");
            if (convError.response) {
              console.error("Status:", convError.response.status);
              console.error("Data:", JSON.stringify(convError.response.data, null, 2));
            } else {
              console.error("Error:", convError.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("\n❌ Error creating batch call:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }, 30000);
});
