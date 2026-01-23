import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test Call with Correct Endpoint", () => {
  it("should make test call using correct batch calling endpoint", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log("\n🚀 Creating test call...");
    console.log("Agent ID: agent_8301kfgw54f5eekabw8htz6ekgnw");
    console.log("Phone Number ID: phnum_2401kfgya520f2xagfd4vv3c4qee");
    console.log("Target: +19176193743");

    try {
      // Create batch call with correct endpoint
      console.log("\n📞 Initiating call via Batch Calling API...");
      const batchResponse = await axios.post(
        "https://api.elevenlabs.io/v1/convai/batch-calling/submit",
        {
          call_name: "Debug Test Call - Silent Agent Issue",
          agent_id: "agent_8301kfgw54f5eekabw8htz6ekgnw",
          agent_phone_number_id: "phnum_2401kfgya520f2xagfd4vv3c4qee",
          recipients: [
            {
              phone_number: "+19176193743"
            }
          ]
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log("\n✅ Batch call created successfully!");
      console.log("Response:", JSON.stringify(batchResponse.data, null, 2));

      const batchId = batchResponse.data.id;
      console.log(`\n📋 Batch ID: ${batchId}`);
      console.log("\nCall initiated! You can:");
      console.log(`1. Monitor progress in ElevenLabs dashboard`);
      console.log(`2. Wait 30-60 seconds and check batch status via API`);
      console.log(`3. Retrieve conversation transcript after call completes`);

      expect(batchResponse.status).toBe(200);
      expect(batchResponse.data.id).toBeDefined();
    } catch (error: any) {
      console.error("\n❌ Error:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else if (error.code === "ECONNABORTED") {
        console.error("Request timeout");
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }, 35000);
});
