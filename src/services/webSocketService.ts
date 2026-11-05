import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import { BASE_URL, getAuthToken, triggerUnauthorized } from './api';

interface UseWebSocketOptions {
  url: string;
  isAuthenticated: boolean;
  onMessage?: (data: unknown) => void;
}

function toWebSocketUrl(url: string) {
  return url.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
}

function joinPath(base: string, suffix: string) {
  return `${base.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
}

const notificationDestination = '/user/queue/notifications';
const reconnectDelay = 5000;
const heartbeatInterval = 10000;

function isAuthenticationError(frame: IFrame) {
  const errorText = `${frame.headers.message ?? ''} ${frame.body}`.toLowerCase();
  return /auth|unauthor|forbidden|invalid token|expired|jwt|401|403/.test(errorText);
}

function deliverMessage(message: IMessage, onMessage: ((data: unknown) => void) | undefined) {
  if (!onMessage) {
    console.log('[WebSocket] Notification received, but no message handler is registered');
    return;
  }

  try {
    const parsed = JSON.parse(message.body);
    onMessage(parsed);
    console.log('[WebSocket] Notification received:', parsed);
  } catch {
    onMessage(message.body);
    console.log('[WebSocket] Notification received as text:', message.body);
  }
}

export const useWebSocket = ({ url, isAuthenticated, onMessage }: UseWebSocketOptions) => {
  const clientRef = useRef<Client | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const onMessageRef = useRef(onMessage);
  const deactivationRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      await deactivationRef.current;
      return;
    }

    clientRef.current = null;
    console.log('[WebSocket] Deactivating STOMP client');
    const deactivation = client.deactivate({ force: true });
    deactivationRef.current = deactivation;
    await deactivation;
    if (deactivationRef.current === deactivation) {
      deactivationRef.current = null;
    }
  }, []);

  const createClient = useCallback(() => {
    const endpoint = joinPath(url || BASE_URL, '/ws-native');
    const client = new Client({
      brokerURL: toWebSocketUrl(endpoint),
      reconnectDelay,
      maxReconnectDelay: 30000,
      connectionTimeout: 8000,
      heartbeatIncoming: heartbeatInterval,
      heartbeatOutgoing: heartbeatInterval,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
    });

    client.beforeConnect = async () => {
      const token = await getAuthToken();
      if (!token) {
        console.log('[WebSocket] Connection skipped: no auth token found');
        client.reconnectDelay = 0;
        await client.deactivate({ force: true });
        return;
      }

      client.connectHeaders = {
        Authorization: `Bearer ${token}`,
      };
      console.log('[WebSocket] Connecting to STOMP endpoint');
    };

    client.onConnect = (frame) => {
      console.log('[WebSocket] STOMP CONNECTED:', frame.headers.session ?? '(no session id)');
      client.subscribe(
        notificationDestination,
        (message) => deliverMessage(message, onMessageRef.current),
        { ack: 'auto' },
      );
      console.log('[WebSocket] Subscribed to:', notificationDestination);
    };

    client.onStompError = (frame) => {
      console.error('[WebSocket] STOMP ERROR:', {
        message: frame.headers.message,
        body: frame.body,
      });
      if (isAuthenticationError(frame)) {
        client.reconnectDelay = 0;
        triggerUnauthorized();
        void client.deactivate({ force: true });
      }
    };

    client.onWebSocketError = (event) => {
      console.error('[WebSocket] WebSocket error:', event);
    };

    client.onWebSocketClose = (event) => {
      console.log('[WebSocket] WebSocket close:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    };

    if (__DEV__) {
      client.debug = (message) => {
        const redactedMessage = message.replace(/(authorization:\s*bearer\s+)\S+/gi, '$1[REDACTED]');
        console.log('[WebSocket][STOMP]', redactedMessage);
      };
    }

    clientRef.current = client;
    return client;
  }, [url]);

  const connect = useCallback(async () => {
    if (!isAuthenticated || AppState.currentState !== 'active') return;

    await deactivationRef.current;
    if (clientRef.current?.active) return;

    const client = clientRef.current ?? createClient();
    if (!client.active) {
      console.log('[WebSocket] Activating STOMP client');
      client.activate();
    }
  }, [createClient, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && AppState.currentState === 'active') {
      void connect();
    } else if (!isAuthenticated) {
      void disconnect();
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isComingFromBackground =
        appState.current.match(/inactive|background/) && nextAppState === 'active';
      const isGoingToBackground = nextAppState.match(/inactive|background/);

      if (isComingFromBackground) {
        void connect();
      } else if (isGoingToBackground) {
        void disconnect();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      void disconnect();
    };
  }, [connect, disconnect, isAuthenticated]);
};