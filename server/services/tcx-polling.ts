/**
 * 3CX Polling Service
 * Polls /xapi/v1/ActiveCalls to monitor operator status
 */

import axios from 'axios';
import { getSetting } from '../db';

const TCX_API_URL = process.env.TCX_API_URL || '';
const TCX_API_KEY = process.env.TCX_API_KEY || '';

// Extensions to monitor - loaded from database settings
let MONITORED_EXTENSIONS: string[] = ['1000']; // Default to extension 1000 only

// Poll interval in milliseconds (10 seconds)
const POLL_INTERVAL = 10000;

interface ActiveCall {
  Id: string;
  PartyNumber: string;
  PartyName: string;
  OtherPartyNumber: string;
  OtherPartyName: string;
  State: string;
  Direction: string;
  StartTime: string;
  AnswerTime?: string;
  Duration: number;
}

interface ActiveCallsResponse {
  '@odata.context': string;
  value: ActiveCall[];
}

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let pollingInterval: NodeJS.Timeout | null = null;
let isPolling = false;

// Callback for status changes
type StatusChangeCallback = (extension: string, isBusy: boolean) => void;
let statusChangeCallback: StatusChangeCallback | null = null;

// Track current busy status for each extension
const extensionStatus = new Map<string, boolean>();

/**
 * Load active extensions from database settings
 */
async function loadActiveExtensions(): Promise<void> {
  try {
    const activeExtensionsStr = await getSetting('active_extensions');
    if (activeExtensionsStr) {
      const extensions = activeExtensionsStr.split(',').map(e => e.trim()).filter(e => e);
      if (extensions.length > 0) {
        MONITORED_EXTENSIONS = extensions;
        console.log('[3CX Polling] Loaded active extensions:', MONITORED_EXTENSIONS.join(', '));
        
        // Reset status map
        extensionStatus.clear();
        MONITORED_EXTENSIONS.forEach(ext => extensionStatus.set(ext, false));
      }
    } else {
      // Set default if not configured
      console.log('[3CX Polling] No active extensions configured, using default: 1000');
      MONITORED_EXTENSIONS = ['1000'];
      extensionStatus.clear();
      extensionStatus.set('1000', false);
    }
  } catch (error) {
    console.error('[3CX Polling] Failed to load active extensions:', error);
  }
}

/**
 * Get OAuth2 access token
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      `${TCX_API_URL}/connect/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'www',
        client_secret: TCX_API_KEY,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    accessToken = response.data.access_token as string;
    const expiresIn = response.data.expires_in || 3600;
    tokenExpiresAt = Date.now() + expiresIn * 1000;

    console.log('[3CX Polling] Access token obtained, expires in', expiresIn, 'seconds');
    return accessToken;
  } catch (error: any) {
    console.error('[3CX Polling] Failed to get access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with 3CX API');
  }
}

/**
 * Fetch active calls from 3CX
 */
async function fetchActiveCalls(): Promise<ActiveCall[]> {
  try {
    const token = await getAccessToken();
    
    const response = await axios.get<ActiveCallsResponse>(
      `${TCX_API_URL}/xapi/v1/ActiveCalls`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    return response.data.value || [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token expired, clear cache and retry once
      accessToken = null;
      tokenExpiresAt = 0;
      console.log('[3CX Polling] Token expired, retrying...');
      
      const token = await getAccessToken();
      const response = await axios.get<ActiveCallsResponse>(
        `${TCX_API_URL}/xapi/v1/ActiveCalls`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );
      return response.data.value || [];
    }
    
    console.error('[3CX Polling] Failed to fetch active calls:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Check if an extension is busy based on active calls
 */
function isExtensionBusy(extension: string, activeCalls: ActiveCall[]): boolean {
  return activeCalls.some(call => {
    // Check if this extension is involved in the call
    const isParty = call.PartyNumber === extension;
    const isOtherParty = call.OtherPartyNumber === extension;
    
    // Consider busy if in an active call (Connected, Ringing, etc.)
    const isBusyState = ['Connected', 'Ringing', 'Dialing'].includes(call.State);
    
    return (isParty || isOtherParty) && isBusyState;
  });
}

/**
 * Poll active calls and update operator status
 */
async function pollActiveCalls() {
  if (!isPolling) return;

  try {
    const activeCalls = await fetchActiveCalls();
    
    // Check each monitored extension
    for (const extension of MONITORED_EXTENSIONS) {
      const wasBusy = extensionStatus.get(extension) || false;
      const isBusy = isExtensionBusy(extension, activeCalls);
      
      // Status changed?
      if (wasBusy !== isBusy) {
        console.log(`[3CX Polling] Extension ${extension} status changed: ${wasBusy ? 'Busy' : 'Available'} -> ${isBusy ? 'Busy' : 'Available'}`);
        extensionStatus.set(extension, isBusy);
        
        // Notify callback
        if (statusChangeCallback) {
          statusChangeCallback(extension, isBusy);
        }
      }
    }
  } catch (error: any) {
    console.error('[3CX Polling] Error during polling:', error.message);
  }
}

/**
 * Start polling
 */
export async function startPolling(callback?: StatusChangeCallback) {
  if (isPolling) {
    console.log('[3CX Polling] Already polling');
    return;
  }

  // Load active extensions from database
  await loadActiveExtensions();

  console.log('[3CX Polling] Starting polling every', POLL_INTERVAL, 'ms');
  isPolling = true;
  
  if (callback) {
    statusChangeCallback = callback;
  }

  // Initial poll
  pollActiveCalls();

  // Start interval
  pollingInterval = setInterval(pollActiveCalls, POLL_INTERVAL);
}

/**
 * Stop polling
 */
export function stopPolling() {
  if (!isPolling) {
    console.log('[3CX Polling] Not polling');
    return;
  }

  console.log('[3CX Polling] Stopping polling');
  isPolling = false;

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Get current status of all monitored extensions
 */
export function getExtensionStatuses(): Record<string, boolean> {
  const statuses: Record<string, boolean> = {};
  extensionStatus.forEach((isBusy, extension) => {
    statuses[extension] = isBusy;
  });
  return statuses;
}

/**
 * Check if all monitored extensions are busy
 */
export function areAllExtensionsBusy(): boolean {
  return MONITORED_EXTENSIONS.every(ext => extensionStatus.get(ext) === true);
}

/**
 * Check if any extension is available
 */
export function isAnyExtensionAvailable(): boolean {
  return MONITORED_EXTENSIONS.some(ext => extensionStatus.get(ext) === false);
}


/**
 * Reload active extensions from database (call after updating settings)
 */
export async function reloadActiveExtensions(): Promise<void> {
  await loadActiveExtensions();
  console.log('[3CX Polling] Active extensions reloaded');
}

/**
 * Get list of currently monitored extensions
 */
export function getMonitoredExtensions(): string[] {
  return [...MONITORED_EXTENSIONS];
}
