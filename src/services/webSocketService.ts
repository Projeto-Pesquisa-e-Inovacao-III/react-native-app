import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
}

function toWebSocketUrl(url: string) {
  return url.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
}

export const useWebSocket = ({ url, onMessage }: UseWebSocketOptions) => {
  const ws = useRef<WebSocket | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (ws.current) {
     ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const readyState = ws.current?.readyState;
    if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(toWebSocketUrl(url + '/ws'));

    socket.onopen = () => {
      console.log('WebSocket connection established.');
    };

    socket.onmessage = (event) => {
      if (onMessageRef.current) {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current(parsed);
        } catch {
          onMessageRef.current(event.data);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket encountered error:', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.reason);
      if (ws.current === socket) {
        ws.current = null;
      }
    };

    ws.current = socket;
  }, [url]);

  useEffect(() => {
    // 1. Establish connection if app opens directly into active state
    if (AppState.currentState === 'active') {
      connect();
    }

    // 2. Listen for transition events between background and foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isComingFromBackground =
        appState.current.match(/inactive|background/) && nextAppState === 'active';
      const isGoingToBackground = nextAppState.match(/inactive|background/);

      if (isComingFromBackground) {
        connect();
      } else if (isGoingToBackground) {
        disconnect();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      disconnect();
    };
  }, [connect, disconnect]);

  const sendMessage = useCallback((payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }
  }, []);

  return { sendMessage };
};