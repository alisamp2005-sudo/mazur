import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Get Conversation Details", () => {
  it("should get conversation details including failure reason", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const conversationId = "conv_2801kfjwawpvf2y8vtrcd5gc31p0";

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log(`\n💬 Getting conversation: ${conversationId}`);

    try {
      const response = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
          timeout: 15000,
        }
      );

      console.log("\n✅ Conversation details:");
      console.log(JSON.stringify(response.data, null, 2));

      const data = response.data;

      // Check for error/failure information
      if (data.status) {
        console.log(`\n📊 Status: ${data.status}`);
      }

      if (data.end_reason) {
        console.log(`\n🔚 End reason: ${data.end_reason}`);
      }

      if (data.error || data.failure_reason || data.call_failure_reason) {
        console.log("\n❌ Failure information:");
        console.log("Error:", data.error);
        console.log("Failure reason:", data.failure_reason);
        console.log("Call failure reason:", data.call_failure_reason);
      }

      // Check transcript
      if (data.transcript) {
        console.log("\n📝 Transcript:");
        console.log(data.transcript);
      }

      // Check metadata
      if (data.metadata) {
        console.log("\n📋 Metadata:");
        console.log(JSON.stringify(data.metadata, null, 2));
      }

      expect(response.status).toBe(200);
    } catch (error: any) {
      console.error("\n❌ Error getting conversation:");
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
