import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// mock api module used by child components
jest.mock('../lib/api', () => ({ api: (path) => {
  if (path === '/api/reports/estate-summary') return Promise.resolve({
    occupancy: { total: 4, occupied: 3, vacant: 1 },
    tenantsCount: 3,
    revenue: { collected: 2000, pending: 300 },
    tickets: { open: 2 }
  });
  if (path === '/api/reports/analytics') return Promise.resolve({
    monthlyRevenue: [{ month: '2025-09', collected: 1000 }],
    monthlyNewTenants: [{ month: '2025-09', count: 2 }]
  });
  // default: empty
  return Promise.resolve({});
}}));

test('navigates to Estate Dashboard and renders widgets', async () => {
  // simulate authenticated landlord so RequireAuth allows /dashboard
  localStorage.setItem('token', 'tok');
  localStorage.setItem('role', 'landlord');
  // navigate to dashboard route before rendering
  window.history.pushState({}, 'Test page', '/dashboard');
  render(<App />);
  expect(await screen.findByText(/Estate Summary/i)).toBeTruthy();
  expect(await screen.findByText(/Analytics/i)).toBeTruthy();
});
