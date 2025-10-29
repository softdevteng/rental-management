import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
beforeEach(() => {
  jest.spyOn(window, 'fetch').mockImplementation((url, opts) => {
    if (String(url).includes('/api/auth/login')) {
      return Promise.resolve({ ok: true, json: async () => ({ token: 'tok', role: 'tenant' }) });
    }
    // default response for other API calls
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});
afterEach(() => { jest.restoreAllMocks(); });

test('sign in flow does not throw and navigates', async () => {
  render(<App />);
  // navigate to sign in
  const signInLink = await screen.findByText(/Sign In/i);
  fireEvent.click(signInLink);
  // fill form
  const email = await screen.findByPlaceholderText(/Email/i);
  const password = await screen.findByPlaceholderText(/Password/i);
  fireEvent.change(email, { target: { value: 'test@example.com' } });
  fireEvent.change(password, { target: { value: 'pass' } });
  const btn = screen.getByRole('button', { name: /Sign In/i });
  fireEvent.click(btn);
  // expect navigation to tenant dashboard (Welcome, Tenant)
  await waitFor(() => expect(screen.queryByText(/Welcome, Tenant/i) || screen.queryByText(/Welcome, /i)).toBeTruthy());
});
