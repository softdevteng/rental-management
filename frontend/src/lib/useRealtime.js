import { useEffect, useRef } from 'react';

// useRealtime hook
// - token: auth token string
// - handlers: object mapping eventName -> handler(data)
// Behavior: attempts to dynamic-import socket.io-client and connect; if not available, falls back to EventSource to /api/payments/stream

export function useRealtime(token, handlers = {}) {
  const socketRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    let socket = null;
    let es = null;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const base = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) || '';
        const url = base ? base.replace(/\/$/, '') : '';
        socket = io(url || undefined, { auth: { token } });
        socketRef.current = socket;
        // attach handlers
        Object.keys(handlers || {}).forEach(ev => {
          try { socket.on(ev, handlers[ev]); } catch (e) {}
        });
        socket.on('connect_error', (err) => {
          // fallback to SSE if socket fails to connect
          tryInitSSE();
        });
      } catch (err) {
        // socket.io-client not available or failed — fallback to SSE
        tryInitSSE();
      }
    };

    const tryInitSSE = () => {
      try {
        const base = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) || '';
        const url = base ? (base.replace(/\/$/, '') + '/api/payments/stream') : '/api/payments/stream';
        es = new EventSource(url);
        esRef.current = es;
        Object.keys(handlers || {}).forEach(ev => {
          try { es.addEventListener(ev, (e) => { try { handlers[ev](JSON.parse(e.data || '{}')); } catch (e) {} }); } catch (e) {}
        });
      } catch (e) {
        // no realtime available
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      try { if (socketRef.current) socketRef.current.disconnect(); } catch (e) {}
      try { if (esRef.current) esRef.current.close(); } catch (e) {}
    };
  }, [token, JSON.stringify(Object.keys(handlers))]);
}
