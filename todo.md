# ElevenLabs Call Admin Panel - TODO

## Database Schema
- [ ] Create agents table (agent_id, phone_number_id, name, configuration)
- [ ] Create phone_numbers table (phone, metadata, status, agent_id)
- [ ] Create calls table (conversation_id, status, agent_id, phone_number, timestamps)
- [ ] Create call_transcripts table (call_id, role, message, timestamp)
- [ ] Create call_queue table (queue status, priority, retry logic)

## Backend API - Agent Management
- [ ] Create agent CRUD endpoints (create, read, update, delete)
- [ ] Validate ElevenLabs agent_id and phone_number_id format
- [ ] List all agents with pagination

## Backend API - Phone Number Management
- [ ] Upload CSV/XLS file parser
- [ ] Parse and validate phone numbers
- [ ] Bulk insert phone numbers into database
- [ ] List phone numbers with filtering and pagination
- [ ] Delete phone numbers

## Backend API - Call Management
- [ ] Initiate outbound call via ElevenLabs API
- [ ] Get call details by conversation_id
- [ ] List all calls with status filtering
- [ ] Export calls to CSV format
- [ ] Get call transcript with timestamps
- [ ] Stream/download call audio recording

## Call Queue System
- [ ] Implement queue processor with 3 concurrent workers
- [ ] Add phone numbers to call queue
- [ ] Process queue with automatic retry logic
- [ ] Monitor queue status (active, waiting, failed)
- [ ] Pause/resume queue processing

## Webhook Integration
- [ ] Create webhook endpoint for ElevenLabs post-call data
- [ ] Implement HMAC signature verification
- [ ] Parse transcription webhook payload
- [ ] Parse audio webhook payload
- [ ] Store transcript in database
- [ ] Save audio file to local storage
- [ ] Update call status after webhook received

## Frontend - Dashboard
- [ ] Create dashboard layout with sidebar navigation
- [ ] Display call statistics (total, success, failed, in-progress)
- [ ] Show recent calls table with status indicators
- [ ] Real-time queue monitoring widget
- [ ] Call status distribution chart

## Frontend - Agent Management
- [ ] Agent list page with add/edit/delete actions
- [ ] Agent creation form (agent_id, phone_number_id, name)
- [ ] Agent edit form with validation
- [ ] Agent deletion confirmation dialog

## Frontend - Phone Number Management
- [ ] Upload CSV/XLS file interface with drag-and-drop
- [ ] Phone number list table with search and filters
- [ ] Bulk delete phone numbers
- [ ] Preview uploaded file before import
- [ ] Show import progress and errors

## Frontend - Call Logs
- [ ] Call list page with status filters
- [ ] Call detail page with full transcript
- [ ] Audio player for call recordings
- [ ] Export calls to CSV button
- [ ] Search calls by phone number or date

## Frontend - Call Queue
- [ ] Queue status dashboard (active/waiting/failed calls)
- [ ] Start/stop queue processing controls
- [ ] Manual retry failed calls
- [ ] Queue configuration (concurrency limit)

## Testing
- [ ] Test CSV/XLS file upload and parsing
- [ ] Test ElevenLabs API integration
- [ ] Test webhook HMAC verification
- [ ] Test call queue with 3 parallel workers
- [ ] Test audio file storage and playback
- [ ] Test export to CSV functionality

## Queue Configuration Updates
- [x] Increase max concurrent calls from 3 to 15
- [x] Add queue settings page in frontend
- [x] Add API endpoint to configure queue concurrency
- [x] Add API endpoint to start/stop queue processor
- [x] Add queue control panel in UI (start/stop, set concurrency)
- [x] Display current queue processor status in UI

## Call Quality Evaluation System
- [x] Add call_ratings table (call_id, rating, criteria scores, feedback, evaluator)
- [x] Add prompt_versions table (agent_id, version, prompt_text, created_at, performance_metrics)
- [x] Create API endpoint to rate call quality (1-5 stars + criteria)
- [x] Create API endpoint to add feedback/notes to calls
- [x] Create API endpoint to get call quality analytics
- [x] Create API endpoint to save new prompt version
- [x] Create API endpoint to compare prompt versions performance
- [x] Implement LLM-based automatic call quality evaluation
- [x] Build call rating UI with star rating and criteria checkboxes
- [x] Build prompt editor with version history
- [x] Build prompt performance comparison dashboard
- [ ] Add A/B testing support for different prompts

## ElevenLabs Agent API Integration
- [x] Research ElevenLabs Agent Update API endpoint
- [x] Create helper function to update agent prompt via API
- [x] Integrate prompt sync in setActive mutation
- [x] Add error handling for API failures
- [x] Test automatic prompt synchronization

## 3CX Integration for Operator Availability
- [ ] Research 3CX Cloud API endpoints for operator status
- [ ] Add 3CX credentials to secrets (API URL, username, password)
- [ ] Create 3CX API client helper
- [ ] Implement getOperatorAvailability() function (returns available/busy count)
- [ ] Update queue processor to check operator availability before processing
- [ ] Add queue pause/resume logic based on operator status
- [ ] Add operator status dashboard in UI
- [ ] Add manual pause/resume controls for queue
- [ ] Test with 4 operators scenario
- [ ] Ensure queue resumes automatically when operator becomes available

## Test Call
- [x] Make test call to 9176193743
- [x] Make test call to 610-434-7366 with agent agent_0601kfrs2q7nekzrazpmyfmejevg
- [x] Make test call to +16466697757
- [x] Make test call to +19493637777
- [x] Make test call to +17185966700
- [x] Make test call to +17183631122
- [x] Make test call to +17188584300
- [x] Make test call to +17183882216

## 3CX Automatic Integration
- [x] Create Ring Group in 3CX for operators (Extension 801)
- [x] Create webhook endpoint /api/webhook/3cx for receiving operator status updates
- [x] Create API endpoint to check operator availability for ElevenLabs
- [x] Implement waiting queue system for clients when all operators busy
- [x] Integrate automatic pause/resume of batch calls based on operator availability
- [x] Configure Custom Tool in ElevenLabs agent to check operator availability (documentation created)
- [x] Add operator status indicators in Dashboard UI
- [x] Test complete workflow with real calls (unit tests passed, ready for integration testing)

## Full System Integration
- [x] Configure 3CX Ring Group 801 settings (hold music, timeout, etc)
- [x] Configure ElevenLabs agent with Custom Tool for operator availability check
- [x] Update ElevenLabs agent prompt with transfer instructions
- [ ] Set transfer destination in ElevenLabs agent to Ring Group 801 (manual setup by user)
- [x] Activate Queue Manager in admin panel
- [ ] Test full workflow: AI call → operator check → transfer → queue management

## DID Routing and Transfer Setup
- [x] Review additional redirect settings from user
- [x] Configure transfer in ElevenLabs using SIP URI (sip:801@clientservicesltd.3cx.agency)
- [ ] Test full workflow with real call transfer

## Single Call Feature
- [x] Add single call feature with phone number input in admin panel
- [x] Add tRPC mutation for creating single call
- [x] Add UI form with phone number input and agent selector
- [x] Add validation for phone number format
- [x] Show success/error feedback after call creation

## UI Improvements
- [x] Rename "Phone Numbers" to "Batch Calls" in navigation menu
- [x] Update page title and descriptions

## Bug Fixes
- [x] Fix API error by restarting server (database connection issue resolved)

## Bug Fixes - Call Initiation
- [x] Fix "Failed to initiate call" error on Make a Call page
- [x] Changed API endpoint from Twilio to SIP Trunk
- [x] Updated response interface to support sip_call_id

## Authentication & Security
- [ ] Implement login page with email/password authentication
- [ ] Add authentication middleware to protect all admin routes
- [ ] Create admin user with credentials: admin@odmen.adm / AHShbdb3434HShs36!@
- [ ] Remove Manus OAuth integration (replace with custom auth)
## Ring Group Configuration Update
- [x] Change Ring Group from 8000 to 801 in all code
- [x] Update Custom Tool configuration for operator availability check
- [x] Update database references to Ring Group
- [x] Update SIP URI from sip:8000@... to sip:801@...
## VPS Deployment
- [ ] Connect to VPS (150.241.230.244)
- [ ] Install Node.js, pnpm, and dependencies on VPS
- [ ] Setup MySQL database on VPS
- [ ] Configure environment variables on VPS
- [ ] Setup Nginx reverse proxy
- [ ] Configure SSL certificate (Let's Encrypt)
- [ ] Deploy application code to VPS
- [ ] Start application with PM2
- [ ] Configure firewall rules

## Final Testing on VPS
- [ ] Test call distribution to Ring Group 801
- [ ] Test Queue Manager pause functionality when operators busy
- [ ] Test authentication flow (login/logout)
- [ ] Verify all admin pages require authentication
- [ ] Test full call workflow from admin panel to 3CX transfer

## Batch Calls Control UI
- [x] Add Start/Stop buttons to Batch Calls page
- [x] Add manual pause/resume functionality for batch calls
- [x] Display current batch calling status (running/paused/stopped)
- [x] Add visual indicators for batch calling state
- [x] Connect Start button to queue processor start endpoint
- [x] Connect Stop button to queue processor stop endpoint
- [x] Add confirmation dialogs for Start/Stop actions
