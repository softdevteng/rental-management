import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock the api wrapper used throughout the app
const mockApi = jest.fn();
jest.mock('../lib/api', () => ({ api: (...args) => mockApi(...args) }));

describe('Add Tenant flow (server-generated tenantCode)', () => {
  beforeEach(() => {
    mockApi.mockReset();
    // Default responses for miscellaneous calls
    mockApi.mockImplementation((path, opts = {}) => {
      // Landlord profile (used to get estates)
      if (String(path).startsWith('/api/landlords/me')) {
        return Promise.resolve({ id: 1, name: 'Landlord One', Estates: [{ id: 'e1', name: 'Green Park' }] });
      }
      // Apartments for estate
      if (String(path).startsWith('/api/public/estates/') && String(path).endsWith('/apartments')) {
        return Promise.resolve([{ id: 'a1', number: 'A1', name: 'A1' }]);
      }
      // generate-code endpoint
      if (String(path) === '/api/landlords/tenants/generate-code' && opts.method === 'POST') {
        return Promise.resolve({ tenantCode: 'GP001' });
      }
      // creating tenant: echo back body
      if (String(path) === '/api/landlords/tenants' && opts.method === 'POST') {
        return Promise.resolve(Object.assign({ id: 12345 }, opts.body || {}));
      }
      // sensible defaults for other endpoints
      return Promise.resolve([]);
    });

    // Set auth state as owner before rendering
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'owner');
    // Ensure we're on the owner route
    window.history.pushState({}, 'Owner', '/landlord');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('requests a server-generated tenantCode and includes it when creating a tenant', async () => {
    render(<App />);

  // Click the sidebar Add Tenant button
  const addBtn = await screen.findByRole('button', { name: /Add Tenant/i });
  fireEvent.click(addBtn);

  // Wait for the Add Tenant card to render (there are multiple matching nodes; pick the card heading)
  const headings = await screen.findAllByText(/Add Tenant/i);
  const heading = headings.find(h => h.tagName === 'H3') || headings[0];
  const card = heading.closest('.card');
    expect(card).toBeTruthy();

    // Use accessible labels: select estate then apartment
    const estateSelect = within(card).getByLabelText(/Estate/i);
    fireEvent.change(estateSelect, { target: { value: 'e1' } });

    // Wait for apartment option to appear then select it
    await waitFor(() => {
      const aptSelect = within(card).getByLabelText(/Apartment/i);
      const opt = Array.from(aptSelect.options).find(o => o.value === 'a1');
      if (!opt) throw new Error('Apartment option not loaded yet');
    });
    const aptSelect = within(card).getByLabelText(/Apartment/i);
    fireEvent.change(aptSelect, { target: { value: 'a1' } });

    // Fill inputs using labels
    const nameInput = within(card).getByLabelText(/Name/i);
    const idInput = within(card).getByLabelText(/ID Number/i);
    const phoneInput = within(card).getByLabelText(/Phone/i);
    const emailInput = within(card).getByLabelText(/Email/i);
    fireEvent.change(nameInput, { target: { value: 'Test Tenant' } });
    fireEvent.change(idInput, { target: { value: '12345678' } });
    fireEvent.change(phoneInput, { target: { value: '0712345678' } });
    fireEvent.change(emailInput, { target: { value: 'tenant@example.com' } });

    // Submit the form (Admit Tenant button)
    const submitBtn = within(card).getByRole('button', { name: /Admit Tenant/i });
  fireEvent.click(submitBtn);

    // Wait for the mocked generate-code and tenant create calls to be invoked
    await waitFor(() => {
      // ensure the generate-code call happened
      const genCall = mockApi.mock.calls.find(c => String(c[0]) === '/api/landlords/tenants/generate-code');
      if (!genCall) throw new Error('generate-code not called yet');
    });

    // Check that create tenant was called with tenantCode from generate-code
    const createCall = mockApi.mock.calls.find(c => String(c[0]) === '/api/landlords/tenants' && c[1] && c[1].method === 'POST');
    expect(createCall).toBeDefined();
    const createBody = createCall[1].body;
    expect(createBody).toBeDefined();
    expect(createBody.tenantCode).toBe('GP001');
    expect(createBody.name).toBe('Test Tenant');
    expect(createBody.apartmentId).toBe('a1');
  });
});
