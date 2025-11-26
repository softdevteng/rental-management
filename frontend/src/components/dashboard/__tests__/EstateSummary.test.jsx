import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EstateSummary from '../EstateSummary';

jest.mock('../../../lib/api', () => ({ api: (path) => {
  if (path === '/api/reports/estate-summary') return Promise.resolve({
    occupancy: { total: 2, occupied: 1, vacant: 1 },
    tenantsCount: 1,
    revenue: { collected: 1000, pending: 500 },
    tickets: { open: 1 }
  });
  return Promise.resolve({});
}}));

test('renders estate summary from API', async () => {
  render(<EstateSummary />);
  // wait for the component to render fetched data
  await screen.findByText(/Units/i);
  // numeric values should be present; be explicit about which label we inspect to avoid ambiguous matches
  const unitsEl = screen.getByText(/Units/i).parentElement.querySelector('strong');
  expect(unitsEl.textContent.trim()).toBe('2');
  const tenantsEl = screen.getByText(/Tenants/i).parentElement.querySelector('strong');
  expect(tenantsEl.textContent.trim()).toBe('1');
  expect(screen.getByText(/KSh 1,000/)).toBeTruthy();
});
