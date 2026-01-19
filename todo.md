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
