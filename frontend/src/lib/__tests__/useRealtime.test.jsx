import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useRealtime } from '../useRealtime';

// A tiny component to exercise the hook
function TestComp({ token, handlers }) {
  useRealtime(token, handlers);
  return <div data-testid="ok">ok</div>;
}

describe('useRealtime', () => {
  beforeEach(() => {
    jest.resetModules();
    // Ensure any global EventSource mock is cleared
    delete global.EventSource;
  });

  test('falls back to EventSource when socket reports connect_error', async () => {
    // Mock socket.io-client to simulate connect_error being emitted
    jest.mock('socket.io-client', () => ({
      io: () => ({
        on: (ev, cb) => { if (ev === 'connect_error') cb(new Error('fail')); },
        disconnect: () => {}
      })
    }));

    const listeners = [];
    global.EventSource = jest.fn((url) => ({
      addEventListener: (ev, cb) => listeners.push({ ev, cb }),
      close: () => {}
    }));

    const handlers = { 'payment:update': jest.fn() };
    const { getByTestId } = render(<TestComp token="tok" handlers={handlers} />);
    expect(getByTestId('ok')).toBeTruthy();

    await waitFor(() => {
      // EventSource should have been instantiated
      expect(global.EventSource).toHaveBeenCalled();
    });
  });
});
