# ElevenLabs Custom Tool Setup Guide

## Overview

This guide explains how to configure a Custom Tool in your ElevenLabs AI agent to check operator availability before transferring calls.

## Custom Tool Configuration

### 1. Tool Definition

Add this Custom Tool to your ElevenLabs agent configuration:

**Tool Name:** `check_operator_availability`

**Description:** 
```
Check if human operators are available to take a transferred call. Returns the number of available operators and whether any are free to take calls.
```

**API Endpoint:**
```
https://3000-iyl7zrihvqk45vi1v5xxd-3ba1e40f.us1.manus.computer/api/trpc/operators.checkAvailability
```

**HTTP Method:** `GET`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Response Schema:**
```json
{
  "type": "object",
  "properties": {
    "result": {
      "type": "object",
      "properties": {
        "data": {
          "type": "object",
          "properties": {
            "totalOperators": {
              "type": "number",
              "description": "Total number of operators (always 4)"
            },
            "busyOperators": {
              "type": "number",
              "description": "Number of currently busy operators"
            },
            "availableOperators": {
              "type": "number",
              "description": "Number of available operators"
            },
            "isAnyAvailable": {
              "type": "boolean",
              "description": "True if at least one operator is available"
            },
            "lastChecked": {
              "type": "string",
              "description": "Timestamp of last check"
            }
          }
        }
      }
    }
  }
}
```

### 2. Agent Prompt Instructions

Add these instructions to your agent's system prompt:

```
IMPORTANT: Before offering to transfer the customer to a human operator, you MUST:

1. Call the check_operator_availability tool
2. Check the isAnyAvailable field in the response
3. Only offer transfer if isAnyAvailable is true

If isAnyAvailable is false (all operators busy):
- Tell the customer: "All our operators are currently assisting other customers"
- Offer alternatives:
  a) "Would you like to hold while I wait for the next available operator?"
  b) "I can take your number and have someone call you back within 10 minutes"
  c) "I can try to help you myself - what do you need assistance with?"

If isAnyAvailable is true:
- Proceed with transfer to extension 801
- Say: "Let me transfer you to one of our operators right away"

After successful transfer:
- The system will automatically connect to the first available operator
- Ring Group 801 will ring all 4 operators simultaneously
- Whoever answers first gets the call
```

### 3. Transfer Configuration

**Transfer Destination:** `801` (Ring Group for all operators)

**Transfer Type:** Warm Transfer (recommended) or Blind Transfer

**Operators in Ring Group 801:**
- Extension 1000: Slobodan Starn
- Extension 2000: Operator 2000
- Extension 3000: Operator 3000
- Extension 4000: Operator 4000

**Ring Strategy:** Ring All (simultaneous ringing)

## Workflow Example

### Scenario 1: Operators Available

```
Customer: "I need to speak with someone"
AI: [calls check_operator_availability]
AI: [receives isAnyAvailable: true]
AI: "Of course! Let me transfer you to one of our operators right away."
AI: [transfers to 801]
→ All 4 operators ring
→ First to answer gets the call
→ Batch calls continue normally
```

### Scenario 2: All Operators Busy

```
Customer: "I need to speak with someone"
AI: [calls check_operator_availability]
AI: [receives isAnyAvailable: false]
AI: "All our operators are currently assisting other customers. Would you like to hold while I wait for the next available operator, or shall I take your number for a callback?"

Customer: "I'll hold"
AI: "Perfect, please hold while I connect you."
AI: [transfers to 801 - customer hears hold music]
→ Queue Manager automatically PAUSES batch calls
→ System monitors operator availability every 10 seconds
→ When operator becomes free, call connects
→ Queue Manager automatically RESUMES batch calls
```

### Scenario 3: Customer Prefers Callback

```
Customer: "Can you call me back?"
AI: "Absolutely! What's the best number to reach you?"
Customer: "555-1234"
AI: "Got it - 555-1234. We'll call you back within 10 minutes."
AI: [saves callback request to system]
→ Operator calls back when available
```

## Testing the Integration

### Test 1: Check API Endpoint

```bash
curl "https://3000-iyl7zrihvqk45vi1v5xxd-3ba1e40f.us1.manus.computer/api/trpc/operators.checkAvailability"
```

Expected response:
```json
{
  "result": {
    "data": {
      "totalOperators": 4,
      "busyOperators": 0,
      "availableOperators": 4,
      "isAnyAvailable": true,
      "lastChecked": "2026-01-25T10:30:00.000Z"
    }
  }
}
```

### Test 2: Simulate Busy Operators

From the admin panel:
1. Go to Dashboard
2. Click "Start Queue Manager"
3. Manually mark operators as busy for testing
4. Verify AI behavior changes

### Test 3: End-to-End Call Flow

1. Make a test call to your AI agent
2. Request to speak with an operator
3. Verify AI checks availability before offering transfer
4. Verify transfer works correctly
5. Check that batch calls pause/resume automatically

## Troubleshooting

### AI doesn't check availability before transfer

- Verify Custom Tool is properly configured in ElevenLabs
- Check that tool name matches exactly: `check_operator_availability`
- Verify API endpoint is accessible
- Review agent prompt includes the MUST check instruction

### Transfer fails

- Verify Ring Group 801 exists in 3CX
- Check all 4 operators are added to the group
- Verify Ring Strategy is set to "Ring All"
- Test manual transfer to 801 from 3CX

### Queue doesn't pause when all busy

- Start Queue Manager from admin panel
- Check operator availability service is running
- Verify batch calls are active
- Check server logs for errors

## Admin Panel Controls

Access the admin panel to:

1. **Start/Stop Queue Manager**
   - Automatic pause/resume based on operator availability

2. **View Operator Status**
   - Real-time display of available/busy operators

3. **Manual Queue Control**
   - Emergency pause/resume if needed

4. **Monitor Active Transfers**
   - See current calls being transferred

## Support

For issues or questions:
- Check server logs: `/home/ubuntu/elevenlabs_call_admin/`
- Review queue processor status in admin panel
- Test API endpoints manually with curl
- Verify 3CX Ring Group configuration
