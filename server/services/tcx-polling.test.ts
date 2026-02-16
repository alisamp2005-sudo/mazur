import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('3CX Polling Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for testing
    process.env.TCX_API_URL = 'https://test.3cx.agency';
    process.env.TCX_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully get OAuth2 access token', async () => {
    // Mock token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-token-123',
        expires_in: 3600,
        token_type: 'Bearer',
      },
    });

    // Import after mocking
    const { startPolling, stopPolling } = await import('./tcx-polling');

    // Start polling (will trigger token fetch)
    startPolling();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify token request was made
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://test.3cx.agency/connect/token',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );

    // Cleanup
    stopPolling();
  });

  it('should fetch active calls with valid token', async () => {
    // Mock token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-token-123',
        expires_in: 3600,
      },
    });

    // Mock active calls response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        '@odata.context': 'https://test.3cx.agency/xapi/v1/$metadata#ActiveCalls',
        value: [
          {
            Id: 'call-1',
            PartyNumber: '1000',
            OtherPartyNumber: '+1234567890',
            State: 'Connected',
            Direction: 'Outbound',
            StartTime: '2026-01-29T00:00:00Z',
            Duration: 120,
          },
        ],
      },
    });

    const { startPolling, stopPolling, getExtensionStatuses } = await import('./tcx-polling');

    // Start polling
    startPolling();

    // Wait for polling cycle
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify active calls request was made
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://test.3cx.agency/xapi/v1/ActiveCalls',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token-123',
        }),
      })
    );

    // Check extension statuses
    const statuses = getExtensionStatuses();
    expect(statuses).toHaveProperty('1000');
    expect(statuses).toHaveProperty('2000');
    expect(statuses).toHaveProperty('3000');
    expect(statuses).toHaveProperty('4000');

    // Extension 1000 should be busy (in active call)
    expect(statuses['1000']).toBe(true);

    // Cleanup
    stopPolling();
  });

  it('should detect when all extensions are busy', async () => {
    // Mock token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-token-123',
        expires_in: 3600,
      },
    });

    // Mock active calls with all extensions busy
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        '@odata.context': 'https://test.3cx.agency/xapi/v1/$metadata#ActiveCalls',
        value: [
          { Id: 'call-1', PartyNumber: '1000', State: 'Connected', Direction: 'Outbound', StartTime: '2026-01-29T00:00:00Z', Duration: 60 },
          { Id: 'call-2', PartyNumber: '2000', State: 'Connected', Direction: 'Outbound', StartTime: '2026-01-29T00:00:00Z', Duration: 60 },
          { Id: 'call-3', PartyNumber: '3000', State: 'Connected', Direction: 'Outbound', StartTime: '2026-01-29T00:00:00Z', Duration: 60 },
          { Id: 'call-4', PartyNumber: '4000', State: 'Connected', Direction: 'Outbound', StartTime: '2026-01-29T00:00:00Z', Duration: 60 },
        ],
      },
    });

    const { startPolling, stopPolling, areAllExtensionsBusy, isAnyExtensionAvailable } = await import('./tcx-polling');

    // Start polling
    startPolling();

    // Wait for polling cycle
    await new Promise(resolve => setTimeout(resolve, 200));

    // All extensions should be busy
    expect(areAllExtensionsBusy()).toBe(true);
    expect(isAnyExtensionAvailable()).toBe(false);

    // Cleanup
    stopPolling();
  });

  it('should detect when any extension is available', async () => {
    // Mock token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-token-123',
        expires_in: 3600,
      },
    });

    // Mock active calls with only one extension busy
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        '@odata.context': 'https://test.3cx.agency/xapi/v1/$metadata#ActiveCalls',
        value: [
          { Id: 'call-1', PartyNumber: '1000', State: 'Connected', Direction: 'Outbound', StartTime: '2026-01-29T00:00:00Z', Duration: 60 },
        ],
      },
    });

    const { startPolling, stopPolling, areAllExtensionsBusy, isAnyExtensionAvailable } = await import('./tcx-polling');

    // Start polling
    startPolling();

    // Wait for polling cycle
    await new Promise(resolve => setTimeout(resolve, 200));

    // Not all extensions are busy
    expect(areAllExtensionsBusy()).toBe(false);
    // At least one extension is available
    expect(isAnyExtensionAvailable()).toBe(true);

    // Cleanup
    stopPolling();
  });
});
