import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsSummary from '../AnalyticsSummary';

jest.mock('../../../lib/api', () => ({ api: (path) => {
  if (path === '/api/reports/analytics') return Promise.resolve({
    monthlyRevenue: [{ month: '2025-09', collected: 1000 }, { month: '2025-10', collected: 500 }],
    monthlyNewTenants: [{ month: '2025-09', count: 2 }, { month: '2025-10', count: 1 }]
  });
  return Promise.resolve({});
}}));

test('renders analytics lists', async () => {
  render(<AnalyticsSummary />);
  expect(await screen.findByText(/Monthly Revenue/i)).toBeTruthy();
  expect(await screen.findByText(/New Tenants/i)).toBeTruthy();
});
