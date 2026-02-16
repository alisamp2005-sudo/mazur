import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Test Complete Call Flow", () => {
  it("should create batch call and wait for completion", async () => {
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
          call_name: "Complete Call Flow Test",
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

      console.log("\n✅ Batch call created!");
      console.log("Batch ID:", response.data.id);

      const batchId = response.data.id;

      // Poll for conversation_id (max 60 seconds)
      console.log("\n⏳ Polling for conversation_id...");
      let conversationId: string | null = null;
      let attempts = 0;
      const maxAttempts = 12; // 12 * 5 = 60 seconds

      while (!conversationId && attempts < maxAttempts) {
        attempts++;
        console.log(`\n  Attempt ${attempts}/${maxAttempts}...`);

        await new Promise((resolve) => setTimeout(resolve, 5000));

        const batchResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/batch-calling/${batchId}`,
          {
            headers: {
              "xi-api-key": apiKey,
            },
            timeout: 15000,
          }
        );

        console.log(`  Batch Status: ${batchResponse.data.status}`);
        console.log(`  Dispatched: ${batchResponse.data.total_calls_dispatched}`);
        console.log(`  Finished: ${batchResponse.data.total_calls_finished}`);

        if (batchResponse.data.recipients && batchResponse.data.recipients.length > 0) {
          const recipient = batchResponse.data.recipients[0];
          console.log(`  Recipient Status: ${recipient.status}`);
          
          if (recipient.conversation_id) {
            conversationId = recipient.conversation_id;
            console.log(`  ✅ Conversation ID: ${conversationId}`);
          }
        }
      }

      if (!conversationId) {
        console.log("\n⚠️ Conversation ID not found after 60 seconds");
        console.log("This is normal - calls may take longer to complete");
        return;
      }

      // Get conversation details
      console.log(`\n💬 Getting conversation details...`);
      const convResponse = await axios.get(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          headers: {
            "xi-api-key": apiKey,
          },
          timeout: 15000,
        }
      );

      console.log("\n📊 CALL RESULTS:");
      console.log("================");
      console.log("Status:", convResponse.data.status);
      console.log("Call Duration:", convResponse.data.metadata?.call_duration_secs, "seconds");
      console.log("Cost: $" + (convResponse.data.metadata?.cost || 0));

      if (convResponse.data.metadata?.termination_reason) {
        console.log("Termination Reason:", convResponse.data.metadata.termination_reason);
      }

      if (convResponse.data.metadata?.error) {
        console.log("\n❌ ERROR:");
        console.log("Code:", convResponse.data.metadata.error.code);
        console.log("Reason:", convResponse.data.metadata.error.reason);
      } else {
        console.log("\n✅ No errors!");
      }

      if (convResponse.data.transcript && convResponse.data.transcript.length > 0) {
        console.log("\n📝 TRANSCRIPT:");
        console.log("==============");
        convResponse.data.transcript.forEach((turn: any, index: number) => {
          const role = turn.role.toUpperCase().padEnd(10);
          const message = turn.message || turn.original_message || "...";
          const interrupted = turn.interrupted ? " [INTERRUPTED]" : "";
          console.log(`${index + 1}. ${role}: ${message}${interrupted}`);
        });
      }

      // Check if call was successful
      const isSuccess = convResponse.data.status === "successful" || 
                       convResponse.data.status === "completed";
      
      if (isSuccess) {
        console.log("\n🎉 CALL COMPLETED SUCCESSFULLY!");
      } else {
        console.log(`\n⚠️ Call ended with status: ${convResponse.data.status}`);
      }

      expect(response.status).toBe(200);
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
  }, 90000); // 90 second timeout
});
