import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test Call to User Number", () => {
  it("should create call to +17015814825", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = "agent_8301kfgw54f5eekabw8htz6ekgnw";
    const phoneNumberId = "phnum_2401kfgya520f2xagfd4vv3c4qee";
    const targetNumber = "+17015814825";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log(`\n📞 Creating call to ${targetNumber}...`);

    try {
      // Create batch call
      const response = await axios.post(
        "https://api.elevenlabs.io/v1/convai/batch-calling/submit",
        {
          call_name: "Test Call to User",
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          recipients: [
            {
              phone_number: targetNumber,
              name: "User",
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

      console.log("\n✅ Call created successfully!");
      console.log("Batch ID:", response.data.id);
      console.log("Status:", response.data.status);
      console.log("\n📱 Calling", targetNumber, "...");
      console.log("\n⏳ The phone should ring shortly!");

      expect(response.status).toBe(200);
      expect(response.data.id).toBeDefined();

      // Wait a bit and check status
      console.log("\n⏳ Waiting 10 seconds to check call status...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const batchId = response.data.id;
      const batchResponse = await axios.get(
        `https://api.elevenlabs.io/v1/convai/batch-calling/${batchId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
          timeout: 15000,
        }
      );

      console.log("\n📊 Call Status Update:");
      console.log("Batch Status:", batchResponse.data.status);
      console.log("Dispatched:", batchResponse.data.total_calls_dispatched);
      console.log("Finished:", batchResponse.data.total_calls_finished);

      if (batchResponse.data.recipients && batchResponse.data.recipients.length > 0) {
        const recipient = batchResponse.data.recipients[0];
        console.log("Recipient Status:", recipient.status);
        
        if (recipient.conversation_id) {
          console.log("Conversation ID:", recipient.conversation_id);
          console.log("\n✅ Call is in progress or completed!");
          console.log("Check your phone or ElevenLabs dashboard for details.");
        } else {
          console.log("\n⏳ Call is being initiated...");
        }
      }

      console.log("\n" + "=".repeat(60));
      console.log("🎉 Test call initiated successfully!");
      console.log("=".repeat(60));
    } catch (error: any) {
      console.error("\n❌ Error creating call:");
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
