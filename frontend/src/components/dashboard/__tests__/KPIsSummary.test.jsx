import React from 'react';
import { render, screen } from '@testing-library/react';
import KPIsSummary from '../KPIsSummary';

jest.mock('../../../lib/api', () => ({ api: (path) => {
  if (path === '/api/reports/kpis') return Promise.resolve({
    turnover: [{ month: '2025-09', newTenants: 2, vacated: 1 }],
    occupancyTrend: [{ month: '2025-09', totalUnits: 4, occupied: 3, occupancyPct: 75 }],
    expenseSummary: { collected: 1200, pending: 200 }
  });
  return Promise.resolve({});
}}));

test('renders KPI widget with data', async () => {
  render(<KPIsSummary />);
  expect(await screen.findByText(/KPIs/i)).toBeTruthy();
  expect(await screen.findByText(/Turnover/i)).toBeTruthy();
  expect(await screen.findByText(/Occupancy trend/i)).toBeTruthy();
  expect(await screen.findByText(/Revenue summary/i)).toBeTruthy();
});
