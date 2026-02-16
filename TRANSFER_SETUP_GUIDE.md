# ElevenLabs Transfer Setup Guide

## Overview
This guide explains how to configure call transfer functionality in your ElevenLabs agent to transfer calls to your 3CX Ring Group.

## Prerequisites
- ✅ ElevenLabs agent "TESTED" (agent_8301kfgw54f5eekabw8htz6ekgnw)
- ✅ 3CX Ring Group 801 configured with operators 1000, 2000, 3000, 4000
- ✅ Ring Group strategy: Ring All (first to answer gets the call)
- ✅ Custom Tool configured for operator availability check
- ✅ Original agent prompt restored with transfer logic

## Transfer Configuration

### Step 1: Access ElevenLabs Dashboard
1. Go to https://elevenlabs.io/app/conversational-ai
2. Select agent "TESTED" from your agents list

### Step 2: Configure Transfer Settings
Look for the "Transfer" or "Call Transfer" section in the agent configuration.

**Settings:**
- **Transfer Type**: `Conference`
- **Destination Type**: `SIP URI`
- **SIP URI**: `sip:801@clientservicesltd.3cx.agency`
- **Transfer Condition**: `customer wants to speak with operator` or `true`

### Step 3: Verify Configuration
Make sure all settings are saved. The agent will now be able to transfer calls to your 3CX Ring Group.

## How It Works

### Call Flow
1. **AI Agent answers** the call and starts conversation
2. **During conversation**, agent checks if transfer is needed based on:
   - Customer asks questions AI can't answer
   - Customer needs sensitive account information
   - Customer wants to speak with someone senior
   - Conversation needs specialized fraud support
3. **Before transfer**, agent calls Custom Tool to check operator availability
4. **If operators available**:
   - Agent says: "No problem, let me get you over to our senior fraud advisor right now. They'll be able to help you with that. One moment please."
   - Agent transfers call to `sip:801@clientservicesltd.3cx.agency`
   - 3CX Ring Group 801 rings all 4 operators simultaneously
   - First operator to answer gets the call
5. **If all operators busy**:
   - Queue Manager automatically pauses batch calls
   - Customer waits with hold music
   - When operator becomes available, Queue Manager resumes calls

### Transfer Logic in Agent Prompt
The agent prompt already includes proper transfer conditions:

```
## Transfer Conditions
Transfer when:
- They ask questions you can't answer
- They need sensitive account information
- They want to speak with someone senior
- The conversation needs specialized fraud support

## Transfer Script
"No problem, let me get you over to our senior fraud advisor right now. They'll be able to help you with that. One moment please."
[Then call the transfer_call function]
```

## Testing

### Create Test Call
1. Open admin panel dashboard
2. Start Queue Manager if not already running
3. Create a test call using agent "TESTED"
4. During the call, trigger transfer by:
   - Asking for sensitive information
   - Requesting to speak with a supervisor
   - Asking questions the AI can't answer

### Verify Transfer
1. Call should be transferred to Ring Group 801
2. All 4 operators (1000, 2000, 3000, 4000) should ring simultaneously
3. First operator to answer gets the call
4. Check call logs in admin panel for transfer status

## Troubleshooting

### Transfer Not Working
- Verify SIP URI is correct: `sip:801@clientservicesltd.3cx.agency`
- Check that Ring Group 801 exists in 3CX
- Verify operators 1000, 2000, 3000, 4000 are members of Ring Group 801
- Check 3CX logs for incoming SIP calls

### Operators Not Ringing
- Verify Ring Group strategy is set to "Ring All"
- Check operator extensions are registered in 3CX
- Verify operators are not in DND (Do Not Disturb) mode

### Custom Tool Not Working
- Verify Custom Tool is configured in ElevenLabs agent
- Check that webhook URL is accessible: `https://3000-iyl7zrihvqk45vi1v5xxd-3ba1e40f.us1.manus.computer/api/operators/check-availability`
- Verify Queue Manager is running in admin panel

## Additional Resources
- [ELEVENLABS_CUSTOM_TOOL_SETUP.md](./ELEVENLABS_CUSTOM_TOOL_SETUP.md) - Custom Tool configuration guide
- [3CX Ring Group Documentation](https://www.3cx.com/docs/ring-groups/)
- [ElevenLabs Conversational AI Docs](https://elevenlabs.io/docs/conversational-ai)
