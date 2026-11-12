import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { api } from '../api';
import {
  FLUSH_THRESHOLD,
  LOG_BUFFER_STORAGE_KEY,
  MAX_BUFFER_SIZE,
  logBufferService,
} from '../logBufferService';

describe('logBufferService', () => {
  let postSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    logBufferService.resetForTesting();
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: { status: 'accepted', ingested: 1 } });
  });

  afterEach(() => {
    logBufferService.resetForTesting();
    postSpy.mockRestore();
  });

  test('persists enqueued log entries to AsyncStorage under @csf:log_buffer', async () => {
    await logBufferService.enqueue({
      level: 'ERROR',
      tag: 'UNHANDLED_EXCEPTION',
      message: 'TypeError: Cannot read property id of undefined',
      timestamp: '2026-11-06T19:29:55.120Z',
      context: { screen: '/(app)/(tabs)/dashboard' },
    });

    const buffer = logBufferService.getBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].tag).toBe('UNHANDLED_EXCEPTION');

    const rawStored = await AsyncStorage.getItem(LOG_BUFFER_STORAGE_KEY);
    expect(rawStored).not.toBeNull();
    const parsedStored = JSON.parse(rawStored!);
    expect(parsedStored).toHaveLength(1);
    expect(parsedStored[0].message).toBe('TypeError: Cannot read property id of undefined');
  });

  test('caps queue size at 200 items (FIFO) when network flush fails', async () => {
    postSpy.mockRejectedValue(new Error('Network offline'));

    for (let i = 1; i <= MAX_BUFFER_SIZE + 15; i++) {
      await logBufferService.enqueue({
        level: 'WARN',
        tag: 'API_ERROR',
        message: `Entry-${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    const buffer = logBufferService.getBuffer();
    expect(buffer).toHaveLength(MAX_BUFFER_SIZE);
    expect(buffer[0].message).toBe('Entry-16');
    expect(buffer[buffer.length - 1].message).toBe(`Entry-${MAX_BUFFER_SIZE + 15}`);

    const rawStored = await AsyncStorage.getItem(LOG_BUFFER_STORAGE_KEY);
    const parsedStored = JSON.parse(rawStored!);
    expect(parsedStored).toHaveLength(MAX_BUFFER_SIZE);
  });

  test('automatically triggers batch flush when buffer reaches 20 items', async () => {
    for (let i = 1; i <= FLUSH_THRESHOLD; i++) {
      await logBufferService.enqueue({
        level: 'ERROR',
        tag: 'API_ERROR',
        message: `Error ${i}`,
        timestamp: '2026-11-06T19:30:00.000Z',
      });
    }

    // Wait for async flush triggered at threshold
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      '/logs/mobile',
      expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({ message: 'Error 1' }),
          expect.objectContaining({ message: `Error ${FLUSH_THRESHOLD}` }),
        ]),
      }),
    );
    expect(logBufferService.getBuffer()).toHaveLength(0);
  });

  test('retains logs in storage when network fails and flushes them on next retry', async () => {
    postSpy.mockRejectedValueOnce(new Error('Timeout'));

    await logBufferService.enqueue({
      level: 'ERROR',
      tag: 'UNHANDLED_EXCEPTION',
      message: 'Offline crash',
      timestamp: '2026-11-06T19:30:00.000Z',
    });

    const firstAttempt = await logBufferService.flush();
    expect(firstAttempt).toBe(false);
    expect(logBufferService.getBuffer()).toHaveLength(1);

    // Next flush succeeds
    postSpy.mockResolvedValueOnce({ data: { status: 'accepted', ingested: 1 } });
    const secondAttempt = await logBufferService.flush();
    expect(secondAttempt).toBe(true);
    expect(logBufferService.getBuffer()).toHaveLength(0);

    const storedAfterSuccess = await AsyncStorage.getItem(LOG_BUFFER_STORAGE_KEY);
    expect(JSON.parse(storedAfterSuccess!)).toEqual([]);
  });

  test('flushes buffer when AppState transitions from active to background', async () => {
    let capturedListener: ((state: any) => void) | null = null;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type: any, listener: any) => {
        capturedListener = listener;
        return { remove: jest.fn() } as any;
      });

    const cleanup = logBufferService.initialize();

    await logBufferService.enqueue({
      level: 'WARN',
      tag: 'API_ERROR',
      message: 'HTTP 502 on GET /api/personais',
      timestamp: '2026-11-06T19:30:00.000Z',
    });

    expect(capturedListener).not.toBeNull();
    capturedListener!('background');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postSpy).toHaveBeenCalledWith(
      '/logs/mobile',
      expect.objectContaining({
        entries: [expect.objectContaining({ message: 'HTTP 502 on GET /api/personais' })],
      }),
    );

    cleanup();
    addEventListenerSpy.mockRestore();
  });
});
