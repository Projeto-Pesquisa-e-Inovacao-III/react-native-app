import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

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

export const useWebSocket = ({ url, isAuthenticated, onMessage }: UseWebSocketOptions) => {
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
    if (!isAuthenticated) {
      disconnect();
      return;
    }

    const readyState = ws.current?.readyState;
    if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) return;

    const endpoint = joinPath(url, '/ws/websocket');
    const socket = new WebSocket(toWebSocketUrl(endpoint));

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
  }, [disconnect, isAuthenticated, url]);

  useEffect(() => {
    if (isAuthenticated && AppState.currentState === 'active') {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }

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
  }, [connect, disconnect, isAuthenticated]);

  const sendMessage = useCallback((payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }
  }, []);

  return { sendMessage };
};