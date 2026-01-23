import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test SIP Trunk Outbound Call", () => {
  it("should make outbound call via SIP trunk endpoint", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    console.log("\n🚀 Creating SIP trunk outbound call...");
    console.log("Agent ID: agent_8301kfgw54f5eekabw8htz6ekgnw");
    console.log("Phone Number ID: phnum_2401kfgya520f2xagfd4vv3c4qee");
    console.log("Target: +19176193743");

    try {
      // Create outbound call via SIP trunk
      console.log("\n📞 Initiating call via SIP Trunk API...");
      const callResponse = await axios.post(
        "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call",
        {
          agent_id: "agent_8301kfgw54f5eekabw8htz6ekgnw",
          agent_phone_number_id: "phnum_2401kfgya520f2xagfd4vv3c4qee",
          to_number: "+19176193743"
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log("\n✅ Call initiated successfully!");
      console.log("Response:", JSON.stringify(callResponse.data, null, 2));

      const conversationId = callResponse.data.conversation_id;
      if (conversationId) {
        console.log(`\n💬 Conversation ID: ${conversationId}`);
        console.log("\nWait 30-60 seconds for call to complete, then retrieve transcript:");
        console.log(`GET https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`);
      }

      expect(callResponse.status).toBe(200);
      expect(callResponse.data).toBeDefined();
    } catch (error: any) {
      console.error("\n❌ Error:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else if (error.code === "ECONNABORTED") {
        console.error("Request timeout - SIP trunk may not be configured correctly");
        console.error("This usually means:");
        console.error("1. SIP trunk outbound configuration is missing");
        console.error("2. SIP provider (xho.biz) is not responding");
        console.error("3. Authentication credentials are incorrect");
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }, 35000);
});
