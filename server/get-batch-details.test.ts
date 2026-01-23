import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Get Batch Call Details", () => {
  it("should get detailed information about failed batch call", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const batchId = "btcal_9001kfjwaw9sfchs4tyvfkehh277";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log(`\n📋 Getting details for batch: ${batchId}`);

    try {
      const response = await axios.get(
        `https://api.elevenlabs.io/v1/convai/batch-calling/${batchId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
          timeout: 15000,
        }
      );

      console.log("\n✅ Batch details:");
      console.log(JSON.stringify(response.data, null, 2));

      // Check if there are any error details
      if (response.data.error || response.data.failure_reason) {
        console.log("\n❌ Error/Failure information:");
        console.log("Error:", response.data.error);
        console.log("Failure reason:", response.data.failure_reason);
      }

      // Check individual call statuses
      if (response.data.calls && Array.isArray(response.data.calls)) {
        console.log("\n📞 Individual call details:");
        response.data.calls.forEach((call: any, index: number) => {
          console.log(`\nCall ${index + 1}:`);
          console.log(`  Phone: ${call.phone_number || call.to_number}`);
          console.log(`  Status: ${call.status}`);
          console.log(`  Conversation ID: ${call.conversation_id || 'N/A'}`);
          if (call.error || call.failure_reason) {
            console.log(`  Error: ${call.error || call.failure_reason}`);
          }
        });
      }

      expect(response.status).toBe(200);
    } catch (error: any) {
      console.error("\n❌ Error getting batch details:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }, 20000);
});
