import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { getTelemetryMetadata } from './telemetryMetadata';
import { api } from './api';

export const LOG_BUFFER_STORAGE_KEY = '@csf:log_buffer';
export const MAX_BUFFER_SIZE = 200;
export const FLUSH_THRESHOLD = 20;
export const FLUSH_INTERVAL_MS = 30_000;
export const MAX_BATCH_SIZE = 50;
export const MAX_MESSAGE_LENGTH = 8 * 1024;

export type MobileLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface MobileLogEntry {
  level: MobileLogLevel;
  tag: string;
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface MobileLogBatchPayload {
  clientTimestamp: string;
  os: 'android' | 'ios' | 'web' | 'unknown';
  osVersion: string;
  appVersion: string;
  appBuild: string;
  entries: MobileLogEntry[];
}

function truncateString(value: string | undefined, maxLength = MAX_MESSAGE_LENGTH): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const str = String(value);
  return str.length <= maxLength ? str : str.slice(0, maxLength);
}

class LogBufferService {
  private buffer: MobileLogEntry[] = [];
  private isHydrated = false;
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private currentAppState: AppStateStatus =
    (AppState.currentState as AppStateStatus | null) ?? 'active';

  async hydrate(): Promise<void> {
    if (this.isHydrated) {
      return;
    }
    this.isHydrated = true;
    try {
      const raw = await AsyncStorage.getItem(LOG_BUFFER_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const combined = [...parsed, ...this.buffer];
        this.buffer = combined.slice(-MAX_BUFFER_SIZE);
      }
    } catch {
      // Ignore corrupted storage and start fresh
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOG_BUFFER_STORAGE_KEY, JSON.stringify(this.buffer));
    } catch {
      // Ignore storage write failures
    }
  }

  async enqueue(entry: MobileLogEntry): Promise<void> {
    if (!this.isHydrated) {
      await this.hydrate();
    }

    const sanitizedEntry: MobileLogEntry = {
      level: entry.level,
      tag: truncateString(entry.tag, 64) ?? 'MOBILE_LOG',
      message: truncateString(entry.message, MAX_MESSAGE_LENGTH) ?? 'Unknown error',
      ...(entry.stack ? { stack: truncateString(entry.stack, MAX_MESSAGE_LENGTH) } : {}),
      timestamp: entry.timestamp || new Date().toISOString(),
      ...(entry.context ? { context: entry.context } : {}),
    };

    this.buffer.push(sanitizedEntry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_SIZE);
    }

    await this.persist();

    if (this.buffer.length >= FLUSH_THRESHOLD) {
      void this.flush();
    }
  }

  async recordApiError(error: any): Promise<void> {
    const config = error?.config ?? error?.response?.config;
    const url: string = config?.url ?? '';

    // Avoid infinite recursion if the log ingestion endpoint itself fails
    if (url.includes('/logs/mobile')) {
      return;
    }

    const method = (config?.method ?? 'GET').toUpperCase();
    const status: number | undefined = error?.response?.status;
    const startTime: number | undefined = config?._requestStartTime;
    const durationMs =
      typeof startTime === 'number' ? Math.max(0, Date.now() - startTime) : undefined;
    const requestId: string | undefined =
      error?.response?.headers?.['x-request-id'] ??
      error?.response?.headers?.['X-Request-Id'];

    const isServerError = typeof status === 'number' && status >= 500;
    const level: MobileLogLevel = isServerError || !status ? 'ERROR' : 'WARN';
    const message = status
      ? `HTTP ${status} on ${method} ${url}`
      : `Network error on ${method} ${url}: ${error?.message ?? 'Unknown network error'}`;

    const context: Record<string, unknown> = {
      url,
      method,
      ...(status !== undefined ? { status } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(requestId ? { requestId } : {}),
    };

    await this.enqueue({
      level,
      tag: 'API_ERROR',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  async recordUnhandledException(
    error: unknown,
    isFatal = false,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const errObj = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
    await this.enqueue({
      level: 'ERROR',
      tag: 'UNHANDLED_EXCEPTION',
      message: `${errObj.name}: ${errObj.message}`,
      stack: errObj.stack,
      timestamp: new Date().toISOString(),
      context: {
        isFatal,
        ...context,
      },
    });
  }

  async recordUnhandledRejection(
    reason: unknown,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const errObj =
      reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled promise rejection'));
    await this.enqueue({
      level: 'ERROR',
      tag: 'UNHANDLED_PROMISE_REJECTION',
      message: `${errObj.name}: ${errObj.message}`,
      stack: errObj.stack,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  async flush(): Promise<boolean> {
    if (this.isFlushing) {
      return false;
    }

    if (!this.isHydrated) {
      await this.hydrate();
    }

    if (this.buffer.length === 0) {
      return true;
    }

    this.isFlushing = true;
    const batchEntries = this.buffer.slice(0, MAX_BATCH_SIZE);
    this.buffer = this.buffer.slice(batchEntries.length);

    const metadata = getTelemetryMetadata();
    const payload: MobileLogBatchPayload = {
      clientTimestamp: new Date().toISOString(),
      os: metadata['X-OS'],
      osVersion: metadata['X-OS-Version'],
      appVersion: metadata['X-App-Version'],
      appBuild: metadata['X-App-Build'],
      entries: batchEntries,
    };

    try {
      await api.post('/logs/mobile', payload);
      await this.persist();
      this.isFlushing = false;
      return true;
    } catch {
      // Restore unshipped entries at the front of the buffer (respecting MAX_BUFFER_SIZE FIFO cap)
      const restored = [...batchEntries, ...this.buffer];
      this.buffer = restored.slice(-MAX_BUFFER_SIZE);
      await this.persist();
      this.isFlushing = false;
      return false;
    }
  }

  initialize(): () => void {
    void this.hydrate();

    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, FLUSH_INTERVAL_MS);
      if (typeof (this.flushTimer as any)?.unref === 'function') {
        (this.flushTimer as any).unref();
      }
    }

    if (!this.appStateSubscription) {
      const initialState = AppState.currentState as AppStateStatus | null;
      this.currentAppState =
        initialState === 'background' || initialState === 'inactive' ? initialState : 'active';
      this.appStateSubscription = AppState.addEventListener(
        'change',
        (nextAppState: AppStateStatus) => {
          const wasActive = this.currentAppState === 'active';
          const isGoingToBackground =
            nextAppState === 'background' || nextAppState === 'inactive';

          this.currentAppState = nextAppState;

          if (wasActive && isGoingToBackground) {
            void this.flush();
          }
        },
      );
    }

    return () => {
      this.dispose();
    };
  }

  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  getBuffer(): MobileLogEntry[] {
    return [...this.buffer];
  }

  async clear(): Promise<void> {
    this.buffer = [];
    this.isHydrated = true;
    this.isFlushing = false;
    try {
      await AsyncStorage.removeItem(LOG_BUFFER_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  resetForTesting(): void {
    this.dispose();
    this.buffer = [];
    this.isHydrated = false;
    this.isFlushing = false;
  }
}

export const logBufferService = new LogBufferService();
