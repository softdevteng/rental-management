import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';

// Mock the api wrapper
const mockApi = jest.fn();
jest.mock('../lib/api', () => ({ api: (...args) => mockApi(...args) }));

describe('Delete Tenant flow (frontend)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    // landlord profile
    mockApi.mockImplementation((path, opts = {}) => {
      if (String(path).startsWith('/api/landlords/me')) return Promise.resolve({ id: 1, name: 'L1', Estates: [{ id: 'e1', name: 'G' }] });
      if (String(path).startsWith('/api/public/estates/') && String(path).endsWith('/apartments')) return Promise.resolve([{ id: 'a1', number: 'A1' }]);
      // tenants list
      if (String(path) === '/api/landlords/tenants' && (!opts.method || opts.method === 'GET')) {
        return Promise.resolve([{ id: 't1', name: 'Tenant One', apartmentId: 'a1', Apartment: { id: 'a1', number: 'A1', Estate: { id: 'e1', name: 'G' } } }]);
      }
      // delete tenant
      if (String(path).startsWith('/api/landlords/tenants/') && opts.method === 'DELETE') return Promise.resolve({ message: 'Tenant deleted' });
      return Promise.resolve([]);
    });

    localStorage.setItem('token', 'fake');
    localStorage.setItem('role', 'owner');
    window.history.pushState({}, 'Owner', '/landlord');
  });

  afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

  test('selecting delete action calls backend and removes row', async () => {
    render(<App />);

    // Click Tenants sidebar
    const tenantsBtn = await screen.findByRole('button', { name: /Tenants/i });
    fireEvent.click(tenantsBtn);

    // Wait for tenant row
    const row = await screen.findByText(/Tenant One/i);
    expect(row).toBeTruthy();

    // Mock confirm to auto-accept
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    // Find the actions select in the same table row
    const tr = row.closest('tr');
    expect(tr).toBeTruthy();
    const actions = within(tr).getByRole('combobox');
    // Choose delete
    fireEvent.change(actions, { target: { value: 'delete' } });

    // Wait for delete call to have been made
    await waitFor(() => {
      const delCall = mockApi.mock.calls.find(c => String(c[0]).startsWith('/api/landlords/tenants/') && c[1] && c[1].method === 'DELETE');
      if (!delCall) throw new Error('delete not called yet');
    });

    // The tenant row should be removed from DOM
    await waitFor(() => expect(screen.queryByText(/Tenant One/i)).toBeNull());
  });
});
